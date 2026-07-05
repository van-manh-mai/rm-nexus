"""FastAPI app: rm-run, SSE stream, health.

Cross-thread handoff: ``_rm_worker`` runs in a background thread and parallelises the
blocking Anthropic SDK calls across a ``ThreadPoolExecutor``. It pushes sentinel strings
onto a stdlib ``queue.Queue`` (thread-safe). The async SSE endpoint drains that queue via
``run_in_executor`` and reframes each sentinel as a JSON SSE event.

A stdlib ``queue.Queue`` is used deliberately over ``asyncio.Queue``: it is safe to write
from the worker thread without marshalling every put back onto the event loop, and the
async side blocks on it with a timeout that doubles as the ~10s keepalive tick.
"""

from __future__ import annotations

import asyncio
import json
import queue
import re
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout
from concurrent.futures import as_completed

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rm_agent import URGENCY_ORDER, NBCAgent

AGENT_TIMEOUT_S = 60
KEEPALIVE_S = 10
_DONE = object()  # end-of-run sentinel placed on the queue

app = FastAPI(title="RM ClientNexus backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# run_id -> queue of sentinel strings (worker thread -> async stream handoff)
_RUNS: dict[str, "queue.Queue"] = {}
_agent = NBCAgent()


class RunRequest(BaseModel):
    clients: list[dict]


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/rm-run")
def rm_run(req: RunRequest) -> dict:
    run_id = uuid.uuid4().hex
    q: queue.Queue = queue.Queue()
    _RUNS[run_id] = q
    threading.Thread(target=_rm_worker, args=(req.clients, q), daemon=True).start()
    return {"run_id": run_id}


def _urgency_ordered(items: list[dict]) -> bool:
    try:
        ranks = [URGENCY_ORDER.index(i["urgency"]) for i in items]
    except (KeyError, ValueError):
        return False
    return ranks == sorted(ranks)  # non-decreasing rank == non-increasing severity


def _generate_one(client: dict) -> str:
    """Generate + validate one client. Returns a __NBC__ or __NBC_ERROR__ sentinel."""
    cid = client.get("id", "unknown")
    try:
        text = _agent.generate(client)
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return f"__NBC_ERROR__{cid}"
        briefing = json.loads(match.group(0))
        items = briefing.get("next_best", [])
        if len(items) != 3 or not _urgency_ordered(items):
            return f"__NBC_ERROR__{cid}"
        return f"__NBC__{cid}__{json.dumps(briefing)}"
    except Exception:
        return f"__NBC_ERROR__{cid}"


def _rm_worker(clients: list[dict], q: "queue.Queue") -> None:
    """Run all clients concurrently; push a sentinel per client as it completes, then _DONE.

    AGENT_TIMEOUT_S bounds the run: any client still unfinished at the deadline is emitted
    as __NBC_ERROR__ so one slow/hung generation never blocks the stream from ending.
    """
    pool = ThreadPoolExecutor(max_workers=min(8, max(1, len(clients))))
    try:
        futures = {pool.submit(_generate_one, c): c.get("id", "unknown") for c in clients}
        pending = set(futures)
        try:
            for fut in as_completed(futures, timeout=AGENT_TIMEOUT_S):
                pending.discard(fut)
                q.put(fut.result())  # _generate_one never raises
        except FuturesTimeout:
            for fut in pending:
                q.put(f"__NBC_ERROR__{futures[fut]}")
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
        q.put(_DONE)


def _frame(item: str) -> dict:
    """Reframe a worker sentinel string as an SSEMessage dict."""
    if item.startswith("__NBC_ERROR__"):
        return {"type": "nbc_error", "client_id": item[len("__NBC_ERROR__") :]}
    if item.startswith("__NBC__"):
        # Partition on the FIRST "__" only, so JSON content containing "__" survives intact.
        cid, _, content = item[len("__NBC__") :].partition("__")
        return {"type": "nbc", "client_id": cid, "content": content}
    return {"type": "log", "message": str(item)}


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


@app.get("/api/stream/{run_id}")
async def stream(run_id: str) -> StreamingResponse:
    q = _RUNS.get(run_id)

    async def event_gen():
        if q is None:
            yield _sse({"type": "error", "message": "unknown run_id"})
            return
        loop = asyncio.get_running_loop()
        try:
            while True:
                try:
                    item = await loop.run_in_executor(None, q.get, True, KEEPALIVE_S)
                except queue.Empty:
                    yield _sse({"type": "keepalive"})
                    continue
                if item is _DONE:
                    yield _sse({"type": "done"})
                    break
                yield _sse(_frame(item))
        finally:
            _RUNS.pop(run_id, None)

    return StreamingResponse(event_gen(), media_type="text/event-stream")
