import { useMemo, useRef, useState } from 'react'
import { formatDateShort, formatNumber } from '../../domain/util'

interface Pt {
  x: string // fecha YYYY-MM-DD
  y: number | null
}

const W = 340
const H = 170
const PAD = { l: 34, r: 10, t: 12, b: 24 }

function niceTicks(min: number, max: number, n = 4): number[] {
  if (min === max) return [min]
  const span = max - min
  const step = Math.pow(10, Math.floor(Math.log10(span / n)))
  const err = (span / n) / step
  const k = err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1
  const s = k * step
  const out: number[] = []
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) out.push(Math.round(v * 100) / 100)
  return out
}

/** Línea de evolución (un solo eje). Serie opcional discontinua (p. ej. 1RM estimado, misma unidad). Tooltip al tocar y tabla accesible. */
export function LineChart({ points, second, yLabel, label, secondLabel = '1RM estimado' }: { points: Pt[]; second?: Pt[]; yLabel: string; label: string; secondLabel?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const data = useMemo(() => points.filter((p) => p.y !== null) as { x: string; y: number }[], [points])
  const data2 = useMemo(() => (second ?? []).filter((p) => p.y !== null) as { x: string; y: number }[], [second])
  if (data.length < 2) return null
  const xs = [...new Set([...data, ...data2].map((d) => d.x))].sort()
  const ys = [...data, ...data2].map((d) => d.y)
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  if (lo === hi) { lo -= 1; hi += 1 }
  const padY = (hi - lo) * 0.12
  lo = Math.max(0, lo - padY)
  hi += padY
  const ix = (x: string) => xs.indexOf(x)
  const sx = (i: number) => PAD.l + (xs.length === 1 ? 0 : (i / (xs.length - 1)) * (W - PAD.l - PAD.r))
  const sy = (y: number) => PAD.t + (1 - (y - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const path = (d: { x: string; y: number }[]) => d.map((p, i) => `${i ? 'L' : 'M'}${sx(ix(p.x)).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
  const ticks = niceTicks(lo, hi)
  const onMove = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const rel = ((clientX - r.left) / r.width) * W
    let best = 0
    xs.forEach((_, i) => { if (Math.abs(sx(i) - rel) < Math.abs(sx(best) - rel)) best = i })
    setHover(best)
  }
  const hx = hover !== null ? xs[hover] : null
  const hv = hx ? data.find((d) => d.x === hx) : undefined
  const hv2 = hx ? data2.find((d) => d.x === hx) : undefined
  return (
    <figure className="stack-sm" style={{ margin: 0 }}>
      {data2.length > 0 && (
        <div className="legend" aria-hidden>
          <span><i />Carga máxima de trabajo ({yLabel})</span>
          <span><i className="alt" />{secondLabel} (estimación)</span>
        </div>
      )}
      <div className="chart-wrap">
        <svg
          ref={ref}
          className="chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${label}. ${data.length} sesiones; de ${formatNumber(data[0].y)} a ${formatNumber(data[data.length - 1].y)} ${yLabel}.`}
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerDown={(e) => onMove(e.clientX)}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} />
              <text x={PAD.l - 6} y={sy(t) + 4} textAnchor="end">{formatNumber(t)}</text>
            </g>
          ))}
          <text x={sx(0)} y={H - 6} textAnchor="start">{formatDateShort(xs[0])}</text>
          <text x={sx(xs.length - 1)} y={H - 6} textAnchor="end">{formatDateShort(xs[xs.length - 1])}</text>
          {data2.length > 1 && <path className="line alt" d={path(data2)} />}
          <path className="line" d={path(data)} />
          {hover !== null && <line className="xhair" x1={sx(hover)} x2={sx(hover)} y1={PAD.t} y2={H - PAD.b} />}
          {data.map((d) => <circle key={d.x} className="pt" cx={sx(ix(d.x))} cy={sy(d.y)} r={hover !== null && xs[hover] === d.x ? 6 : 4} />)}
        </svg>
        {hover !== null && hx && (
          <div className="chart-tip" style={{ left: `${(sx(hover) / W) * 100}%` }}>
            {formatDateShort(hx)}: {hv ? `${formatNumber(hv.y)} ${yLabel}` : '—'}
            {hv2 && ` · est. ${formatNumber(hv2.y)}`}
          </div>
        )}
      </div>
      <details className="more">
        <summary className="small">Ver como tabla</summary>
        <table className="small num" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Fecha</th><th style={{ textAlign: 'right' }}>{yLabel}</th>{data2.length > 0 && <th style={{ textAlign: 'right' }}>{secondLabel}</th>}</tr></thead>
          <tbody>
            {xs.map((x) => (
              <tr key={x}><td>{formatDateShort(x)}</td><td style={{ textAlign: 'right' }}>{formatNumber(data.find((d) => d.x === x)?.y)}</td>{data2.length > 0 && <td style={{ textAlign: 'right' }}>{formatNumber(data2.find((d) => d.x === x)?.y)}</td>}</tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** Barras por semana (una sola serie). La semana actual se resalta; tooltip al tocar. */
export function WeekBars({ data, label, unit }: { data: { week: string; value: number }[]; label: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const bw = (W - PAD.l - PAD.r) / data.length
  const sy = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const ticks = niceTicks(0, max, 3)
  return (
    <figure className="stack-sm" style={{ margin: 0 }}>
      <div className="chart-wrap">
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}. Últimas ${data.length} semanas: ${data.map((d) => d.value).join(', ')}.`} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} />
              <text x={PAD.l - 6} y={sy(t) + 4} textAnchor="end">{formatNumber(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.l + i * bw + 1
            const h = H - PAD.b - sy(d.value)
            const w = Math.max(2, bw - 2)
            const r = Math.min(4, w / 2, h)
            const y = sy(d.value)
            const last = i === data.length - 1
            return (
              <g key={d.week} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <rect x={PAD.l + i * bw} y={PAD.t} width={bw} height={H - PAD.t - PAD.b} fill="transparent" />
                {d.value > 0 && <path className={`bar ${last || hover === i ? '' : 'dim'}`} d={`M${x},${H - PAD.b} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H - PAD.b} Z`} />}
              </g>
            )
          })}
          <text x={PAD.l} y={H - 6} textAnchor="start">{formatDateShort(data[0].week)}</text>
          <text x={W - PAD.r} y={H - 6} textAnchor="end">Esta semana</text>
        </svg>
        {hover !== null && (
          <div className="chart-tip" style={{ left: `${((PAD.l + (hover + 0.5) * bw) / W) * 100}%` }}>
            Semana del {formatDateShort(data[hover].week)}: {formatNumber(data[hover].value)} {unit}
          </div>
        )}
      </div>
    </figure>
  )
}
