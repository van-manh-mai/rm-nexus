# Process Spec: RM ClientNexus Delivery

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Created**: 2026-07-06

This document holds the **delivery process** for RM ClientNexus — the git workflow regimes and the
numbered build order. It is deliberately separate from:

- the **constitution** (`.specify/memory/constitution.md`), which holds use-case *principles*
  (LLM narrates only; zero live-LLM floor), and
- the **spec** (`spec.md`), which holds behavioural requirements.

Process rules are neither product principles nor product behaviour, so they live here.

## Two Build Regimes

### Stage A — direct commits to `main` (build items 1–5)

- Commit directly to `main`. Commits MUST be small, atomic, and well-messaged.
- Used for initial scaffolding and the first working end-to-end slice, before branch protection
  is active.

### Stage B — branch → PR → CI → human approval (build items 6+)

- Branch protection is enabled at the start of Stage B (announced explicitly).
- From then, NEVER push or merge directly to `main`. Every change MUST: branch → push → open PR →
  wait for CI to pass → wait for human approval → human merges.
- The agent does not merge; a human performs the merge (satisfies the constitution's human-merge
  gate).
- Enforcement is layered: a Claude Code `git_guard` PreToolUse hook blocks direct push/commit to
  `main` within a session, and GitHub-side branch protection is the live gate. Hooks bind at
  session start; GitHub protection is authoritative.

## Doc-Delta Rule (every build item)

Every commit MUST include:

- a 2–4 line README "Features log" entry: what shipped / how it was verified / which spec
  acceptance criterion it satisfies; and
- a `CLAUDE.md` update whenever a new module appears.

Markdown only per item; the full/HTML README is assembled in the final item.

## Build Order

| # | Item | Regime | Purpose |
|---|------|--------|---------|
| 1 | Scaffold + spec | Stage A | Backend + frontend skeletons, CI on push **and** pull_request, agent operating rules (CLAUDE.md). |
| 2 | Backend | Stage A | NBC agent (tool-less), FastAPI streaming server, offline/key-free tests. |
| 3 | Frontend data + hook | Stage A | Shared types, the 8-client dataset, the streaming hook. |
| 4 | Frontend components | Stage A | Nav, sparkline, client card, client detail overlay. |
| 5 | Page + wire-up | Stage A | Dashboard page with state, filter/sort, detail modal, end-to-end wiring. |
| — | **Branch protection enabled** | → | Transition to Stage B (announced). |
| 6 | Governance retrofit | Stage B | `git_guard` hook + settings wiring + CI PR-comment step. First PR under the new regime. |
| 7 | One governed feature | Stage B | A small, testable feature (e.g. copy-NBC-to-clipboard, or Escape-to-close) via full branch → PR → CI → approval. |
| 8 | Verify + document | Stage B | Green test suite, finalised README (Frame / Design / Build / Verify / Document), Responsible-AI controls named, cold walk-away check. |

## Cut Order Under Time Pressure

If time runs short, cut in this order:

1. Cut **item 7**'s feature scope first (smallest, most optional).
2. Then **item 5** (the page) — fall back to a backend-only demo (e.g. curl against the streaming
   endpoint) to prove the pipeline.
3. Items **1–4 and 6** are the core story and MUST NOT be cut.

Every commit MUST be real, working, and reviewable.
