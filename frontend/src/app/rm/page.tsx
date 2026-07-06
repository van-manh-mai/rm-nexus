'use client'

import { useCallback, useMemo, useState } from 'react'

import { ClientDetail } from '@/components/ClientDetail'
import { NBCCard } from '@/components/NBCCard'
import { WbcNav } from '@/components/WbcNav'
import { API_BASE, useSSEStream } from '@/hooks/useSSEStream'
import { RM_CLIENTS } from '@/lib/rmClients'
import type { ClientBriefing, SSEMessage } from '@/types/api'

export default function RMPage() {
  const [briefings, setBriefings] = useState<Record<string, ClientBriefing>>({})
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 4000)
  }, [])

  const onMessage = useCallback(
    (msg: SSEMessage) => {
      if (msg.type === 'nbc' && msg.client_id) {
        const clientId = msg.client_id
        try {
          const briefing = JSON.parse(msg.content ?? '') as ClientBriefing
          setBriefings((prev) => ({ ...prev, [clientId]: briefing }))
        } catch {
          // malformed content — fall through to clearing pending, static briefing stays
        }
        setPending((prev) => {
          const next = new Set(prev)
          next.delete(clientId)
          return next
        })
      } else if (msg.type === 'nbc_error' && msg.client_id) {
        const clientId = msg.client_id
        setPending((prev) => {
          const next = new Set(prev)
          next.delete(clientId)
          return next
        })
      } else if (msg.type === 'done') {
        setIsRunning(false)
      } else if (msg.type === 'error') {
        setIsRunning(false)
        setPending(new Set())
        showToast('Live briefing stream lost — showing static briefings.')
      }
    },
    [showToast],
  )

  const { open } = useSSEStream(onMessage)

  const runGeneration = useCallback(
    async (clientIds: string[]) => {
      if (isRunning) return
      const clients = RM_CLIENTS.filter((c) => clientIds.includes(c.id))
      setIsRunning(true)
      setPending(new Set(clientIds))
      showToast(
        clients.length === 1
          ? `Generating fresh briefing for ${clients[0].name}…`
          : `Generating ${clients.length} fresh briefings…`,
      )
      try {
        const res = await fetch(`${API_BASE}/api/rm-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clients }),
        })
        if (!res.ok) throw new Error(`rm-run failed: ${res.status}`)
        const { run_id: runId } = (await res.json()) as { run_id: string }
        open(runId)
      } catch {
        setIsRunning(false)
        setPending(new Set())
        showToast('Could not reach the briefing service — showing static briefings.')
      }
    },
    [isRunning, open, showToast],
  )

  const selectedClient = useMemo(
    () => RM_CLIENTS.find((c) => c.id === selectedId) ?? null,
    [selectedId],
  )

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <WbcNav />

      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-sm text-zinc-500">
          {Object.keys(briefings).length} of {RM_CLIENTS.length} briefings refreshed this session
        </p>
        <button
          type="button"
          disabled={isRunning}
          onClick={() => runGeneration(RM_CLIENTS.map((c) => c.id))}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isRunning ? 'Generating…' : 'Generate All Briefings'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-6 pb-10 sm:grid-cols-2 xl:grid-cols-4">
        {RM_CLIENTS.map((client) => (
          <NBCCard
            key={client.id}
            client={client}
            liveBriefing={briefings[client.id] ?? null}
            isGenerating={pending.has(client.id)}
            onSelect={() => setSelectedId(client.id)}
          />
        ))}
      </div>

      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          onClose={() => setSelectedId(null)}
          liveBriefing={briefings[selectedClient.id] ?? null}
          isGenerating={pending.has(selectedClient.id)}
          onGenerate={() => runGeneration([selectedClient.id])}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-40 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
