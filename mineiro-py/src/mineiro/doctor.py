"""`mineiro doctor`: one command that explains why a scan would fail in this environment.

Run it first when something does not work (Colab, corporate network, sandbox). It checks the Python and
dependency versions, the registry, DNS, TLS and a real probe, and tells you what to change.
"""

from __future__ import annotations

import asyncio
import importlib
import platform
import socket
import ssl
import sys
import time

from . import __version__

PROBES = [("github", "https://github.com/octocat"), ("codeberg", "https://codeberg.org/forgejo"), ("reddit", "https://www.reddit.com/user/spez")]


def _ver(name: str) -> str:
    try:
        return getattr(importlib.import_module(name), "__version__", "installed")
    except Exception as exc:  # noqa: BLE001
        return f"MISSING ({exc.__class__.__name__})"


async def _probe(url: str) -> str:
    from .fetch import GuardedFetcher

    fetcher = GuardedFetcher()
    started = time.monotonic()
    try:
        result = await fetcher.fetch(url, timeout=8, read_body=True, headers={"User-Agent": "Mozilla/5.0 MineiroDoctor"})
        ms = int((time.monotonic() - started) * 1000)
        note = " (edge protection)" if result.edge_protected else ""
        return f"HTTP {result.status} in {ms} ms, {len(result.body)} bytes{note}"
    except Exception as exc:  # noqa: BLE001
        return f"FAILED: {exc.__class__.__name__}: {str(exc)[:160]}"
    finally:
        await fetcher.aclose()


async def run_doctor(emit=print) -> dict:
    report: dict = {"ok": True, "problems": [], "hints": []}

    def problem(msg: str, hint: str) -> None:
        report["ok"] = False
        report["problems"].append(msg)
        report["hints"].append(hint)

    emit(f"mineiro {__version__} · Python {platform.python_version()} · {platform.system()} {platform.release()}")
    emit(f"  httpx: {_ver('httpx')} · ipywidgets: {_ver('ipywidgets')} · IPython: {_ver('IPython')} · ssl: {ssl.OPENSSL_VERSION}")
    if sys.version_info < (3, 10):
        problem("Python < 3.10", "Use Python 3.10 or newer.")

    try:
        from .registry import load_registry

        registry = load_registry()
        issues = registry.validate()
        emit(f"  registry: {len(registry)} detectors, validation {'OK' if not issues else 'FAILED'}")
        if issues:
            problem("registry validation failed", "; ".join(issues[:3]))
    except Exception as exc:  # noqa: BLE001
        problem(f"registry failed to load: {exc}", "Reinstall the package: pip install --force-reinstall mineiro")

    try:
        socket.getaddrinfo("github.com", 443)
        emit("  dns: OK")
    except OSError as exc:
        problem(f"DNS lookup failed: {exc}", "This environment has no internet or DNS access.")

    statuses = []
    for name, url in PROBES:
        outcome = await _probe(url)
        statuses.append(outcome)
        emit(f"  probe {name:<9} {outcome}")
    failed = [s for s in statuses if s.startswith("FAILED")]
    if len(failed) == len(PROBES):
        reason = failed[0]
        if "CERTIFICATE_VERIFY_FAILED" in reason:
            problem("TLS inspection (self-signed certificate in chain)", "Set MINEIRO_CA_BUNDLE (or SSL_CERT_FILE) to your network's CA file. Do not disable verification.")
        else:
            problem("no probe could reach the internet", "Check the network/egress policy; every probe failed.")
    elif failed:
        emit("  note: some probes failed; a platform may be blocking this network (that is reported as uncertain, not as absence).")

    try:
        import ipywidgets  # noqa: F401
    except ImportError:
        emit("  widgets: ipywidgets not installed (the form UI is optional; the Colab form cell and the CLI work without it)")

    emit("")
    emit("RESULT: " + ("everything this tool needs is working." if report["ok"] else "problems found:"))
    for msg, hint in zip(report["problems"], report["hints"], strict=True):
        emit(f"  - {msg}\n    -> {hint}")
    return report


def doctor() -> dict:
    """Synchronous entry point (works in scripts; in notebooks use `await run_doctor()` or this wrapper)."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(run_doctor())
    # Inside a running loop (Jupyter/Colab): run in a worker thread with its own loop.
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(lambda: asyncio.run(run_doctor())).result()
