---
name: "launch"
description: "Start the RM ClientNexus backend (FastAPI :8000) and frontend (Next.js :3000) dev servers and open the dashboard at /rm in the browser."
argument-hint: "Optional: 'no-browser' to skip opening a tab, 'backend' or 'frontend' to start only one"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Parse `$ARGUMENTS` (empty is the common case = start both, open browser):
- `no-browser` — start server(s) but skip the browser step.
- `backend` — start/verify only the backend.
- `frontend` — start/verify only the frontend.

## Steps

Run everything from the repo root (`C:\Users\thavb\Github\rm-nexus`).

1. **Check what's already running** before starting anything new — never double-launch a dev
   server on a port that's already serving:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8000/api/health
   curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000/rm
   ```
   A `200` means that server is already up — skip (re)starting it and go straight to using it.

2. **Backend** (skip if `$ARGUMENTS` is `frontend` or it's already healthy):
   - Launch `python backend/run.py` via Bash with `run_in_background: true`.
   - Poll `http://localhost:8000/api/health` in a short retry loop (~1s interval, ~20s max —
     do not use a single long `sleep`):
     ```bash
     for i in $(seq 1 20); do
       code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://localhost:8000/api/health)
       [ "$code" = "200" ] && break
       sleep 1
     done
     ```
   - If it never returns 200, read the background task's output for the error and report it —
     do not continue to the frontend step.

3. **Frontend** (skip if `$ARGUMENTS` is `backend` or it's already healthy):
   - Launch `npm run dev` inside `frontend/` via Bash with `run_in_background: true`
     (`cd frontend && npm run dev`).
   - Poll `http://localhost:3000/rm` the same way, ~1s interval, ~30s max (Turbopack cold start
     is slower than the backend).
   - If it never returns 200, read the background output and report the error.

4. **Zero-live-LLM floor note** — check whether `ANTHROPIC_API_KEY` is set in the environment
   (existence only, never print the value). Tell the user which mode they're in: no key = every
   card shows its static NBC (expected, not a bug); key set = "Generate All Briefings" will call
   the live model.

5. **Open the browser** (skip entirely if `$ARGUMENTS` contains `no-browser`):
   - Load the Chrome tools once: `ToolSearch` with
     `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__computer`.
   - Call `tabs_context_mcp` with `createIfEmpty: true`.
   - Reuse an existing tab already on `localhost:3000` if one exists in the group; otherwise
     `tabs_create_mcp`.
   - `navigate` that tab to `http://localhost:3000/rm`.
   - Take one screenshot to confirm the 8-card dashboard rendered, and report anything that
     looks wrong (blank page, console-visible error, fewer than 8 cards).

6. **Report back**: which servers were already running vs. freshly started, the two URLs
   (`http://localhost:8000`, `http://localhost:3000/rm`), the API-key mode from step 4, and a
   reminder that both dev servers keep running in the background after this skill finishes —
   they are not tied to this conversation turn. To stop them later:
   ```powershell
   Get-NetTCPConnection -LocalPort 8000,3000 -State Listen -ErrorAction SilentlyContinue |
     Select-Object -ExpandProperty OwningProcess -Unique |
     ForEach-Object { Stop-Process -Id $_ -Force }
   ```

## Notes

- Never use a long blocking `sleep` — the polling loops above are the pattern.
- This only starts local dev servers for manual testing; it is not a deployment or release action.
