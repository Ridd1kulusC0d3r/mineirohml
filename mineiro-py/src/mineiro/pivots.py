"""Extract follow-up leads (pivots) from public profile text and plan them within a request budget."""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlsplit

GENERIC_DOMAINS = {
    "github.com", "twitter.com", "x.com", "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "youtu.be",
    "google.com", "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "w3.org", "schema.org", "gravatar.com",
    "wikipedia.org", "reddit.com", "tiktok.com", "t.me", "discord.gg", "bit.ly",
}

_EMAIL = re.compile(r"[a-z0-9._%+-]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}", re.I)
_URL = re.compile(r"https?://[^\s\"'<>)]{4,300}", re.I)
_HANDLE = re.compile(r"(?<![\w@.])@([a-z0-9_.]{3,30})\b", re.I)
_RANK = {"email": 0, "handle": 1, "domain": 2, "url": 3}


@dataclass(frozen=True)
class Pivot:
    type: str  # email | domain | handle | url
    value: str
    origin: str
    depth: int = 1

    @property
    def key(self) -> str:
        return f"{self.type}:{self.value}"


def _host(url: str) -> str | None:
    try:
        host = urlsplit(url).hostname
    except ValueError:
        return None
    return host.removeprefix("www.").lower() if host else None


def extract_pivots(text: str, origin: str, depth: int = 1) -> list[Pivot]:
    out: dict[str, Pivot] = {}

    def add(kind: str, value: str) -> None:
        pivot = Pivot(kind, value, origin, depth)
        out.setdefault(pivot.key, pivot)

    for m in _EMAIL.finditer(text):
        add("email", m.group(0).lower())
    for m in _URL.finditer(text):
        url = m.group(0).rstrip(".,;")
        host = _host(url)
        if not host:
            continue
        add("url" if host in GENERIC_DOMAINS else "domain", url if host in GENERIC_DOMAINS else host)
    for m in _HANDLE.finditer(text):
        handle = m.group(1)
        if "." not in handle or not re.search(r"\.(com|org|net|io)$", handle):
            add("handle", handle.lower())
    return list(out.values())


def plan_pivots(candidates: list[Pivot], *, max_depth: int, budget: int, seen: set[str] | None = None) -> dict:
    """Keeps pivots within depth and request budget; already-seen values are never re-queued."""
    seen = set() if seen is None else seen
    accepted: list[Pivot] = []
    skipped: list[dict] = []
    for pivot in sorted(candidates, key=lambda p: (p.depth, _RANK[p.type])):
        if pivot.key in seen:
            skipped.append({**pivot.__dict__, "reason": "seen"})
        elif pivot.depth > max_depth:
            skipped.append({**pivot.__dict__, "reason": "depth"})
        elif len(accepted) >= budget:
            skipped.append({**pivot.__dict__, "reason": "budget"})
        else:
            seen.add(pivot.key)
            accepted.append(pivot)
    return {"accepted": accepted, "skipped": skipped}
