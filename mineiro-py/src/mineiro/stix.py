"""STIX 2.1 export of observed accounts. Interoperable with MISP/OpenCTI; identity claims are never asserted."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from .scan import ScanResult


def stix_id(kind: str, seed: str) -> str:
    """Deterministic UUIDv5-like ids so re-exports are stable and diffable."""
    h = hashlib.sha1(f"mineiro:{kind}:{seed}".encode()).hexdigest()
    variant = format((int(h[16:18], 16) & 0x3F) | 0x80, "x")
    return f"{kind}--{h[:8]}-{h[8:12]}-5{h[13:16]}-{variant}{h[18:20]}-{h[20:32]}"


def build_stix_bundle(target: str, results: list[ScanResult], created_at: str | None = None) -> dict:
    created = created_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    identity = stix_id("identity", "mineiro-osint-workbench")
    objects: list[dict] = [{
        "type": "identity", "spec_version": "2.1", "id": identity, "created": created, "modified": created,
        "name": "Mineiro OSINT Workbench", "identity_class": "system",
    }]
    for r in (r for r in results if r.status == "found"):
        account = stix_id("user-account", f"{r.platform_id}:{target.lower()}")
        url = stix_id("url", r.url)
        objects += [
            {"type": "user-account", "spec_version": "2.1", "id": account, "account_login": target,
             "account_type": r.platform_id, "display_name": r.platform_name},
            {"type": "url", "spec_version": "2.1", "id": url, "value": r.url},
            {"type": "observed-data", "spec_version": "2.1",
             "id": stix_id("observed-data", f"{r.platform_id}:{target}:{r.collected_at}"),
             "created": r.collected_at, "modified": r.collected_at, "created_by_ref": identity,
             "first_observed": r.collected_at, "last_observed": r.collected_at, "number_observed": 1,
             "object_refs": [account, url], "confidence": max(0, min(100, round(r.confidence_score))),
             "x_mineiro_evidence_hash": r.evidence_hash, "x_mineiro_detector_version": r.detector_version,
             "x_mineiro_note": f'Public account presence for "{target}" on {r.platform_name}. Presence is not proof of identity.'},
        ]
    return {"type": "bundle", "id": stix_id("bundle", f"{target}:{created}"), "objects": objects}
