"""E-mail reconnaissance: syntax, provider heuristics, Gravatar existence and (optionally) MX records."""

from __future__ import annotations

import hashlib
import re

import httpx

DISPOSABLE = ("mailinator.com", "10minutemail.com", "tempmail.com", "guerrillamail.com", "trashmail.com", "sharklasers.com", "yopmail.com", "getairmail.com")
COMMON = ("gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "proton.me", "protonmail.com", "icloud.com")


def _mx(domain: str) -> list[str]:
    try:
        import dns.resolver  # type: ignore  # optional dependency: pip install dnspython
    except ImportError:
        return []
    try:
        return sorted(str(r.exchange).rstrip(".") for r in dns.resolver.resolve(domain, "MX"))
    except Exception:
        return []


async def recon_email(email: str, *, check_gravatar: bool = True, client: httpx.AsyncClient | None = None) -> dict:
    clean = email.strip().lower()
    if "@" not in clean:
        raise ValueError("A valid e-mail address is required")
    username, domain = clean.split("@", 1)
    digest = hashlib.md5(clean.encode()).hexdigest()  # noqa: S324 (Gravatar's required hash, not a security use)
    mx = _mx(domain)
    gravatar = False
    if check_gravatar:
        own = client or httpx.AsyncClient(timeout=5)
        try:
            gravatar = (await own.head(f"https://www.gravatar.com/avatar/{digest}?d=404&s=256")).status_code == 200
        except httpx.HTTPError:
            gravatar = False
        finally:
            if client is None:
                await own.aclose()
    footprint = []
    if any("google" in s for s in mx):
        footprint.append("Google Workspace / Gmail Infrastructure")
    if any("outlook" in s or "protection.outlook.com" in s for s in mx):
        footprint.append("Microsoft 365 / Exchange Online")
    if any("protonmail" in s or "proton.me" in s for s in mx):
        footprint.append("ProtonMail End-to-End Encrypted Service")
    if gravatar:
        footprint.append("Automattic / Gravatar Verified Profile")
    return {
        "email": clean, "username": username, "domain": domain,
        "is_valid_syntax": re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", clean) is not None,
        "is_disposable": any(d in domain for d in DISPOSABLE), "is_common_provider": domain in COMMON,
        "mx_records_found": bool(mx), "mx_servers": mx, "gravatar_exists": gravatar,
        "gravatar_avatar_url": f"https://www.gravatar.com/avatar/{digest}?d=404&s=256" if gravatar else None,
        "hash": digest, "associated_footprint": footprint,
    }
