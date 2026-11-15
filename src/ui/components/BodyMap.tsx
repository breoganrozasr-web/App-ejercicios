import { useId, type ReactNode } from 'react'
import { ANAT_LABEL, ANAT_REGIONS, ROLE_LABEL, type AnatRegion, type AnatRole } from '../../domain/catalog/anatomy'

/**
 * Esquema corporal ORIGINAL por grupos (frente y espalda), dibujado a mano para Forja con formas simples. No es una
 * ilustración anatómica de músculos profundos ni procede de otras apps: sirve para orientar «qué zona». Funciona sin
 * conexión y en tema claro/oscuro. Cada región tiene nombre accesible y una alternativa en lista con botones grandes.
 */

type Shape = { r: AnatRegion; el: ReactNode; mirror?: boolean }

// Coordenadas locales de una figura de 100 × 230 (lado izquierdo del dibujo; las formas con mirror se reflejan).
const SIL_HALF = (
  <>
    <path d="M30 39 Q21 40 20 52 L17 80 L13 108 L11 122 Q14 126 18 123 L22 108 L27 82 L30 62 Z" />
    <path d="M31 116 Q29 145 34 170 Q33 190 37 214 L38 224 L45 224 L45 214 Q48 190 46 170 Q49 145 49 124 Z" />
  </>
)
const SIL_CENTER = (
  <>
    <ellipse cx="50" cy="15" rx="10" ry="12" />
    <path d="M45 25 L55 25 L56 34 L44 34 Z" />
    <path d="M30 38 Q50 33 70 38 L73 60 Q71 88 68 108 L70 118 Q50 127 30 118 L32 108 Q29 88 27 60 Z" />
  </>
)

const FRONT: Shape[] = [
  { r: 'chest', el: <path d="M33 44 Q41 41 49 43 L49 58 Q40 62 33 56 Z" />, mirror: true },
  { r: 'delt_front', el: <ellipse cx="28" cy="45" rx="5" ry="7" />, mirror: true },
  { r: 'delt_side', el: <ellipse cx="22.3" cy="49" rx="2.4" ry="6" />, mirror: true },
  { r: 'biceps', el: <ellipse cx="24" cy="68" rx="4.2" ry="10.5" />, mirror: true },
  { r: 'forearms', el: <ellipse cx="19.5" cy="96" rx="3.6" ry="11" transform="rotate(8 19.5 96)" />, mirror: true },
  { r: 'abs', el: <rect x="44" y="63" width="12" height="42" rx="5" /> },
  { r: 'obliques', el: <path d="M33 64 Q38 62 42.5 64 L42.5 104 Q37 106 33.5 100 Q31 82 33 64 Z" />, mirror: true },
  { r: 'abductors', el: <ellipse cx="34" cy="122" rx="3.2" ry="6" />, mirror: true },
  { r: 'quads', el: <path d="M34 130 Q33 150 37 166 Q41.5 170 45.5 166 Q47.5 150 46.5 132 Q40 126 34 130 Z" />, mirror: true },
  { r: 'adductors', el: <ellipse cx="47.6" cy="140" rx="1.9" ry="11" />, mirror: true },
]
const BACK: Shape[] = [
  { r: 'upper_back', el: <path d="M43 30 L57 30 L69 40 L58 51 L50 64 L42 51 L31 40 Z" /> },
  { r: 'delt_rear', el: <ellipse cx="27" cy="46" rx="5.5" ry="7" />, mirror: true },
  { r: 'lats', el: <path d="M32 52 Q39 55 45.5 66 L45.5 94 Q39 91 34.5 80 Q31 66 32 52 Z" />, mirror: true },
  { r: 'lower_back', el: <rect x="45.5" y="86" width="9" height="24" rx="4" /> },
  { r: 'triceps', el: <ellipse cx="24" cy="68" rx="4.2" ry="10.5" />, mirror: true },
  { r: 'forearms', el: <ellipse cx="19.5" cy="96" rx="3.6" ry="11" transform="rotate(8 19.5 96)" />, mirror: true },
  { r: 'abductors', el: <ellipse cx="36" cy="114" rx="4.5" ry="4.5" />, mirror: true },
  { r: 'glutes', el: <ellipse cx="41.5" cy="127" rx="8" ry="8.5" />, mirror: true },
  { r: 'hamstrings', el: <path d="M34.5 140 Q34 158 38 170 Q42 173 46 169 Q48 155 47.5 140 Q41 136 34.5 140 Z" />, mirror: true },
  { r: 'adductors', el: <ellipse cx="47.6" cy="150" rx="1.9" ry="10" />, mirror: true },
  { r: 'calves', el: <ellipse cx="41" cy="192" rx="5.2" ry="14" />, mirror: true },
]

export type MapMode =
  | { kind: 'roles'; roles: Partial<Record<AnatRegion, AnatRole>> }
  | { kind: 'values'; values: Partial<Record<AnatRegion, number>>; unit: string }

