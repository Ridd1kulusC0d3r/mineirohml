"""Notebook interface (Google Colab / Jupyter). Renders inside the notebook: no server, no proxy, no JavaScript bundle.

    from mineiro.ui import launch
    launch()                      # form with presets, live progress, report and downloads
"""

from __future__ import annotations

import asyncio
import html
from pathlib import Path

from .assessment import build_assessment
from .export import _CSS, write_report
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


def _enable_colab_widgets() -> None:
    """Colab needs the custom widget manager for ipywidgets 8 and is harmless for 7."""
    try:
        from google.colab import output  # type: ignore

        output.enable_custom_widget_manager()
    except Exception:  # noqa: BLE001  (not in Colab, or already enabled)
        pass


async def run_form(target: str, *, preset: str = "standard", lang: str = "en", requirement: str = "account_correlation",
                   category: str = "all", out_dir: str | Path = OUT_DIR, formats: tuple[str, ...] = ("html", "markdown", "json")) -> dict:
    """Widget-free entry point: scan, show the summary and the findings table, and save the reports.

    Use it from a Colab form cell (`#@param`) with top-level `await`. It has no event-loop callbacks to go wrong.
    """
    from IPython.display import HTML, display

    target = target.strip()
    if not target:
        raise ValueError("Informe um alvo (username público que você está autorizado a investigar).")
    results, assessment, paths = await scan_and_report(target, preset=preset, lang=lang, requirement=requirement,
                                                       category=category, out_dir=out_dir, formats=formats)
    display(HTML(summary_html(assessment)))
    display(HTML(results_table(results)))
    print("Relatórios salvos em:")
    for path in paths:
        print("  ", path)
    return assessment


def launch():
    """Interactive form for Colab/Jupyter (ipywidgets 7 or 8). Returns the widget box.

    Everything the user sees is rendered by assigning `HTML.value`, never from inside an `Output` context, so it
    works from background tasks and with Colab's older widget stack.
    """
    try:
        import ipywidgets as w
        from IPython.display import display
    except ImportError:
        print("ipywidgets não está instalado. Use a célula com formulário (`await run_form(...)`) ou a CLI `mineiro scan`.")
        return None
    _enable_colab_widgets()

    target = w.Text(placeholder="username público (você precisa estar autorizado a investigá-lo)", description="Target",
                    layout=w.Layout(width="560px"))
    preset = w.ToggleButtons(options=[(f"{k} ({SCAN_PRESETS[k]['scope']})", k) for k in SCAN_PRESETS], value="standard", description="Preset")
    lang = w.Dropdown(options=list(LANGUAGES), value="en", description="Language")
    requirement = w.Dropdown(options=list(REQUIREMENTS), value="account_correlation", description="Requirement",
                             layout=w.Layout(width="380px"))
    run = w.Button(description="Run scan", button_style="primary", icon="search")
    status = w.HTML("")
    result = w.HTML("")
    box = w.VBox([target, preset, w.HBox([lang, requirement]), run, status, result])

    async def _run() -> None:
        run.disabled = True
        status.value = "<i>Escaneando…</i>"
        result.value = ""
        try:
            async with Scanner(preset=preset.value) as scanner:
                async def tick(r: ScanResult, done: int, total: int) -> None:
                    status.value = f"<i>[{done}/{total}] {html.escape(r.platform_name)}: {html.escape(r.status)}</i>"

                results = await scanner.scan(target.value.strip(), on_result=tick)
            assessment = build_assessment(results, target.value.strip(), requirement.value, lang.value)
            paths = [write_report(assessment, results, OUT_DIR, fmt)[0] for fmt in ("html", "markdown", "json")]
            files = "".join(f"<li><code>{html.escape(str(p))}</code></li>" for p in paths)
            status.value = "<b>Concluído.</b> Arquivos na barra lateral → pasta <code>mineiro-reports</code>."
            result.value = summary_html(assessment) + results_table(results) + f"<h2>Arquivos</h2><ul>{files}</ul>"
        except Exception:  # noqa: BLE001  (show the error in the page instead of failing silently)
            import traceback

            status.value = f"<b style='color:#f85149'>Erro:</b> <pre>{html.escape(traceback.format_exc()[-1500:])}</pre>"
        finally:
            run.disabled = False

    def on_click(_button) -> None:
        if not target.value.strip():
            status.value = "<b>Informe um alvo.</b>"
            return
        try:
            asyncio.get_running_loop().create_task(_run())
        except RuntimeError:
            asyncio.run(_run())

    run.on_click(on_click)
    box._mineiro_controls = {"target": target, "run": run, "status": status, "result": result}  # for tests
    display(box)
    return box
