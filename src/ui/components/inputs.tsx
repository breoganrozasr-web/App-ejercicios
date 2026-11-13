import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatNumber, parseDecimal } from '../../domain/util'

/**
 * Campo numérico con coma española. Mantiene el texto que escribe la persona ("12," mientras escribe)
 * y notifica el número (o null) al confirmar. Nunca genera NaN. 0 es válido.
 */
export function DecimalInput({
  value, onChange, placeholder, label, integer, className = 'num-input', id, min = 0, max = 1000,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  label: string
  integer?: boolean
  className?: string
  id?: string
  min?: number
  max?: number
}) {
  const [text, setText] = useState(value === null ? '' : formatNumber(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value === null ? '' : formatNumber(value))
  }, [value])
  const commit = (t: string) => {
    let n = parseDecimal(t)
    if (n !== null) {
      if (integer) n = Math.round(n)
      n = Math.min(max, Math.max(min, n))
    }
    if (n !== value) onChange(n)
  }
  return (
    <input
      id={id}
      className={className}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      pattern={integer ? '[0-9]*' : undefined}
      autoComplete="off"
      enterKeyHint="done"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => {
        focused.current = true
        // Evita que la barra inferior tape el campo en iPhone.
        setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250)
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, '')
        setText(t)
        const n = parseDecimal(t)
        if (t === '' || (n !== null && !/[.,]$/.test(t))) commit(t)
      }}
      onBlur={() => {
        focused.current = false
        commit(text)
        const n = parseDecimal(text)
        setText(n === null ? '' : formatNumber(integer ? Math.round(n) : n))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Choice({ selected, onClick, title, desc }: { selected: boolean; onClick: () => void; title: ReactNode; desc?: ReactNode }) {
  return (
    <button type="button" className="choice" aria-pressed={selected} onClick={onClick}>
      <strong>{title}</strong>
      {desc && <span>{desc}</span>}
    </button>
  )
}

export function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={onClick} aria-label={label}>
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; desc?: ReactNode }) {
  return (
    <label className="switch-row">
      <span className="grow">
        <span style={{ fontWeight: 650 }}>{label}</span>
        {desc && <span className="muted small" style={{ display: 'block' }}>{desc}</span>}
      </span>
      <input type="checkbox" className="check" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}
