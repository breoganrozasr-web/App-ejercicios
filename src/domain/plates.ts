import type { Increments, LoadType } from './types'

/** Discos por lado disponibles por defecto (gimnasio típico). Configurable en Ajustes. */
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
export const PLATE_CHOICES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5]

export interface PlateResult {
  /** Discos de UN lado, de mayor a menor. */
  perSide: number[]
  /** Peso total que se consigue (barra + 2 × discos). */
  totalKg: number
  exact: boolean
  /** El objetivo es menor que la barra vacía. */
  belowBar: boolean
}

const UNIT = 0.05 // kg: resolución de cálculo (admite discos de 0,25 y 1,25)

/**
 * Discos por lado para llegar a `targetKg` con una barra de `barKg`. Supone pares ilimitados de cada disco.
 * Programación dinámica: si no es exacto, el total más alto que no pase del objetivo, con el menor número de discos.
 */
export function platesFor(targetKg: number, barKg: number, plates: number[] = DEFAULT_PLATES): PlateResult {
  const avail = [...new Set(plates.filter((p) => p > 0))].sort((a, b) => b - a)
  if (!(targetKg > barKg)) return { perSide: [], totalKg: barKg, exact: Math.abs(targetKg - barKg) < 1e-9, belowBar: targetKg < barKg - 1e-9 }
  const side = Math.round((targetKg - barKg) / 2 / UNIT)
  const units = avail.map((p) => Math.round(p / UNIT))
  const INF = Number.MAX_SAFE_INTEGER
  const best = new Array<number>(side + 1).fill(INF)
  const pick = new Array<number>(side + 1).fill(-1)
  best[0] = 0
  for (let s = 1; s <= side; s++) {
    for (let i = 0; i < units.length; i++) {
      const u = units[i]
      if (u <= s && best[s - u] + 1 < best[s]) {
        best[s] = best[s - u] + 1
        pick[s] = i
      }
    }
  }
  let reach = side
  while (reach > 0 && best[reach] === INF) reach--
  const perSide: number[] = []
  for (let s = reach; s > 0; s -= units[pick[s]]) perSide.push(avail[pick[s]])
  perSide.sort((a, b) => b - a)
  const totalKg = Math.round((barKg + 2 * reach * UNIT) * 100) / 100
  return { perSide, totalKg, exact: reach === side, belowBar: false }
}

/** Agrupa discos iguales: [20, 20, 2.5] → "2 × 20 + 2,5". */
export function describePlates(perSide: number[], fmt: (n: number) => string): string {
  if (!perSide.length) return 'sin discos'
  const groups: { kg: number; n: number }[] = []
  for (const p of perSide) {
    const g = groups.find((x) => x.kg === p)
    if (g) g.n++
    else groups.push({ kg: p, n: 1 })
  }
  return groups.map((g) => (g.n > 1 ? `${g.n} × ${fmt(g.kg)}` : fmt(g.kg))).join(' + ')
}

// ───────────────────────── Calentamiento ─────────────────────────

export interface WarmupStep {
  pct: number
  reps: number
  kg: number
}

/**
 * Series de aproximación (EVIDENCIA, regla R21; convención práctica, no una prescripción con evidencia fuerte):
 * cargas crecientes con pocas repeticiones para no fatigar antes de las series de trabajo.
 */
const SCHEMES: Record<number, { pct: number; reps: number }[]> = {
  1: [{ pct: 0.6, reps: 6 }],
  2: [{ pct: 0.5, reps: 8 }, { pct: 0.75, reps: 4 }],
  3: [{ pct: 0.4, reps: 8 }, { pct: 0.6, reps: 5 }, { pct: 0.8, reps: 3 }],
  4: [{ pct: 0.3, reps: 10 }, { pct: 0.5, reps: 6 }, { pct: 0.7, reps: 4 }, { pct: 0.85, reps: 2 }],
}

export function warmupStepFor(lt: LoadType, inc: Increments): number {
  if (lt === 'barbell_total') return inc.barbellKg || 2.5
  if (lt === 'dumbbell_each') return inc.dumbbellKg || 2
  if (lt === 'cable') return inc.cableKg || 2.5
  return inc.machineKg || 5
}

export function warmupPlan(workKg: number, count: number, lt: LoadType, inc: Increments): WarmupStep[] {
  if (!(workKg > 0) || count < 1) return []
  const scheme = SCHEMES[Math.min(4, count)]
  const step = warmupStepFor(lt, inc)
  const floor = lt === 'barbell_total' ? inc.barKg : 0
  const out: WarmupStep[] = scheme.map(({ pct, reps }) => {
    let kg = Math.round((workKg * pct) / step) * step
    kg = Math.max(floor, Math.min(kg, workKg))
    return { pct, reps, kg: Math.round(kg * 100) / 100 }
  })
  // Si hay más series de aproximación que pasos del esquema, se repite la primera (p. ej. barra vacía).
  while (out.length < count) out.unshift({ ...out[0] })
  return out
}
