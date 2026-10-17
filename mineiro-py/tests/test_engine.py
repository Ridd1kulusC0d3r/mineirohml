import json

import pytest

from mineiro.assessment import build_assessment
from mineiro.cases import CaseStore, diff_collections
from mineiro.export import export_report, verify_manifest, write_report
from mineiro.fetch import GuardedFetcher
from mineiro.netguard import BlockedTargetError
from mineiro.graph import add_variant_candidates, graph_to_cypher, run_graph_query
from mineiro.registry import Detector, Registry
from mineiro.scan import Scanner, ScanResult
from mineiro.stix import build_stix_bundle
from mineiro.variants import generate_username_variants


def detector(site, did, pattern, reliability=80):
    return Detector(id=did, name=did.title(), category="developer", site_type="developer", url_pattern=site + pattern, check_method="status_code",
                    target_type="username", expected_status=200, error_status=404, reliability=reliability, tier="medium",
                    provenance="verified", license="test", last_verified="2026-10-02", scannable=True)


def registry_for(site):
    dets = [detector(site, "real", "/u/{username}"), detector(site, "soft", "/soft/{username}"),
            detector(site, "limited", "/limit/{username}"), detector(site, "redir", "/redir/{username}")]
    return Registry(detectors=dets, evidence_checks=["a"] * 8, top20=[], top50=[]), dets


async def test_scan_against_local_site(local_site):
    reg, dets = registry_for(local_site)
    async with Scanner(reg, preset="standard", fetcher=GuardedFetcher(allow_private=True), use_cache=False) as scanner:
        results = {r.platform_id: r for r in await scanner.scan("real", detectors=dets)}
    assert results["real"].status == "found" and results["real"].confidence_score >= 60
    assert results["real"].metadata["extractedLinks"] == ["https://example.org/me"]  # github.com is filtered as noise
    assert results["limited"].status in ("uncertain", "rate_limited")
    assert results["real"].evidence_hash and results["real"].evidence_checks_total == 8


async def test_soft_404_is_not_reported_as_found(local_site):
    reg, dets = registry_for(local_site)
    async with Scanner(reg, preset="standard", fetcher=GuardedFetcher(allow_private=True), use_cache=False) as scanner:
        result = await scanner.check(dets[1], "ghostuser")
    assert result.status == "not_found"  # 200 + "page not found" hint and identical to the control page


async def test_missing_user_is_not_found(local_site):
    reg, dets = registry_for(local_site)
    async with Scanner(reg, preset="quick", fetcher=GuardedFetcher(allow_private=True), use_cache=False) as scanner:
        r = await scanner.check(dets[0], "nobody-here")
    assert r.status == "not_found" and r.evidence_level == "absent"


async def test_ssrf_guard_blocks_loopback_targets(local_site):
    reg, dets = registry_for(local_site)
    async with Scanner(reg, preset="quick", fetcher=GuardedFetcher(), use_cache=False) as scanner:  # default guard
        direct = await scanner.check(dets[0], "real")
    assert direct.status == "error" and direct.error in ("Port not allowed", "Non-public address literal")


async def test_redirect_to_metadata_address_is_refused():
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"Location": "http://169.254.169.254/latest/meta-data/"})

    fetcher = GuardedFetcher(transport=httpx.MockTransport(handler))
    with pytest.raises(BlockedTargetError):
        await fetcher.fetch("http://93.184.216.34/start")  # public literal: first hop allowed, redirect must be re-validated
    await fetcher.aclose()


def sample_results():
    mk = lambda pid, status, conf=85, links=None, name=None: ScanResult(  # noqa: E731
        platform_id=pid, platform_name=pid.title(), category="developer" if pid != "mastodon" else "social", url=f"https://{pid}.test/ben",
        status=status, status_code=200, confidence_score=conf, detector_reliability=90, evidence_checks_passed=7, evidence_checks_total=8,
        evidence_signals=["a", "b", "c"], collected_at="2026-10-02T00:00:00+00:00",
        metadata={"extractedLinks": links or [], **({"displayName": name} if name else {})})
    return [mk("github", "found", links=["https://ben.dev/"], name="Ben A"), mk("gitlab", "found", links=["https://ben.dev/x"], name="Ben B"),
            mk("mastodon", "found", conf=60), mk("npm", "not_found"), mk("steam", "uncertain", conf=40)]


