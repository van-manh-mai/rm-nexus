// Pure SVG bar sparkline: no chart library. Bars rise above a zero midline in bank-green
// for positive cash flow days and drop below it in bank-red for negative days, so an RM
// can read the sign of a day at a glance without reading axis labels.

const POSITIVE = '#00813D'
const NEGATIVE = '#C8102E'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  className?: string
}

export function Sparkline({ values, width = 90, height = 40, className }: SparklineProps) {
  if (values.length === 0) return null

  const max = Math.max(...values.map(Math.abs), 1)
  const midY = height / 2
  const barWidth = width / values.length
  const gap = barWidth > 3 ? 1 : 0

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Cash flow sparkline over ${values.length} days`}
    >
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="currentColor" strokeOpacity={0.15} />
      {values.map((v, i) => {
        const barHeight = (Math.abs(v) / max) * midY
        const x = i * barWidth + gap / 2
        const y = v >= 0 ? midY - barHeight : midY
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={Math.max(barWidth - gap, 0.5)}
            height={Math.max(barHeight, 0.5)}
            fill={v >= 0 ? POSITIVE : NEGATIVE}
          />
        )
      })}
    </svg>
  )
}
