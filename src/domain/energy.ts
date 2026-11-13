import type { BodyWeightEntry, Session } from './types'

/**
 * Estimación de gasto energético de una sesión de fuerza (EVIDENCIA, regla R18).
 * Compendio de Actividades Físicas para adultos 2024 (Herrmann et al.):
 *  - 02054 «ejercicios de fuerza múltiples, 8–15 repeticiones a esfuerzo variable»: 3,5 MET.
 *  - 02052 «sentadillas, peso muerto… lento o explosivo»: 5,0 MET.
 * kcal ≈ MET × kg de peso corporal × horas (1 MET ≈ 1 kcal/kg/h). Es un RANGO orientativo:
 * incluye lo que gastarías en reposo y no tiene en cuenta tu composición corporal ni lo que descansas.
 */
export const MET_LOW = 3.5
export const MET_HIGH = 5.0

export function kcalRange(activeMinutes: number, bodyKg: number): { lo: number; hi: number } | null {
  if (!(activeMinutes > 0) || !(bodyKg > 20) || bodyKg > 400) return null
  const h = activeMinutes / 60
  const r10 = (n: number) => Math.round(n / 10) * 10
  return { lo: r10(MET_LOW * bodyKg * h), hi: r10(MET_HIGH * bodyKg * h) }
}

/** Duración útil de la sesión en minutos (sin pausas). Para registros a posteriori, la declarada. */
export function sessionMinutes(s: Session, now = Date.now()): number {
  if (s.backdated && s.manualDurationMin) return s.manualDurationMin
  const end = s.endedAt ?? now
  const paused = s.pausedTotalMs + (s.pausedAt && !s.endedAt ? now - s.pausedAt : 0)
  return Math.max(0, (end - s.startedAt - paused) / 60000)
}

/** Peso corporal más cercano anterior o igual a la fecha; si no hay, el primero posterior. */
export function bodyweightOn(entries: BodyWeightEntry[], date: string): number | null {
  if (!entries.length) return null
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  let best: BodyWeightEntry | null = null
  for (const e of sorted) if (e.date <= date) best = e
  return (best ?? sorted[0]).kg
}
