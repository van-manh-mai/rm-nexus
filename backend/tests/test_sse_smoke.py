"""End-to-end SSE smoke test — Principle IV.

POST /api/rm-run then GET /api/stream/{run_id}. Key-free (template path), so it is fast
and deterministic: two clients yield two `nbc` frames and a terminal `done`.
"""

import json

from fastapi.testclient import TestClient

import server


def test_run_then_stream_yields_done(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)  # template path — no network
    client = TestClient(server.app)

    assert client.get("/api/health").json() == {"status": "ok"}

    resp = client.post(
        "/api/rm-run",
        json={"clients": [{"id": "c01", "name": "A"}, {"id": "c02", "name": "B"}]},
    )
    assert resp.status_code == 200
    run_id = resp.json()["run_id"]

    types: list[str] = []
    with client.stream("GET", f"/api/stream/{run_id}") as s:
        for line in s.iter_lines():
            if not line or not line.startswith("data: "):
                continue
            event = json.loads(line[len("data: ") :])
            types.append(event["type"])
            if event["type"] == "done":
                break

    assert "done" in types
    assert types.count("nbc") == 2  # both clients briefed via the template
