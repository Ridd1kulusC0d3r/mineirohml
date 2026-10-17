"""Input validation for investigation targets. Everything that reaches a URL goes through here first."""

from __future__ import annotations

import re
import unicodedata

MAX_USERNAME_LENGTH = 64
_USERNAME = re.compile(r"^[\w.\-]{2,%d}$" % MAX_USERNAME_LENGTH, re.UNICODE)


class InvalidTarget(ValueError):
    """The target is empty, too long or contains characters a public username cannot have."""


def normalize_username(raw: str) -> str:
    """NFKC-normalizes, strips a leading '@' and validates. Letters, digits, '.', '_' and '-' only (2-64 chars)."""
    if not isinstance(raw, str):
        raise InvalidTarget("Target must be text.")
    value = unicodedata.normalize("NFKC", raw).strip().lstrip("@")
    if not value:
        raise InvalidTarget("Informe um username.")
    if not _USERNAME.match(value):
        raise InvalidTarget("Username inválido: use de 2 a %d letras, números, '.', '_' ou '-'." % MAX_USERNAME_LENGTH)
    return value
