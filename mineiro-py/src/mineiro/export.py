"""Local reporting: HTML, JSON, Markdown, CSV, STIX 2.1 and Cypher, each with a SHA-256 export manifest.

The SHA-256 checks the integrity of the exported payload. It is not an authorship signature or legal chain of custody.
"""

from __future__ import annotations

import csv
import hashlib
import html
import io
import json
from datetime import datetime, timezone
from functools import lru_cache
from importlib import resources
from pathlib import Path

from .graph import graph_to_cypher
from .i18n import analysis_text
from .scan import ScanResult
from .stix import build_stix_bundle

SECTIONS = (
    "executive_assessment", "key_judgments", "collection_coverage", "high_confidence_findings", "evidence_matrix",
    "footprint_clusters", "correlation_graph", "hypotheses", "supporting_evidence", "analytic_ledger", "contradictions",
    "unresolved_findings", "gaps", "timeline", "pivots", "collection_plan", "reliability", "methodology", "provenance",
    "technical_appendix", "integrity_snapshot", "raw_results",
)
DEFAULT_SELECTION = {name: name != "raw_results" for name in SECTIONS}
FORMATS = ("html", "json", "markdown", "csv", "stix", "cypher")


@lru_cache(maxsize=1)
def _labels() -> dict:
    with resources.files("mineiro.data").joinpath("export_messages.json").open("r", encoding="utf-8") as h:
        return json.load(h)


def label(lang: str, key: str) -> str:
    return (_labels().get(lang) or _labels()["en"]).get(key) or _labels()["en"].get(key, key)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _selected(selection: dict | None) -> dict:
    merged = dict(DEFAULT_SELECTION)
    merged.update(selection or {})
    return merged


def build_json_payload(assessment: dict, results: list[ScanResult], selection: dict | None = None) -> dict:
    s = _selected(selection)
    a, lang = assessment, assessment["language"]
    pick = lambda key, value: value if s[key] else None  # noqa: E731
    payload = {
        "schema": "mineiro.report.v2", "generated_at": a["generated_at"], "target": a["target"], "language": lang,
        "requirement": a["intelligence_requirement"],
        "assessment": {"confidence": a["assessment_confidence"], "known_assessed_unknown": a["known_assessed_unknown"]} if s["executive_assessment"] else None,
        "judgments": pick("key_judgments", a["judgments"]),
        "collection": pick("collection_coverage", a["collection"]),
        "high_confidence_findings": pick("high_confidence_findings", a["high_confidence_findings"]),
        "evidence": pick("evidence_matrix", a["evidence"]),
        "clusters": pick("footprint_clusters", a["clusters"]),
        "graph": pick("correlation_graph", a["graph"]),
        "hypotheses": pick("hypotheses", a["hypotheses"]),
        "supporting_evidence": pick("supporting_evidence", a["supporting_evidence"]),
        "analytic_ledger": pick("analytic_ledger", a["analytic_ledger"]),
        "contradictions": pick("contradictions", a["contradictory_evidence"]),
        "unresolved_findings": pick("unresolved_findings", a["unresolved_findings"]),
        "gaps": pick("gaps", a["gaps"]),
        "timeline": pick("timeline", a["timeline"]),
        "pivots": pick("pivots", a["pivots"]),
        "collection_plan": pick("collection_plan", {"actions": a["collection_plan"], "stop_condition": a["stop_condition"]}),
        "reliability": pick("reliability", {"heatmap": a["reliability_heatmap"], "source_quality_notes": a["source_quality_notes"]}),
        "methodology": pick("methodology", {"pipeline": ["COLLECTION", "EVIDENCE", "CORRELATION", "HYPOTHESES", "CONTRADICTIONS",
                                                        "ASSESSMENT", "PIVOTS", "COLLECTION_PLAN"], "note": label(lang, "methodologyNote")}),
        "provenance": pick("provenance", {"graph": a["provenance_graph"]}),
        "technical_appendix": pick("technical_appendix", a["technical_appendix"]),
        "raw_results": pick("raw_results", [r.to_dict() for r in results]),
    }
    return {k: v for k, v in payload.items() if v is not None}


