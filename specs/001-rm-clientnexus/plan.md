# Implementation Plan: RM ClientNexus

**Branch**: `001-rm-clientnexus` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-rm-clientnexus/spec.md`

## Summary

RM ClientNexus is a full-stack dashboard for institutional banking RMs. A Next.js/React frontend
renders a fixed book of 8 AU institutional clients from a bundled synthetic dataset, always
showing a static "Next Best Conversation" (NBC) briefing per client (the dependability floor). On
demand, a Python/FastAPI backend calls the Anthropic API — via a tool-less NBC agent — to overlay
fresh AI briefings, streamed to the browser per-client over Server-Sent Events (SSE). Any AI
failure degrades silently to the static briefing. All financial figures come from the dataset;
the model only narrates. See [process.md](./process.md) for the delivery regimes and build order.

## Technical Context

**Language/Version**: Backend Python 3.10+; Frontend TypeScript on Node (Next.js 16, React 19).

**Primary Dependencies**: Backend — FastAPI, uvicorn, `anthropic` SDK (no AWS/Bedrock), pytest,
httpx, ruff. Frontend — Next.js 16, React 19, Tailwind CSS (NO Cloudscape).

**Storage**: None. The 8-client dataset is a bundled static TypeScript module
(`frontend/src/lib/rmClients.ts`); no database, no persistence of RM actions.

**Testing**: Backend `pytest` (key-free, monkeypatched Anthropic client). Frontend `npm run lint`.
CI runs both on **push and pull_request**.

**Target Platform**: Local two-server dev — backend `python backend/run.py` on :8000, frontend
`npm run dev` on :3000. `backend/run.py` forces UTF-8 stdout/stderr **before any import** (Windows
cp1252 otherwise crashes on model output).

**Project Type**: Web application (frontend + backend siblings).

**Performance Goals**: Progressive reveal — each client's AI briefing appears as produced (clients
generated concurrently). Per-client agent timeout `AGENT_TIMEOUT_S=60`; SSE keepalive ~every 10s.

**Constraints**: Offline-capable (fully functional with zero live LLM). Model
`claude-haiku-4-5-20251001` by default, `claude-sonnet-4-6` via `ANTHROPIC_MODEL`. `.env` excluded
from git; `.env.example` committed; no secret/API key committed.

**Scale/Scope**: Single RM persona; fixed book of 8 clients; demonstration tool.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | How this plan satisfies it | Enforcing test |
|-----------|------|----------------------------|----------------|
| **I. Data authoritative, LLM narrates** | The NBC agent has no tools and cannot compute figures | Agent constructed with an empty tool set; figures are passed in the profile and echoed only | `test_boundary_no_tools` |
| **II. Zero live-LLM floor** | Dashboard fully usable with no AI; silent degradation | Static NBC in the dataset renders always; agent returns a template when no key; `__NBC_ERROR__` keeps the static briefing | `test_no_key_fallback` |
| **III. Responsible AI** | Validated JSON, exactly 3 urgency-ordered items; synthetic-data labelling | Regex-extract + `json.loads` validation in `_rm_worker`; malformed → `__NBC_ERROR__`; README/data label synthetic | `test_nbc_contract` |
| **IV. Offline-first, test-guarded** | Guarantees covered by key-free, network-free tests in CI on push + PR | pytest suite monkeypatches the Anthropic client; GitHub Actions runs on both triggers | `test_sse_smoke` + all above |

**Result**: PASS. No violations; Complexity Tracking not required.

*Post-Phase-1 re-check*: PASS — the contracts (tool-less agent, `__NBC_ERROR__` fallback frame,
strict JSON validation) preserve every gate; no new principle risk introduced by the design.

## Project Structure

### Documentation (this feature)

```text
specs/001-rm-clientnexus/
├── spec.md              # Behavioural requirements (WHAT/WHY)
├── process.md           # Stage A/B git regimes + build order
├── plan.md              # This file
├── research.md          # Phase 0 — key decisions
├── data-model.md        # Phase 1 — entities + the 8-client dataset spec
├── quickstart.md        # Phase 1 — run/validate guide
├── contracts/           # Phase 1 — TS + Python/SSE interface contracts
│   ├── api.types.md
│   ├── sse-contract.md
│   └── nbc-agent.md
└── checklists/
    └── requirements.md  # Spec quality checklist (all-green)
```

### Source Code (repository root)

```text
backend/
├── run.py              # Entry point: force UTF-8 stdout/stderr, then uvicorn.run()
├── server.py           # FastAPI: POST /api/rm-run, GET /api/stream/{run_id}, GET /api/health
├── rm_agent.py         # Tool-less NBC agent; template fallback when no key/call fails
├── pyproject.toml      # fastapi, uvicorn, anthropic, pytest, httpx, ruff
├── .env.example        # ANTHROPIC_API_KEY / ANTHROPIC_MODEL placeholders (real .env gitignored)
└── tests/
    ├── test_nbc_contract.py        # valid JSON, 3 items, urgency order
    ├── test_boundary_no_tools.py   # agent tool set is empty
    ├── test_no_key_fallback.py     # no key → template, no network call
    └── test_sse_smoke.py           # POST rm-run → stream → done event

frontend/
├── src/
│   ├── types/api.ts            # NBCItem, ClientBriefing, SSEMessage, RMClient
│   ├── lib/rmClients.ts        # RM_CLIENTS: RMClient[] — the 8 clients, fully populated
│   ├── hooks/useSSEStream.ts   # EventSource wrapper: open(runId)/close(), onMessage
│   ├── components/
│   │   ├── WbcNav.tsx
│   │   ├── Sparkline.tsx
│   │   ├── NBCCard.tsx
│   │   └── ClientDetail.tsx
│   └── app/rm/page.tsx         # Dashboard: state, filter/sort, Generate All, detail modal
└── next.config.ts              # rewrites /api/* → http://localhost:8000/api/*
```

**Structure Decision**: Web-application layout — `backend/` (Python/FastAPI) and `frontend/`
(Next.js) as siblings at the repo root, matching the spec's clear frontend/backend split and the
two-server local dev model. Interface contracts between them live in `contracts/` and are the
source of truth shared by both sides.

## Complexity Tracking

Not required — Constitution Check passed with no violations.
