"""Detector registry: 985 cataloged detectors (984 scannable) with provenance and reliability metadata."""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass, field
from functools import lru_cache
from importlib import resources
from typing import Iterable

from .matchers import DeclarativeDetector, validate_declarative_detector


@dataclass(frozen=True)
class Detector:
    id: str
    name: str
    category: str
    site_type: str
    url_pattern: str
    check_method: str
    target_type: str
    expected_status: int
    error_status: int
    reliability: int
    tier: str
    provenance: str
    license: str
    last_verified: str | None
    scannable: bool

    def url_for(self, target: str) -> str:
        from .netguard import build_detector_url

        return build_detector_url(self.url_pattern, target)


def _breakdown(values: Iterable[str]) -> list[dict]:
    values = list(values)
    counts = Counter(values)
    total = max(1, len(values))
    items = [{"key": k, "count": c, "percent": round(c / total * 1000) / 10} for k, c in counts.items()]
    return sorted(items, key=lambda i: (-i["count"], i["key"]))


@dataclass
class Registry:
    detectors: list[Detector]
    evidence_checks: list[str]
    top20: list[str]
    top50: list[str]
    declarative: dict[str, DeclarativeDetector] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self._by_id = {d.id: d for d in self.detectors}

    def __len__(self) -> int:
        return len(self.detectors)

    def get(self, detector_id: str) -> Detector | None:
        return self._by_id.get(detector_id)

    def scope(self, scope: str = "top20", category: str = "all", target_type: str = "username") -> list[Detector]:
        """Detectors for a scan scope. Email targets only probe detectors that support e-mail checks."""
        if scope == "none":
            return []
        pool = [d for d in self.detectors if d.scannable]
        if target_type == "email":
            pool = [d for d in pool if d.target_type in ("email", "both")]
        else:
            pool = [d for d in pool if d.target_type in ("username", "both")]
        if scope == "top20":
            keep = set(self.top20)
            pool = [d for d in pool if d.id in keep]
        elif scope == "top50":
            keep = set(self.top50)
            pool = [d for d in pool if d.id in keep]
        if category != "all":
            pool = [d for d in pool if d.category == category]
        return pool

    def stats(self) -> dict:
        total = len(self.detectors)
        checks = len(self.evidence_checks)
        return {
            "totalDetectors": total,
            "logicalEvidenceChecks": total * checks,
            "evidenceChecksPerDetector": checks,
            "byCategory": _breakdown(d.category for d in self.detectors),
            "bySiteType": _breakdown(d.site_type for d in self.detectors),
            "byReliabilityTier": _breakdown(d.tier for d in self.detectors),
            "byProvenance": _breakdown(d.provenance for d in self.detectors),
            "averageReliability": round(sum(d.reliability for d in self.detectors) / total) if total else 0,
            "verifiedDetectors": sum(d.provenance == "verified" for d in self.detectors),
            "auditRequiredDetectors": sum(d.provenance == "legacy-audit-required" for d in self.detectors),
            "scannableDetectors": sum(d.scannable for d in self.detectors),
            "registryOnlyDetectors": sum(not d.scannable for d in self.detectors),
        }

    def validate(self) -> list[str]:
        """Structural checks used by the CLI and CI. Returns a list of problems."""
        from .netguard import PLACEHOLDER

        problems: list[str] = []
        seen: set[str] = set()
        for d in self.detectors:
            if d.id in seen:
                problems.append(f"{d.id}: duplicate id")
            seen.add(d.id)
            if d.scannable and not d.url_pattern.startswith(("http://", "https://")):
                problems.append(f"{d.id}: url_pattern must be http(s)")
            if d.scannable and not PLACEHOLDER.search(d.url_pattern):
                problems.append(f"{d.id}: url_pattern needs a {{username}} or {{email}} placeholder")
            if not 0 <= d.reliability <= 100:
                problems.append(f"{d.id}: reliability out of range")
        for det_id, rule in self.declarative.items():
            if det_id not in self._by_id:
                problems.append(f"declarative {det_id}: unknown detector id")
            problems.extend(validate_declarative_detector(rule.to_dict()))
        return problems


def _read(name: str) -> dict:
    with resources.files("mineiro.data").joinpath(name).open("r", encoding="utf-8") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def load_registry() -> Registry:
    raw = _read("registry.json")
    detectors = [Detector(**item) for item in raw["detectors"]]
    declarative = {}
    for item in _read("declarative.json").get("detectors", []):
        rule = DeclarativeDetector.from_dict(item)
        declarative[rule.id] = rule
    return Registry(
        detectors=detectors,
        evidence_checks=raw["evidence_checks"],
        top20=raw["top20"],
        top50=raw["top50"],
        declarative=declarative,
    )
