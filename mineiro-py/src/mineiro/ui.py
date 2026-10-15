"""Notebook interface (Google Colab / Jupyter). Renders inside the notebook: no server, no proxy, no JavaScript bundle.

    from mineiro.ui import launch
    launch()                      # form with presets, live progress, report and downloads
"""

from __future__ import annotations

import asyncio
import html
from pathlib import Path

from .assessment import build_assessment
from .export import FORMATS, _CSS, write_report
from .i18n import LANGUAGES, REQUIREMENTS
from .scan import SCAN_PRESETS, Scanner, ScanResult

OUT_DIR = Path("mineiro-reports")


def _badge(status: str) -> str:
    colors = {"found": "#2ea043", "not_found": "#6e7681", "uncertain": "#d29922", "rate_limited": "#d29922", "error": "#f85149"}
    return f"<span style='background:{colors.get(status, '#6e7681')};color:#fff;border-radius:6px;padding:1px 7px;font-size:12px'>{html.escape(status)}</span>"


def results_table(results: list[ScanResult], *, only_relevant: bool = True) -> str:
    rows = [r for r in results if r.status in ("found", "uncertain", "rate_limited")] if only_relevant else results
    rows = sorted(rows, key=lambda r: (r.status != "found", -r.confidence_score))
    body = "".join(
        f"<tr><td>{html.escape(r.platform_name)}</td><td>{_badge(r.status)}</td><td>{r.confidence_score}%</td><td>{html.escape(r.evidence_level)}</td>"
        f"<td><a href='{html.escape(r.url)}' target='_blank' rel='noopener noreferrer'>{html.escape(r.url)}</a></td></tr>" for r in rows)
    return (f"<style>{_CSS}</style><table><tr><th>Platform</th><th>Status</th><th>Conf.</th><th>Evidence</th><th>URL</th></tr>{body}</table>"
            if rows else "<p>No findings.</p>")


def summary_html(assessment: dict) -> str:
    c = assessment["collection"]
    judgments = "".join(f"<li><b>{html.escape(j['id'])}</b> [{html.escape(j['confidence'])}] {html.escape(j['text'])}</li>" for j in assessment["judgments"])
    gaps = "".join(f"<li>{html.escape(g['question'])}</li>" for g in assessment["gaps"])
    return (f"<style>{_CSS}</style><div class='card'><b>{html.escape(assessment['target'])}</b> · "
            f"{c['found']} found · {c['absent']} absent · {c['uncertain'] + c['rate_limited']} inconclusive · {c['errors']} errors · "
            f"coverage {c['effective_coverage_percent']}% · confidence <span class='pill'>{html.escape(assessment['assessment_confidence'])}</span></div>"
            f"<h2>Judgments</h2><ul>{judgments}</ul><h2>Open gaps</h2><ul>{gaps or '<li>none</li>'}</ul>"
            "<p class='mut'>A FOUND is an observation, not proof of identity.</p>")


async def scan_and_report(target: str, *, preset: str = "standard", lang: str = "en", requirement: str = "account_correlation",
                          category: str = "all", out_dir: str | Path = OUT_DIR, formats: tuple[str, ...] = ("html", "markdown", "json"),
                          show=None) -> tuple[list[ScanResult], dict, list[Path]]:
    """Scans, assesses and writes reports. `show` receives progress strings (defaults to print)."""
    show = show or print
    async with Scanner(preset=preset, category=category) as scanner:
        async def tick(result: ScanResult, done: int, total: int) -> None:
            if result.status == "found" or done == total:
                show(f"[{done}/{total}] {result.platform_name}: {result.status}")

        results = await scanner.scan(target, on_result=tick)
    assessment = build_assessment(results, target, requirement, lang)
    paths = [write_report(assessment, results, out_dir, fmt)[0] for fmt in formats]
    return results, assessment, paths


def launch() -> None:
    """Interactive form for Colab/Jupyter (needs ipywidgets, preinstalled in Colab)."""
    import ipywidgets as w
    from IPython.display import HTML, FileLink, display

    target = w.Text(placeholder="public username (you must be authorized to investigate it)", description="Target", layout=w.Layout(width="520px"))
    preset = w.ToggleButtons(options=[(f"{k} ({SCAN_PRESETS[k]['scope']})", k) for k in SCAN_PRESETS], value="standard", description="Preset")
    lang = w.Dropdown(options=list(LANGUAGES), value="en", description="Language")
    requirement = w.Dropdown(options=list(REQUIREMENTS), value="account_correlation", description="Requirement", layout=w.Layout(width="360px"))
    run = w.Button(description="Run scan", button_style="primary", icon="search")
    log = w.Output()
    view = w.Output()

    async def _run() -> None:
        run.disabled = True
        log.clear_output()
        view.clear_output()
        try:
            def show(msg: str) -> None:
                with log:
                    print(msg)

            results, assessment, paths = await scan_and_report(target.value.strip(), preset=preset.value, lang=lang.value,
                                                               requirement=requirement.value, show=show)
            with view:
                display(HTML(summary_html(assessment)))
                display(HTML(results_table(results)))
                for path in paths:
                    display(FileLink(str(path)))
        except Exception as exc:  # show it in the notebook instead of failing silently
            with view:
                print("Error:", exc)
        finally:
            run.disabled = False

    def on_click(_button) -> None:
        if not target.value.strip():
            return
        try:
            asyncio.get_running_loop().create_task(_run())
        except RuntimeError:
            asyncio.run(_run())

    run.on_click(on_click)
    display(w.VBox([target, preset, w.HBox([lang, requirement]), run, log, view]))
