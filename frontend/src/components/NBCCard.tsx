'use client'

import { useState } from 'react'

import type { ClientBriefing, NBCItem, RMClient } from '@/types/api'

const ALERT_STYLES: Record<RMClient['alertLevel'], string> = {
  critical: 'bg-red-100 text-red-800 border border-red-200',
  high: 'bg-amber-100 text-amber-800 border border-amber-200',
  medium: 'bg-blue-100 text-blue-800 border border-blue-200',
  none: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
}

const URGENCY_STYLES: Record<NBCItem['urgency'], string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-blue-100 text-blue-800',
  low: 'bg-zinc-100 text-zinc-600',
}

function liquidityColor(score: number): string {
  if (score >= 75) return 'text-[#00813D]'
  if (score >= 55) return 'text-amber-600'
  return 'text-[#C8102E]'
}

function signColor(value: number): string {
  return value >= 0 ? 'text-[#00813D]' : 'text-[#C8102E]'
}

interface NBCCardProps {
  client: RMClient
  /** Fresh AI briefing overlay (from SSE). null/undefined = show the static fallback. */
  liveBriefing?: ClientBriefing | null
  isGenerating?: boolean
  onSelect?: () => void
}

export function NBCCard({ client, liveBriefing, isGenerating, onSelect }: NBCCardProps) {
  const [expanded, setExpanded] = useState(false)

  const items = liveBriefing?.next_best ?? client.nextBest
  const summary = liveBriefing?.summary ?? client.alertText

  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onSelect}
        className="flex items-start justify-between gap-2 px-4 pt-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{client.name}</h3>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              {client.tier}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{client.type}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ALERT_STYLES[client.alertLevel]}`}
        >
          {client.alertLevel === 'none' ? 'No alert' : client.alertLevel}
        </span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-3 px-4">
        <Metric
          label="Net Position"
          value={`${client.currencySymbol}${client.netPosition.toLocaleString()}M`}
          valueClassName={signColor(client.netPosition)}
        />
        <Metric
          label="Total Exposure"
          value={`${client.currencySymbol}${client.exposure.toLocaleString()}M`}
        />
        <Metric
          label="Liquidity Score"
          value={String(client.liquidityScore)}
          valueClassName={liquidityColor(client.liquidityScore)}
        />
        <Metric
          label="Revenue YTD"
          value={`${client.currencySymbol}${client.revenue}M`}
          suffix={
            <span className={signColor(client.revenueYoY)}>
              {client.revenueYoY >= 0 ? '+' : ''}
              {client.revenueYoY}%
            </span>
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1 px-4">
        {client.products.map((p) => (
          <span
            key={p}
            className="rounded bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500"
          >
            {p}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-500">
        <span>{client.rm}</span>
        <span>Last contact {client.lastContact}</span>
      </div>

      <div className="border-t border-zinc-100 px-4 py-3">
        {isGenerating && <p className="text-xs text-zinc-400 italic">Generating fresh briefing…</p>}
        <p className="text-xs text-zinc-600">{summary}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="mt-2 text-xs font-medium text-zinc-700 hover:text-zinc-900"
        >
          {expanded ? 'Hide' : `Show ${items.length} NBC`} {expanded ? '▲' : '▼'}
        </button>
        {expanded && (
          <ul className="mt-2 flex flex-col gap-2">
            {items.map((item, i) => (
              <li key={i} className="rounded border border-zinc-100 p-2">
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
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.acts.map((act) => (
                      <span
                        key={act}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  suffix,
  valueClassName,
}: {
  label: string
  value: string
  suffix?: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`text-sm font-semibold text-zinc-900 ${valueClassName ?? ''}`}>
        {value} {suffix}
      </p>
    </div>
  )
}
