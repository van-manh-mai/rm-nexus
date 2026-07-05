"""Constitution Principle III — the agent returns valid, contract-shaped JSON.

Exercises the *live* model path with a mocked Anthropic client (key-free, no network):
the agent must return exactly 3 next_best items, urgency-ordered (critical > high >
medium > low), each carrying the required narrative fields.
"""

import json

from rm_agent import NBCAgent

_CANNED = json.dumps(
    {
        "client_id": "c01",
        "client_name": "AustralianSuper",
        "summary": "Lock the rate ahead of the REPO maturity.",
        "next_best": [
            {"urgency": "critical", "action": "Lock REPO rate", "text": "…", "acts": ["Book"]},
            {"urgency": "high", "action": "Review buffer", "text": "…", "acts": ["Model"]},
            {"urgency": "medium", "action": "Confirm cadence", "text": "…", "acts": ["Log"]},
        ],
    }
)


class _FakeBlock:
    type = "text"
    text = _CANNED


class _FakeResponse:
    content = [_FakeBlock()]


class _FakeMessages:
    def create(self, **kwargs):
        return _FakeResponse()


class _FakeAnthropic:
    def __init__(self, *args, **kwargs):
        self.messages = _FakeMessages()


def test_agent_returns_three_urgency_ordered_items(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr("anthropic.Anthropic", _FakeAnthropic)

    text = NBCAgent().generate({"id": "c01", "name": "AustralianSuper"})
    briefing = json.loads(text)

    items = briefing["next_best"]
    assert len(items) == 3

    order = ["critical", "high", "medium", "low"]
    ranks = [order.index(i["urgency"]) for i in items]
    assert ranks == sorted(ranks)  # urgency-ordered, most urgent first

    for item in items:
        assert {"urgency", "action", "text", "acts"} <= set(item)
