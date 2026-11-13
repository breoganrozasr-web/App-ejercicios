import { getExercise } from '../catalog'
import { MAJOR_MUSCLES, MUSCLE_LABEL } from '../catalog/exercises'
import type { DurationBreakdown, MuscleId, MuscleVolume, Prescription, RoutineAnalysis, RoutineDay, RoutineVersion } from '../types'
import { WEEKDAY_NAME } from '../util'
import { DURATION } from './params'

/** Ponderación de series indirectas: 0,5 (método "fraccional", Pelland 2025). Es una ESTIMACIÓN, no fisiología exacta. */
export const INDIRECT_WEIGHT = 0.5

export function dayMuscleSets(day: RoutineDay): Map<MuscleId, { direct: number; indirect: number }> {
  const m = new Map<MuscleId, { direct: number; indirect: number }>()
  for (const re of day.exercises) {
    const ex = getExercise(re.exerciseId)
    if (!ex) continue
    const sets = re.prescription.sets
    for (const p of ex.primary) {
      const v = m.get(p) ?? { direct: 0, indirect: 0 }
      v.direct += sets
      m.set(p, v)
    }
    for (const s of ex.secondary) {
      if (ex.primary.includes(s)) continue
      const v = m.get(s) ?? { direct: 0, indirect: 0 }
      v.indirect += sets
      m.set(s, v)
    }
  }
  return m
}

/** Días efectivamente planificados en la semana (si no hay calendario, cada día una vez). */
export function scheduledDays(version: Pick<RoutineVersion, 'days' | 'schedule'>): { weekday: number | null; day: RoutineDay }[] {
  if (!version.schedule.length) return version.days.map((day) => ({ weekday: null, day }))
  const byId = new Map(version.days.map((d) => [d.id, d]))
  return [...version.schedule]
    .sort((a, b) => a.weekday - b.weekday)
    .map((s) => ({ weekday: s.weekday, day: byId.get(s.dayId) }))
    .filter((x): x is { weekday: number; day: RoutineDay } => !!x.day)
}

export function weeklyVolume(version: Pick<RoutineVersion, 'days' | 'schedule'>): MuscleVolume[] {
  const totals = new Map<MuscleId, MuscleVolume>()
  for (const { day } of scheduledDays(version)) {
    const dm = dayMuscleSets(day)
    for (const [muscle, v] of dm) {
      const t = totals.get(muscle) ?? { muscle, directSets: 0, indirectSets: 0, weighted: 0, frequencyDirect: 0, frequencyAny: 0 }
      t.directSets += v.direct
      t.indirectSets += v.indirect
      t.weighted += v.direct + INDIRECT_WEIGHT * v.indirect
      if (v.direct > 0) t.frequencyDirect += 1
      if (v.direct > 0 || v.indirect > 0) t.frequencyAny += 1
      totals.set(muscle, t)
    }
  }
  return [...totals.values()].sort((a, b) => b.weighted - a.weighted)
}

export function exerciseMinutes(exerciseId: string, p: Prescription): { warm: number; work: number; rest: number; transition: number } {
  const ex = getExercise(exerciseId)
  const unilateral = ex?.unilateral ? 2 : 1
  const perSetExec =
    ex?.loadType === 'time'
      ? ((p.timeMinSec ?? 30) + (p.timeMaxSec ?? 30)) / 2
      : ((p.repMin + p.repMax) / 2) * DURATION.secPerRep
  const work = (p.sets * (perSetExec * unilateral + DURATION.setupPerSetSec)) / 60
  const rest = (Math.max(0, p.sets - 1) * p.restSec) / 60
  const warm = p.warmupSets * DURATION.warmupSetMin
  const transition = DURATION.transitionSec / 60
  return { warm, work, rest, transition }
}

export function dayDuration(day: RoutineDay): { minutes: number; breakdown: DurationBreakdown } {
  const b: DurationBreakdown = { generalWarmupMin: DURATION.generalWarmupMin, warmupSetsMin: 0, workMin: 0, restMin: 0, transitionsMin: 0 }
  // Superseries: dentro de un par, el descanso de una se solapa con la ejecución de la otra.
  const seenSuperset = new Set<string>()
  for (const re of day.exercises) {
    const m = exerciseMinutes(re.exerciseId, re.prescription)
    b.warmupSetsMin += m.warm
    b.workMin += m.work
    b.transitionsMin += m.transition
    if (re.superset) {
      if (seenSuperset.has(re.superset)) continue // el descanso del segundo ejercicio se comparte
      seenSuperset.add(re.superset)
    }
    b.restMin += m.rest
  }
  const minutes = Math.round(b.generalWarmupMin + b.warmupSetsMin + b.workMin + b.restMin + b.transitionsMin)
  return { minutes, breakdown: b }
}

/** Grupos principales con estímulo directo en días naturales consecutivos (incluye domingo → lunes de la semana siguiente). */
export function recoveryOverlaps(version: Pick<RoutineVersion, 'days' | 'schedule'>): { a: number; b: number; muscles: MuscleId[] }[] {
  const sched = scheduledDays(version).filter((x) => x.weekday !== null) as { weekday: number; day: RoutineDay }[]
  const byWeekday = new Map(sched.map((s) => [s.weekday, s.day]))
  const out: { a: number; b: number; muscles: MuscleId[] }[] = []
  for (const s of sched) {
    const next = (s.weekday + 1) % 7
    const nd = byWeekday.get(next)
    if (!nd || (next === s.weekday)) continue
    const m1 = dayMuscleSets(s.day)
    const m2 = dayMuscleSets(nd)
    const shared = MAJOR_MUSCLES.filter((mu) => (m1.get(mu)?.direct ?? 0) > 0 && (m2.get(mu)?.direct ?? 0) > 0)
    if (shared.length) out.push({ a: s.weekday, b: next, muscles: shared })
  }
  return out
}

export function analyzeRoutine(version: Pick<RoutineVersion, 'days' | 'schedule'>): RoutineAnalysis {
  const volume = weeklyVolume(version)
  const dayMinutes = version.days.map((d) => ({ dayId: d.id, ...dayDuration(d) }))
  const recoveryWarnings = recoveryOverlaps(version).map(
    (o) => `${cap(WEEKDAY_NAME[o.a])} y ${WEEKDAY_NAME[o.b]} son días seguidos y ambos trabajan ${o.muscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')}.`,
  )
  const byMuscle = new Map(volume.map((v) => [v.muscle, v]))
  const coverageGaps = MAJOR_MUSCLES.filter((m) => (byMuscle.get(m)?.directSets ?? 0) === 0 && (byMuscle.get(m)?.weighted ?? 0) < 2).map(
    (m) => `${MUSCLE_LABEL[m]} no recibe series directas esta semana.`,
  )
  return { volume, dayMinutes, recoveryWarnings, coverageGaps }
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
