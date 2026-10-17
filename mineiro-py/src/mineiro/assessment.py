"""Intelligence assessment: turns scan results into judgments, hypotheses, contradictions, gaps and pivots.

Everything here is DERIVED from observed evidence. Handle reuse is a lead, never proof of identity.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timezone
from urllib.parse import urlsplit

from .i18n import analysis_text, requirement_label
from .scan import ScanResult


def clamp(value: float, lo: int = 0, hi: int = 100) -> int:
    return int(max(lo, min(hi, round(value))))


def confidence_band(score: float) -> str:
    return "HIGH" if score >= 80 else "MODERATE" if score >= 55 else "LOW"


def priority_band(score: float) -> str:
    return "HIGH" if score >= 78 else "MEDIUM" if score >= 50 else "LOW"


def requirement_relevance(category: str, requirement: str) -> int:
    if requirement == "username_presence":
        return 75
    if requirement == "account_correlation":
        return 85
    if requirement == "digital_footprint":
        return 82
    if requirement == "developer_footprint":
        return 98 if category in ("developer", "security") else 60 if category == "community" else 35
    if requirement == "threat_research_alias":
        return 92 if category in ("security", "developer", "community") else 45
    if requirement == "brand_impersonation":
        return 95 if category in ("social", "community", "media") else 45
    return 70


def source_quality_grade(r: ScanResult) -> str:
    detector, observation = r.detector_reliability, r.confidence_score or 40
    signals = len(r.evidence_signals)
    self_declared = bool(r.metadata.get("extractedLinks") or r.metadata.get("displayName"))
    if self_declared and detector >= 90 and observation >= 85 and signals >= 3:
        return "A"
    if detector >= 80 and observation >= 75:
        return "B"
    if detector >= 65 and observation >= 55:
        return "C"
    if r.status in ("uncertain", "rate_limited"):
        return "D"
    return "E"


def collection_coverage(results: list[ScanResult]) -> dict:
    count = lambda *s: sum(1 for r in results if r.status in s)  # noqa: E731
    requested = len(results)
    found, absent = count("found"), count("not_found")
    uncertain, limited, errors = count("uncertain"), count("rate_limited"), count("error")
    pending = count("pending", "scanning")
    return {
        "requested": requested, "completed": requested - pending, "found": found, "absent": absent,
        "uncertain": uncertain, "rate_limited": limited, "errors": errors, "pending": pending,
        "blocked_or_inconclusive": uncertain + limited + errors,
        "effective_coverage_percent": clamp((found + absent) / requested * 100) if requested else 0,
    }


def _domains_for(r: ScanResult) -> list[str]:
    out = []
    for raw in r.metadata.get("extractedLinks", []):
        try:
            host = (urlsplit(raw).hostname or "").lower()
        except ValueError:
            continue
        if host and host not in out:
            out.append(host)
    return out


def build_evidence(results: list[ScanResult], requirement: str, lang: str) -> list[dict]:
    found_by_cat = Counter(r.category for r in results if r.status == "found")
    items = []
    for r in results:
        if r.status not in ("found", "uncertain", "rate_limited"):
            continue
        detector = r.detector_reliability
        observation = r.confidence_score or (55 if r.status == "found" else 30)
        ratio = (r.evidence_checks_passed or 0) / r.evidence_checks_total if r.evidence_checks_total else 0.5
        corroboration = min(1, found_by_cat[r.category] / 4)
        correlation = clamp(detector * 0.24 + observation * 0.34 + ratio * 100 * 0.24 + corroboration * 100 * 0.18)
        relevance = requirement_relevance(r.category, requirement)
        novelty = 85 if found_by_cat[r.category] == 1 else 60
        priority = clamp(ratio * 100 * 0.28 + correlation * 0.30 + novelty * 0.14 + relevance * 0.28)
        value = clamp(detector * 0.26 + observation * 0.27 + correlation * 0.24 + priority * 0.23)
        direct = bool(r.metadata.get("extractedLinks"))
        items.append({
            "id": f"E-{r.platform_id}", "platform_id": r.platform_id, "platform_name": r.platform_name,
            "category": r.category, "url": r.url, "status": r.status, "status_code": r.status_code,
            "response_time_ms": r.response_time_ms, "metadata": r.metadata,
            "detector_confidence": detector, "observation_confidence": observation, "correlation_confidence": correlation,
            "assessment_contribution": priority_band(value), "analytical_value": priority_band(value),
            "intelligence_priority_score": priority, "requirement_relevance": relevance,
            "source_quality": source_quality_grade(r), "provenance": "PRIMARY", "observed_at": r.collected_at,
            "evidence_signals": r.evidence_signals, "evidence_hash": r.evidence_hash,
            "why_it_matters": (analysis_text(lang, "evidence_direct" if direct else "evidence_lead")
                               if r.status == "found" else analysis_text(lang, "evidence_inconclusive")),
            "recommended_pivot": analysis_text(lang, "pivot_direct" if direct else "pivot_metadata"),
        })
    items.sort(key=lambda e: (-e["intelligence_priority_score"], -e["correlation_confidence"]))
    return items


def build_clusters(results: list[ScanResult]) -> list[dict]:
    by_cat: dict[str, list[ScanResult]] = defaultdict(list)
    for r in results:
        if r.status == "found":
            by_cat[r.category].append(r)
    clusters = []
    for category, items in by_cat.items():
        weighted = sum((i.detector_reliability / 100) * ((i.confidence_score or 50) / 100) for i in items)
        clusters.append({
            "category": category, "findings": len(items),
            "strong_findings": sum(1 for i in items if i.detector_reliability >= 80 and i.confidence_score >= 75),
            "weighted_score": clamp(weighted / max(1, len(items)) * 100),
            "average_detector_reliability": clamp(sum(i.detector_reliability for i in items) / len(items)),
            "overlaps": [],
        })
    for cluster in clusters:
        mine = {d for r in by_cat[cluster["category"]] for d in _domains_for(r)}
        for other in clusters:
            if other is cluster:
                continue
            theirs = {d for r in by_cat[other["category"]] for d in _domains_for(r)}
            shared = sorted(mine & theirs)
            if shared:
                cluster["overlaps"].append({"with_category": other["category"], "shared_signals": shared,
                                            "score": clamp(65 + min(30, len(shared) * 10))})
    clusters.sort(key=lambda c: (-c["weighted_score"], -c["findings"]))
    return clusters


def build_contradictions(results: list[ScanResult], lang: str) -> list[str]:
    found = [r for r in results if r.status == "found"]
    norm = lambda key: {(r.metadata.get(key) or "").strip().lower() for r in found} - {""}  # noqa: E731
    out = []
    if len(norm("displayName")) > 1:
        out.append(analysis_text(lang, "contradiction_display"))
    if len(norm("location")) > 1:
        out.append(analysis_text(lang, "contradiction_location"))
    if len(norm("organization")) > 1:
        out.append(analysis_text(lang, "contradiction_org"))
    if len(norm("avatarHash")) > 1:
        out.append(analysis_text(lang, "contradiction_avatar"))
    weak = [r for r in found if r.detector_reliability < 60 or r.confidence_score < 55]
    if weak:
        out.append(analysis_text(lang, "contradiction_weak", count=len(weak)))
    return out


def build_judgments(coverage: dict, evidence: list[dict], clusters: list[dict], requirement: str, lang: str) -> list[dict]:
    high = [e for e in evidence if e["status"] == "found" and e["analytical_value"] == "HIGH"]
    out = [{
        "id": "KJ-01",
        "confidence": confidence_band(coverage["effective_coverage_percent"] * 0.4 + min(100, len(high) * 12) * 0.6),
        "text": (analysis_text(lang, "judgment_high", count=len(high), requirement=requirement_label(lang, requirement).lower())
                 if high else analysis_text(lang, "judgment_none")),
        "basis": analysis_text(lang, "judgment_basis", coverage=coverage["effective_coverage_percent"], count=len(high)),
    }]
    if clusters:
        lead = clusters[0]
        out.append({
            "id": "KJ-02", "confidence": confidence_band(lead["weighted_score"]),
            "text": analysis_text(lang, "judgment_cluster", category=lead["category"]),
            "basis": analysis_text(lang, "judgment_cluster_basis", count=lead["findings"], score=lead["weighted_score"]),
        })
    if coverage["blocked_or_inconclusive"]:
        out.append({"id": "KJ-03", "confidence": "HIGH", "text": analysis_text(lang, "judgment_gap"),
                    "basis": analysis_text(lang, "judgment_gap_basis", count=coverage["blocked_or_inconclusive"])})
    return out


def build_gaps(coverage: dict, evidence: list[dict], lang: str) -> list[dict]:
    gaps = []
    if coverage["effective_coverage_percent"] < 80:
        gaps.append({"id": "GAP-01", "severity": "HIGH", "question": analysis_text(lang, "gap1_q"),
                     "reason": analysis_text(lang, "gap1_r", coverage=coverage["effective_coverage_percent"])})
    if not any(e["correlation_confidence"] >= 80 and e["status"] == "found" for e in evidence):
        gaps.append({"id": "GAP-02", "severity": "HIGH", "question": analysis_text(lang, "gap2_q"),
                     "reason": analysis_text(lang, "gap2_r")})
    if not any(e["source_quality"] in ("A", "B") for e in evidence):
        gaps.append({"id": "GAP-03", "severity": "MEDIUM", "question": analysis_text(lang, "gap3_q"),
                     "reason": analysis_text(lang, "gap3_r")})
    return gaps


def build_pivots(evidence: list[dict], coverage: dict, contradictions: list[str], lang: str) -> list[dict]:
    pivots = [{
        "id": f"PIVOT-{i + 1:02d}", "priority": priority_band(e["intelligence_priority_score"]),
        "priority_score": e["intelligence_priority_score"],
        "signal": f"{e['platform_name']}: source {e['source_quality']}, correlation {e['correlation_confidence']}/100",
        "action": e["recommended_pivot"], "reason": e["why_it_matters"],
    } for i, e in enumerate([e for e in evidence if e["status"] == "found"][:6])]
    if contradictions:
        pivots.insert(0, {
            "id": "PIVOT-CONTRADICTION", "priority": "HIGH", "priority_score": 95,
            "signal": analysis_text(lang, "pivot_contradiction_signal", count=len(contradictions)),
            "action": analysis_text(lang, "pivot_contradiction_action"),
            "reason": analysis_text(lang, "pivot_contradiction_reason"),
        })
    inconclusive = coverage["uncertain"] + coverage["rate_limited"]
    if inconclusive:
        pivots.append({
            "id": "PIVOT-COLLECTION", "priority": "MEDIUM", "priority_score": 58,
            "signal": analysis_text(lang, "pivot_collection_signal", count=inconclusive),
            "action": analysis_text(lang, "pivot_collection_action"),
            "reason": analysis_text(lang, "pivot_collection_reason"),
        })
    return pivots


def build_heatmap(results: list[ScanResult]) -> list[dict]:
    cells: dict[str, dict] = {}
    for r in results:
        if r.status != "found":
            continue
        cell = cells.setdefault(r.category, {"category": r.category, "high": 0, "medium": 0, "low": 0})
        combined = r.detector_reliability * 0.5 + (r.confidence_score or 50) * 0.5
        cell["high" if combined >= 80 else "medium" if combined >= 55 else "low"] += 1
    return sorted(cells.values(), key=lambda c: -(c["high"] * 3 + c["medium"] * 2 + c["low"]))


def build_timeline(results: list[ScanResult], lang: str) -> list[dict]:
    events, n = [], 0

    def add(observed_at, kind, type_, platform, label, evidence_id):
        nonlocal n
        n += 1
        events.append({"id": f"T-{n:03d}", "observed_at": observed_at, "timestamp_kind": kind, "type": type_,
                       "platform_name": platform, "label": label, "evidence_id": evidence_id, "provenance": "PRIMARY"})

    for r in results:
        if r.status not in ("found", "uncertain"):
            continue
        eid = f"E-{r.platform_id}"
        when = r.collected_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
        add(when, "SCAN_TIMESTAMP", "PUBLIC_PROFILE_SIGNAL" if r.status == "found" else "SCAN_OBSERVATION", r.platform_name,
            analysis_text(lang, "timeline_found" if r.status == "found" else "timeline_uncertain"), eid)
        if r.metadata.get("accountCreatedAt"):
            add(r.metadata["accountCreatedAt"], "ACCOUNT_CREATED", "ACCOUNT_LIFECYCLE", r.platform_name,
                analysis_text(lang, "timeline_created"), eid)
    return sorted(events, key=lambda e: e["observed_at"])


def build_graph(results: list[ScanResult], target: str) -> dict:
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    def node(id_, type_, label, evidence_id=None):
        nodes.setdefault(id_, {"id": id_, "type": type_, "label": label, "provenance": "DERIVED" if id_ == "target" else "PRIMARY",
                               "evidence_id": evidence_id})

    node("target", "TARGET", target)
    uid = f"username:{target.lower()}"
    node(uid, "EMAIL" if "@" in target else "USERNAME", target)
    edges.append({"id": "edge:target:identifier", "source": "target", "target": uid, "relationship": "USES",
                  "confidence": 100, "provenance": "DERIVED"})

    for r in (r for r in results if r.status == "found"):
        eid, pid, plat = f"E-{r.platform_id}", f"profile:{r.platform_id}", f"platform:{r.platform_id}"
        node(plat, "PLATFORM", r.platform_name, eid)
        node(pid, "PROFILE", r.url, eid)
        common = {"evidence_id": eid, "source_url": r.url, "observed_at": r.collected_at, "provenance": "PRIMARY"}
        edges.append({"id": f"edge:identifier:{r.platform_id}", "source": uid, "target": pid, "relationship": "SAME_HANDLE",
                      "confidence": clamp(r.detector_reliability * 0.45 + (r.confidence_score or 50) * 0.55), **common})
        edges.append({"id": f"edge:profile:platform:{r.platform_id}", "source": pid, "target": plat,
                      "relationship": "OBSERVED_ON", "confidence": 100, **common})
        if r.metadata.get("displayName"):
            did = f"display:{r.metadata['displayName'].lower()}"
            node(did, "DISPLAY_NAME", r.metadata["displayName"], eid)
            edges.append({"id": f"edge:display:{r.platform_id}", "source": pid, "target": did, "relationship": "USES",
                          "confidence": 72, **common})
        for link in r.metadata.get("extractedLinks", []):
            host = (urlsplit(link).hostname or "").lower()
            if not host:
                continue
            did, lid = f"domain:{host}", f"url:{link}"
            node(did, "DOMAIN", host, eid)
            node(lid, "PUBLIC_URL", link, eid)
            edges.append({"id": f"edge:url:{r.platform_id}:{link}", "source": pid, "target": lid, "relationship": "LINKS_TO",
                          "confidence": 88, **common})
            edges.append({"id": f"edge:host:{r.platform_id}:{host}", "source": lid, "target": did, "relationship": "HOSTED_ON",
                          "confidence": 100, "evidence_id": eid, "source_url": link, "observed_at": r.collected_at,
                          "provenance": "PRIMARY"})

    domain_profiles: dict[str, list[str]] = defaultdict(list)
    for e in edges:
        if e["relationship"] != "HOSTED_ON":
            continue
        linked = next((x for x in edges if x["target"] == e["source"] and x["relationship"] == "LINKS_TO"), None)
        if linked:
            domain_profiles[e["target"]].append(linked["source"])
    for did, profiles in domain_profiles.items():
        unique = list(dict.fromkeys(profiles))
        for i in range(len(unique) - 1):
            edges.append({"id": f"edge:same-domain:{did}:{i}", "source": unique[i], "target": unique[i + 1],
                          "relationship": "SAME_DOMAIN", "confidence": 90, "provenance": "DERIVED"})
    return {"nodes": list(nodes.values()), "edges": edges}


def build_hypotheses(evidence, clusters, contradictions, coverage, lang) -> list[dict]:
    strong = [e for e in evidence if e["status"] == "found" and e["analytical_value"] == "HIGH"]
    out = [{
        "id": "H1", "statement": analysis_text(lang, "hypothesis_h1"),
        "confidence": confidence_band(len(strong) * 12 + coverage["effective_coverage_percent"] * 0.35),
        "supporting_evidence_ids": [e["id"] for e in strong],
        "contradictory_evidence_ids": [f"C-{i + 1:03d}" for i in range(len(contradictions))],
        "caveat": analysis_text(lang, "hypothesis_h1_caveat"), "alternative": False,
    }]
    if clusters:
        lead = clusters[0]["category"]
        out.append({
            "id": "H2", "statement": analysis_text(lang, "hypothesis_h2", category=lead),
            "confidence": confidence_band(clusters[0]["weighted_score"]),
            "supporting_evidence_ids": [e["id"] for e in evidence if e["category"] == lead and e["status"] == "found"],
            "contradictory_evidence_ids": [], "caveat": analysis_text(lang, "hypothesis_h2_caveat"), "alternative": False,
        })
    weak = [e for e in evidence if e["status"] == "found" and e["correlation_confidence"] < 50]
    out.append({
        "id": "H3", "statement": analysis_text(lang, "hypothesis_h3"), "confidence": "MODERATE" if weak else "LOW",
        "supporting_evidence_ids": [e["id"] for e in weak], "contradictory_evidence_ids": [e["id"] for e in strong],
        "caveat": analysis_text(lang, "hypothesis_h3_caveat"), "alternative": True,
    })
    return out


def build_ledger(judgments, evidence, contradictions, generated_at) -> list[dict]:
    strong = [e["id"] for e in evidence if e["status"] == "found" and e["analytical_value"] == "HIGH"]
    return [{
        "id": f"A-{i + 1:03d}", "claim": j["text"], "confidence": j["confidence"],
        "supporting_evidence_ids": strong[:12] if i == 0 else [e["id"] for e in evidence[:6]],
        "contradictory_evidence_ids": [f"C-{k + 1:03d}" for k in range(len(contradictions))],
        "generated_at": generated_at, "provenance": "DERIVED",
    } for i, j in enumerate(judgments)]


def build_provenance_graph(evidence, ledger) -> dict:
    nodes, edges = [], []
    for e in evidence:
        src = f"prov:{e['id']}:{e['provenance']}"
        nodes += [{"id": src, "label": e["provenance"], "type": e["provenance"]},
                  {"id": e["id"], "label": e["platform_name"], "type": "EVIDENCE"}]
        edges.append({"source": src, "target": e["id"], "relation": "OBSERVED_AS"})
    for entry in ledger:
        nodes.append({"id": entry["id"], "label": entry["claim"], "type": "ASSESSMENT"})
        edges += [{"source": eid, "target": entry["id"], "relation": "DERIVED_FROM"} for eid in entry["supporting_evidence_ids"]]
    return {"nodes": nodes, "edges": edges}


def build_assessment(results: list[ScanResult], target: str = "target", requirement: str = "account_correlation",
                     lang: str = "en") -> dict:
    """Builds the full assessment as a JSON-serializable dict (schema_version 2)."""
    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    coverage = collection_coverage(results)
    evidence = build_evidence(results, requirement, lang)
    clusters = build_clusters(results)
    contradictions = build_contradictions(results, lang)
    judgments = build_judgments(coverage, evidence, clusters, requirement, lang)
    gaps = build_gaps(coverage, evidence, lang)
    pivots = build_pivots(evidence, coverage, contradictions, lang)
    hypotheses = build_hypotheses(evidence, clusters, contradictions, coverage, lang)
    ledger = build_ledger(judgments, evidence, contradictions, generated_at)
    high = [e for e in evidence if e["status"] == "found" and e["analytical_value"] == "HIGH"]
    status_counts = Counter(r.status for r in results)
    quality = Counter(e["source_quality"] for e in evidence)
    return {
        "schema_version": 2, "generated_at": generated_at, "target": target, "language": lang,
        "intelligence_requirement": requirement, "intelligence_requirement_label": requirement_label(lang, requirement),
        "assessment_confidence": judgments[0]["confidence"] if judgments else "LOW",
        "collection": coverage, "judgments": judgments, "evidence": evidence,
        "high_confidence_findings": high,
        "unresolved_findings": [e for e in evidence if e["status"] in ("uncertain", "rate_limited")],
        "clusters": clusters, "hypotheses": hypotheses,
        "supporting_evidence": [f"{e['id']}: {e['platform_name']} ({e['source_quality']}, IPS {e['intelligence_priority_score']})" for e in high],
        "contradictory_evidence": contradictions,
        "known_assessed_unknown": {
            "known": [analysis_text(lang, "known_presence", platform=e["platform_name"], url=e["url"])
                      for e in evidence if e["status"] == "found"][:10],
            "assessed": [f"{j['id']}: {j['text']}" for j in judgments],
            "unknown": [g["question"] for g in gaps],
        },
        "gaps": gaps, "pivots": pivots,
        "collection_plan": [analysis_text(lang, f"plan{i}") for i in (1, 2, 3, 4)],
        "stop_condition": analysis_text(lang, "stop"),
        "source_quality_notes": [analysis_text(lang, f"source{g}") for g in "ABCDE"],
        "analytic_ledger": ledger, "timeline": build_timeline(results, lang),
        "graph": build_graph(results, target), "provenance_graph": build_provenance_graph(evidence, ledger),
        "reliability_heatmap": build_heatmap(results),
        "technical_appendix": {
            "detector_count": len(results),
            "evidence_checks_available": sum(r.evidence_checks_total or 0 for r in results),
            "result_status_counts": dict(status_counts),
            "source_quality_counts": {g: quality.get(g, 0) for g in "ABCDE"},
            "provenance_counts": {"PRIMARY": len(evidence), "DERIVED": 1, "EXTERNAL": 0},
        },
    }
