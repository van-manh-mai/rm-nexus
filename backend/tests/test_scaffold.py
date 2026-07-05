"""Scaffold smoke test — confirms the backend dependency set installs and imports,
and that the runtime meets the minimum Python version.

The real behavioural guarantees (NBC JSON contract, tool-less boundary, no-key
fallback, SSE smoke) arrive as dedicated tests in item 2. This keeps CI green from
the first commit so the pipeline is proven before product code lands.
"""

import sys


def test_dependencies_importable():
    import anthropic  # noqa: F401
    import fastapi  # noqa: F401
    import httpx  # noqa: F401


def test_python_version_supported():
    assert sys.version_info >= (3, 10)
