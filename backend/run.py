"""Backend entry point.

Force UTF-8 on stdout/stderr BEFORE importing anything that may emit model output.
On Windows the default cp1252 console encoding raises UnicodeEncodeError the moment a
non-cp1252 character (curly quotes, em dashes, A$ figures) is printed — which the
Anthropic SDK and our logging can produce. Doing this first, in the entry point,
guarantees every downstream import inherits UTF-8 streams.
"""

import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

import uvicorn  # noqa: E402  — intentional: reconfigure streams before any heavy import


def main() -> None:
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main()
