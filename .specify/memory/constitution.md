<!--
Sync Impact Report
==================
Version change: (uninitialized template) → 1.0.0
Ratification: initial adoption (2026-07-06)

Modified principles:
  [PRINCIPLE_1_NAME] → I. Data is Authoritative, the LLM Only Narrates (NON-NEGOTIABLE)
  [PRINCIPLE_2_NAME] → II. Zero Live-LLM Floor (NON-NEGOTIABLE)
  [PRINCIPLE_3_NAME] → III. Responsible AI in a Regulated Context
  [PRINCIPLE_4_NAME] → IV. Offline-First, Test-Guarded
  [PRINCIPLE_5_NAME] → (removed — project defined 4 principles, not 5)

Added sections:
  - Additional Constraints (Boundary Enforcement)
  - Development Workflow & Quality Gates

Removed sections:
  - Fifth principle placeholder (intentionally dropped)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate references generic
     "gates determined based on constitution file"; compatible, no edit required.
  ✅ .specify/templates/spec-template.md — no constitution-specific mandatory sections
     added; compatible.
  ✅ .specify/templates/tasks-template.md — testing-discipline tasks already supported;
     compatible.

Deferred TODOs: none.

Notes: Process/git-workflow rules (Stage A/B, branch protection specifics) and tech-stack
choices are intentionally kept OUT of this constitution; they live in the feature's
process spec (specs/<feature>/process.md) and plan.md respectively.
-->

# RM ClientNexus Constitution

RM ClientNexus is an AI-powered institutional relationship-management dashboard operating in a
regulated banking context. These principles govern how AI is used, how the system behaves when
AI is unavailable, and how correctness is guarded. They supersede ad-hoc practice.

## Core Principles

### I. Data is Authoritative, the LLM Only Narrates (NON-NEGOTIABLE)

Every financial figure originates in the client dataset — never from the model. The LLM receives
a pre-populated client profile and MAY only narrate and prioritize the information it is handed.
It MUST NOT compute, round, invent, aggregate, or otherwise alter any figure.

The boundary is a structural constraint, not a matter of prompting: the Next Best Conversation
(NBC) agent is given no tools, so it has no mechanism to fetch or compute values. This is
enforced by an automated test (`test_boundary_no_tools`) asserting the agent's tool set is empty.

**Rationale**: In a regulated financial context, a model that can compute or restate figures is
a compliance and correctness liability. Making the data authoritative and the model tool-less
removes an entire class of hallucinated-number failures by construction.

### II. Zero Live-LLM Floor (NON-NEGOTIABLE)

The system MUST be fully functional with no live LLM dependency. Every client card ALWAYS renders
a static NBC briefing ("yesterday's briefing") sourced from the client dataset. Live AI is only an
overlay: a fresh briefing rendered on top of the static floor.

Any API or network failure MUST degrade silently to the static briefing — no crash, no spinner
that never resolves, no broken or partial state. This is enforced by key-free tests
(`test_no_key_fallback`): with no API key present the agent returns a deterministic template and
makes no network call.

**Rationale**: The tool must be dependable for an RM's daily work regardless of model
availability, cost, or outage. Treating AI as an enhancement rather than a dependency guarantees
the product never becomes unusable because an external service is down.

### III. Responsible AI in a Regulated Context

Company names used in demonstrations are real; all financial data is synthetic and MUST be
clearly labelled as demonstration data wherever it is presented or documented. The model MUST
emit structured, validated JSON only — exactly three NBC items, urgency-ordered
(critical > high > medium > low). Malformed or unparseable model output MUST degrade to the
fallback (per Principle II) rather than surfacing raw or partial output to the user.

**Rationale**: Clear synthetic-data labelling prevents mistaking a demo for real advice, and
strict output validation keeps the user experience trustworthy even when the model misbehaves.

### IV. Offline-First, Test-Guarded

All behaviours above MUST be guarded by tests that run without secrets or network access, using a
monkeypatched/mocked LLM client. The NBC contract (valid JSON, exactly three urgency-ordered
items), the tool-less boundary, and the no-key fallback are each covered by a dedicated test. CI
MUST run these tests on every push and every pull request.

**Rationale**: Principles that are not tested are aspirations. Key-free, network-free tests make
the guarantees reproducible for any contributor and enforceable in CI on untrusted branches.

## Additional Constraints (Boundary Enforcement)

- The NBC agent MUST be constructed with an empty tool set; adding tools to it is a constitution
  violation requiring an amendment, not a code review waiver.
- The static NBC briefing for each client MUST exist in the dataset independently of any AI call.
- Named enforcing tests (`test_boundary_no_tools`, `test_no_key_fallback`, `test_nbc_contract`)
  MUST remain present and passing; removing or skipping them requires an amendment.

## Development Workflow & Quality Gates

- CI runs the offline test suite on every push and pull request; a red suite blocks merge.
- Changes reaching the `main` branch require a human-merge gate. The specific git process (direct
  commits during early scaffolding vs. branch → PR → CI → approval later, and branch-protection
  configuration) is defined in the feature's process spec (`specs/<feature>/process.md`), not in
  this constitution.
- The Constitution Check in `plan.md` MUST map its gates to Principles I–IV by name and cite the
  enforcing tests.

## Governance

This constitution supersedes ad-hoc practice. Principles I and II are NON-NEGOTIABLE and MUST NOT
be waived; they can only be changed by a versioned amendment to this document.

Amendments MUST: (a) be recorded here with an updated Sync Impact Report, (b) increment the
version per semantic versioning — MAJOR for backward-incompatible principle removals or
redefinitions, MINOR for a new principle or materially expanded guidance, PATCH for
clarifications — and (c) propagate any consequent changes to dependent templates and specs.

Compliance is verified at the plan gate (Constitution Check) and in code review; complexity or
deviation that touches a NON-NEGOTIABLE principle MUST be rejected rather than justified.

**Version**: 1.0.0 | **Ratified**: 2026-07-06 | **Last Amended**: 2026-07-06
