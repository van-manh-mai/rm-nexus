# Feature Specification: RM ClientNexus

**Feature Branch**: `001-rm-clientnexus`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "RM ClientNexus — an AI-powered dashboard for institutional banking relationship managers (RMs) at a large Australian bank, in a regulated (APRA) context."

## User Scenarios & Testing *(mandatory)*

RM ClientNexus serves a single persona: an institutional banking **Relationship Manager (RM)**
who manages a book of large AU institutional clients and needs a fast, dependable read on what
to talk to each client about next. The value is delivered in three layers, each independently
usable.

### User Story 1 - Dependable dashboard with no AI (Priority: P1)

An RM opens RM ClientNexus and immediately sees their book of 8 institutional clients. Each
client card shows key metrics and a static "Next Best Conversation" (NBC) briefing sourced from
the client dataset ("yesterday's briefing"). Nothing on the page depends on a live AI service.

**Why this priority**: This is the product's dependability floor. The RM must be able to rely on
the tool for daily work regardless of AI availability, cost, or outage. If only this story ships,
the RM still has a fully usable client dashboard — a viable MVP.

**Independent Test**: Load the dashboard with no AI configured/available and confirm all 8 client
cards render with their metrics and a static NBC briefing, and that no AI request is made.

**Acceptance Scenarios**:

1. **Given** no AI service is configured or reachable, **When** the RM opens the dashboard, **Then** all 8 client cards render with metrics and a static NBC briefing, and zero AI requests are made.
2. **Given** the dashboard is loaded, **When** the RM scans a client card, **Then** it shows net position, total exposure, liquidity score, revenue and year-on-year change, product chips, last-contact and next-meeting, and an alert chip reflecting the client's status.
3. **Given** the dashboard is loaded, **When** the RM reviews any figure on a card, **Then** every figure shown corresponds to a value present in the client dataset.

### User Story 2 - Fresh AI briefings, streamed and fault-tolerant (Priority: P2)

The RM clicks "Generate All Briefings". Fresh AI-generated NBC briefings stream in progressively —
appearing one client at a time as each is produced — and replace the static briefing on each
card. If generation for any client fails, that card silently keeps its static briefing.

**Why this priority**: This is the core AI value-add — timely, prioritized talking points. It sits
above P1 because it enhances rather than replaces the dependable floor, and it must never
compromise it.

**Independent Test**: With AI available, click "Generate All Briefings" and confirm briefings
appear per-client (not all at once at the end); then force a failure for one client and confirm
that card retains its static briefing while others update normally.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the RM clicks "Generate All Briefings", **Then** each client's AI briefing appears on its card as it is produced, progressively rather than all at once at the end.
2. **Given** an AI briefing has arrived for a client, **When** the RM reads it, **Then** it contains exactly 3 NBC items ordered by urgency (critical, then high, then medium, then low), each with a short action title, 2–3 sentences of guidance citing specific A$ figures and APRA thresholds, and 1–3 action-button labels.
3. **Given** AI generation fails for a client (service error, network failure, or malformed output), **When** the failure occurs, **Then** that client's card silently retains its static NBC briefing, no error is surfaced to the RM, and other clients' cards are unaffected.
4. **Given** every AI figure the RM reads, **When** compared against the dataset, **Then** no financial figure appears that is not present in the client dataset.

### User Story 3 - Deep-dive client detail (Priority: P3)

The RM opens a client to see a full profile: net position, exposure, revenue year-on-year,
contacts, currency mix, a liquidity-score bar (0–100), a 30-day cash-flow sparkline, a
product-value breakdown, an alert detail box, and the 3 NBC items with action chips. The RM can
re-generate the AI briefing for just that client from this view.

**Why this priority**: Valuable depth for preparing a specific conversation, but the dashboard and
AI briefings (P1, P2) already deliver the primary value without it.

**Independent Test**: Open a client's detail view and confirm all profile elements render from the
dataset, and that a single-client re-generate updates only that client's briefing.

**Acceptance Scenarios**:

1. **Given** a client on the dashboard, **When** the RM opens its detail view, **Then** the full profile, 30-day cash-flow sparkline, product-value breakdown, alert detail, and 3 NBC items render from the client dataset.
2. **Given** the detail view is open, **When** the RM triggers re-generation for that client, **Then** only that client's briefing is regenerated, and on failure it falls back to that client's static briefing.
3. **Given** the detail view is open, **When** the RM chooses to close it, **Then** they return to the dashboard with all cards intact.

### Edge Cases

