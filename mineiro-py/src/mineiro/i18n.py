"""Localized analysis text (en / pt / es) used by the assessment and the reports."""

from __future__ import annotations

import json
from functools import lru_cache
from importlib import resources

LANGUAGES = ("en", "pt", "es")

REQUIREMENTS = (
    "username_presence", "account_correlation", "digital_footprint",
    "developer_footprint", "threat_research_alias", "brand_impersonation",
)


@lru_cache(maxsize=1)
def _messages() -> dict:
    with resources.files("mineiro.data").joinpath("analysis_messages.json").open("r", encoding="utf-8") as h:
        return json.load(h)


def analysis_text(lang: str, key: str, **params) -> str:
    table = _messages().get(lang) or _messages()["en"]
    text = table.get(key) or _messages()["en"].get(key, key)
    return text.format(**params) if params else text


def requirement_label(lang: str, requirement: str) -> str:
    return analysis_text(lang, f"req_{requirement}")
