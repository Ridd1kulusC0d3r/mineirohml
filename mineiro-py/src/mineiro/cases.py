"""Long-lived cases: SQLite snapshots of collections and Diff Intelligence between two collections.

DISAPPEARED is a difference between collections, not proof that an account was deleted.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .scan import ScanResult

CONCLUSIVE = {"found", "not_found"}


def default_db_path() -> Path:
    return Path(os.environ.get("MINEIRO_HOME", Path.home() / ".mineiro")) / "cases.sqlite"


class CaseStore:
    def __init__(self, path: str | Path | None = None) -> None:
        self.path = str(path or default_db_path())
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, name TEXT, target TEXT, created_at TEXT, notes TEXT);
            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
                collected_at TEXT, preset TEXT, results_json TEXT, found INTEGER, uncertain INTEGER, total INTEGER);
        """)

    def close(self) -> None:
        self.db.close()

    def get_or_create_case(self, target: str, name: str | None = None) -> str:
        row = self.db.execute("SELECT id FROM cases WHERE lower(target)=lower(?)", (target,)).fetchone()
        if row:
            return row["id"]
        case_id = f"case_{uuid.uuid4().hex[:10]}"
        self.db.execute("INSERT INTO cases (id,name,target,created_at) VALUES (?,?,?,?)",
                        (case_id, name or f"Case: {target}", target, _now()))
        self.db.commit()
        return case_id

    def add_snapshot(self, case_id: str, results: list[ScanResult], preset: str = "standard") -> str:
        snap_id = f"snap_{uuid.uuid4().hex[:10]}"
        self.db.execute(
            "INSERT INTO snapshots VALUES (?,?,?,?,?,?,?,?)",
            (snap_id, case_id, _now(), preset, json.dumps([r.to_dict() for r in results]),
             sum(r.status == "found" for r in results),
             sum(r.status in ("uncertain", "rate_limited") for r in results), len(results)))
        self.db.commit()
        return snap_id

    def list_cases(self) -> list[dict]:
        rows = self.db.execute("""SELECT c.id, c.name, c.target, c.created_at, count(s.id) AS snapshots
                                  FROM cases c LEFT JOIN snapshots s ON s.case_id=c.id GROUP BY c.id ORDER BY c.created_at DESC""")
        return [dict(r) for r in rows]

    def list_snapshots(self, case_id: str) -> list[dict]:
        rows = self.db.execute("SELECT id, collected_at, preset, found, uncertain, total FROM snapshots WHERE case_id=? ORDER BY collected_at, rowid",
                               (case_id,))
        return [dict(r) for r in rows]

    def load_snapshot(self, snapshot_id: str) -> list[ScanResult]:
        row = self.db.execute("SELECT results_json FROM snapshots WHERE id=?", (snapshot_id,)).fetchone()
        if not row:
            raise KeyError(snapshot_id)
        return [ScanResult.from_dict(d) for d in json.loads(row["results_json"])]

    def delete_case(self, case_id: str) -> None:
        self.db.execute("DELETE FROM snapshots WHERE case_id=?", (case_id,))
        self.db.execute("DELETE FROM cases WHERE id=?", (case_id,))
        self.db.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _meta_signature(r: ScanResult | None) -> str:
    if r is None or not r.metadata:
        return ""
    m = r.metadata
    return json.dumps({"displayName": m.get("displayName", ""), "extractedLinks": sorted(m.get("extractedLinks", []))}, sort_keys=True)


def _classify(before: ScanResult | None, after: ScanResult | None) -> tuple[str, list[str], str]:
    if before is None and after is not None:
        return "NEW", ["platform"], "This platform appears in the newer collection but not in the previous snapshot."
    if before is not None and after is None:
        return ("DISAPPEARED", ["platform"],
                "This platform is absent from the newer collection scope. Treat disappearance as a collection change, not proof that an account was deleted.")
    assert before is not None and after is not None
    fields = []
    if before.status != after.status:
        fields.append("status")
    if before.url != after.url:
        fields.append("url")
    if before.status_code != after.status_code:
        fields.append("status_code")
    if _meta_signature(before) != _meta_signature(after):
        fields.append("metadata")
    delta = after.confidence_score - before.confidence_score
    if not fields and delta >= 10:
        return "CONFIDENCE_UP", ["confidence"], f"Observation confidence increased by {round(delta)} points."
    if not fields and delta <= -10:
        return "CONFIDENCE_DOWN", ["confidence"], f"Observation confidence decreased by {round(abs(delta))} points."
    if fields:
        uncertain = (before.status not in CONCLUSIVE or after.status not in CONCLUSIVE) and before.status != after.status
        return ("CHANGED", fields,
                "The observation changed, but at least one snapshot is inconclusive. Review evidence before treating this as a real account-state change."
                if uncertain else "Material public observation fields changed between collection snapshots.")
    return "UNCHANGED", [], "No material difference detected between snapshots."


def diff_collections(before: list[ScanResult], after: list[ScanResult], target: str = "") -> dict:
    b = {r.platform_id: r for r in before}
    a = {r.platform_id: r for r in after}
    entries = []
    for pid in sorted(set(b) | set(a)):
        kind, fields, note = _classify(b.get(pid), a.get(pid))
        ex = a.get(pid) or b[pid]
        entries.append({
            "platform_id": pid, "platform_name": ex.platform_name, "category": ex.category, "change_type": kind,
            "before_status": b[pid].status if pid in b else None, "after_status": a[pid].status if pid in a else None,
            "before_confidence": b[pid].confidence_score if pid in b else None,
            "after_confidence": a[pid].confidence_score if pid in a else None,
            "changed_fields": fields, "note": note,
        })
    counts = {k: 0 for k in ("NEW", "DISAPPEARED", "CHANGED", "UNCHANGED", "CONFIDENCE_UP", "CONFIDENCE_DOWN")}
    for e in entries:
        counts[e["change_type"]] += 1
    material = sum(v for k, v in counts.items() if k != "UNCHANGED")
    return {
        "target": target, "generated_at": _now(), "entries": entries, "counts": counts, "material_changes": material,
        "summary": (f"{material} material change(s) detected across {len(entries)} platform observations." if material
                    else f"No material change detected across {len(entries)} platform observations."),
    }
