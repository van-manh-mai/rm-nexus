# Quickstart & Validation: RM ClientNexus

A run/validate guide proving the feature end-to-end. Implementation details live in the code and
(later) `tasks.md`; this file is how you confirm it works.

## Prerequisites

- Python 3.10+ and Node (for Next.js 16 / React 19).
- Backend deps installed from `backend/pyproject.toml`; frontend deps via `npm install` in
  `frontend/`.
- Optional: `backend/.env` with `ANTHROPIC_API_KEY` (copy from `.env.example`). **Without a key the
  app still works** on static briefings — that is the point (Principle II).

## Run (two servers)

```bash
# Terminal 1 — backend on :8000 (forces UTF-8 stdout before imports)
python backend/run.py

# Terminal 2 — frontend on :3000
cd frontend && npm run dev
```

Open http://localhost:3000/rm.

## Validation scenarios (map to spec Success Criteria)

1. **Cold offline floor (SC-001, SC-006)** — With no `ANTHROPIC_API_KEY`, load `/rm`. Expect all 8
   client cards rendered with metrics and a static NBC briefing; no AI request made.
2. **Progressive reveal (SC-002)** — With a key set, click "Generate All Briefings". Expect
   briefings to appear on cards one client at a time, not all at once at the end.
3. **Silent degradation (SC-003)** — Force a failure for one client (e.g. invalid key, or a client
   whose generation errors). Expect that card to keep its static briefing, no error surfaced, other
   cards unaffected.
4. **Figures from data (SC-004)** — Spot-check any figure in a card / detail / AI briefing against
   `frontend/src/lib/rmClients.ts`. Expect every figure to exist in the dataset.
5. **Exactly 3 urgency-ordered items (SC-005)** — Open any AI briefing. Expect exactly 3 NBC items
   ordered critical > high > medium > low.

## Backend-only demo (fallback if the UI isn't running)

```bash
# Health
curl http://localhost:8000/api/health          # → {"status":"ok"}

# Start a run (send the client list), then stream results
curl -s -X POST http://localhost:8000/api/rm-run \
  -H 'Content-Type: application/json' \
  -d '{"clients":[ ... ]}'                       # → {"run_id":"..."}
curl -N http://localhost:8000/api/stream/<run_id>  # → nbc / nbc_error / keepalive / done frames
```

## Offline test suite (the guarantees, key-free)

```bash
cd backend && pytest -v
# test_nbc_contract, test_boundary_no_tools, test_no_key_fallback, test_sse_smoke — all green,
# no network, no secrets.
```
