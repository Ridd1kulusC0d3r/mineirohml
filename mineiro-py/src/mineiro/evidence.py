"""Evidence engine: pure functions that read one HTTP response (no I/O)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import quote, urlsplit

EVIDENCE_CHECK_IDS = (
    "status_expected", "absence_status", "redirect_consistency", "username_final_url",
    "username_body", "canonical_match", "soft_404", "edge_protection",
)

SOFT_404_HINTS = (
    "page not found", "user not found", "profile not found",
    "does not exist", "doesn't exist", "no such user", ">404<",
)

_CANONICAL_A = re.compile(r"""<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["']""", re.I)
_CANONICAL_B = re.compile(r"""<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*canonical[^"']*["']""", re.I)


def encode_uri_component(value: str) -> str:
    """Same output as JavaScript's encodeURIComponent."""
    return quote(value, safe="!'()*-._~")


@dataclass
class EvidenceReport:
    checks: list[dict]
    passed: int
    total: int
    signals: list[str]
    soft_404: bool


def _host(url: str) -> str:
    return (urlsplit(url).hostname or "").lower()


def evaluate_evidence(
    *, requested_url: str, final_url: str, username: str = "", status_code: int,
    expected_status: int, error_status: int, body: str, edge_protected: bool,
) -> EvidenceReport:
    body_lower = body.lower()
    user = username.strip().lower()
    user_enc = encode_uri_component(user)
    final_lower = final_url.lower()
    requested_host, final_host = _host(requested_url), _host(final_url)

    soft_404 = any(hint in body_lower for hint in SOFT_404_HINTS)

    canonical_match = False
    match = _CANONICAL_A.search(body) or _CANONICAL_B.search(body)
    if match:
        try:
            from urllib.parse import urljoin

            canonical = urljoin(final_url, match.group(1))
            canonical_match = _host(canonical) == final_host and (not user or user_enc in canonical.lower())
        except ValueError:
            canonical_match = False

    absence = status_code in (error_status, 404)
    same_site = (
        requested_host == final_host or final_host.endswith("." + requested_host)
        or requested_host.endswith("." + final_host)
    )
    in_url = bool(user and user_enc in final_lower)
    in_body = bool(user and user in body_lower)

    checks = [
        {"id": "status_expected", "pass": status_code == expected_status, "signal": f"http_status:{status_code}"},
        {"id": "absence_status", "pass": absence, "signal": "explicit_absence_status" if absence else "absence_status_not_observed"},
        {"id": "redirect_consistency", "pass": same_site,
         "signal": "no_redirect" if requested_url == final_url else f"final_host:{final_host}"},
        {"id": "username_final_url", "pass": in_url, "signal": "username_in_final_url" if in_url else "username_not_in_final_url"},
        {"id": "username_body", "pass": in_body, "signal": "username_token_in_body" if in_body else "username_token_not_observed"},
        {"id": "canonical_match", "pass": canonical_match, "signal": "canonical_consistent" if canonical_match else "canonical_not_confirmed"},
        {"id": "soft_404", "pass": not soft_404, "signal": "soft_404_hint_detected" if soft_404 else "no_soft_404_hint"},
        {"id": "edge_protection", "pass": not edge_protected, "signal": "edge_protection_detected" if edge_protected else "no_edge_protection_signal"},
    ]
    return EvidenceReport(
        checks=checks, passed=sum(1 for c in checks if c["pass"]), total=len(checks),
        signals=[c["signal"] for c in checks], soft_404=soft_404,
    )
