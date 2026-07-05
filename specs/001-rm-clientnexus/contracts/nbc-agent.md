# Contract: NBC Agent (`backend/rm_agent.py`)

The agent turns ONE pre-populated client profile into a validated NBC briefing. It **narrates
only** — it cannot compute figures (Constitution Principle I).

## Boundary constraints

- The agent receives one client profile as a prompt string. It has **no tools** — the tool set is
  empty (asserted by `test_boundary_no_tools`).
- System prompt is an f-string citing the bank name and the APRA regulator.
- Fallback: if `ANTHROPIC_API_KEY` is absent, or the API call fails, return a deterministic
  template briefing and make **no network call** (asserted by `test_no_key_fallback`).
- Model: `claude-haiku-4-5-20251001` default; `claude-sonnet-4-6` via `ANTHROPIC_MODEL`.

## Output schema (valid JSON only — no markdown, no preamble)

```json
{
  "client_id": "...",
  "client_name": "...",
  "summary": "One-sentence executive summary (max 20 words).",
  "next_best": [
    {
      "urgency": "critical|high|medium|low",
      "action": "Short action title (3-6 words)",
      "text": "Specific RM guidance citing A$ amounts + APRA thresholds. 2-3 sentences.",
      "acts": ["Label 1", "Label 2"]
    }
  ]
}
```

- Exactly 3 `next_best` items, urgency-ordered (critical > high > medium > low).
- Figures cited MUST come from the supplied profile; the agent never computes, rounds, or invents.

## Tests (pytest, key-free via monkeypatch)

| Test | Asserts |
|------|---------|
| `test_nbc_contract` | Agent returns valid JSON with exactly 3 items in correct urgency order. |
| `test_boundary_no_tools` | The agent's tool set is empty (`tool_executor is None` / no tools). |
| `test_no_key_fallback` | With no API key, the template is returned and no network call is made (mocked `anthropic`). |
| `test_sse_smoke` | `POST /api/rm-run` then `GET /api/stream/{id}` yields a terminal `done` event. |
