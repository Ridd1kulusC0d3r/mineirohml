"""Graph hunting: read-only local query language (MGQ) and Cypher export over the correlation graph.

    MATCH type=PROFILE            EDGE relationship=SAME_DOMAIN     SHARED type=DOMAIN
    MATCH candidate=true          EDGE confidence>=80               PATH from=TARGET to=PROFILE
    MATCH label~pascho            MATCH similarity>=80              (clauses can be joined with AND)

Mineiro only generates text for Neo4j; it never connects anywhere or sends graph data out.
"""

from __future__ import annotations

import operator
import re
from collections import defaultdict, deque

from .variants import UsernameVariant

_OPS = {">=": operator.ge, "<=": operator.le, ">": operator.gt, "<": operator.lt, "=": operator.eq}

PRESETS = {
    "similar": "MATCH candidate=true AND similarity>=70",
    "shared-domains": "SHARED type=DOMAIN",
    "profiles": "MATCH type=PROFILE",
    "strong-edges": "EDGE confidence>=80",
    "same-domain": "EDGE relationship=SAME_DOMAIN",
    "target-profiles": "PATH from=TARGET to=PROFILE",
}


def add_variant_candidates(graph: dict, target: str, variants: list[UsernameVariant], limit: int = 10) -> dict:
    """Adds username permutations as dashed candidate nodes. They are similarity leads, not observations."""
    nodes, edges = list(graph["nodes"]), list(graph["edges"])
    anchor = f"username:{target.lower()}"
    for variant in variants[:limit]:
        nid = f"candidate:{variant.value.lower()}"
        nodes.append({"id": nid, "type": "USERNAME", "label": variant.value, "provenance": "DERIVED", "evidence_id": None,
                      "candidate": True, "similarity_score": variant.similarity, "variant_kind": variant.kind})
        edges.append({"id": f"edge:candidate:{variant.value}", "source": anchor, "target": nid, "relationship": "SIMILAR_TO",
                      "confidence": variant.similarity, "provenance": "DERIVED", "candidate": True})
    return {"nodes": nodes, "edges": edges}


def _connected(edges: list[dict], edge_ids: set[str]) -> set[str]:
    out: set[str] = set()
    for e in edges:
        if e["id"] in edge_ids:
            out.update((e["source"], e["target"]))
    return out


