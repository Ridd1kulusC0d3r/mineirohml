import pytest

from mineiro.assessment import build_assessment
from mineiro.ui import results_table, summary_html
from tests.test_engine import sample_results  # noqa: E402


def test_notebook_html_escapes_and_summarizes():
    results = sample_results()
    results[0].platform_name = "<img src=x onerror=alert(1)>"
    table = results_table(results)
    assert "<img src=x" not in table and "&lt;img" in table
    summary = summary_html(build_assessment(results, "<b>ben</b>"))
    assert "<b>ben</b>" not in summary and "not proof of identity" in summary


def test_launch_builds_the_form():
    pytest.importorskip("ipywidgets")
    from IPython.display import display  # noqa: F401
    import mineiro.ui as ui

    shown = []
    import IPython.display as d

    original = d.display
    d.display = lambda *a, **k: shown.append(a)
    try:
        ui.launch()
    finally:
        d.display = original
    assert shown, "launch() should display the form"
