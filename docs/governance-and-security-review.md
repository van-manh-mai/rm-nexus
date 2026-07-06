# RM Nexus — Governance & Security Review

**Subject:** RM ClientNexus (the "Next Best Conversation" RM dashboard — this repository).
**Date:** 2026-07-06 · **Status:** Self-assessment (not an APRA submission or endorsement).
**Author:** Delivery team (AI-assisted).

> **Scope & honesty caveat.** This reviews the *thin vertical slice* in this repo, which runs on a
> **bundled synthetic dataset** — company names are real, **all financial data is fabricated for
> demonstration**. There is no real customer information, no production deployment, and no live
> data feed. This document is a **design-level self-assessment** that maps the solution's existing
> controls to APRA's expectations; it is **not** a claim of formal compliance. APRA's prudential
> framework is **principle-based and technology/vendor-agnostic** — the April 2026 AI Letter
> deliberately cites **no prudential standard by number**, stating that existing standards already
> apply to AI. Two things below are therefore *our* interpretation, not APRA's wording: (a) the
> mapping of controls to specific standard numbers (CPS 230 / CPS 234), and (b) the **theme labels**
> for the AI Letter (e.g. "operational-resilience theme"), which are our groupings of APRA's
> published findings, not APRA's own section numbering. Phrases are paraphrased from APRA's
> published summaries unless shown as a defined standard term.

---

## 1. Executive summary

RM Nexus is an AI-assisted dashboard: a fixed book of 8 institutional clients renders from an
authoritative dataset, and an LLM overlays fresh "Next Best Conversation" (NBC) briefings on
demand. The design decision that dominates its risk posture is that **the AI narrates; it never
owns a number**. That, plus a **tested offline fallback** and a **human-gated change process**,
means the solution already embodies the kind of *enforceable technical* controls APRA's April 2026
AI Letter encourages entities to favour over policy-only assurances.

This review does two things:

- **Part A — Governance:** picks the **top 3 AI governance controls** most relevant to this use
  case and easiest to stand up, mapped to the **APRA AI Letter (30 April 2026)** and **CPS 230
  Operational Risk Management**.
- **Part B — Security:** a design-level security review mapped to **CPS 234 Information Security**,
  with honest residual gaps.

The three governance controls are chosen because they are simultaneously the **highest-relevance**
for an AI tool in a regulated bank *and* **already substantially implemented as code**, so the
cost to formalise them is low.

**AI Letter themes referenced below** (our labels for APRA's published findings): *governance &
accountability*, *operational resilience*, *model risk & data*, *assurance & change control*, and
*third-party / supplier risk*.

---

## 2. Part A — Top 3 AI governance controls

### C1 · AI Output Boundary — the model narrates, a human/system-of-record owns every figure

**What it is.** The NBC agent is *tool-less by construction*: it cannot compute, round, look up, or
alter a financial figure. Every number the RM sees comes from the dataset, not the model; the AI
only produces advisory narrative prioritising what the RM already holds.

**Why it matters here.** The dominant AI risk in this use case is a hallucinated or subtly-altered
figure reaching an RM as if authoritative. This control removes that failure mode *by design*
rather than by asking a reviewer to catch it — an **enforceable technical restriction**, the kind
of preventative control APRA's letter encourages entities to favour over policy reliance.

**APRA mapping.** AI Letter — *governance & accountability* (human involvement in high-risk
decisions), *operational resilience* (preventative technical controls over policy reliance), and
*model risk & data* (failure modes bounded). CPS 230 — effective internal controls.

**In-repo evidence.**
- Tool-less agent: `NBCAgent.tools = []` and no `tools=` argument on the model call —
  `backend/rm_agent.py`; asserted by `backend/tests/test_boundary_no_tools.py`.
- The type system carries the boundary: `NBCItem` is **all strings** (`urgency`, `action`, `text`,
  `acts[]`) with **no numeric field** — `frontend/src/types/api.ts`. A number narrated in `text`
  is never a value the UI trusts as data.
- Every figure originates in the dataset `frontend/src/lib/rmClients.ts`.

**Residual gap → easy how-to.** The boundary is invisible to the end user. *Add an explicit UI
disclosure* on AI-generated briefings — "AI-generated · advisory only · figures are system-of-
record" — and *record RM Nexus in an AI use-case inventory* (the letter's governance &
accountability theme) with this control noted.

---

### C2 · Operational resilience — a credible fallback when the AI provider fails (the zero-LLM floor)

**What it is.** The dashboard is fully usable with **no AI at all**. Each client always carries a
static "yesterday's briefing"; the live AI overlay degrades **silently** to that static briefing on
any API error, missing key, timeout, or malformed output. No crash, no broken state.

