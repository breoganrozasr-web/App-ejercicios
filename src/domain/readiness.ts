import type { Readiness } from './types'

/**
 * Preparación del día (EVIDENCIA, regla R19). Autoevaluación breve; no es un diagnóstico.
 * - 'low' si dormiste mal (≤2), tienes la energía baja (≤2) o muchas agujetas (≥4).
 * - 'ok' en otro caso.
 * Con 'low' se ofrece entrenar de forma más conservadora (sin buscar récords, +1 RIR, una serie menos opcional).
 */
export type ReadinessLevel = 'low' | 'ok'

export function readinessLevel(r: Readiness | null | undefined): ReadinessLevel | null {
  if (!r) return null
  return r.sleep <= 2 || r.energy <= 2 || r.soreness >= 4 ? 'low' : 'ok'
}

export function readinessReasons(r: Readiness): string[] {
  const out: string[] = []
  if (r.sleep <= 2) out.push('has dormido poco o mal')
  if (r.energy <= 2) out.push('tienes poca energía')
  if (r.soreness >= 4) out.push('tienes bastantes agujetas')
  return out
}

export const READINESS_SCALES = {
  sleep: { label: 'Sueño', lo: 'Muy mal', hi: 'Muy bien' },
  energy: { label: 'Energía', lo: 'Muy baja', hi: 'Muy alta' },
  soreness: { label: 'Agujetas', lo: 'Ninguna', hi: 'Muchas' },
} as const
