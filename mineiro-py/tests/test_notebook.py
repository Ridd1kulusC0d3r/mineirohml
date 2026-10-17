import json
from pathlib import Path

NOTEBOOK = Path(__file__).resolve().parents[1] / "notebooks" / "Mineiro_Python_Colab.ipynb"


def test_notebook_is_clean_and_valid():
    nb = json.loads(NOTEBOOK.read_text(encoding="utf-8"))
    assert nb["nbformat"] == 4 and len(nb["cells"]) >= 8
    source = "".join("".join(c["source"]) for c in nb["cells"])
    for token in ("mineiro.ui", "launch()", "subdirectory=mineiro-py", "verify_manifest", "BRANCHES", "run_form", "doctor", "#@param"):
        assert token in source
    for forbidden in ("npm ", "node ", "proxyPort", "GEMINI", "api_key"):
        assert forbidden not in source
    for cell in nb["cells"]:
        if cell["cell_type"] == "code":
            assert cell["outputs"] == [] and cell["execution_count"] is None
            # notebook magics and top-level await are valid in IPython; strip them to syntax-check the rest
            lines = [ln for ln in "".join(cell["source"]).splitlines() if not ln.startswith("%")]
            compile("\n".join(lines).replace("async with", "with").replace("await ", ""), "cell", "exec")
