# Phase 1 Data Model: RM ClientNexus

Entities are described here by meaning and validation rules. The exact TypeScript shapes are in
[contracts/api.types.md](./contracts/api.types.md). All financial values are **synthetic
demonstration data**; company names are real.

## Entities

### RMClient

One institutional client in the RM's book. Fields (see `RMClient` in the contract):

- **Identity**: `id` (e.g. `c01`), `name`, `short` (ticker-like code), `type`, `tier`
  (`Strategic` | `Core`), `rm`, `rmEmail`.
- **Currency**: `currency` (e.g. `AUD`), `currencySymbol` (e.g. `A$`), `currencies` (mix map).
- **Financials** ($M): `netPosition` (positive = surplus), `exposure`, `revenue`, `revenueYoY`
  (%), `products` (codes), `productValues` (code → $M).
- **Liquidity**: `liquidityScore` (0–100; `<50` = APRA APS 210 warning zone), `scoreTrend`
  (`stable` | `deteriorating` | `improving`), `trend` (`up` | `down` | `stable`).
- **Engagement**: `lastContact`, `nextMeeting` (nullable).
- **Alerting**: `alertLevel` (`critical` | `high` | `medium` | `none`), `alertText`.
- **Series**: `cashFlows` — exactly 30 daily cash-flow values ($M), mixed sign (renders a
  meaningful sparkline).
- **Static briefing**: `nextBest` — the fallback `NBCItem[]` (the "yesterday's briefing" floor).

**Validation rules**:
- Exactly 8 clients in `RM_CLIENTS`.
- `liquidityScore` in `[0, 100]`; `cashFlows.length === 30`.
- `nextBest` present and non-empty for every client (Principle II floor).
- Every figure shown in UI/AI must exist here (Principle I / SC-004).

### ClientBriefing

The NBC set for one client: `client_id`, `client_name`, `summary` (≤20 words), and `next_best`
(exactly 3 `NBCItem`, urgency-ordered). Two sources: static (from `RMClient.nextBest`, always
present) and AI (streamed overlay, may be absent or fail).

### NBCItem

A single recommended conversation: `urgency` (`critical` | `high` | `medium` | `low`), `action`
(3–6 words), `text` (2–3 sentences citing specific figures + APRA thresholds), `acts` (1–3 button
labels, ≤4 words each). **Ordering rule**: within a briefing, items are sorted
critical > high > medium > low.

## The 8-client book

Company names real; all financials synthetic. Each client gets plausible $M figures, APRA
threshold references where relevant, 30 mixed-sign daily `cashFlows`, and a 3-item urgency-ordered
`nextBest`.

| id | name | short | type | tier | scenario driving NBC | alertLevel |
|----|------|-------|------|------|----------------------|------------|
| c01 | AustralianSuper | AUS | Superannuation Fund | Strategic | REPO maturity concern; rate-lock opportunity | medium |
| c02 | Future Fund | FF | Sovereign Wealth Fund | Strategic | Strong (liquidity score 90+); reinvestment pitch | none |
| c03 | Macquarie AM | MQG | Asset Manager | Core | **CRITICAL**: liquidity score `<50`, APRA APS 210 breach | critical |
| c04 | QIC | QIC | State Gov Investment | Core | FX concentration above internal limit | high |
| c05 | Aware Super | AWR | Superannuation Fund | Core | **HIGH**: LCR approaching 110% APS 210 warning zone | high |
| c06 | Qantas Airways | QAN | Airline / Transport | Core | **HIGH**: fuel hedge `<70%` limit; oil-price sensitive | high |
| c07 | Woodside Energy | WDS | Oil & Gas Producer | Strategic | Hedge rollover; surplus-liquidity deployment | medium |
| c08 | Ampol Limited | ALD | Fuel Refiner / Retailer | Core | **CRITICAL**: crack-spread crisis, RCF drawdown | critical |

Notes:
- `c03` and `c08` are the two CRITICAL clients; `c02` is the strong/no-alert client.
- APRA APS 210 (liquidity) is the recurring regulatory reference; `liquidityScore < 50` marks the
  warning zone used by the UI colouring and the critical scenarios.
