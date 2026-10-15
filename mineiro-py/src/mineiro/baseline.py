"""Differential baseline: compare a target page with a control page for a username that cannot exist.

A site that answers 200 with a "profile not found" shell is indistinguishable from the control, which removes
most soft-404 false positives without per-site rules.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import quote, unquote, urlsplit


@dataclass
class PageFingerprint:
    status: int
    final_host: str
    final_path_shape: str  # path with the probed handle replaced by ':u'
    length: int
    title: str
    tag_bigrams: list[int] = field(default_factory=list)  # sorted unique hashes of consecutive tag pairs
    text_hash: int = 0


@dataclass
class BaselineVerdict:
    relation: str  # 'same' | 'different' | 'unknown'
    similarity: float
    signals: list[str]


def fnv1a(text: str) -> int:
    """32-bit FNV-1a over UTF-16 code units (identical to the original JavaScript implementation)."""
    h = 0x811C9DC5
    data = text.encode("utf-16-le")
    for i in range(0, len(data), 2):
        h ^= data[i] | (data[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def _strip_handle(text: str, handles: list[str]) -> str:
    out = text.lower()
    for handle in handles:
        h = handle.strip().lower()
        if h:
            out = out.replace(h, "\x00").replace(quote(h, safe="!'()*-._~"), "\x00")
    return out


_TITLE = re.compile(r"<title[^>]*>([\s\S]*?)</title>", re.I)
_TAGS = re.compile(r"</?[a-z][a-z0-9-]*", re.I)
_NOISE = re.compile(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<[^>]+>", re.I)
_WS = re.compile(r"\s+")


def fingerprint_page(*, status: int, final_url: str, body: str, handle: str) -> PageFingerprint:
    final_host = path_shape = ""
    try:
        parts = urlsplit(final_url)
        final_host = parts.hostname or ""
        path_shape = _strip_handle(unquote(parts.path), [handle]).replace("\x00", ":u")
    except ValueError:
        pass

    m = _TITLE.search(body)
    title = _WS.sub(" ", _strip_handle(m.group(1) if m else "", [handle])).strip()

    tags = [t.lower() for t in _TAGS.findall(body)[:600]]
    bigrams = sorted({fnv1a(f"{tags[i]}>{tags[i + 1]}") for i in range(len(tags) - 1)})

    text = _WS.sub(" ", _strip_handle(_NOISE.sub(" ", body), [handle])).strip()[:4000]
    return PageFingerprint(
        status=status, final_host=final_host, final_path_shape=path_shape, length=len(body),
        title=title, tag_bigrams=bigrams, text_hash=fnv1a(text),
    )


def _jaccard(a: list[int], b: list[int]) -> float:
    if not a and not b:
        return 1.0
    set_b = set(b)
    inter = sum(1 for v in a if v in set_b)
    union = len(a) + len(b) - inter
    return inter / union if union else 1.0


def _control_usable(control: PageFingerprint) -> bool:
    """Blocked or errored control probes say nothing about the site's 'absent' template."""
    return control.status not in (0, 401, 403, 407, 408, 429, 500, 502, 503, 504)


def compare_to_baseline(target: PageFingerprint, control: PageFingerprint | None) -> BaselineVerdict:
    if control is None or not _control_usable(control):
        return BaselineVerdict("unknown", 0, ["baseline_unavailable"])

    if target.status != control.status:
        return BaselineVerdict("different", 0, [f"baseline_status_differs:{target.status}_vs_{control.status}"])

    if target.final_host != control.final_host or target.final_path_shape != control.final_path_shape:
        return BaselineVerdict("different", 0.2, ["baseline_redirect_shape_differs"])

    structural = _jaccard(target.tag_bigrams, control.tag_bigrams)
    length_ratio = min(target.length, control.length) / max(1, max(target.length, control.length))
    same_title = target.title == control.title
    same_text = target.text_hash == control.text_hash

    similarity = round(
        (structural * 0.5 + length_ratio * 0.2 + (0.15 if same_title else 0) + (0.15 if same_text else 0)) * 100
    ) / 100

    if same_text or (same_title and structural >= 0.85) or (structural >= 0.93 and length_ratio >= 0.9):
        return BaselineVerdict("same", similarity, ["baseline_identical_to_absent_profile"])
    return BaselineVerdict("different", similarity, ["baseline_distinct_from_absent_profile"])