def _md(a: dict, s: dict) -> str:
    lang = a["language"]
    L = lambda k: label(lang, k)  # noqa: E731
    out = [f"# Mineiro · {L('executive')}", "", f"**{L('target')}:** {a['target']}  ",
           f"**{L('requirement')}:** {a['intelligence_requirement_label']}  ",
           f"**{L('confidence')}:** {a['assessment_confidence']}  ",
           f"**{L('coverage')}:** {a['collection']['effective_coverage_percent']}%", "", f"_{L('publicEvidence')}_", ""]
    if s["executive_assessment"]:
        k = a["known_assessed_unknown"]
        for title, items in ((L("known"), k["known"]), (L("assessed"), k["assessed"]), (L("unknown"), k["unknown"])):
            out += [f"### {title}", *(f"- {x}" for x in items), ""]
    if s["key_judgments"]:
        out += [f"## 1 {L('judgments')}", ""]
        for j in a["judgments"]:
            out += [f"- **{j['id']} · {j['confidence']}** {j['text']}  ", f"  {L('basis')}: {j['basis']}"]
        out.append("")
    if s["collection_coverage"]:
        c = a["collection"]
        out += [f"## 2 {L('collection')}", "",
                f"{L('requested')}: {c['requested']} · {L('found')}: {c['found']} · {L('absent')}: {c['absent']} · "
                f"{L('uncertain')}: {c['uncertain']} · {L('rateLimited')}: {c['rate_limited']} · {L('errors')}: {c['errors']}", ""]
    if s["high_confidence_findings"]:
        out += [f"## 3 {L('highFindings')}", "", *(f"- [{e['platform_name']}]({e['url']}) · {e['source_quality']} · IPS {e['intelligence_priority_score']}"
                                                  for e in a["high_confidence_findings"]), ""]
    if s["evidence_matrix"]:
        out += [f"## 4 {L('evidence')}", "", "| ID | Platform | Status | Obs | Corr | SQ | IPS |", "|---|---|---|---:|---:|---|---:|"]
        out += [f"| {e['id']} | {e['platform_name']} | {e['status']} | {e['observation_confidence']} | {e['correlation_confidence']} | "
                f"{e['source_quality']} | {e['intelligence_priority_score']} |" for e in a["evidence"]]
        out.append("")
    if s["footprint_clusters"]:
        out += [f"## 5 {L('clusters')}", "", *(f"- {c['category']}: {c['findings']} {L('findings')} · {c['strong_findings']} {L('strong')} · "
                                               f"{L('weighted')} {c['weighted_score']}" for c in a["clusters"]), ""]
    if s["correlation_graph"]:
        out += [f"## 6 {L('graph')}", "", f"Nodes: {len(a['graph']['nodes'])} · edges: {len(a['graph']['edges'])}", ""]
    if s["hypotheses"]:
        out += [f"## 7 {L('hypotheses')}", ""]
        for h in a["hypotheses"]:
            tag = f" [{L('alternative')}]" if h["alternative"] else ""
            out += [f"- **{h['id']}{tag} · {h['confidence']}** {h['statement']}  ", f"  {L('caveat')}: {h['caveat']}"]
        out.append("")
    if s["supporting_evidence"]:
        out += [f"## 8 {L('supporting')}", "", *(f"- {x}" for x in a["supporting_evidence"]), ""]
    if s["analytic_ledger"]:
        out += [f"## 9 {L('ledger')}", "", *(f"- {x['id']} · {x['confidence']} · {x['claim']}" for x in a["analytic_ledger"]), ""]
    if s["contradictions"]:
        out += [f"## 10 {L('contradictions')}", "", *(f"- {x}" for x in (a["contradictory_evidence"] or [L("noContradiction")])), ""]
    if s["unresolved_findings"]:
        out += [f"## 11 {L('unresolved')}", "", *(f"- {e['platform_name']} · {e['status']} · HTTP {e['status_code']}" for e in a["unresolved_findings"]), ""]
    if s["gaps"]:
        out += [f"## 12 {L('gaps')}", "", *(f"- **{g['severity']} · {g['id']}** {g['question']}  \n  {g['reason']}" for g in a["gaps"]), ""]
    if s["timeline"]:
        out += [f"## 13 {L('timeline')}", "", *(f"- {e['observed_at']} · {e['timestamp_kind']} · {e['platform_name']} · {e['label']}" for e in a["timeline"]), ""]
    if s["pivots"]:
        out += [f"## 14 {L('pivots')}", "", *(f"- **{p['priority']} · IPS {p['priority_score']}** {p['action']}  \n  {L('signal')}: {p['signal']} · {L('reason')}: {p['reason']}" for p in a["pivots"]), ""]
    if s["collection_plan"]:
        out += [f"## 15 {L('plan')}", "", *(f"{i + 1}. {x}" for i, x in enumerate(a["collection_plan"])), "", f"**{L('stop')}:** {a['stop_condition']}", ""]
    if s["reliability"]:
        out += [f"## 16 {L('reliability')}", "", *(f"- {x}" for x in a["source_quality_notes"]), ""]
    if s["methodology"]:
        out += [f"## 17 {L('methodology')}", "", "COLLECTION → EVIDENCE → CORRELATION → HYPOTHESES → CONTRADICTIONS → ASSESSMENT → PIVOTS → COLLECTION PLAN", "",
                label(lang, "methodologyNote"), ""]
    if s["provenance"]:
        out += [f"## 18 {L('provenance')}", "", f"Nodes: {len(a['provenance_graph']['nodes'])} · edges: {len(a['provenance_graph']['edges'])}", ""]
    if s["technical_appendix"]:
        t = a["technical_appendix"]
        out += [f"## 19 {L('appendix')}", "", f"Detectors: {t['detector_count']} · status: {t['result_status_counts']} · source quality: {t['source_quality_counts']}", ""]
    out += [f"---", L("generated")]
    return "\n".join(out)


