# RM ClientNexus

An AI-powered "Next Best Conversation" (NBC) dashboard for institutional banking Relationship
Managers, built as a thin vertical slice credible inside a regulated enterprise.

A Next.js/React frontend renders a fixed book of 8 AU institutional clients from a bundled dataset,
always showing a static NBC briefing per client (the **zero-live-LLM floor**). On demand, a
Python/FastAPI backend overlays fresh AI briefings via a **tool-less NBC agent**, streamed
per-client over Server-Sent Events. Any AI failure degrades silently to the static briefing.

**All financial figures come from the client dataset — never from the model. The LLM only
narrates.** Company names are real; **all financial data is synthetic and for demonstration only.**

---

## Quickstart

**Prerequisites:** Python 3.10+ and Node.js. **No API key required** (that's the zero-LLM floor).

```bash
# Terminal 1 — backend (FastAPI) on :8000
python backend/run.py

# Terminal 2 — frontend (Next.js) on :3000
cd frontend && npm install && npm run dev
```

Open **http://localhost:3000/rm**. For live AI briefings, set `ANTHROPIC_API_KEY` (copy
`backend/.env.example` → `backend/.env`); override the model with `ANTHROPIC_MODEL` (default
`claude-haiku-4-5-20251001`).

📖 **Full user & technical documentation:** [`docs/rm-nexus-documentation.html`](docs/rm-nexus-documentation.html)
— app walkthrough, launch guide, architecture & CI diagrams, test evidence, and governance links.
Also reachable from the running app via the **Documentation ↗** link in the top nav.

---

## Frame · Design · Build · Verify · Document

### Frame

The user is an **institutional banking Relationship Manager** at an APRA-regulated Australian bank,
managing a book of large institutional clients and needing a fast, dependable read on *what to talk
to each client about next*. The hard part isn't the AI — it's making an AI feature **credible
inside a regulated enterprise**. Three non-negotiables framed everything:

1. **Data is authoritative; the LLM only narrates.** Every figure comes from the client dataset,
   never the model — no hallucinated numbers reaching an RM as fact.
2. **Zero-live-LLM floor.** The tool must work fully with no API key and survive any AI outage —
   the AI is an *overlay*, not a dependency.
3. **Auditable, incremental delivery.** Small reviewable commits, a spec trail, and a human in the
   loop — not a black-box drop.

### Design

- **Data-authoritative boundary, enforced two ways.** The NBC agent is *tool-less by construction*
  (`NBCAgent.tools = []`) so it structurally cannot compute or alter a figure; and `NBCItem` is
  **all strings** (no numeric field), so a number the model narrates is never trusted as UI data.
  The two halves together mean no model output is ever a value the dashboard renders.
- **Zero-LLM floor + silent degradation.** Each client carries a static "yesterday's briefing";
  the live overlay degrades to it on any error via the `__NBC_ERROR__` path — no crash, no broken
  state.
- **Progressive reveal over SSE.** `POST /api/rm-run` → per-client `nbc` frames streamed over
  `GET /api/stream/{run_id}`. A worker thread parallelises the blocking SDK calls and hands off to
  the async endpoint through a stdlib `queue.Queue`, whose get-timeout doubles as the ~10s
  keepalive tick. The browser connects **direct to :8000** to avoid dev-proxy SSE buffering.
- **Governed change process.** A two-regime git workflow (below) plus a `git_guard` PreToolUse
  hook and a no-bypass GitHub ruleset keep `main` human-gated; browser screenshots are attached to
  every UI PR as pre-deployment assurance.

### Build

Delivered as **8 numbered, checkpointed items** (see
[`specs/001-rm-clientnexus/process.md`](specs/001-rm-clientnexus/process.md)) in two regimes:
**Stage A** (items 1–5) committed directly to `main`; **Stage B** (items 6–8) went through
`branch → push → PR → CI → human approval → human merge` — the agent never merges. Every item
added a Features-log entry (below) and updated `CLAUDE.md` when a module appeared. Stack:

