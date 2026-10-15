"""Scan engine: probes detectors concurrently and turns responses into evidence-graded results."""

from __future__ import annotations

import asyncio
import hashlib
import random
import re
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Awaitable, Callable
from urllib.parse import urlsplit

import httpx

from . import __version__
from .baseline import PageFingerprint, compare_to_baseline, fingerprint_page
from .evidence import evaluate_evidence
from .fetch import FetchResult, GuardedFetcher
from .matchers import evaluate_matchers
from .netguard import BlockedTargetError, random_control_username
from .pivots import GENERIC_DOMAINS
from .registry import Detector, Registry, load_registry

DEFAULT_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                   f"Chrome/124.0.0.0 Safari/537.36 MineiroUsernameIntelligence/{__version__}"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}
RETRY_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
                   "Chrome/126.0.0.0 Safari/537.36"),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

SCAN_PRESETS: dict[str, dict] = {
    "quick": {"scope": "top20", "concurrency": 10, "timeout": 2.5, "depth": "fast", "evidence": False},
    "standard": {"scope": "top50", "concurrency": 8, "timeout": 4.5, "depth": "deep", "evidence": True},
    "full": {"scope": "all", "concurrency": 6, "timeout": 6.5, "depth": "deep", "evidence": True, "progressive": True},
}

BASELINE_TTL = 15 * 60
RESULT_TTL = 5 * 60
_LINK = re.compile(r"""href=["'](https?://[^"'#\s]{4,300})["']""", re.I)
_TITLE = re.compile(r"<title[^>]*>([\s\S]*?)</title>", re.I)
_OG_TITLE = re.compile(r"""<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']""", re.I)
_NOISE_HOSTS = GENERIC_DOMAINS | {"fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com",
                                  "googletagmanager.com", "google-analytics.com", "apple.com", "play.google.com"}


@dataclass
class ScanResult:
    platform_id: str
    platform_name: str
    category: str
    url: str
    status: str  # found | not_found | uncertain | rate_limited | error
    status_code: int = 0
    response_time_ms: int = 0
    confidence_score: int = 0
    detector_reliability: int = 60
    evidence_level: str = "uncertain"  # confirmed | probable | uncertain | absent
    evidence_signals: list[str] = field(default_factory=list)
    evidence_checks_passed: int | None = None
    evidence_checks_total: int | None = None
    baseline_similarity: float | None = None
    evidence_hash: str | None = None
    collected_at: str = ""
    detector_version: str = "legacy"
    waf_retried: bool = False
    uncertain_reason: str | None = None
    error: str | None = None
    cached: bool = False
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "ScanResult":
        names = cls.__dataclass_fields__.keys()
        return cls(**{k: v for k, v in data.items() if k in names})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def extract_profile_metadata(body: str, url: str) -> dict:
    """Best-effort public hints from a found profile. These are leads, never identity proof."""
    meta: dict = {}
    m = _OG_TITLE.search(body) or _TITLE.search(body)
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()
        if title:
            meta["displayName"] = title[:120]
    own = (urlsplit(url).hostname or "").removeprefix("www.").lower()
    links: list[str] = []
    for hit in _LINK.finditer(body[:120_000]):
        link = hit.group(1)
        host = (urlsplit(link).hostname or "").removeprefix("www.").lower()
        if host and host != own and not host.endswith("." + own) and host not in _NOISE_HOSTS and link not in links:
            links.append(link)
        if len(links) >= 8:
            break
    if links:
        meta["extractedLinks"] = links
    return meta


class _HostLimiter:
    def __init__(self, per_host: int) -> None:
        self._per_host = per_host
        self._slots: dict[str, asyncio.Semaphore] = {}

    def slot(self, host: str) -> asyncio.Semaphore:
        return self._slots.setdefault(host, asyncio.Semaphore(self._per_host))