export function BodyMap({ mode, title, selected, onSelect, showList = true, listExtra, maxWidth = 360 }: { mode: MapMode; title: string; selected?: AnatRegion | null; onSelect?: (r: AnatRegion | null) => void; showList?: boolean; listExtra?: (r: AnatRegion) => ReactNode; maxWidth?: number }) {
  const uid = useId().replace(/:/g, '')
  const hatch = `hatch-${uid}`
  const max = mode.kind === 'values' ? Math.max(0, ...Object.values(mode.values).map((v) => v ?? 0)) : 0
  const style = (r: AnatRegion): React.SVGProps<SVGElement> => {
    const sel = selected === r
    const base = { stroke: sel ? 'var(--text)' : 'var(--map-line)', strokeWidth: sel ? 1.4 : 0.6 }
    if (mode.kind === 'roles') {
      const role = mode.roles[r]
      if (role === 'primary') return { ...base, fill: 'var(--accent)' }
      if (role === 'secondary') return { ...base, fill: `url(#${hatch})` }
      if (role === 'stabilizer') return { ...base, fill: 'var(--map-off)', stroke: 'var(--accent)', strokeWidth: sel ? 1.6 : 1, strokeDasharray: '2 1.4' }
      return { ...base, fill: 'var(--map-off)' }
    }
    const v = mode.values[r] ?? 0
    if (v <= 0 || max <= 0) return { ...base, fill: 'var(--map-off)' }
    return { ...base, fill: 'var(--accent)', fillOpacity: 0.25 + 0.75 * (v / max) }
  }
  const involved = ANAT_REGIONS.filter((r) => (mode.kind === 'roles' ? !!mode.roles[r] : (mode.values[r] ?? 0) > 0))
  const describe = (r: AnatRegion) => (mode.kind === 'roles' ? ROLE_LABEL[mode.roles[r] as AnatRole] : `${String(Math.round((mode.values[r] ?? 0) * 10) / 10).replace('.', ',')} ${mode.unit}`)
  const aria = involved.length ? `${title}: ${involved.map((r) => `${ANAT_LABEL[r]} (${describe(r).toLowerCase()})`).join(', ')}` : `${title}: sin zonas marcadas`
  const render = (shapes: Shape[]) =>
    shapes.map((s, i) => {
      const props = { ...style(s.r), 'data-region': s.r, onClick: onSelect ? () => onSelect(selected === s.r ? null : s.r) : undefined, style: { cursor: onSelect ? 'pointer' : undefined } }
      const el = <g key={`${s.r}-${i}`} {...(props as object)}><title>{ANAT_LABEL[s.r]}</title>{s.el}</g>
      return s.mirror ? [el, <g key={`${s.r}-${i}-m`} transform="translate(100 0) scale(-1 1)" {...(props as object)}><title>{ANAT_LABEL[s.r]}</title>{s.el}</g>] : el
    })
  const figure = (shapes: Shape[], x: number, label: string) => (
    <g transform={`translate(${x} 0)`}>
      <g fill="var(--map-body)" stroke="var(--map-line)" strokeWidth="0.6">
        {SIL_CENTER}
        {SIL_HALF}
        <g transform="translate(100 0) scale(-1 1)">{SIL_HALF}</g>
      </g>
      {render(shapes)}
      <text x="50" y="236" textAnchor="middle" fontSize="8" fill="var(--muted)">{label}</text>
    </g>
  )
  return (
    <div className="body-map stack-sm">
      <svg viewBox="0 0 220 240" role="img" aria-label={aria} style={{ width: '100%', maxWidth, alignSelf: 'center', touchAction: 'manipulation' }}>
        <defs>
          <pattern id={hatch} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="3" fill="var(--accent-soft)" />
            <line x1="0" y1="0" x2="0" y2="3" stroke="var(--accent)" strokeWidth="1.3" />
          </pattern>
        </defs>
        {figure(FRONT, 6, 'Frente')}
        {figure(BACK, 114, 'Espalda')}
      </svg>
      {mode.kind === 'roles' && (
        <div className="row wrap tiny" aria-hidden style={{ gap: 10, justifyContent: 'center' }}>
          <span className="row" style={{ gap: 4 }}><Swatch kind="primary" hatch={hatch} /> Principal</span>
          <span className="row" style={{ gap: 4 }}><Swatch kind="secondary" hatch={hatch} /> Colabora</span>
          <span className="row" style={{ gap: 4 }}><Swatch kind="stabilizer" hatch={hatch} /> Estabiliza</span>
        </div>
      )}
      <span className="tiny muted" style={{ textAlign: 'center' }}>Esquema por grupos, no un dibujo de cada músculo{mode.kind === 'values' ? '; más intenso = más series registradas o previstas' : '; no son porcentajes de activación'}.</span>
      {showList && involved.length > 0 && (
        <ul className="map-list" aria-label={`${title}: lista`}>
          {involved.map((r) => (
            <li key={r}>
              <button className="map-item" aria-pressed={selected === r} onClick={onSelect ? () => onSelect(selected === r ? null : r) : undefined} disabled={!onSelect}>
                <span className="grow">{ANAT_LABEL[r]}</span>
                <span className="small muted">{describe(r)}</span>
              </button>
              {selected === r && listExtra && <div className="small" style={{ padding: '4px 4px 8px' }}>{listExtra(r)}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Swatch({ kind, hatch }: { kind: AnatRole; hatch: string }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden>
      <rect x="1" y="1" width="16" height="10" rx="3" fill={kind === 'primary' ? 'var(--accent)' : kind === 'secondary' ? `url(#${hatch})` : 'var(--map-off)'} stroke={kind === 'stabilizer' ? 'var(--accent)' : 'var(--map-line)'} strokeDasharray={kind === 'stabilizer' ? '2 1.4' : undefined} />
    </svg>
  )
}