_CSS = """:root{color-scheme:dark light;--bg:#0b0e10;--fg:#e9ecef;--mut:#9aa1aa;--line:#2c3136;--card:#12161a}
@media (prefers-color-scheme:light){:root{--bg:#fff;--fg:#14181c;--mut:#5b636b;--line:#d9dde1;--card:#f6f7f8}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 64px}h1{font-size:28px;margin:.2em 0}h2{margin-top:2em;font-size:19px;border-bottom:1px solid var(--line);padding-bottom:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:8px 0}.mut{color:var(--mut)}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left}code{font-family:ui-monospace,monospace}
.pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:0 8px;font-size:12px;margin-right:6px}"""


def _html(a: dict, s: dict) -> str:
    lang = a["language"]
    L = lambda k: label(lang, k)  # noqa: E731
    esc = html.escape
    parts = [f"<h1>Mineiro · {esc(L('executive'))}</h1>",
             f"<p class='mut'>{esc(L('target'))}: <b>{esc(a['target'])}</b> · {esc(L('requirement'))}: {esc(a['intelligence_requirement_label'])} · "
             f"{esc(L('confidence'))}: <span class='pill'>{esc(a['assessment_confidence'])}</span> {esc(L('coverage'))}: {a['collection']['effective_coverage_percent']}%</p>"]
    if s["key_judgments"]:
        parts.append(f"<h2>{esc(L('judgments'))}</h2>" + "".join(
            f"<div class='card'><span class='pill'>{esc(j['confidence'])}</span><b>{esc(j['id'])}</b> {esc(j['text'])}<br><span class='mut'>{esc(L('basis'))}: {esc(j['basis'])}</span></div>" for j in a["judgments"]))
    if s["evidence_matrix"]:
        rows = "".join(f"<tr><td>{esc(e['id'])}</td><td><a href='{esc(e['url'])}'>{esc(e['platform_name'])}</a></td><td>{esc(e['status'])}</td>"
                       f"<td>{e['observation_confidence']}</td><td>{e['correlation_confidence']}</td><td>{esc(e['source_quality'])}</td><td>{e['intelligence_priority_score']}</td></tr>" for e in a["evidence"])
        parts.append(f"<h2>{esc(L('evidence'))}</h2><table><tr><th>ID</th><th>Platform</th><th>Status</th><th>Obs</th><th>Corr</th><th>SQ</th><th>IPS</th></tr>{rows}</table>")
    if s["hypotheses"]:
        parts.append(f"<h2>{esc(L('hypotheses'))}</h2>" + "".join(
            f"<div class='card'><span class='pill'>{esc(h['confidence'])}</span><b>{esc(h['id'])}</b>{' <span class=pill>' + esc(L('alternative')) + '</span>' if h['alternative'] else ''} {esc(h['statement'])}<br><span class='mut'>{esc(L('caveat'))}: {esc(h['caveat'])}</span></div>" for h in a["hypotheses"]))
    if s["contradictions"]:
        items = a["contradictory_evidence"] or [L("noContradiction")]
        parts.append(f"<h2>{esc(L('contradictions'))}</h2><ul>" + "".join(f"<li>{esc(x)}</li>" for x in items) + "</ul>")
    if s["gaps"]:
        parts.append(f"<h2>{esc(L('gaps'))}</h2>" + "".join(f"<div class='card'><span class='pill'>{esc(g['severity'])}</span><b>{esc(g['id'])}</b> {esc(g['question'])}<br><span class='mut'>{esc(g['reason'])}</span></div>" for g in a["gaps"]))
    if s["pivots"]:
        parts.append(f"<h2>{esc(L('pivots'))}</h2>" + "".join(f"<div class='card'><span class='pill'>{esc(p['priority'])} · IPS {p['priority_score']}</span>{esc(p['action'])}<br><span class='mut'>{esc(L('signal'))}: {esc(p['signal'])}</span></div>" for p in a["pivots"]))
    if s["collection_plan"]:
        parts.append(f"<h2>{esc(L('plan'))}</h2><ol>" + "".join(f"<li>{esc(x)}</li>" for x in a["collection_plan"]) + f"</ol><p><b>{esc(L('stop'))}:</b> {esc(a['stop_condition'])}</p>")
    parts.append(f"<p class='mut'>{esc(L('generated'))} {esc(label(lang, 'integrityNote'))}</p>")
    return (f"<!doctype html><html lang='{lang}'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            f"<title>Mineiro · {esc(a['target'])}</title><style>{_CSS}</style></head><body><main>{''.join(parts)}</main></body></html>")


def _csv(a: dict) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "platform", "category", "status", "url", "status_code", "observation_confidence", "correlation_confidence",
                     "source_quality", "ips", "evidence_hash"])
    for e in a["evidence"]:
        writer.writerow([e["id"], e["platform_name"], e["category"], e["status"], e["url"], e["status_code"], e["observation_confidence"],
                         e["correlation_confidence"], e["source_quality"], e["intelligence_priority_score"], e["evidence_hash"] or ""])
    return buf.getvalue()


