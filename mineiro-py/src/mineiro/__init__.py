"""Mineiro: OSINT username investigation workbench.

Collection -> evidence -> correlation -> assessment. A FOUND is an observation, never proof of identity.
"""

__version__ = "2.0.0a1"

from .registry import Registry, load_registry  # noqa: E402
from .scan import Scanner, ScanResult, SCAN_PRESETS  # noqa: E402
from .assessment import build_assessment  # noqa: E402

__all__ = ["__version__", "Registry", "load_registry", "Scanner", "ScanResult", "SCAN_PRESETS", "build_assessment"]
