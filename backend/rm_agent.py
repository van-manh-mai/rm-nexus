"""Tool-less NBC agent.

Turns ONE pre-populated client profile into a "Next Best Conversation" (NBC) briefing
as JSON. The agent NARRATES ONLY — Constitution Principle I:

  * It has no tools (empty tool set — asserted by ``test_boundary_no_tools``), so it
    structurally cannot compute, look up, or alter a figure.
  * Every figure it cites is read from the supplied profile.

Fallback (Principle II — zero-live-LLM floor): if ``ANTHROPIC_API_KEY`` is absent, or the
model call fails, ``generate()`` returns a deterministic template briefing built from the
profile and makes NO network call (asserted by ``test_no_key_fallback``). ``generate()``
never raises — malformed *live* model output is caught downstream in the worker, which
degrades that client to its static briefing via ``__NBC_ERROR__``.
"""

from __future__ import annotations

import json
import os

BANK_NAME = "Aussie Bank"
REGULATOR = "APRA"
DEFAULT_MODEL = "claude-haiku-4-5-20251001"

# Urgency severity, highest first. Used to order template items and to validate ordering.
URGENCY_ORDER = ["critical", "high", "medium", "low"]


def _system_prompt() -> str:
    return (
        f"You are a relationship-management analyst at {BANK_NAME}, an Australian "
        f"institutional bank regulated by {REGULATOR}. You are given ONE institutional "
        f"client profile. Produce a 'Next Best Conversation' briefing as a single JSON "
        f"object and NOTHING else — no markdown, no preamble.\n\n"
        f"Rules:\n"
        f'- Output valid JSON only, matching exactly: {{"client_id","client_name",'
        f'"summary","next_best":[{{"urgency","action","text","acts"}}]}}.\n'
        f"- Exactly 3 next_best items, ordered by urgency: critical > high > medium > low.\n"
        f"- summary <= 20 words. action 3-6 words. text 2-3 sentences citing A$ amounts and "
        f"{REGULATOR} thresholds (e.g. APS 210 liquidity). acts: 1-3 short button labels.\n"
        f"- You NARRATE ONLY. Every figure MUST come from the supplied profile. Never compute, "
        f"round, or invent a number."
    )


class NBCAgent:
    """A narration-only agent with an intentionally empty tool set."""

    #: The boundary, by construction: no tools. Asserted by ``test_boundary_no_tools``.
    tools: list = []

    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)

    def generate(self, client: dict) -> str:
        """Return an NBC briefing as a JSON string. Never raises; degrades to a
        deterministic template on missing key or any model-call failure."""
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return self._template(client)
        try:
            return self._call_model(client, api_key)
        except Exception:
            return self._template(client)

    def _call_model(self, client: dict, api_key: str) -> str:
        # Imported lazily so the no-key path never touches the network stack.
        import anthropic

        agent_client = anthropic.Anthropic(api_key=api_key)
        prompt = (
            f"Institutional client profile:\n{json.dumps(client)}\n\n"
            f"Generate the NBC briefing."
        )
        # NOTE: no ``tools=`` argument — the agent has no tools (``self.tools`` is empty).
        response = agent_client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=_system_prompt(),
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in response.content if block.type == "text")

    def _template(self, client: dict) -> str:
        """Deterministic, offline NBC built entirely from profile figures."""
        sym = client.get("currencySymbol", "A$")
        name = client.get("name", "the client")
        cid = client.get("id", "unknown")
        net = client.get("netPosition", 0)
        exposure = client.get("exposure", 0)
        score = client.get("liquidityScore", 0)
        revenue = client.get("revenue", 0)
        alert = client.get("alertLevel", "medium")

        # Window of 3 urgencies starting at the client's alert level, clamped so 3 always fit.
        start = min(URGENCY_ORDER.index(alert) if alert in URGENCY_ORDER else 1, 1)
        urgencies = URGENCY_ORDER[start : start + 3]

        bodies = [
            (
                "Review liquidity position",
                f"Liquidity score is {score}/100 against the {REGULATOR} APS 210 warning zone. "
                f"Net position is {sym}{net}M on {sym}{exposure}M total exposure. Confirm the "
                f"buffer ahead of the next reporting cycle.",
                ["Book review", "Send APS 210 note"],
            ),
            (
                "Discuss deployment options",
                f"With {sym}{net}M net position and {sym}{revenue}M revenue YTD, there is scope to "
                f"discuss reinvestment or hedging against the {sym}{exposure}M exposure.",
                ["Model options", "Schedule call"],
            ),
            (
                "Confirm relationship cadence",
                f"Maintain contact cadence for {name}. Revenue YTD is {sym}{revenue}M; use the next "
                f"touchpoint to validate product mix and upcoming maturities.",
                ["Log contact"],
            ),
        ]
        next_best = [
            {"urgency": u, "action": a, "text": t, "acts": acts}
            for u, (a, t, acts) in zip(urgencies, bodies)
        ]
        briefing = {
            "client_id": cid,
            "client_name": name,
            "summary": f"{name}: liquidity {score}/100, net {sym}{net}M — review buffer and deployment.",
            "next_best": next_best,
        }
        return json.dumps(briefing)
