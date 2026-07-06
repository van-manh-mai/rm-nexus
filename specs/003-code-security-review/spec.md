# Code & Security Review — RM Nexus

> This file is named `spec.md` to sit alongside the other `specs/` documents, but its content is a
> **code and security review report**, not a feature specification.

**Subject:** RM ClientNexus (this repository, at the tip of `main`).
**Date:** 2026-07-06 · **Type:** Engineering review — analysis only, **no code changed**.
**Reviewer:** Delivery team (AI-assisted).

## Method & caveats

- **Scope:** the full vertical slice — `backend/` (FastAPI + NBC agent + tests), `frontend/`
  (Next.js UI + hook + e2e), and `.github/` / `.claude/` tooling.
- **Method:** manual read of every source file; each finding cites a real `file:line`. This is a
  design/code review, **not** a penetration test or a review of a deployed system.
- **Independence caveat:** the reviewer also authored most of this code, so this is a
  *self-review*. To offset that, the draft was put through an independent `advisor` pass. A truly
  independent reviewer is still recommended (the same non-independence point the governance review
  raised about CPS 234 testing).
- **Companion doc:** regulatory mapping (APRA AI Letter / CPS 230 / CPS 234) lives in
  [`docs/governance-and-security-review.md`](../../docs/governance-and-security-review.md); this
  review does not repeat it and instead goes to code-level depth.
- **Severity is scaled demo → prod:** most findings are Low for the current synthetic-data demo but
  would rise materially if this served real data over a network. That escalation is stated per
  finding.

## Findings summary

| ID | Severity (demo → prod) | Area | Finding |
|----|------------------------|------|---------|
| **C1** | Low → High | backend | `_RUNS` entry + its queue leak when a run is started but its stream is never opened |
| **C2** | Low → High | backend | `RunRequest.clients` is unbounded and unvalidated (cost / DoS / injection surface) |
| **C3** | Low → Med | backend | Broad `except Exception` degrades silently with **no logging** (no observability) |
| **C4** | Info → Med | backend | One blocked executor thread held per concurrent SSE stream (scalability) |
| **C5** | Low | backend | `alertLevel:"none"` isn't in `URGENCY_ORDER`; template mislabels a healthy client "high" |
| **C6** | Info | backend | Greedy `{[\s\S]*}` JSON extraction; robust only because `json.loads` validates |
| **C7** | Low → Med | frontend | Whole-tile `role="button"` contains a nested `<button>` (`nbc-toggle`) — ARIA nesting |
| **C8** | Info → Low | frontend | `EventSource` has no reconnect/backoff; a transient blip ends the stream |
| **C9** | Med | tests | Coverage gaps: timeout, keepalive, malformed-output, unknown `run_id`; **no frontend unit tests** |
| **C10** | Low → Med | infra | Dependencies use floating ranges (`^` / `>=`); no dependency scanning |
| **S1** | Low → High | security | API binds `0.0.0.0` with no authN/authZ; CORS does not protect non-browser callers |
| **S2** | Low → High | security | Public `pr-visual-evidence` branch — safe only because data is synthetic |
| **S3** | Low | security | Prompt-injection can influence narrative wording (well-mitigated today) |
| **S4** | Low → Med | security | No rate limiting on `/api/rm-run` / `/api/stream` |

Legend: **Critical** exploit now · **High** serious in prod · **Medium** should fix · **Low** minor
· **Info** note/assumption.

---

## Part 1 — Code review

### Backend

**C1 · `_RUNS` entry + queue leak — `backend/server.py:62`, cleaned only at `:150`.**
`rm_run` inserts `_RUNS[run_id] = q` and spawns the worker, but the only cleanup is
`_RUNS.pop(run_id, None)` inside the stream generator's `finally`. If a caller POSTs `/api/rm-run`
and never opens `GET /api/stream/{run_id}`, the worker thread runs to completion and exits normally,
but the `_RUNS` entry and its queue (holding every accumulated sentinel) are never reclaimed.
*Impact:* unbounded memory growth under repeated un-consumed runs. *Recommend:* TTL/expiry on
`_RUNS` entries (timestamp + sweep, or an `asyncio` task), or create the queue lazily on stream
open. Low now (single trusted UI) → High if the endpoint is exposed.

**C2 · Unbounded, unvalidated `clients` — `backend/server.py:49-50`.**
`RunRequest.clients: list[dict]` accepts any length and any dict shape. A caller can submit an
enormous list; each element triggers a model call (`_generate_one` → `_agent.generate`), so this is
a **cost-amplification / DoS** vector against the LLM provider, and the arbitrary dict is serialised
straight into the prompt (`rm_agent.py:73`), which is the prompt-injection surface (see S3).
*Recommend:* cap list length (e.g. ≤ 16), and validate each client against a Pydantic model with
known fields rather than `dict`.