- **AI unavailable at start**: dashboard is fully usable on static briefings; "Generate All" either no-ops gracefully or leaves cards on their static briefings — never a crash or stuck state.
- **Partial failure**: some clients succeed and some fail in the same "Generate All" run; succeeded cards show AI briefings, failed cards keep static briefings, no error surfaced.
- **Malformed AI output**: output that is not valid, or not exactly 3 urgency-ordered NBC items, is treated as a failure and degrades to the static briefing rather than being displayed.
- **Slow generation**: a client whose briefing is still generating shows a loading indicator while other cards continue to populate independently.
- **Re-generate while a run is in progress**: single-client re-generation from the detail view updates only that client without disturbing others.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present a book of exactly 8 named AU institutional clients: AustralianSuper, Future Fund, Macquarie AM, QIC, Aware Super, Qantas Airways, Woodside Energy, and Ampol.
- **FR-002**: System MUST display, for each client, key metrics — net position, total exposure, liquidity score, revenue and year-on-year change — plus product chips, last-contact and next-meeting, a client tier (Strategic or Core), and an alert chip reflecting the client's status (critical / high / medium / none).
- **FR-003**: System MUST always show a static NBC briefing for every client, sourced from the client dataset, so the dashboard is fully usable with no live AI dependency.
- **FR-004**: System MUST render the full dashboard and all static briefings on a cold start without making any AI request.
- **FR-005**: System MUST let the RM trigger AI generation of fresh NBC briefings for all clients from the dashboard, and for a single client from that client's detail view.
- **FR-006**: System MUST reveal AI briefings progressively — each client's briefing appears as it is produced, one client at a time, rather than all at once at the end of a run.
- **FR-007**: Each AI briefing MUST consist of exactly 3 NBC items ordered by urgency (critical > high > medium > low). Each item MUST have a short action title, 2–3 sentences of guidance citing specific A$ figures and APRA thresholds, and 1–3 action-button labels.
- **FR-008**: System MUST source every financial figure — on cards, in detail views, and within AI briefings — from the client dataset. The AI MUST only narrate and prioritize the supplied information and MUST NOT compute, round, invent, or alter any figure.
- **FR-009**: On any AI failure for a client (service error, network failure, or output that is malformed or not exactly 3 urgency-ordered NBC items), System MUST silently retain that client's static briefing, surface no error to the RM, and leave all other clients unaffected.
- **FR-010**: System MUST provide a client detail view showing full profile (net position, exposure, revenue year-on-year, contacts, currency mix, a 0–100 liquidity-score bar), a 30-day cash-flow sparkline, a product-value breakdown, an alert detail box, and the 3 NBC items with action chips.
- **FR-011**: System MUST clearly label the dataset as synthetic demonstration data (company names are real; all financials are synthetic).
- **FR-012**: System MUST NOT commit any secret or API key to the repository.

### Key Entities

- **RM Client**: an institutional client in the RM's book. Attributes (by meaning): name and short code; type (e.g. superannuation, sovereign wealth, asset manager, airline, energy producer); tier (Strategic or Core); assigned RM and contact; currency and currency mix; net position; total exposure; revenue and year-on-year change; product holdings and their values; liquidity score (0–100) and its trend; last-contact and next-meeting; alert level and alert text; a 30-day series of daily cash-flow values; and a static NBC briefing.
- **Client Briefing**: the "Next Best Conversation" set for one client — an executive summary plus exactly 3 urgency-ordered NBC items. Exists in two forms: a static briefing from the dataset (always present) and a fresh AI briefing (overlay, may be absent or fail).
- **NBC Item**: a single recommended conversation — an urgency level (critical / high / medium / low), a short action title, 2–3 sentences of guidance citing specific figures and thresholds, and 1–3 action-button labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On cold start, 100% of the 8 client cards render with their metrics and a static NBC briefing, and the number of AI requests made is zero.
- **SC-002**: When the RM triggers "Generate All Briefings", briefings appear progressively — the RM observes cards populating one client at a time rather than every card updating only at the end of the run.
- **SC-003**: When AI generation is forced to fail for a client, the dashboard remains fully intact and that client continues to show its static briefing, with no error shown to the RM and no other client affected.
- **SC-004**: 100% of financial figures shown anywhere (cards, detail views, AI briefings) correspond to values present in the client dataset; none are introduced by the AI.
- **SC-005**: 100% of AI briefings that are displayed contain exactly 3 NBC items in urgency order (critical > high > medium > low).
- **SC-006**: The dashboard remains usable end-to-end (browse clients, open detail, read briefings) with no AI service available at any point.

## Assumptions

- Single RM persona; no multi-user roles, authentication, or permissions are in scope for this demonstration.
- All client financial data is synthetic and fixed in a bundled dataset; there is no live data feed or persistence of RM edits.
- Company names are real and used for realism; all financials are synthetic and labelled as demonstration data.
- The client book is a fixed set of exactly 8 clients for this demonstration.
- "APRA thresholds" (e.g. APS 210 liquidity references) are cited from values carried in the dataset, not computed at runtime.
- Tech stack, git workflow, and build order are intentionally out of scope for this spec — they are defined in the plan (`plan.md`) and the process spec (`process.md`).
