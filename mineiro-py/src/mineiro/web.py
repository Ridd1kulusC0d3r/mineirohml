"""Public web service: users submit a username on the site, scans run as short-lived in-memory jobs.

Design rules: nothing is logged about targets, nothing is written to disk, jobs expire (MINEIRO_JOB_TTL),
the UI is static files under a strict CSP and renders results with textContent only.
"""

from __future__ import annotations

import asyncio
import hmac
import os
import secrets
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse, Response
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from . import __version__
from .assessment import build_assessment
from .export import FORMATS, export_report
from .inputs import InvalidTarget, normalize_username
from .registry import load_registry
from .scan import SCAN_PRESETS, Scanner, ScanResult

STATIC = Path(__file__).parent / "web_static"
MIME = {"html": "text/html", "json": "application/json", "markdown": "text/markdown", "csv": "text/csv",
        "stix": "application/json", "cypher": "text/plain"}
EXT = {"html": "html", "json": "json", "markdown": "md", "csv": "csv", "stix": "stix.json", "cypher": "cypher"}
CSP = ("default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; "
       "base-uri 'none'; form-action 'none'; frame-ancestors 'none'")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass
class Settings:
    public: bool = True
    max_jobs: int = 6              # scans running at the same time on the whole server
    per_ip_jobs: int = 1           # concurrent scans per client
    rate_per_hour: int = 12        # scans per client per hour
    allow_full: bool = False       # preset "full" (984 sites) is off for the public
    job_ttl: int = 900             # seconds a finished job stays available
    trust_hops: int = 0            # number of reverse proxies in front (reads X-Forwarded-For)
    access_token: str = ""         # optional shared secret; empty = open
    allow_private: bool = False

    @classmethod
    def from_env(cls) -> Settings:
        e = os.environ
        return cls(public=e.get("MINEIRO_PUBLIC", "1") != "0", max_jobs=_env_int("MINEIRO_MAX_JOBS", 6),
                   per_ip_jobs=_env_int("MINEIRO_PER_IP_JOBS", 1), rate_per_hour=_env_int("MINEIRO_RATE_PER_HOUR", 12),
                   allow_full=e.get("MINEIRO_ALLOW_FULL", "0") == "1", job_ttl=_env_int("MINEIRO_JOB_TTL", 900),
                   trust_hops=_env_int("MINEIRO_TRUST_HOPS", 0), access_token=e.get("MINEIRO_ACCESS_TOKEN", ""),
                   allow_private=e.get("MINEIRO_ALLOW_PRIVATE", "0") == "1")


@dataclass
class Job:
    id: str
    owner: str
    target: str
    preset: str
    lang: str
    requirement: str
    total: int = 0
    done: int = 0
    status: str = "running"        # running | done | error
    error: str = ""
    found: list = field(default_factory=list)
    results: list[ScanResult] = field(default_factory=list)
    assessment: dict | None = None
    finished_at: float = 0.0
    task: asyncio.Task | None = None