**Why it matters here.** Among the industry weaknesses APRA reports in its letter is that fallback
processes are often *not* established where AI supports critical operations. RM Nexus is the
inverse: the critical operation (an RM getting a dependable per-client briefing) continues within
tolerance when its single AI provider is unavailable. This is the strongest and lowest-cost control
to formalise because it is already built and tested.

**APRA mapping.** AI Letter — *operational resilience* (credible fallback where AI supports critical
operations) and *third-party / supplier risk* (concentration on a single provider → substitution).
CPS 230 — pillar 2 (maintain *critical operations* within *tolerance levels* through severe
disruption, with a credible BCP) and pillar 3 (*material service provider* risk — the Anthropic
API). *("Critical operations", "tolerance levels" and "material service provider" are CPS 230's
defined terms.)*

**In-repo evidence.**
- Zero-LLM floor + silent degradation via the `__NBC_ERROR__` sentinel path — `backend/server.py`;
  the front end leaves that card on its static briefing with no error surfaced.
- No-key fallback proven offline: `backend/tests/test_no_key_fallback.py` (the Anthropic client is
  monkeypatched to fail if constructed; the template still returns).
- Provider substitution lever already exists: `ANTHROPIC_MODEL` env override.

**Residual gap → easy how-to.** The resilience is implicit. *Write a one-paragraph
critical-operation + tolerance statement* ("briefings remain available on static data; AI overlay
is best-effort"), *log degradation events* so silent fallback is observable (feeds C3 and CPS 234
monitoring), and *stand up a one-page material-service-provider register* for Anthropic
(criticality, data sent, fallback, substitution/exit) — CPS 230 pillar 3 / the letter's
third-party theme.

---

### C3 · AI change governance & pre-deployment assurance

**What it is.** No change reaches `main` without a pull request, passing CI, and a **human merge** —
enforced server-side and locally. Every PR that touches the UI carries **browser screenshots as
assurance evidence** before merge.

**Why it matters here.** APRA's letter reports assurance that *lags* deployment, and gaps in
control libraries and change control for AI. RM Nexus front-loads assurance: a change is evidenced
(tests + visual proof) and human-approved *before* it ships, with the agent explicitly barred from
merging its own work.

**APRA mapping.** AI Letter — *assurance & change control* (recognised control frameworks / change
control for AI; assurance not lagging deployment) and *governance & accountability* (lifecycle
ownership, human involvement). CPS 230 — effective internal controls and change management.

**In-repo evidence.**
- Branch protection: GitHub ruleset **`human-review-main`** (PR required, required
  `backend`/`frontend` checks, **no bypass for anyone**) — verified via `gh api`.
- Local belt to that suspenders: `.claude/hooks/git_guard.py` blocks direct push/commit to `main`.
- CI: `backend` (ruff + pytest) and `frontend` (lint) jobs; the **`visual` job** runs Playwright
  against a cold, frontend-only build and **posts labelled screenshots inline on the PR** as
  pre-deployment assurance evidence — `.github/workflows/ci.yml`.
- Spec-driven change trail under `specs/`.

**Residual gap → easy how-to.** *Add a short control-to-evidence register* (this document is its
seed) and *promote the `visual` job to a required check* in the ruleset so visual assurance is
merge-blocking, not merely informational.

---

### Why these three (and not others)

They score highest on **relevance × ease**: each addresses a first-order AI risk for a regulated
RM tool (fabricated figures; provider outage; ungoverned change), and each is **already
implemented as an enforceable technical control** — the kind APRA's letter favours over policy-only
measures — so formalising them is documentation, not new engineering.

**Honourable mentions** (strong, slightly higher effort): a **material AI service-provider
register** for Anthropic (CPS 230 pillar 3 / the letter's third-party theme — folded into C2's
how-to above); and **model/data monitoring** for drift and output quality (the letter's model-risk
theme), which is more meaningful once a live key and real usage exist.

---

## 3. Part B — Security review (mapped to CPS 234)

**Method.** Design/architecture review of this repository — *not* a penetration test or a review of
a deployed system. CPS 234 requires info-security capability commensurate with threats, controls
proportionate to asset **criticality and sensitivity**, systematic independent testing, third-party
assessment, and **incident notification to APRA within 72 hours**.

### Strengths (controls already present)

