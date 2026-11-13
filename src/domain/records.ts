import { getExercise } from './catalog'
import { MAJOR_MUSCLES } from './catalog/exercises'
import { INDIRECT_WEIGHT } from './engine/analysis'
import type { LoadType, MuscleId, Session, SetEntry } from './types'
import { addDays, round2, weekStart } from './util'

/**
 * Récords y estimaciones con criterios explícitos (EVIDENCIA, regla R11):
 *  - Solo series de TRABAJO completadas del MISMO ejercicio (id) y mismo tipo de carga.
 *  - "Mejor carga para N repeticiones": la carga más alta con al menos N repeticiones.
 *  - 1RM estimado (Epley) solo con series de 1–10 repeticiones y en ejercicios con carga externa comparable.
 *    Es una ESTIMACIÓN orientativa, no un máximo real, y no se muestra en perfiles de menores.
 */

export const E1RM_MAX_REPS = 10

export function epley(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

const E1RM_TYPES: LoadType[] = ['barbell_total', 'dumbbell_each', 'machine', 'cable']

export interface ExerciseSetPoint {
  date: string
  sessionId: string
  set: SetEntry
}

export function completedWorkSets(sessions: Session[], exerciseId: string): ExerciseSetPoint[] {
  const out: ExerciseSetPoint[] = []
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      for (const set of ex.sets) if (set.kind === 'work' && set.completed) out.push({ date: s.date, sessionId: s.id, set })
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export interface RecordsSummary {
  loadType: LoadType
  /** reps → mejor carga (kg) con al menos esas repeticiones */
  bestLoadForReps: { reps: number; kg: number; date: string }[]
  bestE1rm: { kg: number; fromKg: number; reps: number; date: string } | null
  bestReps: { reps: number; date: string; extraKg: number | null } | null
  bestTimeSec: { sec: number; date: string } | null
  minAssist: { kg: number; reps: number; date: string } | null
}

export function computeRecords(sessions: Session[], exerciseId: string, allowE1rm: boolean): RecordsSummary | null {
  const ex = getExercise(exerciseId)
  if (!ex) return null
  const lt = ex.loadType
  const pts = completedWorkSets(sessions, exerciseId)
  if (!pts.length) return null
  const res: RecordsSummary = { loadType: lt, bestLoadForReps: [], bestE1rm: null, bestReps: null, bestTimeSec: null, minAssist: null }
  if (lt === 'time') {
    for (const p of pts) if (p.set.durationSec !== null && (!res.bestTimeSec || p.set.durationSec > res.bestTimeSec.sec)) res.bestTimeSec = { sec: p.set.durationSec, date: p.date }
    return res
  }
  if (lt === 'assisted') {
    for (const p of pts) {
      const a = p.set.assistKg ?? p.set.weightKg
      if (a === null || (p.set.reps ?? 0) < 1) continue
      if (!res.minAssist || a < res.minAssist.kg) res.minAssist = { kg: a, reps: p.set.reps ?? 0, date: p.date }
    }
    return res
  }
  if (lt === 'bodyweight' || lt === 'band') {
    for (const p of pts) {
      // Solo se comparan series sin asistencia; el lastre se indica aparte.
      if ((p.set.assistKg ?? 0) > 0) continue
      const r = p.set.reps ?? 0
      if (!res.bestReps || r > res.bestReps.reps) res.bestReps = { reps: r, date: p.date, extraKg: p.set.addedKg }
    }
    return res
  }
  const byReps = new Map<number, { kg: number; date: string }>()
  for (const p of pts) {
    const w = p.set.weightKg
    const r = p.set.reps
    if (w === null || r === null || r < 1) continue
    for (let n = 1; n <= Math.min(r, 20); n++) {
      const cur = byReps.get(n)
      if (!cur || w > cur.kg) byReps.set(n, { kg: w, date: p.date })
    }
    if (allowE1rm && E1RM_TYPES.includes(lt) && r <= E1RM_MAX_REPS && w > 0) {
      const e = round2(epley(w, r))
      if (!res.bestE1rm || e > res.bestE1rm.kg) res.bestE1rm = { kg: e, fromKg: w, reps: r, date: p.date }
    }
  }
  // Mostrar solo rangos útiles (sin repetir la misma carga en rangos contiguos).
  const keys = [1, 3, 5, 6, 8, 10, 12, 15, 20]
  let lastKg = -1
  for (const k of keys.reverse()) {
    const v = byReps.get(k)
    if (v && v.kg !== lastKg) {
      res.bestLoadForReps.unshift({ reps: k, ...v })
      lastKg = v.kg
    }
  }
  return res
}

/** Serie por sesión para gráficos de tendencia: carga máxima de trabajo y 1RM estimado de la sesión. */
export function exerciseTrend(sessions: Session[], exerciseId: string, allowE1rm: boolean): { date: string; topKg: number | null; topReps: number | null; e1rm: number | null; reps: number | null; sec: number | null }[] {
  const ex = getExercise(exerciseId)
  const lt = ex?.loadType
  const bySession = new Map<string, ExerciseSetPoint[]>()
  for (const p of completedWorkSets(sessions, exerciseId)) {
    const arr = bySession.get(p.sessionId) ?? []
    arr.push(p)
    bySession.set(p.sessionId, arr)
  }
  const out = [...bySession.values()].map((arr) => {
    const date = arr[0].date
    let topKg: number | null = null
    let topReps: number | null = null
    let e1rm: number | null = null
    let reps: number | null = null
    let sec: number | null = null
    for (const { set } of arr) {
      const w = lt === 'assisted' ? set.assistKg ?? set.weightKg : set.weightKg
      if (w !== null && (topKg === null || w > topKg || (w === topKg && (set.reps ?? 0) > (topReps ?? 0)))) {
        topKg = w
        topReps = set.reps
      }
      if (set.reps !== null && (reps === null || set.reps > reps)) reps = set.reps
      if (set.durationSec !== null && (sec === null || set.durationSec > sec)) sec = set.durationSec
      if (allowE1rm && lt && E1RM_TYPES.includes(lt) && set.weightKg && set.reps && set.reps <= E1RM_MAX_REPS) {
        const e = round2(epley(set.weightKg, set.reps))
        if (e1rm === null || e > e1rm) e1rm = e
      }
    }
    return { date, topKg, topReps, e1rm, reps, sec }
  })
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Series de trabajo completadas por músculo y semana (directas + 0,5 indirectas: estimación). */
export function weeklyMuscleSets(sessions: Session[], weeks: number, today: string): { week: string; perMuscle: Record<string, number> }[] {
  const start = addDays(weekStart(today), -7 * (weeks - 1))
  const res = new Map<string, Record<string, number>>()
  for (let i = 0; i < weeks; i++) res.set(addDays(start, i * 7), {})
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue
    const wk = weekStart(s.date)
    const bucket = res.get(wk)
    if (!bucket) continue
    for (const ex of s.exercises) {
      const def = getExercise(ex.exerciseId)
      if (!def) continue
      const n = ex.sets.filter((x) => x.kind === 'work' && x.completed).length
      if (!n) continue
      for (const m of def.primary) bucket[m] = (bucket[m] ?? 0) + n
      for (const m of def.secondary) if (!def.primary.includes(m)) bucket[m] = (bucket[m] ?? 0) + INDIRECT_WEIGHT * n
    }
  }
  return [...res.entries()].map(([week, perMuscle]) => ({ week, perMuscle }))
}

export function sessionsPerWeek(sessions: Session[], weeks: number, today: string): { week: string; count: number }[] {
  const start = addDays(weekStart(today), -7 * (weeks - 1))
  const counts = new Map<string, number>()
  for (let i = 0; i < weeks; i++) counts.set(addDays(start, i * 7), 0)
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue
    const wk = weekStart(s.date)
    if (counts.has(wk)) counts.set(wk, (counts.get(wk) ?? 0) + 1)
  }
  return [...counts.entries()].map(([week, count]) => ({ week, count }))
}

export const TRACKED_MUSCLES: MuscleId[] = MAJOR_MUSCLES
