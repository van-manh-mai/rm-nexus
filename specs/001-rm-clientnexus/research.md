# Phase 0 Research: RM ClientNexus

All Technical Context items were specified in the source brief; there were no open
`NEEDS CLARIFICATION` markers. This file records the key decisions and their rationale.

## Decision: Tool-less NBC agent (boundary by construction)

- **Decision**: The NBC agent is created with an empty tool set and receives one client profile as
  a prompt string. It returns only narrated JSON.
- **Rationale**: Constitution Principle I — making the agent unable to call tools removes an entire
  class of hallucinated/computed-figure failures structurally, not by prompt wording. Enforced by
  `test_boundary_no_tools`.
- **Alternatives considered**: Giving the agent calculator/data tools (rejected — reintroduces the
  ability to alter figures); post-hoc figure validation only (rejected — weaker than a structural
  boundary).

## Decision: Static NBC floor in the dataset, AI as overlay

- **Decision**: Every client carries a static `nextBest` NBC in `rmClients.ts`. AI briefings
  overlay it and fall back to it on any failure.
- **Rationale**: Constitution Principle II — the product must work with zero live LLM. Enforced by
  `test_no_key_fallback` and the `__NBC_ERROR__` degradation path.
- **Alternatives considered**: Loading/generating the floor from the backend (rejected — couples
  the dependability floor to a running server).

## Decision: SSE for progressive per-client reveal

- **Decision**: `POST /api/rm-run` starts a worker and returns a `run_id`; the browser opens
  `GET /api/stream/{run_id}` (EventSource) and receives one `nbc` frame per client as it completes,
  plus `keepalive` and a terminal `done`.
- **Rationale**: SSE is a natural fit for one-way progressive server→client streaming and works
  with the browser-native `EventSource`. Satisfies the "appears per-client, not all at once"
  success criterion (SC-002).
- **Alternatives considered**: WebSockets (rejected — bidirectional overhead unneeded); polling
  (rejected — no true progressive reveal, wasteful); single batched response (rejected — violates
  progressive-reveal requirement).

## Decision: Concurrency via ThreadPoolExecutor

- **Decision**: `_rm_worker` runs all clients concurrently through a `ThreadPoolExecutor`, each with
  `AGENT_TIMEOUT_S=60`, emitting `__NBC__{cid}__{json}` on success or `__NBC_ERROR__{cid}` on
  failure/timeout, then a sentinel.
- **Rationale**: The `anthropic` SDK calls are blocking I/O; threads give simple concurrency so
  briefings stream as each finishes. Per-client isolation guarantees one failure never blocks
  others (FR-009).
- **Alternatives considered**: `asyncio` + async SDK (rejected — more complexity for this scope);
  sequential calls (rejected — slow, non-progressive).

## Decision: UTF-8 forced before imports (Windows)

- **Decision**: `backend/run.py` reconfigures stdout/stderr to UTF-8 before importing any module,
  then calls `uvicorn.run()`.
- **Rationale**: On Windows, default cp1252 stdout crashes when model output contains non-cp1252
  characters. Doing it first, in the entry point, guarantees every downstream import inherits it.
- **Alternatives considered**: `PYTHONIOENCODING` env var (rejected — easy to forget, not
  self-contained); patching later (rejected — a crashing import could occur first).

## Decision: No Cloudscape; pure Tailwind

- **Decision**: Frontend styling is Tailwind only.
- **Rationale**: Explicit brief constraint; keeps the frontend dependency-light and self-contained.

## Decision: Anthropic model selection

- **Decision**: Default `claude-haiku-4-5-20251001`; override to `claude-sonnet-4-6` via
  `ANTHROPIC_MODEL`. No AWS/Bedrock dependency — direct `anthropic` SDK.
- **Rationale**: Haiku is fast/cheap for short structured NBC generation; env override allows a
  higher-quality model without code change.
