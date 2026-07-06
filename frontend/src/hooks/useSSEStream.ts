import { useCallback, useEffect, useRef } from 'react'

import type { SSEMessage } from '@/types/api'

// SSE goes DIRECT to the backend, not through the Next.js dev proxy: a rewrite/proxy
// buffers event streams and defeats the progressive per-client reveal. Override with
// NEXT_PUBLIC_API_URL, or pass an explicit baseUrl to open().
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const DEFAULT_BASE = API_BASE

/**
 * EventSource wrapper for the RM run stream.
 *
 * open(runId) connects to GET {base}/api/stream/{runId} and dispatches each parsed
 * SSEMessage to onMessage. The stream is closed automatically on a terminal `done` or
 * `error` frame, and on the underlying connection error.
 */
export function useSSEStream(onMessage: (msg: SSEMessage) => void) {
  const sourceRef = useRef<EventSource | null>(null)
  // Keep the latest callback without forcing open()/close() to change identity.
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const close = useCallback(() => {
    sourceRef.current?.close()
    sourceRef.current = null
  }, [])

  const open = useCallback(
    (runId: string, baseUrl: string = DEFAULT_BASE) => {
      close()
      const es = new EventSource(`${baseUrl}/api/stream/${runId}`)
      sourceRef.current = es

      es.onmessage = (evt: MessageEvent<string>) => {
        let msg: SSEMessage
        try {
          msg = JSON.parse(evt.data) as SSEMessage
        } catch {
          return // ignore any non-JSON frame
        }
        onMessageRef.current(msg)
        if (msg.type === 'done' || msg.type === 'error') close()
      }

      es.onerror = () => {
        onMessageRef.current({ type: 'error', message: 'stream connection lost' })
        close()
      }
    },
    [close],
  )

  return { open, close }
}