def run_graph_query(raw_query: str, graph: dict) -> dict:
    nodes, edges = graph["nodes"], graph["edges"]
    by_id = {n["id"]: n for n in nodes}
    edge_by_id = {e["id"]: e for e in edges}
    query = " ".join(raw_query.split())
    if not query:
        return {"query": query, "matched_node_ids": [n["id"] for n in nodes], "matched_edge_ids": [e["id"] for e in edges],
                "summary": f"{len(nodes)} nodes · {len(edges)} edges", "warnings": []}

    warnings: list[str] = []
    node_hits = {n["id"] for n in nodes}
    edge_hits = {e["id"] for e in edges}
    clauses = [c.strip() for c in re.split(r"\s+AND\s+", query, flags=re.I) if c.strip()]

    for clause in clauses:
        if m := re.match(r"^(?:MATCH\s+)?type\s*=\s*([A-Z0-9_:-]+)$", clause, re.I):
            node_hits = {i for i in node_hits if by_id[i]["type"].upper() == m.group(1).upper()}
        elif m := re.match(r"^(?:MATCH\s+)?candidate\s*=\s*(true|false)$", clause, re.I):
            want = m.group(1).lower() == "true"
            node_hits = {i for i in node_hits if bool(by_id[i].get("candidate")) == want}
        elif m := re.match(r"^(?:MATCH\s+)?label\s*~\s*(.+)$", clause, re.I):
            needle = m.group(1).strip("\"'").lower()
            node_hits = {i for i in node_hits if needle in by_id[i]["label"].lower()}
        elif m := re.match(r"^(?:MATCH\s+)?similarity\s*(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$", clause, re.I):
            op, want = _OPS[m.group(1)], float(m.group(2))
            node_hits = {i for i in node_hits if isinstance(by_id[i].get("similarity_score"), (int, float))
                         and op(by_id[i]["similarity_score"], want)}
        elif m := re.match(r"^EDGE\s+relationship\s*=\s*([A-Z0-9_:-]+)$", clause, re.I):
            edge_hits = {i for i in edge_hits if edge_by_id[i]["relationship"].upper() == m.group(1).upper()}
            node_hits = _connected(edges, edge_hits)
        elif m := re.match(r"^EDGE\s+confidence\s*(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$", clause, re.I):
            op, want = _OPS[m.group(1)], float(m.group(2))
            edge_hits = {i for i in edge_hits if op(edge_by_id[i].get("confidence", 0), want)}
            node_hits = _connected(edges, edge_hits)
        elif m := re.match(r"^SHARED\s+type\s*=\s*([A-Z0-9_:-]+)$", clause, re.I):
            degree: dict[str, int] = defaultdict(int)
            for e in edges:
                degree[e["source"]] += 1
                degree[e["target"]] += 1
            node_hits = {n["id"] for n in nodes if n["type"].upper() == m.group(1).upper() and degree[n["id"]] >= 2}
            edge_hits = {e["id"] for e in edges if e["source"] in node_hits or e["target"] in node_hits}
        elif m := re.match(r"^PATH\s+from\s*=\s*([A-Z0-9_:-]+)\s+to\s*=\s*([A-Z0-9_:-]+)$", clause, re.I):
            starts = [n["id"] for n in nodes if n["type"].upper() == m.group(1).upper()]
            goals = {n["id"] for n in nodes if n["type"].upper() == m.group(2).upper()}
            adjacency: dict[str, list[tuple[str, str]]] = defaultdict(list)
            for e in edges:
                adjacency[e["source"]].append((e["target"], e["id"]))
                adjacency[e["target"]].append((e["source"], e["id"]))
            found_nodes: set[str] = set()
            found_edges: set[str] = set()
            for start in starts:
                queue = deque([(start, [start], [])])
                seen = {start}
                while queue:
                    current, path_nodes, path_edges = queue.popleft()
                    if current in goals and current != start:
                        found_nodes.update(path_nodes)
                        found_edges.update(path_edges)
                        continue
                    if len(path_nodes) > 6:
                        continue
                    for nxt, eid in adjacency[current]:
                        if nxt not in seen:
                            seen.add(nxt)
                            queue.append((nxt, path_nodes + [nxt], path_edges + [eid]))
            node_hits, edge_hits = found_nodes, found_edges
        else:
            warnings.append(f"Unsupported clause: {clause}")

    if not any(re.match(r"^(EDGE|SHARED|PATH)", c, re.I) for c in clauses):
        edge_hits = {e["id"] for e in edges if e["source"] in node_hits and e["target"] in node_hits}
    return {"query": query, "matched_node_ids": sorted(node_hits), "matched_edge_ids": sorted(edge_hits),
            "summary": f"{len(node_hits)} nodes · {len(edge_hits)} edges", "warnings": warnings}


def _esc(value) -> str:
    return str(value if value is not None else "").replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def graph_to_cypher(graph: dict) -> str:
    """Idempotent Cypher (MERGE) for Neo4j. Candidate relationships stay explicitly marked."""
    lines = ["// Mineiro Username Intelligence · Neo4j export", "// Generated locally. Candidate relationships remain explicitly marked.", ""]
    for n in graph["nodes"]:
        sim = n.get("similarity_score")
        lines.append(
            f'MERGE (n:MineiroNode {{id:"{_esc(n["id"])}"}}) SET n.label="{_esc(n["label"])}", n.type="{_esc(n["type"])}", '
            f'n.candidate={str(bool(n.get("candidate"))).lower()}, n.evidenceId="{_esc(n.get("evidence_id"))}", '
            f'n.similarityScore={sim if isinstance(sim, (int, float)) else "null"};')
    lines.append("")
    for e in graph["edges"]:
        rel = re.sub(r"[^A-Z0-9_]", "_", e["relationship"].upper()) or "RELATED_TO"
        lines.append(
            f'MATCH (a:MineiroNode {{id:"{_esc(e["source"])}"}}), (b:MineiroNode {{id:"{_esc(e["target"])}"}}) '
            f'MERGE (a)-[r:{rel} {{id:"{_esc(e["id"])}"}}]->(b) SET r.confidence={e.get("confidence", 0)}, '
            f'r.candidate={str(bool(e.get("candidate"))).lower()}, r.evidenceId="{_esc(e.get("evidence_id"))}";')
    return "\n".join(lines)