class Scanner:
    """Runs detectors against a username.

    >>> scanner = Scanner(preset="quick")
    >>> results = await scanner.scan("someuser")
    """

    def __init__(self, registry: Registry | None = None, *, preset: str = "standard", scope: str | None = None,
                 category: str = "all", concurrency: int | None = None, timeout: float | None = None,
                 depth: str | None = None, evidence: bool | None = None, baseline: bool | None = None,
                 per_host: int = 4, fetcher: GuardedFetcher | None = None, use_cache: bool = True) -> None:
        cfg = {**SCAN_PRESETS[preset]}
        self.registry = registry or load_registry()
        self.preset = preset
        self.scope = scope or cfg["scope"]
        self.category = category
        self.concurrency = concurrency or cfg["concurrency"]
        self.timeout = timeout or cfg["timeout"]
        self.depth = depth or cfg["depth"]
        self.evidence = cfg["evidence"] if evidence is None else evidence
        self.baseline = self.evidence if baseline is None else baseline
        self.progressive = bool(cfg.get("progressive")) and scope is None
        self._fetcher = fetcher or GuardedFetcher()
        self._owns_fetcher = fetcher is None
        self._limiter = _HostLimiter(per_host)
        self._baselines: dict[str, tuple[float, PageFingerprint | None]] = {}
        self._cache: dict[str, tuple[float, ScanResult]] = {}
        self._use_cache = use_cache

    async def aclose(self) -> None:
        if self._owns_fetcher:
            await self._fetcher.aclose()

    async def __aenter__(self) -> "Scanner":
        return self

    async def __aexit__(self, *exc) -> None:
        await self.aclose()

    # -- probing -----------------------------------------------------------------------------------------------
    async def _probe(self, url: str, timeout: float, *, headers: dict | None = None, read_body: bool = False) -> FetchResult:
        host = urlsplit(url).hostname or ""
        async with self._limiter.slot(host):
            return await asyncio.wait_for(
                self._fetcher.fetch(url, headers=headers or DEFAULT_HEADERS, timeout=timeout, read_body=read_body),
                timeout=timeout + 1,
            )

    async def _control(self, detector: Detector, timeout: float) -> PageFingerprint | None:
        cached = self._baselines.get(detector.id)
        if cached and time.time() - cached[0] < BASELINE_TTL:
            return cached[1]
        handle = random_control_username()
        fingerprint = None
        try:
            outcome = await self._probe(detector.url_for(handle), timeout, read_body=True)
            fingerprint = fingerprint_page(status=outcome.status, final_url=outcome.final_url, body=outcome.body, handle=handle)
        except Exception:
            fingerprint = None
        self._baselines[detector.id] = (time.time(), fingerprint)
        return fingerprint

    async def check(self, detector: Detector, target: str, *, depth: str | None = None,
                    evidence: bool | None = None, baseline: bool | None = None) -> ScanResult:
        depth = depth or self.depth
        use_evidence = self.evidence if evidence is None else evidence
        use_baseline = (self.baseline if baseline is None else baseline) and use_evidence
        retry_adaptive = depth == "deep"
        timeout = self.timeout if depth == "deep" or self.depth == "fast" else min(self.timeout, 2.5)
        if depth == "fast":
            timeout = min(self.timeout, 2.5)

        url = detector.url_for(target)
        declarative = self.registry.declarative.get(detector.id)
        want_body = bool(use_evidence or use_baseline or declarative)
        cache_key = f"{detector.id}|{url}|{depth}|{use_evidence}|{use_baseline}"
        if self._use_cache:
            hit = self._cache.get(cache_key)
            if hit and time.time() - hit[0] < RESULT_TTL:
                result = ScanResult.from_dict(hit[1].to_dict())
                result.cached = True
                return result

        started = time.monotonic()
        base = dict(platform_id=detector.id, platform_name=detector.name, category=detector.category, url=url,
                    collected_at=_now(), detector_version=detector.last_verified or "legacy",
                    detector_reliability=detector.reliability)
        elapsed = lambda: int((time.monotonic() - started) * 1000)  # noqa: E731

        try:
            first, control = await asyncio.gather(
                self._probe(url, timeout, read_body=want_body),
                self._control(detector, timeout) if use_baseline else asyncio.sleep(0, result=None),
            )
            outcome = first
            code = outcome.status
            waf_retried = False

            if code in (403, 429, 503) or outcome.edge_protected:
                if not retry_adaptive:
                    return ScanResult(
                        **base, status="rate_limited" if code == 429 else "uncertain", status_code=code,
                        response_time_ms=elapsed(), confidence_score=35 if code == 429 else 42,
                        evidence_signals=[f"http_status:{code}", "edge_protection_detected" if outcome.edge_protected else "request_blocked"],
                        uncertain_reason=("Edge protection challenge (no retry in this mode)" if outcome.edge_protected
                                          else f"HTTP {code} protection challenge (no retry in this mode)"),
                    )
                await asyncio.sleep(0.2 + random.random() * 0.15)
                waf_retried = True
                retry = await self._probe(url, max(timeout - (time.monotonic() - started), 2.5),
                                          headers=RETRY_HEADERS, read_body=want_body)
                if retry.status not in (detector.expected_status, detector.error_status, 404):
                    return ScanResult(
                        **base, status="rate_limited" if retry.status == 429 else "uncertain", status_code=retry.status,
                        response_time_ms=elapsed(), confidence_score=45,
                        evidence_signals=[f"http_status:{retry.status}", "adaptive_retry_inconclusive"],
                        uncertain_reason=f"HTTP {retry.status} persistent protection after retry", waf_retried=True,
                    )
                outcome = retry
                code = retry.status

            reliability = detector.reliability
            expected, error = detector.expected_status, detector.error_status
            signals = [f"http_status:{code}", "expected_status_match" if code == expected else "unexpected_status"]
            report = None
            if use_evidence:
                report = evaluate_evidence(
                    requested_url=url, final_url=outcome.final_url or url, username=target, status_code=code,
                    expected_status=expected, error_status=error, body=outcome.body, edge_protected=outcome.edge_protected,
                )
                signals = list(report.signals)

            found, confidence, level = False, 0, "uncertain"
            if code in (error, 404):
                confidence = max(80, min(98, round(reliability * 0.45 + 55)))
                level = "absent"
            elif code == expected:
                found = True
                ratio = report.passed / report.total if report else 0.65
                confidence = max(35, min(97, round(reliability * 0.6 + ratio * 100 * 0.4)))
                if report and report.soft_404:
                    found, confidence = False, min(confidence, 45)
                else:
                    level = "confirmed" if report and report.passed >= 6 else "probable"
            else:
                found = 200 <= code < 300
                ratio = report.passed / report.total if report else 0.5
                confidence = max(30, min(85, round(reliability * 0.55 + ratio * 100 * 0.45)))

            similarity = None
            if use_baseline and code == expected:
                target_fp = fingerprint_page(status=code, final_url=outcome.final_url, body=outcome.body, handle=target)
                verdict = compare_to_baseline(target_fp, control)
                similarity = verdict.similarity
                signals += verdict.signals
                if verdict.relation == "same":
                    found, level = False, "absent"
                    confidence = max(80, min(95, round(reliability * 0.3 + 62)))
                elif verdict.relation == "different" and found:
                    confidence = min(97, confidence + 8)
                    if level == "probable" and (report is None or report.passed >= 5):
                        level = "confirmed"

            if declarative:
                rule = evaluate_matchers(declarative, code, outcome.final_url, outcome.body)
                signals += rule["signals"]
                if rule["verdict"] == "absent":
                    found, level, confidence = False, "absent", max(confidence, 90)
                elif rule["verdict"] == "present" and found:
                    confidence = min(97, max(confidence, 85))
                    if level == "probable":
                        level = "confirmed"

            status = "uncertain" if (level == "uncertain" and found) else ("found" if found else "not_found")
            result = ScanResult(
                **base, status=status, status_code=code, response_time_ms=elapsed(), confidence_score=confidence,
                evidence_level=level, evidence_signals=signals,
                evidence_checks_passed=report.passed if report else None,
                evidence_checks_total=report.total if report else None,
                baseline_similarity=similarity,
                evidence_hash=(hashlib.sha256(f"{code}\n{outcome.final_url}\n{outcome.body}".encode()).hexdigest()
                               if want_body else None),
                waf_retried=waf_retried,
                metadata=extract_profile_metadata(outcome.body, outcome.final_url) if (found and outcome.body) else {},
            )
            if self._use_cache and result.status in ("found", "not_found"):
                self._cache[cache_key] = (time.time(), result)
            return result
        except BlockedTargetError as exc:
            return ScanResult(**base, status="error", response_time_ms=elapsed(), confidence_score=10, error=str(exc))
        except (asyncio.TimeoutError, httpx.TimeoutException):
            return ScanResult(**base, status="uncertain", status_code=408, response_time_ms=elapsed(), confidence_score=40,
                              uncertain_reason=f"Timed out at {timeout}s ({depth} mode)")
        except Exception as exc:  # network error
            return ScanResult(**base, status="error", response_time_ms=elapsed(), confidence_score=10,
                              error=str(exc) or exc.__class__.__name__)

    # -- orchestration -----------------------------------------------------------------------------------------
    async def scan(self, target: str, *, on_result: Callable[[ScanResult, int, int], Awaitable[None] | None] | None = None,
                   detectors: list[Detector] | None = None, target_type: str = "username") -> list[ScanResult]:
        target = target.strip().lstrip("@")
        if not target:
            raise ValueError("target is required")
        pool = detectors if detectors is not None else self.registry.scope(self.scope, self.category, target_type)
        total = len(pool)
        sem = asyncio.Semaphore(self.concurrency)
        done = 0

        async def run(detector: Detector, **opts) -> ScanResult:
            nonlocal done
            async with sem:
                result = await self.check(detector, target, **opts)
            done += 1
            if on_result:
                maybe = on_result(result, done, total)
                if asyncio.iscoroutine(maybe):
                    await maybe
            return result

        if not self.progressive:
            return list(await asyncio.gather(*(run(d) for d in pool)))

        # Progressive full scan: fast discovery first, deep checks only on candidates.
        first = list(await asyncio.gather(*(run(d, depth="fast", evidence=False, baseline=False) for d in pool)))
        by_id = {d.id: d for d in pool}
        candidates = [r for r in first if r.status in ("found", "uncertain", "rate_limited")]
        deep = await asyncio.gather(*(self.check(by_id[r.platform_id], target, depth="deep", evidence=True, baseline=True)
                                      for r in candidates))
        refined = {r.platform_id: r for r in deep}
        return [refined.get(r.platform_id, r) for r in first]
