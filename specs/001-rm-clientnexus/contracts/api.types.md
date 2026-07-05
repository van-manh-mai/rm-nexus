# Contract: Shared Types (`frontend/src/types/api.ts`)

RM-relevant TypeScript interfaces. These are the source of truth for the browser↔dataset↔SSE
boundary. Backend JSON must serialize into these shapes.

```ts
interface NBCItem {
  urgency: 'critical' | 'high' | 'medium' | 'low'
  action: string   // 3-6 words
  text: string     // 2-3 sentences citing specific figures
  acts: string[]   // 1-3 button labels, max 4 words each
}

interface ClientBriefing {
  client_id: string
  client_name: string
  summary: string          // ≤20 words
  next_best: NBCItem[]     // exactly 3 items, urgency-ordered
}

type SSEMessageType = 'status' | 'nbc' | 'nbc_error' | 'done' | 'error' | 'keepalive' | 'log'

interface SSEMessage {
  type: SSEMessageType
  message?: string
  content?: string      // JSON-stringified ClientBriefing (when type='nbc')
  client_id?: string    // present on type='nbc' and 'nbc_error'
}

interface RMClient {
  id: string; name: string; short: string
  type: string; tier: 'Strategic' | 'Core'
  rm: string; rmEmail: string
  currency: string; currencySymbol: string   // 'AUD', 'A$'
  netPosition: number                        // $M, positive = surplus
  trend: 'up' | 'down' | 'stable'
  exposure: number; revenue: number; revenueYoY: number
  products: string[]                         // e.g. ['DEPOSIT','REPO','FX_SWAP']
  productValues: Record<string, number>
  currencies: Record<string, number>
  liquidityScore: number                     // 0-100; <50 = APRA APS 210 warning zone
  scoreTrend: 'stable' | 'deteriorating' | 'improving'
  lastContact: string; nextMeeting: string | null
  alertLevel: 'critical' | 'high' | 'medium' | 'none'
  alertText: string
  cashFlows: number[]   // 30 daily cash flow values ($M) for sparkline
  nextBest: NBCItem[]   // static fallback briefing
}
```

## `useSSEStream` hook contract (`frontend/src/hooks/useSSEStream.ts`)

```ts
// export function useSSEStream(onMessage: (msg: SSEMessage) => void)
// returns { open(runId: string, baseUrl?: string): void, close(): void }
```

- Implementation: `useRef<EventSource>` + `useCallback`.
- Close the stream on `done` or `error`; also handle `onerror`.
- Each incoming frame is parsed and dispatched to `onMessage`; the page reveals the NBC per client
  from `type='nbc'` frames and leaves the static briefing in place on `type='nbc_error'`.
