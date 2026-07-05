"""Constitution Principle II — zero-live-LLM floor.

With no ANTHROPIC_API_KEY, the agent returns a deterministic template briefing and makes
NO network call. We prove "no network call" by making any attempt to construct an
Anthropic client fail loudly — if the fallback path were to reach the network, the test
would error.
"""

import json

from rm_agent import NBCAgent


def test_no_key_returns_template_without_network(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    constructed = {"n": 0}

    class Boom:
        def __init__(self, *args, **kwargs):
            constructed["n"] += 1
            raise AssertionError("no Anthropic client should be constructed without a key")

    monkeypatch.setattr("anthropic.Anthropic", Boom, raising=False)

    text = NBCAgent().generate(
        {"id": "c03", "name": "Macquarie AM", "currencySymbol": "A$", "liquidityScore": 42}
    )
    briefing = json.loads(text)

    assert briefing["client_id"] == "c03"
    assert len(briefing["next_best"]) == 3
    assert constructed["n"] == 0  # network client never touched
