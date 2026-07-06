// Shared types for the browser ↔ dataset ↔ SSE boundary. Source of truth mirrored from
// specs/001-rm-clientnexus/contracts/api.types.md. Backend JSON serialises into these shapes.

/**
 * A single recommended conversation.
 *
 * BOUNDARY (Constitution Principle I): every field is a string / string[]. There is NO
 * numeric field here, so a figure the model narrates in `text` is never a value the UI
 * trusts as data. All numbers the UI renders come from {@link RMClient}, never from the model.
 */
export interface NBCItem {
  urgency: 'critical' | 'high' | 'medium' | 'low'
  action: string // 3-6 words
  text: string // 2-3 sentences citing specific figures
  acts: string[] // 1-3 button labels, max 4 words each
}

export interface ClientBriefing {
  client_id: string
  client_name: string
  summary: string // ≤20 words
  next_best: NBCItem[] // exactly 3 items, urgency-ordered
}

export type SSEMessageType =
  | 'status'
  | 'nbc'
  | 'nbc_error'
  | 'done'
  | 'error'
  | 'keepalive'
  | 'log'

export interface SSEMessage {
  type: SSEMessageType
  message?: string
  content?: string // JSON-stringified ClientBriefing (when type === 'nbc')
  client_id?: string // present on type 'nbc' and 'nbc_error'
}

export interface RMClient {
  id: string
  name: string
  short: string
  type: string
  tier: 'Strategic' | 'Core'
  rm: string
  rmEmail: string
  currency: string
  currencySymbol: string // 'AUD', 'A$'
  netPosition: number // $M, positive = surplus
  trend: 'up' | 'down' | 'stable'
  exposure: number
  revenue: number
  revenueYoY: number
  products: string[] // e.g. ['DEPOSIT','REPO','FX_SWAP']
  productValues: Record<string, number>
  currencies: Record<string, number>
  liquidityScore: number // 0-100; <50 = APRA APS 210 warning zone
  scoreTrend: 'stable' | 'deteriorating' | 'improving'
  lastContact: string
  nextMeeting: string | null
  alertLevel: 'critical' | 'high' | 'medium' | 'none'
  alertText: string
  cashFlows: number[] // 30 daily cash flow values ($M) for sparkline
  nextBest: NBCItem[] // static fallback briefing ("yesterday's briefing")
}
