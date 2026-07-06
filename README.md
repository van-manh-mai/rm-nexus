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
- **Item 6 — Governance retrofit (Stage B begins).** GitHub ruleset `human-review-main` now
  protects `main` (required PR + 1 approval, required `backend`/`frontend` checks, no bypass —
  verified via `gh api repos/.../rulesets`). `.claude/settings.json` wires a `PreToolUse` hook
  (`.claude/hooks/git_guard.py`, stdlib-only, no `jq`) that blocks any direct `git push`/`commit`
  to `main` at the session level as a belt to GitHub's suspenders; it tokenizes with `shlex`
  so it only matches real git invocations, not text that merely mentions one inside a quoted
  string. CI gained a `pr-comment` job that posts a ✅/❌ status comment on the PR. This item is
  itself the first PR under the new regime: branch → push → PR → CI → human approval → human
  merges (the agent does not merge). *Verified:* 9-case unit test of `git_guard.py` covering
  block/allow paths and two false-positive regressions (literal mentions, piped JSON fixtures).
  *Spec:* specs/001-rm-clientnexus/process.md.
- **Item 7 — Richer client tiles + browser visual verification (governed feature).** Each summary
  tile now shows a 30-day cash-flow sparkline (reusing `Sparkline` + dataset `cashFlows`), is a
  whole-tile click target with a hover-lift and a persistent "View details ›" hint, and carries a
  light alert-level tint (critical=red / high=amber / medium=blue / none=green). Presentation only:
  every figure and colour comes from the dataset; inner NBC controls `stopPropagation` so they
  don't open the detail view. New Playwright suite (`frontend/e2e/spec-002-tiles.spec.ts`) runs a
  real Chromium against a cold **frontend-only** build (no backend/key — so a green run also proves
  the zero-LLM floor), asserting each spec-002 criterion and screenshotting it. A CI `visual` job
  publishes those screenshots inline onto the PR (via an orphan `pr-visual-evidence` branch) for
  human review; the `/verify` skill runs the same suite headed locally. *Verified:* `tsc` + ESLint
  + `next build` clean; 5/5 e2e scenarios green locally with screenshots confirmed; delivered by
  PR under Stage B. *Spec:* specs/002-richer-client-tiles/spec.md.
- **Item 8 — Governance & security review (Responsible-AI controls named).**
  `docs/governance-and-security-review.md` (+ a self-contained `.html` also published as a
  shareable Artifact) reviews the solution against APRA's principle-based framework: it picks the
  **top 3 AI governance controls** (AI output boundary; operational resilience / zero-LLM floor;
  change governance & pre-deployment assurance), mapping each to the **APRA AI Letter (30 Apr 2026)**
  and **CPS 230**, with in-repo evidence, residual gap and an easy how-to; then a **CPS 234**
  security review (6 strengths, 6 residual gaps incl. the public-evidence-branch data-exposure
  finding). Analysis only — no code changed. Every code/test/ruleset citation grep-verified; every
  regulatory claim cited to an APRA primary source (theme labels flagged as our groupings, not
  APRA section numbers). *Verified:* anchors resolve; advisor-reviewed for regulatory calibration.
  *Sources:* APRA AI Letter, CPS 230, CPS 234.
- **Code & security review.** `specs/003-code-security-review/spec.md` — an engineering-depth review
  (companion to the regulatory one), analysis only, no code changed. 14 findings with `file:line`
  evidence and demo→prod severity: e.g. the `_RUNS` entry/queue leak on un-opened streams, unbounded
  `RunRequest.clients` (cost/DoS), silent broad-`except` (no logging), a tile-accessibility ARIA
  nesting, test-coverage gaps, and `0.0.0.0`-bind-with-no-auth. Balanced with strengths (tool-less
  boundary, tested degradation, secrets hygiene). *Verified:* every citation re-read against source;
  advisor independent pass (caught + fixed a C7 mis-statement); self-review caveat stated.
