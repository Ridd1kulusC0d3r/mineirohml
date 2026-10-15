import json

import pytest

from mineiro.baseline import compare_to_baseline, fingerprint_page, fnv1a
from mineiro.evidence import encode_uri_component, evaluate_evidence
from mineiro.matchers import DeclarativeDetector, evaluate_matchers, validate_declarative_detector
from mineiro.netguard import (BlockedTargetError, assert_probeable_url, build_detector_url, is_blocked_address,
                              matches_detector_pattern, random_control_username)
from mineiro.pivots import extract_pivots, plan_pivots
from mineiro.registry import load_registry
from mineiro.variants import generate_username_variants, jaro_winkler


def test_registry_matches_the_original_catalog():
    reg = load_registry()
    stats = reg.stats()
    assert len(reg) == 985 and stats["scannableDetectors"] == 984 and stats["logicalEvidenceChecks"] == 7880
    assert reg.validate() == []
    assert len(reg.scope("top20")) == 19 and len(reg.scope("top50")) == 49 and len(reg.scope("all")) == 984
    assert all(d.target_type in ("email", "both") for d in reg.scope("all", target_type="email"))


@pytest.mark.parametrize("addr", ["127.0.0.1", "10.1.2.3", "169.254.169.254", "192.168.0.1", "172.16.5.5", "100.64.0.1",
                                  "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0", "224.0.0.1", "not-an-ip"])
def test_blocked_addresses(addr):
    assert is_blocked_address(addr)


@pytest.mark.parametrize("addr", ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])
def test_public_addresses_allowed(addr):
    assert not is_blocked_address(addr)


@pytest.mark.parametrize("url", ["ftp://x.com/", "http://user:pw@x.com/", "https://x.com:8443/", "http://localhost/", "http://a.internal/",
                                 "http://169.254.169.254/", "http://[::1]/"])
def test_assert_probeable_rejects(url):
    with pytest.raises(BlockedTargetError):
        assert_probeable_url(url)


def test_detector_pattern_cannot_be_hijacked():
    pattern = "https://{username}.example.com/p/{username}"
    assert matches_detector_pattern(build_detector_url(pattern, "ben"), pattern)
    assert not matches_detector_pattern("https://evil.com/p/ben", pattern)
    assert not matches_detector_pattern("https://ben@evil.com/p/ben", pattern)
    # a crafted username is percent-encoded, so it cannot change the host
    crafted = build_detector_url(pattern, "x.evil.com/")
    assert matches_detector_pattern(crafted, pattern) and "evil.com/" not in crafted.split("/p/")[0].replace("example.com", "")


def test_control_username_is_unique_and_safe():
    a, b = random_control_username(), random_control_username()
    assert a != b and a.startswith("zq") and a.isalnum()


def test_encode_uri_component_matches_javascript():
    assert encode_uri_component("a b/ç!'()*~") == "a%20b%2F%C3%A7!'()*~"


def test_evidence_scoring():
    ok = evaluate_evidence(requested_url="https://x.com/ben", final_url="https://x.com/ben", username="ben", status_code=200,
                           expected_status=200, error_status=404, body="<link rel='canonical' href='https://x.com/ben'> ben", edge_protected=False)
    assert ok.passed >= 6 and not ok.soft_404 and ok.total == 8
    soft = evaluate_evidence(requested_url="https://x.com/ben", final_url="https://x.com/ben", username="ben", status_code=200,
                             expected_status=200, error_status=404, body="Sorry, page not found", edge_protected=False)
    assert soft.soft_404


def test_baseline_detects_identical_templates_and_distinct_pages():
    shell = "<html><head><title>Profile</title></head><body><div><p>Sorry nothing</p></div></body></html>"
    control = fingerprint_page(status=200, final_url="https://x.com/zq123", body=shell, handle="zq123")
    same = fingerprint_page(status=200, final_url="https://x.com/ben", body=shell, handle="ben")
    assert compare_to_baseline(same, control).relation == "same"
    rich = "<html><head><title>ben on X</title></head><body>" + "<section><article><h2>ben</h2><ul><li>a</li></ul></article></section>" * 30 + "</body></html>"
    other = fingerprint_page(status=200, final_url="https://x.com/ben", body=rich, handle="ben")
    assert compare_to_baseline(other, control).relation == "different"
    blocked = fingerprint_page(status=403, final_url="https://x.com/zq", body="", handle="zq")
    assert compare_to_baseline(other, blocked).relation == "unknown"
    assert compare_to_baseline(other, None).relation == "unknown"


def test_fnv1a_is_stable():
    assert fnv1a("") == 0x811C9DC5 and fnv1a("a") == 0xE40C292C


def test_declarative_matchers():
    rule = DeclarativeDetector.from_dict({
        "id": "x", "present": [{"type": "status", "codes": [200]}, {"type": "body_regex", "pattern": "<title>[^<]+- Demo"}],
        "absent": [{"type": "status", "codes": [404]}], "lastVerified": "2026-10-02", "source": "test"})
    assert evaluate_matchers(rule, 200, "https://x.com/a", "<title>a - Demo</title>")["verdict"] == "present"
    assert evaluate_matchers(rule, 404, "https://x.com/a", "")["verdict"] == "absent"
    assert evaluate_matchers(rule, 200, "https://x.com/a", "<title>other</title>")["verdict"] == "inconclusive"
    assert validate_declarative_detector(rule.to_dict()) == []
    assert len(validate_declarative_detector({"id": "x", "present": [{"type": "body_regex", "pattern": "("}], "absent": [],
                                              "lastVerified": "x", "source": ""})) >= 3


def test_variants():
    variants = generate_username_variants("Pascho_Dev")
    values = {v.value for v in variants}
    assert "pascho.dev" in values and all(v.similarity <= 100 for v in variants)
    assert jaro_winkler("martha", "marhta") == pytest.approx(0.961, abs=0.001)
    assert generate_username_variants("x") == []


def test_pivots_extraction_and_budget():
    text = "mail ben@corp.io, site https://ben.dev/about and https://github.com/ben, @benhandle"
    pivots = extract_pivots(text, "github")
    kinds = {p.type for p in pivots}
    assert kinds == {"email", "domain", "url", "handle"}
    plan = plan_pivots(pivots, max_depth=1, budget=2)
    assert len(plan["accepted"]) == 2 and {s["reason"] for s in plan["skipped"]} == {"budget"}
    assert plan_pivots(pivots, max_depth=1, budget=9, seen={pivots[0].key})["skipped"][0]["reason"] == "seen"
