"""Command line interface: `mineiro scan someuser --preset standard --out reports/`."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from . import __version__
from .assessment import build_assessment
from .cases import CaseStore, diff_collections
from .export import FORMATS, verify_manifest, write_report
from .graph import PRESETS, add_variant_candidates, graph_to_cypher, run_graph_query
from .i18n import LANGUAGES, REQUIREMENTS
from .recon import recon_email
from .registry import load_registry
from .scan import SCAN_PRESETS, Scanner, ScanResult
from .variants import generate_username_variants

ICON = {"found": "✔", "not_found": "·", "uncertain": "?", "rate_limited": "~", "error": "!"}


def _progress(result: ScanResult, done: int, total: int, *, quiet: bool) -> None:
    if quiet:
        return
    if result.status in ("found", "uncertain", "rate_limited") or done == total or done % 10 == 0:
        mark = ICON.get(result.status, "?")
        extra = f" {result.confidence_score}%" if result.status == "found" else ""
        print(f"[{done:>3}/{total}] {mark} {result.platform_name}{extra}", file=sys.stderr)


async def _scan(args: argparse.Namespace) -> int:
    registry = load_registry()
    scanner_kwargs = {"preset": args.preset, "category": args.category}
    if args.concurrency:
        scanner_kwargs["concurrency"] = args.concurrency
    if args.timeout:
        scanner_kwargs["timeout"] = args.timeout
    async with Scanner(registry, **scanner_kwargs) as scanner:
        results = await scanner.scan(args.target, on_result=lambda r, d, t: _progress(r, d, t, quiet=args.quiet))

    assessment = build_assessment(results, args.target, args.requirement, args.lang)
    graph = assessment["graph"]
    if args.variants:
        graph = add_variant_candidates(graph, args.target, generate_username_variants(args.target))
        assessment["graph"] = graph

    cov = assessment["collection"]
    print(f"\n{args.target}: {cov['found']} found · {cov['absent']} absent · {cov['uncertain'] + cov['rate_limited']} inconclusive · "
          f"{cov['errors']} errors · coverage {cov['effective_coverage_percent']}% · confidence {assessment['assessment_confidence']}")
    for e in assessment["evidence"]:
        if e["status"] == "found":
            print(f"  ✔ {e['platform_name']:<24} {e['source_quality']} · IPS {e['intelligence_priority_score']:>3} · {e['url']}")
    for j in assessment["judgments"]:
        print(f"  • {j['id']} [{j['confidence']}] {j['text']}")

    if args.query:
        out = run_graph_query(PRESETS.get(args.query, args.query), graph)
        print(f"\ngraph query: {out['summary']}", *out["warnings"])

    if args.out:
        for fmt in args.format.split(","):
            path, manifest = write_report(assessment, results, args.out, fmt.strip())
            print(f"  wrote {path} (+ {manifest.name})")
        raw = Path(args.out) / f"mineiro-{args.target}.assessment.json"
        raw.write_text(json.dumps({"assessment": assessment, "results": [r.to_dict() for r in results]}, indent=2, ensure_ascii=False), encoding="utf-8")
    if args.case:
        store = CaseStore(args.db)
        snap = store.add_snapshot(store.get_or_create_case(args.target), results, args.preset)
        print(f"  saved snapshot {snap}")
    return 0


def _registry(args: argparse.Namespace) -> int:
    registry = load_registry()
    if args.action == "stats":
        s = registry.stats()
        print(f"{s['totalDetectors']} detectors ({s['scannableDetectors']} scannable) · average reliability {s['averageReliability']} · "
              f"{s['logicalEvidenceChecks']} logical evidence checks")
        for item in s["byCategory"]:
            print(f"  {item['key']:<12} {item['count']:>4}  {item['percent']}%")
    elif args.action == "list":
        for d in registry.scope("all", args.category if args.category else "all"):
            print(f"{d.id:<22} {d.category:<10} {d.reliability:>3} {d.tier:<12} {d.url_pattern}")
    else:
        problems = registry.validate()
        print(f"Validated {len(registry)} registry detectors." if not problems else "\n".join(problems))
        return 1 if problems else 0
    return 0


def _cases(args: argparse.Namespace) -> int:
    store = CaseStore(args.db)
    if args.action == "list":
        for c in store.list_cases():
            print(f"{c['id']}  {c['target']:<24} {c['snapshots']} snapshot(s)  {c['created_at']}")
        return 0
    snaps = store.list_snapshots(args.case_id)
    if args.action == "snapshots":
        for s in snaps:
            print(f"{s['id']}  {s['collected_at']}  {s['preset']}  found={s['found']} total={s['total']}")
        return 0
    if len(snaps) < 2:
        print("Need at least two snapshots to diff.", file=sys.stderr)
        return 1
    before, after = (args.before or snaps[-2]["id"]), (args.after or snaps[-1]["id"])
    report = diff_collections(store.load_snapshot(before), store.load_snapshot(after), args.case_id)
    print(report["summary"], report["counts"])
    for e in report["entries"]:
        if e["change_type"] != "UNCHANGED":
            print(f"  {e['change_type']:<16} {e['platform_name']}  ({e['before_status']} → {e['after_status']})")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="mineiro", description="Mineiro: OSINT username investigation (evidence first).")
    p.add_argument("--version", action="version", version=f"mineiro {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    s = sub.add_parser("scan", help="scan a public username")
    s.add_argument("target")
    s.add_argument("--preset", choices=list(SCAN_PRESETS), default="standard")
    s.add_argument("--category", default="all")
    s.add_argument("--requirement", choices=REQUIREMENTS, default="account_correlation")
    s.add_argument("--lang", choices=LANGUAGES, default="en")
    s.add_argument("--concurrency", type=int)
    s.add_argument("--timeout", type=float)
    s.add_argument("--out", help="directory for reports")
    s.add_argument("--format", default="markdown,json", help=f"comma list of {','.join(FORMATS)}")
    s.add_argument("--variants", action="store_true", help="add username permutations as candidate graph nodes")
    s.add_argument("--query", help="graph query (MGQ) or a preset: " + ", ".join(PRESETS))
    s.add_argument("--case", action="store_true", help="save the collection as a snapshot of a case")
    s.add_argument("--db", help="cases database path")
    s.add_argument("--quiet", action="store_true")

    r = sub.add_parser("registry", help="inspect the detector registry")
    r.add_argument("action", choices=["stats", "list", "validate"])
    r.add_argument("--category")

    v = sub.add_parser("variants", help="generate username permutations with similarity scores")
    v.add_argument("target")
    v.add_argument("--limit", type=int, default=20)

    e = sub.add_parser("email", help="e-mail reconnaissance (syntax, provider, Gravatar, MX if dnspython is installed)")
    e.add_argument("address")

    h = sub.add_parser("hunt", help="run a graph query over a saved assessment json")
    h.add_argument("file")
    h.add_argument("query")
    h.add_argument("--cypher", action="store_true", help="print the graph as Cypher instead")

    c = sub.add_parser("cases", help="long-lived cases and Diff Intelligence")
    c.add_argument("action", choices=["list", "snapshots", "diff"])
    c.add_argument("case_id", nargs="?")
    c.add_argument("--before")
    c.add_argument("--after")
    c.add_argument("--db")

    f = sub.add_parser("verify", help="check an exported file against its SHA-256 manifest")
    f.add_argument("file")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "scan":
        return asyncio.run(_scan(args))
    if args.command == "registry":
        return _registry(args)
    if args.command == "variants":
        for v in generate_username_variants(args.target, args.limit):
            print(f"{v.similarity:>3}  {v.kind:<14} {v.value}")
        return 0
    if args.command == "email":
        print(json.dumps(asyncio.run(recon_email(args.address)), indent=2))
        return 0
    if args.command == "hunt":
        data = json.loads(Path(args.file).read_text(encoding="utf-8"))
        graph = data["assessment"]["graph"] if "assessment" in data else data["graph"]
        if args.cypher:
            print(graph_to_cypher(graph))
            return 0
        out = run_graph_query(PRESETS.get(args.query, args.query), graph)
        print(out["summary"], *out["warnings"])
        by_id = {n["id"]: n for n in graph["nodes"]}
        for nid in out["matched_node_ids"]:
            print(f"  {by_id[nid]['type']:<12} {by_id[nid]['label']}")
        return 0
    if args.command == "cases":
        if args.action != "list" and not args.case_id:
            print("case_id is required", file=sys.stderr)
            return 2
        return _cases(args)
    if args.command == "verify":
        ok = verify_manifest(args.file)
        print("OK: payload matches its manifest" if ok else "MISMATCH: file changed after export")
        return 0 if ok else 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
