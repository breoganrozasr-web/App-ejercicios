/** Utilidades puras: IDs, fechas locales (semana lunes–domingo) y números con coma española. */

export function newId(prefix = ''): string {
  const c = globalThis.crypto
  const raw = c && 'randomUUID' in c ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}_${raw}` : raw
}

// ───────────── Fechas ─────────────

/** 'YYYY-MM-DD' en hora local. */
export function toLocalDate(d: Date | number = new Date()): string {
  const x = typeof d === 'number' ? new Date(d) : d
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

/** 0 = lunes … 6 = domingo. */
export function weekdayMon0(d: Date | string): number {
  const x = typeof d === 'string' ? parseLocalDate(d) : d
  return (x.getDay() + 6) % 7
}

/** Lunes de la semana de la fecha dada (YYYY-MM-DD). */
export function weekStart(d: Date | string): string {
  const x = typeof d === 'string' ? parseLocalDate(d) : new Date(d)
  const wd = weekdayMon0(x)
  x.setDate(x.getDate() - wd)
  return toLocalDate(x)
}

export function addDays(s: string, n: number): string {
  const x = parseLocalDate(s)
  x.setDate(x.getDate() + n)
  return toLocalDate(x)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86400000)
}

export const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const WEEKDAY_NAME = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })
export function formatDateLong(s: string): string {
  const t = dateFmt.format(parseLocalDate(s))
  return t.charAt(0).toUpperCase() + t.slice(1)
}
export function formatDateShort(s: string): string {
  return shortFmt.format(parseLocalDate(s))
}
export function formatTime(ms: number): string {
  return timeFmt.format(new Date(ms))
}

// ───────────── Números ─────────────

/**
 * Convierte texto introducido por la persona en número. Acepta coma o punto decimal ("12,5", "12.5").
 * Devuelve null para vacío o texto no numérico (nunca NaN). Acepta 0.
 */
export function parseDecimal(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  const t = input.trim().replace(/\s/g, '')
  if (t === '') return null
  // "1.234,5" (miles con punto) → 1234.5 ; "12,5" → 12.5 ; "12.5" → 12.5
  let norm = t
  if (norm.includes(',') && norm.includes('.')) norm = norm.replace(/\./g, '').replace(',', '.')
  else norm = norm.replace(',', '.')
  if (!/^-?\d*(\.\d*)?$/.test(norm) || norm === '.' || norm === '-' || norm === '') return null
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

export function parseIntSafe(input: string | number | null | undefined): number | null {
  const n = parseDecimal(input)
  if (n === null) return null
  return Math.round(n)
}

const numFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
/** 12.5 → "12,5" */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return ''
  return numFmt.format(n)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n))
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

/** Hash estable pequeño (para IDs deterministas). */
export function stableHash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}
