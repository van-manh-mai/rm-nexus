# Contract: HTTP + SSE (backend `server.py` ↔ frontend)

## HTTP endpoints (FastAPI)

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| `POST` | `/api/rm-run` | `{ "clients": [ ...RMClient ] }` | `{ "run_id": "<str>" }` | Spawn a `_rm_worker` thread that generates AI briefings for all clients. |
| `GET` | `/api/stream/{run_id}` | — | `text/event-stream` | SSE stream of JSON-framed events for that run (reads an `asyncio.Queue`). |
| `GET` | `/api/health` | — | `{ "status": "ok" }` | Liveness. |

CORS: `CORSMiddleware` with `allow_origins=["http://localhost:3000"]`.

## Worker → SSE frame mapping

`_rm_worker` writes internal sentinel strings; the stream endpoint reframes them as JSON SSE
events matching `SSEMessage` (see [api.types.md](./api.types.md)).

| Internal sentinel (from worker) | SSE frame emitted |
|---------------------------------|-------------------|
| `__NBC__{client_id}__{json.dumps(briefing_dict)}` | `{"type":"nbc","client_id":"c01","content":"{...json ClientBriefing...}"}` |
| `__NBC_ERROR__{client_id}` | `{"type":"nbc_error","client_id":"c01"}` |
| end-of-run sentinel | `{"type":"done"}` |
| (periodic, ~10s) | `{"type":"keepalive"}` |
| (optional progress) | `{"type":"status","message":"..."}` / `{"type":"log","message":"..."}` |
| (fatal stream error) | `{"type":"error","message":"..."}` |

## Frontend handling rules

- `nbc`: parse `content` into `ClientBriefing`, reveal on the matching client card/detail.
- `nbc_error`: leave that client on its static `nextBest` briefing — **no error surfaced** (FR-009).
- `keepalive`: ignore (connection-liveness only).
- `done` / `error`: close the `EventSource`.

## `_rm_worker` pattern (backend)

- Build prompt: `f"Institutional client profile:\n{json.dumps(client)}\n\nGenerate the NBC briefing."`
- Extract JSON: `re.search(r'\{[\s\S]*\}', response_text)`.
- Validate: `json.loads` on the match; require exactly 3 urgency-ordered `next_best` items.
- On any failure (call error, no match, invalid JSON, wrong item count): emit `__NBC_ERROR__{cid}`.
- Run all clients concurrently: `ThreadPoolExecutor`, per-client timeout `AGENT_TIMEOUT_S=60`.
- Emit the end sentinel when all clients are done; keepalive ~every 10s while running.