- **Backend:** Python 3.10+, FastAPI, `anthropic` SDK (no AWS/Bedrock). `python backend/run.py` → :8000.
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind (no Cloudscape). `npm run dev` in `frontend/` → :3000.
- Default model `claude-haiku-4-5-20251001`; override via `ANTHROPIC_MODEL`.

**Run it:** `python backend/run.py` and (in `frontend/`) `npm run dev`, then open
`http://localhost:3000/rm`. No API key needed — that's the point.

### Verify

- **Offline, key-free backend tests (6/6):** the guarantees are test-guarded and network-free —
  tool-less boundary (`test_boundary_no_tools`), no-key template + no-network (`test_no_key_fallback`),
  live JSON contract via a mocked client (`test_nbc_contract`), and an end-to-end SSE smoke
  (`test_sse_smoke`).
- **CI on push *and* pull_request:** `backend` (ruff + pytest), `frontend` (lint), `visual`
  (Playwright), and a `pr-comment` status job.
- **Browser visual verification:** a Playwright suite drives real Chromium against a cold,
  frontend-only build and posts labelled screenshots inline on each PR (via an orphan
  `pr-visual-evidence` branch) as human-checkable assurance. Run headed locally with `/verify`.
- **Cold walk-away check (2026-07-06):** from a fresh, key-free start, `/rm` renders all 8 client
  cards — metrics, sparklines, alert tints, static briefings — with **zero backend/AI requests on
  load** (verified in the browser network panel). The dashboard is fully usable with no AI service.
- **Independent reviews:** a governance & security review
  ([`docs/governance-and-security-review.md`](docs/governance-and-security-review.md)) and an
  engineering code & security review
  ([`specs/003-code-security-review/spec.md`](specs/003-code-security-review/spec.md)).

### Document

- **User & technical documentation:** [`docs/rm-nexus-documentation.html`](docs/rm-nexus-documentation.html)
  — the front door: app walkthrough, launch guide, architecture & CI diagrams, test evidence,
  glossary. Served by the running app at `/rm-nexus-documentation.html` (Documentation ↗ in the nav).
- **Specs & contracts:** [`specs/001-rm-clientnexus/`](specs/001-rm-clientnexus/) (product spec,
  TS/SSE/agent contracts, data model, quickstart, delivery process) and
  [`specs/002-richer-client-tiles/spec.md`](specs/002-richer-client-tiles/spec.md).
- **Responsible-AI & regulatory:** [`docs/governance-and-security-review.md`](docs/governance-and-security-review.md)
  — top-3 controls mapped to the APRA AI Letter / CPS 230, plus a CPS 234 security review.
- **Known-issues register:** [`specs/003-code-security-review/spec.md`](specs/003-code-security-review/spec.md).
- **Agent operating rules:** [`CLAUDE.md`](CLAUDE.md). **Build trail:** the Features log below.

---

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
- **Item 8 — Verify + document (finalised).** Adds the top-of-README **Frame / Design / Build /
  Verify / Document** write-up — the assessor-facing spine that pulls the specs, controls and
  verification together. Closes the two remaining item-8 parts: a **cold walk-away check**
  (fresh key-free start → `/rm` renders all 8 cards from the dataset with **zero backend/AI
  requests on load**, confirmed in the browser network panel) and a **green-suite** gate (backend
  ruff + pytest 6/6, frontend lint + `tsc` clean, e2e 5/5). Docs only — no code changed.
  *Verified:* cold walk-away passed 2026-07-06; full local suite green. *Spec:*
  specs/001-rm-clientnexus/process.md (item 8).
- **User documentation.** `docs/rm-nexus-documentation.html` — a self-contained user & technical
  doc: app/use-case/benefits, launch guide, inline SVG architecture & CI-controls diagrams,
  embedded CI test screenshots, repo map, glossary and troubleshooting, with links out to the
  governance and code-security reviews. The running app links to it (**Documentation ↗** in the nav);
  a `predev`/`prebuild` copy step serves it from `public/` while `docs/` stays the single source.
  README gains a Quickstart + documentation pointer. *Verified:* `tsc` + ESLint + `next build`
  clean; served doc + nav link confirmed in-browser; e2e 5/5 green. Delivered by PR under Stage B.
