"""Network-safety helpers: SSRF guard, detector URL building and pattern matching."""

from __future__ import annotations

import ipaddress
import re
import secrets
from urllib.parse import quote, urlsplit

PLACEHOLDER = re.compile(r"\{(username|email)\}")
ALLOWED_PORTS = {None, 80, 443}


class BlockedTargetError(Exception):
    """Raised when a URL or address must not be probed."""


def is_blocked_address(address: str) -> bool:
    """True when an IP literal is not safe to probe (private, loopback, link-local, metadata, ...)."""
    text = address.strip().strip("[]").lower()
    try:
        ip = ipaddress.ip_address(text)
    except ValueError:
        return True  # not a recognizable IP literal: treat as unsafe
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped is not None:
            return is_blocked_address(str(ip.ipv4_mapped))
        if text.startswith("64:ff9b:") or text.startswith("2001:db8"):
            return True
        return (
            ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
            or ip.is_reserved or ip.is_unspecified or ip.is_site_local
        )
    cgnat = ipaddress.ip_network("100.64.0.0/10")
    return bool(
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast
        or ip.is_reserved or ip.is_unspecified or ip in cgnat
        or ip in ipaddress.ip_network("198.18.0.0/15")
        or ip in ipaddress.ip_network("192.0.0.0/24")
    )


def build_detector_url(url_pattern: str, target: str) -> str:
    """Builds the probe URL for a detector. The target is always percent-encoded."""
    if not target or not target.strip():
        raise BlockedTargetError("Empty target")
    encoded = quote(target.strip(), safe="")
    return PLACEHOLDER.sub(lambda _m: encoded, url_pattern)


def matches_detector_pattern(url: str, url_pattern: str) -> bool:
    """True when `url` is exactly what `url_pattern` can produce.

    Placeholders in the host may not contain `/ ? # @`, so a crafted username cannot redirect the probe elsewhere.
    """
    scheme_end = url_pattern.index("://") + 3
    host_end = url_pattern.find("/", scheme_end)
    host_part = url_pattern[scheme_end:] if host_end == -1 else url_pattern[scheme_end:host_end]
    rest = "" if host_end == -1 else url_pattern[host_end:]

    def to_regex(segment: str, host_segment: bool) -> str:
        parts = PLACEHOLDER.split(segment)  # [text, name, text, name, ...]
        out = []
        for index, piece in enumerate(parts):
            if index % 2 == 1:
                out.append(r"[^/?#@\s]+" if host_segment else r"[^\s]*")
            else:
                out.append(re.escape(piece))
        return "".join(out)

    source = "^" + re.escape(url_pattern[:scheme_end]) + to_regex(host_part, True) + to_regex(rest, False) + "$"
    return re.match(source, url, re.IGNORECASE) is not None


def random_control_username(length: int = 18) -> str:
    """A handle that is overwhelmingly unlikely to exist, for baseline (control) probes."""
    alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    return "zq" + "".join(secrets.choice(alphabet) for _ in range(length))


def assert_probeable_url(raw: str) -> str:
    """Validates scheme, credentials, port and host. Returns the normalized URL."""
    try:
        parts = urlsplit(raw)
        port = parts.port
    except ValueError as exc:
        raise BlockedTargetError("Invalid URL") from exc
    if parts.scheme not in ("http", "https"):
        raise BlockedTargetError("Only http(s) is allowed")
    if parts.username or parts.password:
        raise BlockedTargetError("Credentials in URL are not allowed")
    if port not in ALLOWED_PORTS:
        raise BlockedTargetError("Port not allowed")
    host = (parts.hostname or "").lower()
    if not host:
        raise BlockedTargetError("Invalid URL")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        if host == "localhost" or host.endswith(".localhost") or host.endswith(".internal"):
            raise BlockedTargetError("Internal hostname") from None
    else:
        if is_blocked_address(host):
            raise BlockedTargetError("Non-public address literal")
    return raw