**C3 · Silent broad `except` — `backend/rm_agent.py:64` and `backend/server.py:88`.**
Both the agent's model call and `_generate_one` catch bare `Exception` and degrade to a template /
`__NBC_ERROR__` with **no logging**. This is correct for resilience (the zero-LLM floor) but means
failures — including genuine bugs or provider outages — are invisible to operators. *Recommend:*
log the caught exception (structured, at WARNING) before degrading. This directly enables the
incident-detection gap called out in the governance review (CPS 234).

**C4 · One blocked pool thread per live stream — `backend/server.py:141`.**
`await loop.run_in_executor(None, q.get, True, KEEPALIVE_S)` parks a **default-executor** thread on
the blocking `queue.get` for up to 10 s per SSE connection. With many concurrent viewers the
default `ThreadPoolExecutor` (≈ `cpu+4`) can saturate, stalling other blocking work. Fine at demo
scale. *Recommend:* a dedicated bounded executor for stream draining, or an `asyncio.Queue` fed via
`loop.call_soon_threadsafe` from the worker, if concurrency grows.

**C5 · `alertLevel:"none"` falls through the urgency window — `backend/rm_agent.py:97`.**
`URGENCY_ORDER` is `[critical, high, medium, low]`; `"none"` is not a member, so
`alert in URGENCY_ORDER` is false and `start` defaults to `1` → a healthy client's template briefing
leads with a **"high"** urgency item. Semantically wrong for a no-alert client (e.g. Future Fund).
*Recommend:* map `"none"` explicitly to the `[medium, low, …]` window (or a dedicated low-urgency
template). Low — only the template (no-key/fallback) path is affected; the hand-authored static
`nextBest` in `rmClients.ts` is unaffected.

**C6 · Greedy JSON extraction — `backend/server.py:80`.**
`re.search(r"\{[\s\S]*\}", text)` grabs from the first `{` to the **last** `}`. If a model ever
emitted prose containing stray braces around the JSON, the captured span could be wrong. Currently
safe because `json.loads` + the 3-item/ordering check reject anything malformed (→ `nbc_error`).
Info — documented robustness note; no change required.

**Backend positives.** The thread→async handoff via a stdlib `queue.Queue` is a deliberate, sound
choice (documented at `server.py:1-11`); `_frame` partitions on the **first** `__` so JSON content
containing `__` survives (`server.py:119-120`); the agent's never-raises contract (`rm_agent.py:56`)
and UTF-8-before-import in `run.py:12-15` are correct and well-commented.

### Frontend

**C7 · Nested interactive control — `frontend/src/components/NBCCard.tsx:66` (introduced in item 7).**
The whole tile is a `div role="button"` (keyboard-operable, good) but it **contains** a real
`<button>` — the `nbc-toggle` — plus a briefing sub-region that stops click propagation. The
`button` role makes its descendants presentational, so assistive tech may suppress or mis-expose
the nested toggle; nesting an interactive control inside a `role="button"` is an ARIA anti-pattern.
(The act chips in the tile are `<span>`, not buttons, so they are not part of this finding; note the
act chips in `ClientDetail` *are* buttons, but that is a full-screen view, not a nested tile.) This
is the one finding introduced by the recent tiles feature. *Recommend:* make the click target a
dedicated element (e.g. the header / a "View details" link is *the* button) rather than the whole
tile, or move the toggle out of the clickable region. Low visually → Medium for accessibility
compliance.

**C8 · No `EventSource` reconnect — `frontend/src/hooks/useSSEStream.ts:47-50`.**
`es.onerror` dispatches an error and `close()`s, which *disables* EventSource's native
auto-reconnect. A transient network blip ends the run rather than resuming. Acceptable as
graceful degradation (the UI keeps static briefings), but note there is no retry/backoff. Info →
Low.

**Frontend positives.** `Sparkline.tsx` guards its domain (`Math.max(..., 1)` and an empty-values
early return, `Sparkline.tsx:18-20`), so it cannot divide by zero; `useSSEStream` keeps the latest
callback in a ref without churning `open`/`close` identity (`useSSEStream.ts:20-23`); `rm/page.tsx`
handles a `fetch` failure and a stream `error` frame by resetting state and toasting
(`rm/page.tsx`), never leaving a stuck spinner.

### Tests (C9 · Medium)

Backend coverage is genuine but happy-path-weighted. **Covered:** tool-less boundary
(`test_boundary_no_tools`), live contract via a mocked client (`test_nbc_contract`), no-key
template + no-network (`test_no_key_fallback`), and a 2-client SSE smoke (`test_sse_smoke`).
**Not covered:** the worker **timeout** branch (`server.py:106-108`), the **keepalive** tick
(`server.py:143`), **malformed live output → `nbc_error`** (`server.py:81-86`), **unknown
`run_id`** (`server.py:135`), `_urgency_ordered` rejecting out-of-order input, and the C1 cleanup
path. **Frontend has no unit tests at all** — only the Playwright e2e suite; the hook and pure
helpers (Sparkline math, page reducers) are untested in isolation. *Recommend:* add targeted tests
for the degradation/timeout branches and a couple of frontend unit tests for `useSSEStream` and
`Sparkline`.

