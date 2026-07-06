'use client'

import { useState } from 'react'

import { Sparkline } from '@/components/Sparkline'
import type { ClientBriefing, NBCItem, RMClient } from '@/types/api'

const ALERT_STYLES: Record<RMClient['alertLevel'], string> = {
  critical: 'bg-red-100 text-red-800 border border-red-200',
  high: 'bg-amber-100 text-amber-800 border border-amber-200',
  medium: 'bg-blue-100 text-blue-800 border border-blue-200',
  none: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
}

// Whole-tile colour grade (spec 002 FR-206/207): a LIGHT wash keyed to alert level so the book
// is scannable by urgency at a glance. Kept light enough to preserve text contrast; the textual
// alert chip above is retained so colour is never the sole signal.
const TINT_STYLES: Record<RMClient['alertLevel'], string> = {
  critical: 'bg-red-50 border-red-200',
  high: 'bg-amber-50 border-amber-200',
  medium: 'bg-blue-50 border-blue-200',
  none: 'bg-emerald-50 border-emerald-200',
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

  // The whole tile is the click target (opens the detail view). Keyboard-operable per FR-204.
  const open = () => onSelect?.()
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      open()
    }
  }

  return (
    <div
      data-testid="client-tile"
      data-alert-level={client.alertLevel}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      aria-label={`Open ${client.name} details`}
      className={`flex cursor-pointer flex-col rounded-lg border shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${TINT_STYLES[client.alertLevel]}`}
    >
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">{client.name}</h3>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
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
      </div>

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

      <div className="mt-3 px-4">
        <p className="text-[10px] uppercase tracking-wide text-zinc-400">30-day cash flow</p>
        <Sparkline
          values={client.cashFlows}
          width={260}
          height={36}
          className="mt-1 w-full text-zinc-500"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1 px-4">
        {client.products.map((p) => (
          <span
            key={p}
            className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500"
          >
            {p}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-black/5 px-4 py-2 text-[11px] text-zinc-500">
        <span>
          {client.rm} · Last contact {client.lastContact}
        </span>
        <span className="font-medium text-zinc-700">View details ›</span>
      </div>

      {/* Interactive briefing sub-region: clicks here act on their own controls and MUST NOT
          bubble up to open the detail view (spec 002 FR-205 / SC-203). */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="cursor-default border-t border-black/5 px-4 py-3"
      >
        {isGenerating && <p className="text-xs text-zinc-400 italic">Generating fresh briefing…</p>}
        <p className="text-xs text-zinc-600">{summary}</p>
        <button
          type="button"
          data-testid="nbc-toggle"
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
              <li key={i} className="rounded border border-black/5 bg-white/50 p-2">
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
