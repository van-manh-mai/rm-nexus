"""Backend entry point.

Force UTF-8 on stdout/stderr BEFORE importing anything that may emit model output.
On Windows the default cp1252 console encoding raises UnicodeEncodeError the moment a
non-cp1252 character (curly quotes, em dashes, A$ figures) is printed — which the
Anthropic SDK and our logging can produce. Doing this first, in the entry point,
guarantees every downstream import inherits UTF-8 streams.

Then load ``backend/.env`` (if present) so ``ANTHROPIC_API_KEY`` / ``ANTHROPIC_MODEL``
take effect for a normal ``python backend/run.py`` launch — the mechanism ``.env.example``
documents. This lives ONLY in the entry point, never in ``server.py``, so the key-free test
suite stays hermetic: a developer's local ``.env`` can never leak a key into
``test_no_key_fallback``. Real environment variables still win (``load_dotenv`` does not
override values already set).
"""

import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

from pathlib import Path  # noqa: E402  — after the stream reconfigure; see module docstring
from dotenv import load_dotenv  # noqa: E402

# Resolve .env next to this file so the load works regardless of the caller's working
# directory (the documented launch command runs from the repo root, not backend/).
load_dotenv(Path(__file__).resolve().parent / ".env")

import uvicorn  # noqa: E402  — intentional: reconfigure streams before any heavy import


def main() -> None:
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
