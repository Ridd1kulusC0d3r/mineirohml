import asyncio

import pytest
from starlette.testclient import TestClient

from mineiro.scan import ScanResult
from mineiro.web import Settings, create_app


class FakeScanner:
    """Stands in for the network: one hit, one miss, no sockets."""

    def __init__(self, delay=0.0):
        self.delay = delay

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return None

    async def scan(self, target, on_result=None, **kw):
        await asyncio.sleep(self.delay)
        base = dict(platform_id="x", category="social", status_code=200, response_time_ms=1)
        results = [ScanResult(platform_name="Alpha", url=f"https://alpha.test/{target}", status="found", confidence_score=90, **base),
                   ScanResult(platform_name="Beta", url=f"https://beta.test/{target}", status="not_found", confidence_score=0, **base)]
        for i, r in enumerate(results, 1):
            if on_result:
                on_result(r, i, len(results))
        return results


def make(**kw):
    s = Settings(**kw)
    return TestClient(create_app(s, scanner_factory=lambda preset: FakeScanner()))


def wait_done(c, jid, headers=None):
    for _ in range(50):
        d = c.get(f"/api/scans/{jid}", headers=headers).json()
        if d["status"] != "running":
            return d
        import time
        time.sleep(0.05)
    raise AssertionError("job did not finish")


def test_page_headers_and_health():
    c = make()
    r = c.get("/")
    assert r.status_code == 200 and "Mineiro" in r.text
    assert "script-src 'self'" in r.headers["content-security-policy"] and r.headers["x-frame-options"] == "DENY"
    assert "<script>" not in r.text  # no inline scripts: CSP stays strict
    assert c.get("/healthz").json()["status"] == "ok"
    assert c.get("/static/app.js").status_code == 200


def test_config_hides_full_preset_when_public():
    assert "full" not in make().get("/api/config").json()["presets"]
    assert "full" in make(allow_full=True).get("/api/config").json()["presets"]


def test_full_scan_flow_and_reports():
    c = make()
    r = c.post("/api/scans", json={"target": "@Maria_Silva", "preset": "quick"})
    assert r.status_code == 202
    d = wait_done(c, r.json()["id"])
    assert d["status"] == "done" and d["target"] == "Maria_Silva" and len(d["found"]) == 1
    assert d["summary"]["collection"]["found"] == 1
    for fmt in ("html", "json", "markdown", "csv", "stix", "cypher"):
        rep = c.get(f"/api/scans/{r.json()['id']}/report?format={fmt}")
        assert rep.status_code == 200 and "attachment" in rep.headers["content-disposition"]
        assert "sandbox" in rep.headers["content-security-policy"] and len(rep.headers["x-payload-sha256"]) == 64
    assert c.get(f"/api/scans/{r.json()['id']}/report?format=exe").status_code == 422
    assert c.delete(f"/api/scans/{r.json()['id']}").status_code == 204
    assert c.get(f"/api/scans/{r.json()['id']}").status_code == 404


@pytest.mark.parametrize("body", [{"target": ""}, {"target": " "}, {"target": "a"}, {"target": "x" * 65}, {"target": "a/b"},
                                  {"target": "a\r\nHost: x"}, {"target": 5}, {}, {"target": "ok_user", "preset": "full"},
                                  {"target": "ok_user", "preset": "nope"}])
def test_bad_input_rejected(body):
    assert make().post("/api/scans", json=body).status_code == 422


def test_malformed_and_oversized_bodies():
    c = make()
    assert c.post("/api/scans", content=b"not json", headers={"content-type": "application/json"}).status_code == 400
    assert c.post("/api/scans", json=["x"]).status_code == 400
    assert c.post("/api/scans", json={"target": "ok_user", "pad": "x" * 5000}).status_code == 413


def test_rate_limit_per_hour():
    c = make(rate_per_hour=2, per_ip_jobs=5)
    ids = [c.post("/api/scans", json={"target": "ok_user"}) for _ in range(3)]
    assert [r.status_code for r in ids] == [202, 202, 429] and "retry-after" in ids[2].headers


def test_per_ip_and_global_concurrency():
    app = create_app(Settings(per_ip_jobs=1, max_jobs=1), scanner_factory=lambda p: FakeScanner(delay=0.5))
    c = TestClient(app)
    assert c.post("/api/scans", json={"target": "ok_user"}).status_code == 202
    assert c.post("/api/scans", json={"target": "ok_user2"}).status_code == 429
    app.state.core.s.per_ip_jobs = 5
    assert c.post("/api/scans", json={"target": "ok_user3"}).status_code == 503


def test_jobs_are_private_to_their_owner():
    app = create_app(Settings(trust_hops=1), scanner_factory=lambda p: FakeScanner())
    c = TestClient(app)
    jid = c.post("/api/scans", json={"target": "ok_user"}, headers={"x-forwarded-for": "1.1.1.1"}).json()["id"]
    assert c.get(f"/api/scans/{jid}", headers={"x-forwarded-for": "2.2.2.2"}).status_code == 404
    assert c.get(f"/api/scans/{jid}", headers={"x-forwarded-for": "1.1.1.1"}).status_code == 200
    # a spoofed leading hop must not change the identity (we trust only the last hop)
    assert c.get(f"/api/scans/{jid}", headers={"x-forwarded-for": "9.9.9.9, 1.1.1.1"}).status_code == 200


def test_access_token():
    c = make(access_token="s3cret")
    assert c.post("/api/scans", json={"target": "ok_user"}).status_code == 401
    assert c.post("/api/scans", json={"target": "ok_user"}, headers={"x-access-token": "wrong"}).status_code == 401
    assert c.post("/api/scans", json={"target": "ok_user"}, headers={"x-access-token": "s3cret"}).status_code == 202


def test_scanner_crash_does_not_leak_details():
    class Boom(FakeScanner):
        async def scan(self, *a, **k):
            raise RuntimeError("/secret/path/db password=hunter2")
    c = TestClient(create_app(Settings(), scanner_factory=lambda p: Boom()))
    d = wait_done(c, c.post("/api/scans", json={"target": "ok_user"}).json()["id"])
    assert d["status"] == "error" and "hunter2" not in str(d)


def test_finished_jobs_expire():
    app = create_app(Settings(job_ttl=0), scanner_factory=lambda p: FakeScanner())
    c = TestClient(app)
    jid = c.post("/api/scans", json={"target": "ok_user"}).json()["id"]
    wait_done(c, jid)
    import time
    time.sleep(0.01)
    app.state.core.sweep()
    assert c.get(f"/api/scans/{jid}").status_code == 404