def test_assessment_structure_and_contradictions():
    a = build_assessment(sample_results(), "ben", lang="en")
    assert a["collection"]["found"] == 3 and a["collection"]["blocked_or_inconclusive"] == 1
    assert any("display names differ" in c for c in a["contradictory_evidence"])
    assert any(e["id"] == "E-github" and e["source_quality"] in "AB" for e in a["evidence"])
    assert [h["id"] for h in a["hypotheses"]] == ["H1", "H2", "H3"] and a["hypotheses"][-1]["alternative"]
    rels = {e["relationship"] for e in a["graph"]["edges"]}
    assert {"SAME_HANDLE", "OBSERVED_ON", "LINKS_TO", "HOSTED_ON", "SAME_DOMAIN"} <= rels
    assert all(n["provenance"] in ("PRIMARY", "DERIVED") for n in a["graph"]["nodes"])
    pt = build_assessment(sample_results(), "ben", lang="pt")
    assert pt["judgments"][0]["text"] != a["judgments"][0]["text"]


def test_graph_queries_and_cypher():
    a = build_assessment(sample_results(), "ben")
    g = add_variant_candidates(a["graph"], "ben", generate_username_variants("ben"))
    assert run_graph_query("MATCH type=PROFILE", g)["summary"].startswith("3 nodes")
    assert run_graph_query("SHARED type=DOMAIN", g)["matched_node_ids"] == ["domain:ben.dev"]
    path = run_graph_query("PATH from=TARGET to=PROFILE", g)
    assert "target" in path["matched_node_ids"] and "profile:github" in path["matched_node_ids"]
    assert run_graph_query("MATCH candidate=true AND similarity>=70", g)["matched_node_ids"]
    assert run_graph_query("BOGUS", g)["warnings"]
    cypher = graph_to_cypher(g)
    assert cypher.count("MERGE (n:MineiroNode") == len(g["nodes"]) and "SAME_HANDLE" in cypher


def test_stix_is_stable_and_only_found():
    results = sample_results()
    b1 = build_stix_bundle("ben", results, "2026-10-02T00:00:00Z")
    assert b1 == build_stix_bundle("ben", results, "2026-10-02T00:00:00Z")
    types = [o["type"] for o in b1["objects"]]
    assert types.count("observed-data") == 3 and types.count("user-account") == 3
    for o in b1["objects"]:
        assert "--" in o["id"] and len(o["id"].split("--")[1]) == 36


@pytest.mark.parametrize("fmt", ["html", "json", "markdown", "csv", "stix", "cypher"])
def test_exports_have_verifiable_manifests(tmp_path, fmt):
    results = sample_results()
    a = build_assessment(results, "ben")
    path, manifest = write_report(a, results, tmp_path, fmt)
    assert verify_manifest(path)
    path.write_text(path.read_text(encoding="utf-8") + "x", encoding="utf-8")
    assert not verify_manifest(path)
    meta = json.loads(manifest.read_text())
    assert meta["hash_scope"] == "payload-before-manifest" and meta["generated_locally"] is True


def test_html_report_escapes_content():
    results = sample_results()
    results[0].platform_name = "<script>alert(1)</script>"
    a = build_assessment(results, "<b>ben</b>")
    html, _ = export_report(a, results, "html")
    assert "<script>alert(1)</script>" not in html and "&lt;script&gt;" in html


def test_cases_and_diff(tmp_path):
    store = CaseStore(tmp_path / "c.sqlite")
    case = store.get_or_create_case("ben")
    assert store.get_or_create_case("BEN") == case
    before = sample_results()
    after = sample_results()
    after[3].status = "found"                       # npm: not_found -> found  (CHANGED)
    after[2].confidence_score = 85                  # mastodon confidence +25 (CONFIDENCE_UP)
    after.pop(1)                                    # gitlab missing from newer scope (DISAPPEARED)
    after.append(ScanResult(platform_id="new", platform_name="New", category="developer", url="u", status="found"))
    s1, s2 = store.add_snapshot(case, before), store.add_snapshot(case, after)
    report = diff_collections(store.load_snapshot(s1), store.load_snapshot(s2), "ben")
    counts = report["counts"]
    assert counts["NEW"] == 1 and counts["DISAPPEARED"] == 1 and counts["CHANGED"] == 1 and counts["CONFIDENCE_UP"] == 1
    assert "not proof" in next(e for e in report["entries"] if e["change_type"] == "DISAPPEARED")["note"]
    assert [c["snapshots"] for c in store.list_cases()] == [2]
