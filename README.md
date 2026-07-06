# RM ClientNexus

An AI-powered "Next Best Conversation" (NBC) dashboard for institutional banking Relationship
Managers, built as a thin vertical slice credible inside a regulated enterprise.

A Next.js/React frontend renders a fixed book of 8 AU institutional clients from a bundled dataset,
always showing a static NBC briefing per client (the **zero-live-LLM floor**). On demand, a
Python/FastAPI backend overlays fresh AI briefings via a **tool-less NBC agent**, streamed
per-client over Server-Sent Events. Any AI failure degrades silently to the static briefing.

**All financial figures come from the client dataset — never from the model. The LLM only
narrates.** Company names are real; **all financial data is synthetic and for demonstration only.**

> Full Frame / Design / Build / Verify / Document write-up is assembled in item 8. This file grows a
> Features log as each slice lands.

## Stack

- **Backend:** Python 3.10+, FastAPI, `anthropic` SDK (no AWS/Bedrock). `python backend/run.py` → :8000.
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind (no Cloudscape). `npm run dev` in `frontend/` → :3000.
- Default model `claude-haiku-4-5-20251001`; override via `ANTHROPIC_MODEL`.

## Features log

- **Item 1 — Scaffold + CI + operating rules.** Sibling `backend/` (pyproject + UTF-8-before-imports
  `run.py` + `.env.example`) and `frontend/` (Next.js/TypeScript/Tailwind). GitHub Actions CI runs
  `ruff` + `pytest` (backend) and `npm run lint` (frontend) on **push and pull_request**. Operating
  rules (data-authoritative boundary, offline floor, commit regimes) in `CLAUDE.md`.
  *Verified:* CI green on first push. *Spec:* plan.md Constitution gates I–IV.
- **Item 2 — Backend: NBC agent + FastAPI SSE + tests.** `rm_agent.py` (tool-less `NBCAgent`,
  APRA/bank system prompt, deterministic template fallback on no-key/failure). `server.py`
  (`POST /api/rm-run`, SSE `GET /api/stream/{run_id}`, `GET /api/health`, CORS :3000;
  `_rm_worker` ThreadPoolExecutor → thread-safe queue → JSON SSE frames, keepalive, per-run
  timeout). Four key-free tests (`test_nbc_contract`, `test_boundary_no_tools`,
  `test_no_key_fallback`, `test_sse_smoke`). *Verified:* 6/6 pytest green + live curl of
  `/api/stream` yielding urgency-ordered `nbc` frames from posted data, then `done`.
  *Spec:* contracts/nbc-agent.md, contracts/sse-contract.md.
- **Item 3 — Frontend data + hook.** `types/api.ts` (NBCItem/ClientBriefing/SSEMessage/RMClient;
  `NBCItem` is all-strings — the second half of the data-authoritative boundary, so no model
  figure is ever trusted as UI data). `lib/rmClients.ts` — the 8-client book fully populated
  (synthetic $M figures, APRA APS 210 references, 30-point mixed-sign cashflows, 3 urgency-ordered
  static NBCs each). `hooks/useSSEStream.ts` — EventSource wrapper, direct to `:8000` to avoid
  proxy buffering. *Verified:* `tsc` + ESLint clean; 8 clients, all cashflows length 30.
  *Spec:* contracts/api.types.md, data-model.md.
- **Item 4 — Frontend Tailwind components.** `Sparkline` (pure SVG ± bar chart, no chart
  library). `WbcNav` (red utility bar + white nav, bank chrome). `NBCCard` (2×2 metrics,
  alert chip, product chips, expandable static/live briefing — a live SSE `ClientBriefing`
  overlays the narrative only, never the numeric props). `ClientDetail` (full-screen 3-column
  overlay: profile/currency mix/liquidity bar, cash-flow sparkline/product breakdown/alert box,
  AI NBC panel with a `Generate ▸` action and toast callback). Pure Tailwind, no component
  library. *Verified:* `tsc` + ESLint + `next build` all clean (components not yet wired into
  a route). *Spec:* contracts/api.types.md, data-model.md.
- **Item 5 — Page + end-to-end wire-up.** `app/rm/page.tsx`: grid of `NBCCard` over the 8-client
  book, "Generate All Briefings" POSTs `/api/rm-run` then opens `useSSEStream`, overlaying each
  `nbc` frame's narrative onto its card as it arrives; `nbc_error` silently leaves that card on
  its static briefing (no error surfaced); `done`/`error` close the stream. Click a card to open
  `ClientDetail`, with a per-client `Generate ▸` re-running the same flow for one client. Toasts
  confirm actions and stream state. *Verified:* `tsc` + ESLint + `next build` clean; live in
  browser against `python backend/run.py` with no `ANTHROPIC_API_KEY` set — cold static floor
  renders (SC-001/SC-006), "Generate All" streams progressive per-card reveal end-to-end
  (SC-002) via real `/api/rm-run` → `/api/stream` calls, card expand and `ClientDetail` overlay
  both render exactly 3 urgency-ordered items, no console errors. *Spec:* quickstart.md
  validation scenarios, sse-contract.md.
