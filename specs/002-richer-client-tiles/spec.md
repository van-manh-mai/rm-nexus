# Feature Specification: Richer Client Tiles

**Feature Branch**: `002-richer-client-tiles`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Update the UI to (1) show the 30-day cash-flow visual bar on each
client tile in the summary screen, (2) make it more obvious that a tile can be clicked to expand
into more detail, and (3) add a bit more colour grading to each of the customer tiles."

**Depends on**: `specs/001-rm-clientnexus/spec.md` (this feature enhances the Story-1 dashboard
tiles). This is the "one governed feature" delivered under Stage B (branch → PR → CI → human
approval; see `specs/001-rm-clientnexus/process.md`).

## Constitution Guardrails *(inherited, non-negotiable)*

This feature is **presentation-only**. It MUST NOT weaken the two product principles:

- **Data is authoritative; the LLM only narrates.** Every new visual element renders from values
  already in the client dataset (`frontend/src/lib/rmClients.ts`) — the sparkline from
  `cashFlows`, the colour grade from `alertLevel`. No figure and no colour is sourced from the
  model.
- **Zero-live-LLM floor.** All three enhancements are static-data driven and MUST render fully on
  a cold start with no API key. None of them may introduce a dependency on the AI overlay.

## User Scenarios & Testing *(mandatory)*

Persona is unchanged: the institutional-banking **Relationship Manager (RM)** scanning a book of
8 clients. This feature sharpens the at-a-glance read of the summary dashboard and the
discoverability of the detail view.

### User Story 1 - Cash-flow shape at a glance on every tile (Priority: P1)

While scanning the dashboard, the RM sees each client's 30-day cash-flow trend directly on its
tile — the same green-above / red-below sparkline currently only available after opening the
detail view — so liquidity momentum is legible without a click.

**Why this priority**: Highest-value of the three; it surfaces existing dataset information at the
scanning altitude where the RM actually triages the book.

**Independent Test**: Load the dashboard cold (no API key) and confirm every one of the 8 tiles
shows a cash-flow sparkline whose bars match that client's `cashFlows` series, with positive days
above and negative days below the midline.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the RM scans any tile, **Then** it shows a compact
   30-day cash-flow sparkline rendered from that client's dataset `cashFlows`, positive values
   above the midline (green) and negative below (red).
2. **Given** no AI service is configured, **When** the dashboard renders on cold start, **Then**
   all 8 tile sparklines are present (they depend only on static data).
