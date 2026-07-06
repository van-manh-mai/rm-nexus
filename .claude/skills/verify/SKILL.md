---
name: "verify"
description: "Run the Playwright browser verification suite (spec 002 tile scenarios) in a real, visible Chromium and report pass/fail plus the captured screenshots."
argument-hint: "Optional: 'headless' to run without a visible window; default is headed so you can watch it."
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

`headless` → run without a visible browser window. Empty (default) → **headed**, so the user
literally watches a physical Chromium drive the scenarios.

## What this does

Runs the frontend visual-verification suite (`frontend/e2e/spec-002-tiles.spec.ts`) that asserts
the spec-002 tile features and screenshots each acceptance scenario. It is the local twin of the
CI `visual` job. Because the suite boots the **frontend only** (no backend, no API key), a green
run also demonstrates the zero-live-LLM floor.

## Steps

Run from `frontend/` (`C:\Users\thavb\Github\rm-nexus\frontend`).

1. **Ensure the Chromium browser is installed** (first run only; safe to repeat):
   ```bash
   npx playwright install chromium
   ```

2. **Run the suite**:
   - Default (headed): `npm run e2e:headed`
   - `headless`: `npm run e2e`
   Playwright's `webServer` will reuse an already-running dev server on :3000 if present,
   otherwise it does a production `build && start` itself — no manual server launch needed. (If a
   stale dev server is serving an old build, restart it via `/launch frontend` first.)

3. **Report**:
   - Pass/fail per scenario from Playwright's list reporter.
   - The screenshot files written to `frontend/e2e/screenshots/` (01-dashboard-cold,
     02-tile-critical, 03-tile-hover, 04-detail-open, 05-nbc-toggle-no-detail).
   - If run by the agent: `Read` the key screenshots and describe what they show, so the visual
     outcome — not just the assertion pass — is confirmed. Optionally also do a live
     `claude-in-chrome` pass against `http://localhost:3000/rm` for a human-style look.

4. **On failure**: surface the failing scenario and Playwright's error; the HTML report is at
   `frontend/playwright-report/` (`npx playwright show-report`). Do not mark verification passed
   unless every scenario is green.

## Notes

- Screenshots are gitignored locally; CI publishes them inline onto the PR (see the `visual` job
  in `.github/workflows/ci.yml`).
- This is local verification only — it starts no long-lived services and is not a release action.
- Complements `/launch` (which starts the app for interactive use).
