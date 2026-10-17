"""Guarded HTTP fetching: every hop is validated and DNS is pinned to a vetted public address."""

from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
import ssl
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

import httpx

from .netguard import BlockedTargetError, assert_probeable_url, is_blocked_address

BODY_PREVIEW_BYTES = 192 * 1024
TEXT_TYPES = ("text", "html", "json", "xml")


@dataclass
class FetchResult:
    status: int
    final_url: str
    headers: dict[str, str]
    body: str = ""
    redirects: list[str] = field(default_factory=list)

    @property
    def edge_protected(self) -> bool:
        server = self.headers.get("server", "").lower()
        return bool(self.headers.get("cf-ray")) or "cloudflare" in server


class GuardedFetcher:
    """HTTP client that refuses private/loopback/metadata targets, including after redirects and DNS rebinding.

    `allow_private=True` exists for tests against a local server only; it is never exposed by the CLI.
    Behind an HTTP(S) proxy (`MINEIRO_USE_ENV_PROXY=1`) addresses are checked but cannot be pinned.
    """

    def __init__(self, *, allow_private: bool = False, use_env_proxy: bool | None = None,
                 max_redirects: int = 5, transport: httpx.AsyncBaseTransport | None = None) -> None:
        if use_env_proxy is None:
            use_env_proxy = os.environ.get("MINEIRO_USE_ENV_PROXY") == "1"
        self.allow_private = allow_private
        self.pin = not use_env_proxy and transport is None
        self.max_redirects = max_redirects
        # Honor a custom CA bundle (corporate or sandbox TLS inspection) without turning verification off.
        cafile = os.environ.get("MINEIRO_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
        self._client = httpx.AsyncClient(
            follow_redirects=False, trust_env=use_env_proxy, transport=transport,
            verify=ssl.create_default_context(cafile=cafile) if cafile else True,
            limits=httpx.Limits(max_connections=32, max_keepalive_connections=16),
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _resolve(self, host: str) -> list[str]:
        try:
            ipaddress.ip_address(host)
            addresses = [host]
        except ValueError:
            loop = asyncio.get_running_loop()
            try:
                infos = await loop.getaddrinfo(host, None, type=socket.SOCK_STREAM)
            except socket.gaierror as exc:
                raise httpx.ConnectError(f"DNS lookup failed for {host}") from exc
            addresses = list(dict.fromkeys(info[4][0] for info in infos))
        if not self.allow_private and (not addresses or any(is_blocked_address(a) for a in addresses)):
            raise BlockedTargetError(f"Blocked non-public address for {host}")
        return addresses

    async def fetch(self, url: str, *, method: str = "GET", headers: dict[str, str] | None = None,
                    timeout: float = 6.5, read_body: bool = False) -> FetchResult:
        current = url
        redirects: list[str] = []
        for _hop in range(self.max_redirects + 1):
            if not self.allow_private:
                assert_probeable_url(current)
            parts = urlsplit(current)
            host = parts.hostname or ""
            addresses = await self._resolve(host)

            request_url, request_headers, extensions = current, dict(headers or {}), {}
            if self.pin and addresses:
                ip = addresses[0]
                literal = f"[{ip}]" if ":" in ip else ip
                netloc = literal + (f":{parts.port}" if parts.port else "")
                request_url = parts._replace(netloc=netloc).geturl()
                request_headers["Host"] = parts.netloc
                if parts.scheme == "https":
                    extensions["sni_hostname"] = host

            request = self._client.build_request(method, request_url, headers=request_headers,
                                                 timeout=timeout, extensions=extensions)
            response = await self._client.send(request, stream=True)
            try:
                location = response.headers.get("location")
                if 300 <= response.status_code < 400 and location:
                    nxt = urljoin(current, location)
                    if not self.allow_private:
                        assert_probeable_url(nxt)
                    current = nxt
                    redirects.append(current)
                    continue
                body = ""
                ctype = response.headers.get("content-type", "").lower()
                if read_body and any(t in ctype for t in TEXT_TYPES):
                    chunks, total = [], 0
                    async for chunk in response.aiter_bytes():
                        chunks.append(chunk[: BODY_PREVIEW_BYTES - total])
                        total += len(chunks[-1])
                        if total >= BODY_PREVIEW_BYTES:
                            break
                    body = b"".join(chunks).decode("utf-8", errors="replace")
                return FetchResult(
                    status=response.status_code, final_url=current,
                    headers={k.lower(): v for k, v in response.headers.items()}, body=body, redirects=redirects,
                )
            finally:
                await response.aclose()
        raise BlockedTargetError("Too many redirects")
