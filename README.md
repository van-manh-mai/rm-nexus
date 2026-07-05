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