def export_report(assessment: dict, results: list[ScanResult], fmt: str = "markdown", selection: dict | None = None) -> tuple[str, dict]:
    """Returns (payload, manifest). The manifest hash covers the payload exactly as returned."""
    if fmt not in FORMATS:
        raise ValueError(f"format must be one of {FORMATS}")
    s = _selected(selection)
    if fmt == "json":
        payload = json.dumps(build_json_payload(assessment, results, s), indent=2, ensure_ascii=False)
    elif fmt == "markdown":
        payload = _md(assessment, s)
    elif fmt == "html":
        payload = _html(assessment, s)
    elif fmt == "csv":
        payload = _csv(assessment)
    elif fmt == "stix":
        payload = json.dumps(build_stix_bundle(assessment["target"], results), indent=2)
    else:
        payload = graph_to_cypher(assessment["graph"])
    manifest = {
        "schema": "mineiro.export-manifest.v2", "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "target": assessment["target"], "intelligence_requirement": assessment["intelligence_requirement"], "format": fmt,
        "generated_locally": True, "included": [k for k, v in s.items() if v], "excluded": [k for k, v in s.items() if not v],
        "payload_sha256": sha256_text(payload), "hash_scope": "payload-before-manifest", "language": assessment["language"],
    }
    return payload, manifest


_EXT = {"html": "html", "json": "json", "markdown": "md", "csv": "csv", "stix": "stix.json", "cypher": "cypher"}


def write_report(assessment: dict, results: list[ScanResult], directory: str | Path, fmt: str = "markdown",
                 selection: dict | None = None) -> tuple[Path, Path]:
    payload, manifest = export_report(assessment, results, fmt, selection)
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    stem = "".join(c if c.isalnum() or c in "-_" else "_" for c in assessment["target"]) or "target"
    path = directory / f"mineiro-{stem}.{_EXT[fmt]}"
    path.write_bytes(payload.encode("utf-8"))  # bytes: no newline translation, so the hash stays exact
    manifest_path = path.with_name(path.name + ".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return path, manifest_path


def verify_manifest(path: str | Path, manifest_path: str | Path | None = None) -> bool:
    """True when the file still matches the SHA-256 in its manifest."""
    path = Path(path)
    manifest = json.loads(Path(manifest_path or path.with_name(path.name + ".manifest.json")).read_text(encoding="utf-8"))
    return hashlib.sha256(path.read_bytes()).hexdigest() == manifest["payload_sha256"]
