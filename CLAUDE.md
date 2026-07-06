# CLAUDE.md — Agent operating rules

Operating rules for AI coding agents working in this repo. Read before making changes.

## The product

RM ClientNexus: an AI-powered dashboard for institutional banking RMs. A Next.js frontend
renders a fixed book of 8 AU institutional clients from a bundled synthetic dataset; a
Python/FastAPI backend overlays fresh per-client "Next Best Conversation" (NBC) briefings from
an LLM, streamed over SSE. Company names are real; **all financial data is synthetic**.

## Non-negotiable rules

1. **Data is authoritative; the LLM only narrates.** Every financial figure comes from the
   client dataset (`frontend/src/lib/rmClients.ts`), never from the model. The NBC agent has
   **no tools** — it cannot compute, round, or alter a figure. Enforced by `test_boundary_no_tools`
   and by the fact that `NBCItem` carries no numeric fields (narrative strings only).

2. **Zero-live-LLM floor.** The dashboard must work fully with no API key: each card always shows
   the static NBC from the dataset. The AI overlay degrades silently to static data on any API or
   network failure — no crash, no broken state. Enforced by `test_no_key_fallback` and the
   `__NBC_ERROR__` degradation path.

3. **Guarantees are test-guarded and offline.** Backend tests are key-free and network-free
   (Anthropic client monkeypatched). CI runs `pytest` + `ruff` (backend) and `npm run lint`
   (frontend) on **both push and pull_request**.

## Architecture

- `backend/` — Python 3.10+, FastAPI, `anthropic` SDK (no AWS/Bedrock). Entry: `python backend/run.py`
  (forces UTF-8 stdout/stderr before any import — Windows cp1252 otherwise crashes on model output).
  Default model `claude-haiku-4-5-20251001`; override via `ANTHROPIC_MODEL`.
- `frontend/` — Next.js 16, React 19, TypeScript, Tailwind (no Cloudscape). `npm run dev` on :3000.
- `frontend/e2e/` — Playwright visual verification (`playwright.config.ts` + `spec-002-tiles.spec.ts`).
  Boots the **frontend only** (no backend, no key), so a green run also proves the zero-LLM floor.
  Excluded from the app `tsconfig` (tooling, transpiled by Playwright). Run headed via `/verify`.
- Interface contracts (TS types, SSE frames, NBC agent shape) live in `specs/001-rm-clientnexus/contracts/`
  and are the shared source of truth.
- `docs/governance-and-security-review.md` (+ `.html`) names the Responsible-AI controls: the top-3
  AI governance controls mapped to the APRA AI Letter / CPS 230, and a CPS 234 security review. It
  is the control-to-evidence register for the boundary/resilience/change-governance guarantees.
- `specs/003-code-security-review/spec.md` — engineering-depth code & security review (findings with
  `file:line`, demo→prod severity); the known-issues register companion to the governance doc.
- CI jobs: `backend` (ruff+pytest), `frontend` (lint), `visual` (Playwright → inline screenshots
  on the PR via the orphan `pr-visual-evidence` branch), `pr-comment` (status comment). The
  `visual` job is informational, not a required check.

## Build regimes

- **Stage A (items 1–5):** small, atomic commits direct to `main`.
- **Stage B (items 6+, active):** GitHub ruleset `human-review-main` protects `main` (required
  PR + 1 approval, required `backend`/`frontend` status checks, no bypass for anyone). Never
  push or merge to `main` directly. Always branch → push → open PR → wait for CI → wait for
  human approval. A human merges, not the agent. A `.claude/settings.json` `PreToolUse` hook
  (`.claude/hooks/git_guard.py`) also blocks direct push/commit to `main` at the session level —
  a local belt to GitHub's authoritative suspenders.

## Conventions

- **Doc delta every item:** each commit adds a 2–4 line entry to the README Features log, and updates
  this file when a new module appears.
- **Commits:** imperative, scoped (`feat:`, `chore:`, `fix:`, `feat(gov):`). End messages with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- `.env` is gitignored; `.env.example` is committed. Never commit a secret or API key.
- Ambiguous detail: make a call, note it, keep moving.
