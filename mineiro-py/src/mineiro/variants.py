"""Username permutations with a similarity score, for candidate generation (never for identity claims)."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class UsernameVariant:
    value: str
    kind: str  # separator | leet | suffix | prefix | translit | case | reverse-digits
    similarity: int  # Jaro-Winkler vs the original, 0-100


def jaro_winkler(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    rng = max(0, max(len(a), len(b)) // 2 - 1)
    a_match, b_match = [False] * len(a), [False] * len(b)
    matches = 0
    for i, ca in enumerate(a):
        for j in range(max(0, i - rng), min(len(b) - 1, i + rng) + 1):
            if not b_match[j] and ca == b[j]:
                a_match[i] = b_match[j] = True
                matches += 1
                break
    if not matches:
        return 0.0
    transpositions, k = 0, 0
    for i, ca in enumerate(a):
        if not a_match[i]:
            continue
        while not b_match[k]:
            k += 1
        if ca != b[k]:
            transpositions += 1
        k += 1
    m = matches
    jaro = (m / len(a) + m / len(b) + (m - transpositions / 2) / m) / 3
    prefix = 0
    while prefix < min(4, len(a), len(b)) and a[prefix] == b[prefix]:
        prefix += 1
    return jaro + prefix * 0.1 * (1 - jaro)


_LEET = {"a": "4", "e": "3", "i": "1", "o": "0", "s": "5", "t": "7"}
_SEPARATORS = ("_", ".", "-", "")
_SUFFIXES = ("1", "01", "123", "_", "_dev", "_oficial", "official", "br", "_br", "2024", "2025", "2026")
_PREFIXES = ("the", "real", "its", "oficial", "ig_")
_VALID = re.compile(r"^[\w.-]{2,40}$", re.UNICODE)


def _strip_accents(value: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", value) if not unicodedata.combining(c))


def generate_username_variants(handle: str, limit: int = 40) -> list[UsernameVariant]:
    base = handle.strip().lstrip("@")
    if not 2 <= len(base) <= 40:
        return []

    found: dict[str, str] = {}

    def add(value: str, kind: str) -> None:
        v = value.strip()
        if v and v != base and _VALID.match(v) and v not in found:
            found[v] = kind

    lower = base.lower()
    add(lower, "case")
    add(_strip_accents(base), "translit")

    parts = [p for p in re.split(r"[._-]+", lower) if p]
    if len(parts) > 1:
        for sep in _SEPARATORS:
            add(sep.join(parts), "separator")
    else:
        spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", base)
        spaced = re.sub(r"([a-zA-Z])(\d)", r"\1 \2", spaced).lower().split(" ")
        if len(spaced) > 1:
            for sep in _SEPARATORS:
                add(sep.join(spaced), "separator")

    for suffix in _SUFFIXES:
        add(lower + suffix, "suffix")
    for prefix in _PREFIXES:
        add(prefix + lower, "prefix")

    add("".join(_LEET.get(ch, ch) for ch in lower), "leet")
    for i, ch in enumerate(lower):
        if ch in _LEET:
            add(lower[:i] + _LEET[ch] + lower[i + 1:], "leet")

    trailing = re.match(r"^(.*?)(\d+)$", lower)
    if trailing and trailing.group(1):
        add(trailing.group(1), "reverse-digits")

    variants = [UsernameVariant(v, k, round(jaro_winkler(lower, v.lower()) * 100)) for v, k in found.items()]
    variants.sort(key=lambda x: (-x.similarity, x.value))
    return variants[:limit]
