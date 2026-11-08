'use client'

export type Slice = { label: string; value: number; color: string }

const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const

/** Plain SVG pie. Slices highlight when `active` matches their label. */
export function PieChart({
  slices,
  active,
  onActive,
  size = 280,
}: {
  slices: Slice[]
  active: string | null
  onActive: (label: string | null) => void
  size?: number
}) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  const c = size / 2
  const r = size / 2 - 8
  let angle = -Math.PI / 2
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Pie chart" className="shrink-0">
      {slices.length === 1 ? (
        <circle cx={c} cy={c} r={r} fill={slices[0].color} stroke="#fff" strokeWidth={3} onMouseEnter={() => onActive(slices[0].label)} onMouseLeave={() => onActive(null)} />
      ) : (
        slices.map((s) => {
          const sweep = (s.value / total) * Math.PI * 2
          const [x1, y1] = polar(c, c, r, angle)
          const [x2, y2] = polar(c, c, r, angle + sweep)
          const d = `M${c} ${c} L${x1} ${y1} A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`
          const mid = angle + sweep / 2
          angle += sweep
          const [ox, oy] = active === s.label ? polar(0, 0, 6, mid) : [0, 0]
          return (
            <path
              key={s.label}
              d={d}
              fill={s.color}
              stroke="#fff"
              strokeWidth={3}
              transform={`translate(${ox} ${oy})`}
              className="cursor-pointer transition-transform"
              opacity={active && active !== s.label ? 0.55 : 1}
              onMouseEnter={() => onActive(s.label)}
              onMouseLeave={() => onActive(null)}
            >
              <title>{s.label}</title>
            </path>
          )
        })
      )}
    </svg>
  )
}