class App:
    def __init__(self, settings: Settings | None = None, *, scanner_factory=None) -> None:
        self.s = settings or Settings.from_env()
        self.registry = load_registry()
        self.jobs: dict[str, Job] = {}
        self.hits: dict[str, deque] = defaultdict(deque)
        self.scanner_factory = scanner_factory or self._default_scanner

    def _default_scanner(self, preset: str) -> Scanner:
        # public mode: never reuse another visitor's cached result
        return Scanner(self.registry, preset=preset, use_cache=not self.s.public)

    # ---- helpers
    def client(self, request: Request) -> str:
        host = request.client.host if request.client else "unknown"
        hops = self.s.trust_hops
        if hops > 0:
            parts = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
            if len(parts) >= hops:
                host = parts[-hops]
        return host

    def authorized(self, request: Request) -> bool:
        if not self.s.access_token:
            return True
        given = request.headers.get("x-access-token", "")
        return hmac.compare_digest(given.encode(), self.s.access_token.encode())

    def sweep(self) -> None:
        now = time.time()
        for jid in [j for j, job in self.jobs.items() if job.finished_at and now - job.finished_at > self.s.job_ttl]:
            del self.jobs[jid]
        for ip in [i for i, q in self.hits.items() if not q or now - q[-1] > 3600]:
            del self.hits[ip]

    def running(self, owner: str | None = None) -> int:
        return sum(1 for j in self.jobs.values() if j.status == "running" and (owner is None or j.owner == owner))

    def _job_for(self, request: Request) -> Job | None:
        job = self.jobs.get(request.path_params["jid"])
        # a job is only visible to the client that created it
        if job is None or job.owner != self.client(request):
            return None
        return job

    # ---- endpoints
    async def index(self, request: Request) -> Response:
        return FileResponse(STATIC / "index.html", media_type="text/html")

    async def health(self, request: Request) -> Response:
        return JSONResponse({"status": "ok", "version": __version__})

    async def config(self, request: Request) -> Response:
        presets = [p for p in SCAN_PRESETS if p != "full" or self.s.allow_full or not self.s.public]
        return JSONResponse({"version": __version__, "presets": presets, "detectors": len(self.registry.detectors),
                             "requires_token": bool(self.s.access_token), "public": self.s.public})

    async def create_scan(self, request: Request) -> Response:
        if not self.authorized(request):
            return JSONResponse({"error": "Token de acesso inválido."}, status_code=401)
        if int(request.headers.get("content-length") or 0) > 4096:
            return JSONResponse({"error": "Requisição grande demais."}, status_code=413)
        try:
            body = await request.json()
            if not isinstance(body, dict):
                raise ValueError
        except ValueError:
            return JSONResponse({"error": "JSON inválido."}, status_code=400)
        try:
            target = normalize_username(body.get("target", ""))
        except InvalidTarget as exc:
            return JSONResponse({"error": str(exc)}, status_code=422)
        preset = body.get("preset", "quick")
        if preset not in SCAN_PRESETS or (preset == "full" and self.s.public and not self.s.allow_full):
            return JSONResponse({"error": "Preset indisponível."}, status_code=422)
        lang = body.get("lang", "pt") if body.get("lang") in ("pt", "en", "es") else "pt"

        owner = self.client(request)
        self.sweep()
        now = time.time()
        q = self.hits[owner]
        while q and now - q[0] > 3600:
            q.popleft()
        if len(q) >= self.s.rate_per_hour:
            wait = int(3600 - (now - q[0])) + 1
            return JSONResponse({"error": "Limite de buscas por hora atingido.", "retry_after": wait}, status_code=429,
                                headers={"Retry-After": str(wait)})
        if self.running(owner) >= self.s.per_ip_jobs:
            return JSONResponse({"error": "Você já tem uma busca em andamento."}, status_code=429, headers={"Retry-After": "10"})
        if self.running() >= self.s.max_jobs:
            return JSONResponse({"error": "Servidor ocupado, tente em instantes."}, status_code=503, headers={"Retry-After": "15"})
        q.append(now)

        job = Job(id=secrets.token_urlsafe(16), owner=owner, target=target, preset=preset, lang=lang,
                  requirement=body.get("requirement", "account_correlation"))
        self.jobs[job.id] = job
        job.task = asyncio.create_task(self._run(job))
        return JSONResponse({"id": job.id}, status_code=202)

    async def _run(self, job: Job) -> None:
        def on_result(r: ScanResult, done: int, total: int) -> None:
            job.done, job.total = done, total
            if r.status == "found":
                job.found.append({"platform": r.platform_name, "category": r.category, "url": r.url,
                                  "confidence": r.confidence_score})
        try:
            scanner = self.scanner_factory(job.preset)
            async with scanner:
                job.results = await asyncio.wait_for(scanner.scan(job.target, on_result=on_result), timeout=300)
            job.assessment = build_assessment(job.results, job.target, job.requirement, job.lang)
            job.status = "done"
        except TimeoutError:
            job.status, job.error = "error", "A busca excedeu o tempo limite."
        except Exception:  # noqa: BLE001 - never leak internals to the visitor
            job.status, job.error = "error", "Falha interna ao executar a busca."
        finally:
            job.finished_at = time.time()

    async def get_scan(self, request: Request) -> Response:
        job = self._job_for(request)
        if job is None:
            return JSONResponse({"error": "Busca não encontrada ou expirada."}, status_code=404)
        out = {"id": job.id, "status": job.status, "done": job.done, "total": job.total, "found": job.found,
               "error": job.error, "target": job.target}
        if job.assessment:
            a = job.assessment
            out["summary"] = {"collection": a["collection"], "confidence": a["assessment_confidence"],
                              "judgments": [{"id": j["id"], "confidence": j["confidence"], "text": j["text"]} for j in a["judgments"]]}
        return JSONResponse(out, headers={"Cache-Control": "no-store"})

    async def report(self, request: Request) -> Response:
        job = self._job_for(request)
        if job is None or job.assessment is None:
            return JSONResponse({"error": "Relatório indisponível."}, status_code=404)
        fmt = request.query_params.get("format", "html")
        if fmt not in FORMATS:
            return JSONResponse({"error": "Formato inválido."}, status_code=422)
        payload, manifest = export_report(job.assessment, job.results, fmt)
        name = "".join(c if c.isalnum() or c in "-_" else "_" for c in job.target) or "target"
        return Response(payload.encode(), media_type=f"{MIME[fmt]}; charset=utf-8", headers={
            "Content-Disposition": f'attachment; filename="mineiro-{name}.{EXT[fmt]}"',
            "X-Payload-SHA256": manifest["payload_sha256"], "Content-Security-Policy": "sandbox; default-src 'none'",
            "Cache-Control": "no-store"})

    async def delete_scan(self, request: Request) -> Response:
        job = self._job_for(request)
        if job is None:
            return JSONResponse({"error": "Busca não encontrada."}, status_code=404)
        if job.task and not job.task.done():
            job.task.cancel()
        del self.jobs[job.id]
        return Response(status_code=204)


def create_app(settings: Settings | None = None, *, scanner_factory=None) -> Starlette:
    core = App(settings, scanner_factory=scanner_factory)

    async def security(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("Content-Security-Policy", CSP)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        return response

    routes = [
        Route("/", core.index),
        Route("/healthz", core.health),
        Route("/favicon.ico", lambda r: Response(status_code=204)),
        Route("/api/config", core.config),
        Route("/api/scans", core.create_scan, methods=["POST"]),
        Route("/api/scans/{jid}", core.get_scan, methods=["GET"]),
        Route("/api/scans/{jid}", core.delete_scan, methods=["DELETE"]),
        Route("/api/scans/{jid}/report", core.report),
        Mount("/static", StaticFiles(directory=STATIC), name="static"),
    ]
    app = Starlette(routes=routes)
    app.add_middleware(__import__("starlette.middleware.base", fromlist=["BaseHTTPMiddleware"]).BaseHTTPMiddleware, dispatch=security)
    app.state.core = core
    return app


def serve(host: str = "0.0.0.0", port: int | None = None) -> None:  # pragma: no cover
    import uvicorn
    port = port or _env_int("PORT", 8000)
    uvicorn.run(create_app(), host=host, port=port, access_log=False, log_level="warning",
                proxy_headers=False, server_header=False)
