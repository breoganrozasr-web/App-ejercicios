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

/** Solo pesos libres en ejercicios multiarticulares: en máquinas/poleas la carga no es comparable y el 1RM no es pertinente. */
const E1RM_TYPES: LoadType[] = ['barbell_total', 'dumbbell_each']

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
    if (allowE1rm && E1RM_TYPES.includes(lt) && ex.category === 'compound' && r <= E1RM_MAX_REPS && w > 0) {
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
      if (allowE1rm && lt && E1RM_TYPES.includes(lt) && ex?.category === 'compound' && set.weightKg && set.reps && set.reps <= E1RM_MAX_REPS) {
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

// ───────────────────────── Último entrenamiento por músculo ─────────────────────────

/**
 * Fecha más reciente con al menos una serie de trabajo completada en la que el músculo es PRINCIPAL
 * (EVIDENCIA, regla R20). Es un dato, no una medida de recuperación.
 */
export function lastTrainedByMuscle(sessions: Session[], muscles: MuscleId[] = MAJOR_MUSCLES): Record<string, string | null> {
  const out: Record<string, string | null> = Object.fromEntries(muscles.map((m) => [m, null]))
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue
    for (const ex of s.exercises) {
      if (!ex.sets.some((x) => x.kind === 'work' && x.completed)) continue
      const def = getExercise(ex.exerciseId)
      if (!def) continue
      for (const m of def.primary) if (m in out && (out[m] === null || (out[m] as string) < s.date)) out[m] = s.date
    }
  }
  return out
}

// ───────────────────────── Récords de una serie / sesión ─────────────────────────

export interface SetRecord {
  kind: 'load' | 'reps_at_load' | 'reps' | 'time' | 'assist'
  /** Texto corto: «62,5 kg × 8». */
  value: string
  /** Explicación: «más peso que nunca para 8 o más repeticiones (antes 60 kg)». */
  detail: string
  /** Para ordenar: mejora relativa. */
  gain: number
}

/**
 * ¿Supera esta serie a todo lo registrado ANTES en el mismo ejercicio? (EVIDENCIA, regla R22)
 * Solo cuenta si hay historial con el que comparar (la primera vez no es un récord):
 *  - Con carga: más kg que nunca con al menos esas repeticiones, o más repeticiones que nunca con al menos esa carga.
 *  - Peso corporal / banda: más repeticiones sin asistencia. Tiempo: más segundos. Asistida: menos asistencia con ≥ repeticiones.
 */
export function setRecord(set: SetEntry, lt: LoadType, prior: SetEntry[], fmt: (n: number) => string): SetRecord | null {
  if (set.kind !== 'work') return null
  const prev = prior.filter((p) => p.kind === 'work' && p.completed)
  if (!prev.length) return null
  if (lt === 'time') {
    const sec = set.durationSec
    if (sec === null) return null
    const best = Math.max(...prev.map((p) => p.durationSec ?? 0))
    return best > 0 && sec > best ? { kind: 'time', value: `${sec} s`, detail: `tu mejor tiempo (antes ${best} s)`, gain: sec / best - 1 } : null
  }
  const reps = set.reps
  if (reps === null || reps < 1) return null
  if (lt === 'assisted') {
    const a = set.assistKg ?? set.weightKg
    if (a === null) return null
    const cands = prev.filter((p) => (p.reps ?? 0) >= reps && (p.assistKg ?? p.weightKg) !== null)
    if (!cands.length) return null
    const min = Math.min(...cands.map((p) => (p.assistKg ?? p.weightKg) as number))
    return a < min ? { kind: 'assist', value: `${reps} rep · asist. ${fmt(a)} kg`, detail: `la menor asistencia para ${reps} o más repeticiones (antes ${fmt(min)} kg)`, gain: (min - a) / Math.max(1, min) } : null
  }
  if (lt === 'bodyweight' || lt === 'band') {
    if ((set.assistKg ?? 0) > 0) return null
    const added = set.addedKg ?? 0
    const cands = prev.filter((p) => !((p.assistKg ?? 0) > 0) && (p.addedKg ?? 0) >= added)
    if (!cands.length) return null
    const best = Math.max(...cands.map((p) => p.reps ?? 0))
    return best > 0 && reps > best
      ? { kind: 'reps', value: `${reps} rep${added ? ` (+${fmt(added)} kg)` : ''}`, detail: `más repeticiones que nunca${added ? ' con ese lastre o más' : ''} (antes ${best})`, gain: reps / best - 1 }
      : null
  }
  const w = set.weightKg
  if (w === null || w <= 0) return null
  const withReps = prev.filter((p) => p.weightKg !== null && (p.reps ?? 0) >= reps)
  if (withReps.length) {
    const bestKg = Math.max(...withReps.map((p) => p.weightKg as number))
    if (w > bestKg) return { kind: 'load', value: `${fmt(w)} kg × ${reps}`, detail: `más peso que nunca para ${reps} o más repeticiones (antes ${fmt(bestKg)} kg)`, gain: w / bestKg - 1 }
  }
  const withLoad = prev.filter((p) => p.weightKg !== null && (p.weightKg as number) >= w)
  if (withLoad.length) {
    const bestReps = Math.max(...withLoad.map((p) => p.reps ?? 0))
    if (bestReps > 0 && reps > bestReps) return { kind: 'reps_at_load', value: `${fmt(w)} kg × ${reps}`, detail: `más repeticiones que nunca con ${fmt(w)} kg o más (antes ${bestReps})`, gain: (reps / bestReps - 1) * 0.5 }
  }
  return null
}

/** Series de trabajo completadas de un ejercicio en sesiones terminadas ANTERIORES a `before`. */
export function priorSets(sessions: Session[], exerciseId: string, before: { id: string; startedAt: number }): SetEntry[] {
  const out: SetEntry[] = []
  for (const s of sessions) {
    if (s.id === before.id || (s.status !== 'completed' && s.status !== 'partial') || s.startedAt >= before.startedAt) continue
    for (const ex of s.exercises) if (ex.exerciseId === exerciseId) for (const set of ex.sets) if (set.kind === 'work' && set.completed) out.push(set)
  }
  return out
}

/** Mejor récord por ejercicio conseguido en una sesión (comparado con las sesiones anteriores). */
export function sessionRecords(session: Session, all: Session[], fmt: (n: number) => string): { exerciseId: string; name: string; rec: SetRecord }[] {
  const out: { exerciseId: string; name: string; rec: SetRecord }[] = []
  const seen = new Set<string>()
  for (const ex of session.exercises) {
    if (seen.has(ex.exerciseId)) continue
    seen.add(ex.exerciseId)
    const prior = priorSets(all, ex.exerciseId, session)
    if (!prior.length) continue
    // Un único récord por ejercicio: la serie que más mejora lo anterior.
    let best: SetRecord | null = null
    const sets = session.exercises.filter((e) => e.exerciseId === ex.exerciseId).flatMap((e) => e.sets)
    for (const set of sets) {
      if (set.kind !== 'work' || !set.completed) continue
      const r = setRecord(set, ex.loadTypeSnapshot, prior, fmt)
      if (r && (!best || r.gain > best.gain)) best = r
    }
    if (best) out.push({ exerciseId: ex.exerciseId, name: ex.nameSnapshot, rec: best })
  }
  return out
}

/** Comparación con la sesión anterior del mismo día de rutina (o con el mismo título si es libre). */
export function previousComparable(session: Session, all: Session[]): Session | null {
  const cands = all.filter((s) => s.id !== session.id && (s.status === 'completed' || s.status === 'partial') && s.startedAt < session.startedAt && (session.dayId ? s.routineId === session.routineId && s.dayId === session.dayId : !s.routineId && s.title === session.title))
  return cands.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
}

export function sessionTotals(s: Session): { sets: number; reps: number; exercises: number } {
  let sets = 0
  let reps = 0
  let exercises = 0
  for (const e of s.exercises) {
    const done = e.sets.filter((x) => x.kind === 'work' && x.completed)
    if (done.length) exercises++
    sets += done.length
    for (const x of done) reps += x.reps ?? 0
  }
  return { sets, reps, exercises }
}
