"""Declarative detectors: data (JSON) describing how to read a response, instead of per-site code."""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlsplit

MATCHER_TYPES = ("status", "body_contains", "body_regex", "final_path_regex")


@dataclass
class DeclarativeDetector:
    id: str
    present: list[dict]
    absent: list[dict]
    last_verified: str
    source: str
    canary: dict | None = None

    @classmethod
    def from_dict(cls, data: dict) -> "DeclarativeDetector":
        return cls(
            id=data["id"], present=data.get("present", []), absent=data.get("absent", []),
            last_verified=data.get("lastVerified", ""), source=data.get("source", ""), canary=data.get("canary"),
        )

    def to_dict(self) -> dict:
        return {"id": self.id, "present": self.present, "absent": self.absent,
                "lastVerified": self.last_verified, "source": self.source, "canary": self.canary}


def _flags(matcher: dict) -> int:
    return re.IGNORECASE if "i" in matcher.get("flags", "i") else 0


def _matches(matcher: dict, status: int, final_url: str, body: str) -> bool:
    kind = matcher.get("type")
    if kind == "status":
        return status in matcher["codes"]
    if kind == "body_contains":
        lower = body.lower()
        return any(v.lower() in lower for v in matcher["values"])
    if kind == "body_regex":
        return re.search(matcher["pattern"], body, _flags(matcher)) is not None
    if kind == "final_path_regex":
        try:
            return re.search(matcher["pattern"], urlsplit(final_url).path, re.IGNORECASE) is not None
        except ValueError:
            return False
    return False


def evaluate_matchers(rule: DeclarativeDetector, status: int, final_url: str, body: str) -> dict:
    """Returns {'verdict': 'present'|'absent'|'inconclusive', 'signals': [...]}. Absent matchers win."""
    for matcher in rule.absent:
        if _matches(matcher, status, final_url, body):
            return {"verdict": "absent", "signals": [f"rule_absent:{matcher['type']}"]}
    if rule.present and all(_matches(m, status, final_url, body) for m in rule.present):
        return {"verdict": "present", "signals": [f"rule_present:{m['type']}" for m in rule.present]}
    return {"verdict": "inconclusive", "signals": ["rule_inconclusive"]}


def validate_declarative_detector(value: dict) -> list[str]:
    errors: list[str] = []
    label = value.get("id") or "(no id)"
    if not value.get("id"):
        errors.append(f"{label}: id required")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value.get("lastVerified") or ""):
        errors.append(f"{label}: lastVerified must be YYYY-MM-DD")
    if not value.get("source"):
        errors.append(f"{label}: source required (provenance)")
    for key in ("present", "absent"):
        items = value.get(key)
        if not isinstance(items, list):
            errors.append(f"{label}: {key} must be a list")
            continue
        for matcher in items:
            kind = matcher.get("type")
            if kind not in MATCHER_TYPES:
                errors.append(f"{label}: unknown matcher type {kind}")
            elif kind == "status" and not isinstance(matcher.get("codes"), list):
                errors.append(f"{label}: status matcher needs codes[]")
            elif kind == "body_contains" and not isinstance(matcher.get("values"), list):
                errors.append(f"{label}: body_contains needs values[]")
            elif kind in ("body_regex", "final_path_regex"):
                try:
                    re.compile(matcher.get("pattern", ""))
                except re.error:
                    errors.append(f"{label}: invalid regex {matcher.get('pattern')}")
    if isinstance(value.get("present"), list) and isinstance(value.get("absent"), list) \
            and not value["present"] and not value["absent"]:
        errors.append(f"{label}: needs at least one matcher")
    return errors