### Infra / tooling

**C10 · Floating dependency ranges — `frontend/package.json`, `backend/pyproject.toml`.**
npm deps use `^` ranges (and there is a committed `package-lock.json`, good); Python deps use `>=`
with **no lockfile**. Reproducibility and supply-chain exposure both suffer, and there is no
automated dependency scanning. *Recommend:* pin/lock Python deps (e.g. a constraints file) and
enable Dependabot/`pip-audit`.

**`git_guard.py` robustness (Info).** The `PreToolUse` hook tokenises with `shlex` (POSIX), so a
**PowerShell** command may not tokenise the same way; the code correctly falls back to a
conservative whole-string regex on `shlex` failure (`git_guard.py` `split_statements` → `None`
branch), which still catches push-to-`main` / commit-on-`main`. It also binds only at session
start. It is a *local belt*; the authoritative gate is the GitHub ruleset. No change required —
noted so the limitation is explicit.

**CI (Info).** `visual` job runs Playwright and publishes screenshots (see S2); token permissions
are correctly least-privilege (`ci.yml:51-52`). The only cosmetic issue is the **Node-20
deprecation** warning on `actions/*` (non-blocking; bump action versions when convenient).

---

## Part 2 — Security review

**S1 · Network-exposed API with no authentication — `backend/run.py:19`, `backend/server.py:37-42`.**
`uvicorn.run(host="0.0.0.0")` binds all interfaces, and there is no authN/authZ on any endpoint.
**CORS restricts browsers, not raw clients** — `curl` from anywhere on the network reaches
`/api/rm-run` and drives LLM calls. Low for a localhost demo → **High** in any networked
deployment. *Recommend:* bind `127.0.0.1` for local use; add authentication + move CORS to an
allow-list before any real exposure.

**S2 · Screenshots published to a public branch — `.github/workflows/ci.yml` (`visual` job).**
CI pushes dashboard screenshots to the public `pr-visual-evidence` branch and links them in PR
comments. **Safe only because the dataset is synthetic** — with real client data this is a
data-exposure control failure. *Recommend:* gate publication on data being synthetic; for real
data, keep evidence in a private artifact store. (Also raised in the governance review.)

**S3 · Prompt-injection surface — `backend/rm_agent.py:73`, `backend/server.py:50`.**
The full client dict is serialised into the prompt, so a crafted profile could influence the AI's
*wording*. Well-mitigated today: the agent is tool-less (cannot act), output is validated to
exactly 3 urgency-ordered items or dropped to `nbc_error`, **no figure is ever sourced from the
model**, and briefings are advisory with a human in the loop. *Recommend:* input validation (S/C2)
and output guardrails if the input ever becomes untrusted/user-supplied.

**S4 · No rate limiting — `backend/server.py:58`, `:129`.**
Neither `/api/rm-run` nor `/api/stream` is rate-limited, compounding S1 and C2 (resource/cost
exhaustion). Low locally → Medium in prod. *Recommend:* per-client rate limits / quotas.

**Security positives.** No secrets in the repo (`.env` gitignored, only `.env.example`;
`test_no_key_fallback` proves the app runs key-free); least-privilege CI token; the tool-less agent
**bounds prompt-injection blast radius to text** (no side effects possible); `run_id` is an
unguessable `uuid4().hex` and unknown ids are rejected (`server.py:135`); synthetic data means no
real PII is at risk today.

---

## Summary

The solution is **well-architected for its purpose**: the data-authoritative, tool-less AI boundary
and the tested graceful-degradation floor are genuine strengths, and the change-governance around
it is unusually strong for a demo. The material findings all share one root — it is built as a
**single-trust-boundary local demo**: no authentication, no input bounds, no request-scoped cleanup,
minimal observability. None is a live exploit against the synthetic demo; **C1, C2, S1 and S2 are
the ones to close first** before this ever handles real data over a network. The most valuable
quick wins are input bounds + `_RUNS` cleanup (C1/C2), failure logging (C3), and the tile
accessibility fix (C7).

## References

- Regulatory mapping: [`docs/governance-and-security-review.md`](../../docs/governance-and-security-review.md)
- Product & interface specs: [`specs/001-rm-clientnexus/`](../001-rm-clientnexus/),
  [`specs/002-richer-client-tiles/spec.md`](../002-richer-client-tiles/spec.md)
- Delivery process / build regimes: [`specs/001-rm-clientnexus/process.md`](../001-rm-clientnexus/process.md)