| # | Control | Evidence | CPS 234 / CPS 230 linkage |
|---|---------|----------|---------------------------|
| S1 | **No secrets in the repo.** `.env` gitignored; only `.env.example` committed; app needs no key to run. | `.gitignore`; `backend/.env.example`; `test_no_key_fallback` | CPS 234 — protection of information assets (credentials) |
| S2 | **Least-privilege CI token.** The `visual` job's `GITHUB_TOKEN` is scoped to `contents`/`pull-requests` only. | `.github/workflows/ci.yml` (`permissions:`) | CPS 234 — access control proportionate to need |
| S3 | **Blast-radius containment.** The tool-less agent cannot take actions, so prompt-injection cannot trigger side effects — only narrative text is at risk. | `NBCAgent.tools = []` (`backend/rm_agent.py`) | CPS 234 — control commensurate with threat; CPS 230 controls |
| S4 | **Restricted CORS.** API accepts browser calls only from `http://localhost:3000`. | `backend/server.py` (`allow_origins`) | CPS 234 — network/interface controls |
| S5 | **Unguessable run identifiers.** `run_id` is a `uuid4().hex`; unknown ids return an error frame. | `backend/server.py` | CPS 234 — access control |
| S6 | **Low data sensitivity by design.** Synthetic dataset only — no real PII/financials. | `frontend/src/lib/rmClients.ts` | CPS 234 — asset classification |

### Residual gaps (recommendations — not implemented in this review)

| # | Finding | Severity (demo → prod) | Linkage | Recommendation |
|---|---------|------------------------|---------|----------------|
| G1 | **No authentication/authorisation** on the backend (single-user demo). | Low → High | CPS 234 access control; FAR accountability | Add authN/authZ (SSO + role checks) before any real data. |
| G2 | **No incident detection or APRA-notification path.** Minimal logging; silent degradation is invisible to operators. | Low → High | CPS 234 **72-hour incident notification**; monitoring | Structured logging of failures/degradation + alerting + a documented notification runbook. |
| G3 | **Public visual-evidence branch.** CI pushes dashboard screenshots to the public `pr-visual-evidence` branch — **safe only because the data is synthetic**. With real data this is a data-exposure control failure. | N/A → **High** | CPS 234 data classification & protection | Gate screenshot publication on data being synthetic; for real data, keep evidence in a private store, not a public branch. |
| G4 | **Prompt-injection can taint narrative.** A crafted client profile could influence the AI's *wording*. | Low | CPS 234 input handling; letter's model-risk theme | Mitigated today (output validated to 3 urgency-ordered items; figures never model-sourced; human-in-loop; advisory framing). Add input sanitisation/output guardrails if exposure widens. |
| G5 | **No rate limiting** on `/api/rm-run` / `/api/stream`. | Low → Medium | CPS 234 availability; CPS 230 op-risk | Add rate limiting / quotas before exposure beyond localhost. |
| G6 | **Third-party/supply-chain surface** (Anthropic SDK, FastAPI, Next.js, Playwright, GitHub Actions). | Low → Medium | CPS 234 third-party; CPS 230 service providers; letter's third-party theme | Dependency pinning + scanning (e.g. Dependabot), and the service-provider register from C2. |

**Assurance note (CPS 234 testing).** The repo already runs **systematic, automated** control tests
on every push and PR — `backend` (ruff + pytest, incl. the boundary and fallback guarantees),
`frontend` (lint), and the `visual` Playwright suite. This is the seed of the "regular testing of
control effectiveness" CPS 234 expects, though CPS 234 also expects *functionally independent*
testers — out of scope for a solo demo.

---

## 4. Regulatory mapping appendix

| Control / finding | APRA AI Letter theme | CPS 230 | CPS 234 | Other |
|---|---|---|---|---|
| C1 AI output boundary | Governance & accountability; operational resilience; model risk | Internal controls | — | FAR (accountability) |
| C2 Resilience / zero-LLM floor | Operational resilience; third-party / supplier | Pillar 2 critical-ops tolerance + BCP; Pillar 3 service provider | Availability | CPG 235 data risk |
| C3 Change governance & assurance | Assurance & change control; governance | Internal controls / change mgmt | Systematic testing | — |
| S1 Secrets hygiene | — | — | Info-asset protection | — |
| S2 Least-privilege CI | Governance & accountability | — | Access control | — |
| G2 Incident notification | Operational resilience; assurance | Op-risk incident mgmt | **72-hr notification** | — |
| G3 Public evidence branch | — | — | Data classification & protection | — |

---

## 5. Sources (APRA primary + authoritative)

- APRA — *Letter to Industry on Artificial Intelligence* (30 April 2026):
  https://www.apra.gov.au/apra-letter-to-industry-on-artificial-intelligence-ai
- APRA — *APRA calls for a step-change in AI-related risk management and governance* (news, Apr 2026):
  https://www.apra.gov.au/news-and-publications/apra-calls-for-a-step-change-ai-related-risk-management-and-governance
- APRA — *Prudential Standard CPS 230 Operational Risk Management* (in force 1 July 2025):
  https://www.apra.gov.au/standards/cps-230
- APRA — *Prudential Standard CPS 234 Information Security*:
  https://www.apra.gov.au/standards/cps-234

*Standard-to-control mappings and AI-Letter theme labels are this team's interpretation; APRA's
framework is principle-based and the AI Letter cites no standard by number.*
