'use client'

import { useEffect } from 'react'

import { Sparkline } from '@/components/Sparkline'
import type { ClientBriefing, RMClient } from '@/types/api'

const ALERT_BOX_STYLES: Record<RMClient['alertLevel'], string> = {
  critical: 'bg-red-50 border-red-200 text-red-800',
  high: 'bg-amber-50 border-amber-200 text-amber-800',
  medium: 'bg-blue-50 border-blue-200 text-blue-800',
  none: 'bg-zinc-50 border-zinc-200 text-zinc-600',
}

const URGENCY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-zinc-100 text-zinc-600',
}

function liquidityColor(score: number): string {
  if (score >= 75) return '#00813D'
  if (score >= 55) return '#D97706'
  return '#C8102E'
}

function signColor(value: number): string {
  return value >= 0 ? 'text-[#00813D]' : 'text-[#C8102E]'
}

interface ClientDetailProps {
  client: RMClient
  onClose: () => void
  liveBriefing?: ClientBriefing | null
  isGenerating?: boolean
  onGenerate?: () => void
  onToast?: (message: string) => void
}

export function ClientDetail({
  client,
  onClose,
  liveBriefing,
  isGenerating,
  onGenerate,
  onToast,
}: ClientDetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const items = liveBriefing?.next_best ?? client.nextBest
  const currencyEntries = Object.entries(client.currencies)
  const productEntries = Object.entries(client.productValues)

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{client.name}</h2>
          <p className="text-xs text-zinc-500">
            {client.type} · {client.tier}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          Close ✕
        </button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-3">
        {/* Left: profile */}
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Profile</h3>
            <dl className="mt-2 flex flex-col gap-1.5 text-sm">
              <Row label="Relationship Manager" value={client.rm} />
              <Row label="Email" value={client.rmEmail} />
              <Row label="Last Contact" value={client.lastContact} />
              <Row label="Next Meeting" value={client.nextMeeting ?? 'Not scheduled'} />
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Currency Mix
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {currencyEntries.map(([ccy, pct]) => (
                <div key={ccy} className="flex items-center gap-2 text-xs">
                  <span className="w-10 shrink-0 font-medium text-zinc-600">{ccy}</span>
                  <div className="h-2 flex-1 rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-zinc-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-zinc-500">{pct}%</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Liquidity Score
            </h3>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${client.liquidityScore}%`,
                    backgroundColor: liquidityColor(client.liquidityScore),
                  }}
                />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: liquidityColor(client.liquidityScore) }}
              >
                {client.liquidityScore}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">
              Trend: {client.scoreTrend} · APRA APS 210 warning threshold: 50
            </p>
          </section>
        </div>

        {/* Center: cash flow + products + alert */}
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              30-Day Cash Flow
            </h3>
            <div className="mt-2 flex items-center gap-4">
              <Sparkline values={client.cashFlows} width={440} height={80} className="text-zinc-900" />
              <div className="text-right">
                <p className="text-[10px] uppercase text-zinc-400">Net Position</p>
                <p className={`text-lg font-semibold ${signColor(client.netPosition)}`}>
                  {client.currencySymbol}
                  {client.netPosition.toLocaleString()}M
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Product Breakdown
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {productEntries.map(([product, value]) => {
                const max = Math.max(...productEntries.map(([, v]) => v))
                return (
                  <div key={product} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 font-medium text-zinc-600">{product}</span>
                    <div className="h-2 flex-1 rounded-full bg-zinc-100">
                      <div
                        className="h-2 rounded-full bg-zinc-700"
                        style={{ width: `${(value / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-zinc-500">
                      {client.currencySymbol}
                      {value}M
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

          <section
            className={`rounded-lg border p-3 text-sm ${ALERT_BOX_STYLES[client.alertLevel]}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
              {client.alertLevel === 'none' ? 'Status' : `${client.alertLevel} alert`}
            </p>
            <p className="mt-1">{client.alertText}</p>
          </section>
        </div>

        {/* Right: AI NBC panel */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Next Best Conversation
            </h3>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => {
                onGenerate?.()
                onToast?.(`Generating fresh briefing for ${client.name}…`)
              }}
              className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generating…' : 'Generate ▸'}
            </button>
          </div>

          {liveBriefing ? (
            <p className="text-xs text-zinc-500">{liveBriefing.summary}</p>
          ) : (
            <p className="text-xs text-zinc-400 italic">
              Showing yesterday&apos;s static briefing. Generate a fresh one above.
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {items.map((item, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${URGENCY_STYLES[item.urgency]}`}
                  >
                    {item.urgency}
                  </span>
                  <span className="text-xs font-medium text-zinc-800">{item.action}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">{item.text}</p>
                {item.acts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.acts.map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => onToast?.(`${act} — noted (demo only)`)}
                        className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-200"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-medium text-zinc-700">{value}</dd>
    </div>
  )
}