3. **Given** a client with a mixed-sign cash-flow series, **When** the RM reads its tile
   sparkline, **Then** the bar directions and relative heights correspond to the dataset values
   (no figure is invented or rescaled away from the underlying data's sign).

### User Story 2 - Obvious that a tile opens a deeper view (Priority: P2)

The RM immediately understands that a tile is interactive — that clicking it opens the full-screen
client detail — without having to discover it by trial.

**Why this priority**: The detail view (Story 3 of spec 001) already exists but is under-discovered;
this removes that friction. It ranks below the sparkline because the detail path is reachable
today, just not obvious.

**Independent Test**: Load the dashboard and confirm, without hovering, that each tile carries a
persistent "View details ›" affordance; then hover a tile and confirm a visible lift (elevation +
ring); then click the tile body and confirm the detail view opens.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the RM looks at any tile without interacting,
   **Then** a persistent "View details ›" affordance is visible on the tile (discoverable without
   hover, for touch and accessibility).
2. **Given** a tile, **When** the RM hovers (or keyboard-focuses) it, **Then** the tile shows a
   visible interactive state (elevation/shadow + focus ring).
3. **Given** a tile, **When** the RM clicks anywhere on the tile body, **Then** that client's
   detail view opens.
4. **Given** a tile with its in-card controls, **When** the RM clicks the "Show N NBC" toggle or
   an action-button chip, **Then** that control acts on its own and does **not** also open the
   detail view (inner controls stop propagation).
5. **Given** a tile, **When** the RM navigates by keyboard, **Then** the tile is focusable and can
   be activated with Enter/Space.

### User Story 3 - Status legible through tile colour (Priority: P3)

Each tile is subtly tinted by its alert level so the RM can sort the book by urgency at a glance —
red for critical, amber for high, blue for medium, green/neutral for none.

**Why this priority**: A polish layer; the alert chip already communicates status textually, so
this reinforces rather than introduces the signal.

**Independent Test**: Load the dashboard and confirm each tile's tint corresponds to its dataset
`alertLevel`, that body text remains legible against the tint, and that the textual alert chip is
still present (colour is never the only signal).

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the RM scans the tiles, **Then** each tile carries a
   light background tint keyed to its dataset `alertLevel` (critical=red, high=amber, medium=blue,
   none=green/neutral).
2. **Given** a tinted tile, **When** the RM reads its metrics and briefing text, **Then** all text
   meets normal readability (contrast preserved; tint is a light wash, not a saturated fill).
3. **Given** a tinted tile, **When** colour is unavailable to the RM (colour-blindness, greyscale),
   **Then** the textual alert chip still conveys the same status (colour is redundant, not sole).

### Edge Cases

- **All-positive or all-negative cash-flow series**: the sparkline still renders with a visible
  midline reference; bars sit entirely above or below without clipping.
- **Alert level `none`**: tile uses the neutral/green tint and a "No alert" chip — no red/amber
  noise on healthy clients.
- **Live AI briefing overlaid**: the sparkline (dataset) and tint (dataset `alertLevel`) are
  unaffected by whether a fresh AI briefing has arrived — the AI overlay changes narrative only.
- **Dark mode / narrow viewport**: tint and sparkline remain legible; tiles reflow without the
  sparkline overflowing the tile width.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-201**: Each client tile on the summary dashboard MUST display a compact 30-day cash-flow
  sparkline rendered from that client's dataset `cashFlows`, using the same sign convention as the
  detail view (positive above midline in green, negative below in red).
- **FR-202**: The tile sparkline MUST render on cold start with no AI request and MUST NOT depend
  on the AI overlay.
- **FR-203**: Each tile MUST present a persistent, always-visible affordance ("View details ›")
  indicating it opens the client detail view, discoverable without hover.
- **FR-204**: Each tile MUST show a visible interactive state on hover and on keyboard focus
  (e.g. elevation + focus ring), and MUST be operable by both pointer click and keyboard
  activation (Enter/Space).
- **FR-205**: Clicking the tile body MUST open that client's detail view; the in-card "Show N NBC"
  toggle and any action-button chips MUST act independently and MUST NOT also trigger the detail
  view (event propagation isolated).
- **FR-206**: Each tile MUST carry a light background tint keyed to its dataset `alertLevel`
  (critical=red, high=amber, medium=blue, none=green/neutral).
- **FR-207**: The tile tint MUST be light enough that all tile text retains readable contrast, and
  the textual alert chip MUST remain present so status is never conveyed by colour alone.
- **FR-208**: All new visual elements MUST derive solely from the client dataset; none may be
  sourced from, or altered by, the AI. No numeric value may be introduced by these changes.
- **FR-209**: The changes MUST NOT regress any spec-001 behaviour — the 8-client book, metrics,
  static briefings, progressive AI reveal, silent degradation, and the detail view all continue to
  function (spec-001 SC-001 … SC-006 still hold).

### Key Entities

No new entities. This feature is a presentation change over the existing **RM Client** entity;
it surfaces its `cashFlows` and `alertLevel` attributes on the summary tile.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: 100% of the 8 tiles render a cash-flow sparkline on cold start (no API key), each
  matching that client's dataset `cashFlows` sign pattern.
- **SC-202**: 100% of tiles show a persistent "View details ›" affordance without hover, and a
  click on the tile body opens the corresponding detail view.
- **SC-203**: Clicking an in-card control (NBC toggle or action chip) never opens the detail view
  (0 unintended detail-view opens from inner controls).
- **SC-204**: 100% of tiles are tinted per their dataset `alertLevel`, with the textual alert chip
  still present on every tile.
- **SC-205**: All spec-001 success criteria (SC-001 … SC-006) continue to pass unchanged after
  this feature lands.
- **SC-206**: Frontend `tsc`, ESLint, and `next build` are clean, and the feature is verified live
  in the browser on a cold (key-free) start.

## Design Decisions

- **Colour-grading treatment — whole-tile light tint** (chosen over left-stripe / top-bar). It is
  the most immediately scannable of the options; the trade-off is that it is the busiest, so
  FR-207 constrains it to a *light* wash with preserved text contrast and a retained textual chip.
- **Click affordance — hover-lift + persistent "View details ›" hint** (chosen over corner-chevron
  / footer-button). The persistent hint keeps discoverability for touch/greyscale; the whole tile
  is the click target, so FR-205 isolates the inner controls' events.
- **Sparkline placement — compact full-width strip on the tile**, reusing the existing
  `frontend/src/components/Sparkline.tsx` component and the client's dataset `cashFlows`. No new
  data and no new component; the detail view keeps its larger sparkline.

## Assumptions

- Reuses the existing `Sparkline` component and dataset `cashFlows`; no dataset schema change and
  no new dependencies.
- Tailwind-only styling, consistent with the existing components (no component library).
- Delivered as the Stage B "one governed feature": branch → push → PR → CI green → human approval →
  human merges. The agent does not merge.
- Doc delta: a README Features-log entry accompanies the implementing commit (per process.md).
