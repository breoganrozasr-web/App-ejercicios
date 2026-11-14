import { getExercise } from '../catalog'
import type { Prescription, Region, RoutineDay, RoutineVersion } from '../types'
import { WEEKDAY_NAME } from '../util'
import { DEFAULT_TARGET_REGIONS, PANEL_REGIONS, REGION_LABEL, contributionOf, type ContributionRole } from './contribution'
import { DURATION } from './params'
import { isTimePrescription } from './prescription'

/** Ponderación de series secundarias: 0,5 (convención aproximada; no es una equivalencia biológica exacta). */
export const INDIRECT_WEIGHT = 0.5

export interface VolumeSource {
  exerciseId: string
  dayId: string
  dayName: string
  weekday: number | null
  /** Series de trabajo del ejercicio ese día (unilateral: series por lado = series para cada lado, no el doble). */
  sets: number
  weight: 1 | 0.5 | 0
  role: ContributionRole
  /** Clasificación antigua (no revisada con la política de familias). */
  legacy: boolean
}

export interface RegionVolume {
  region: Region
  /** Series directas (peso 1). */
  direct: number
  /** Nº de series con contribución secundaria (sin ponderar). */
  secondary: number
  /** direct + 0,5 × secondary. ESTIMACIÓN. */
  estimated: number
  /** Días distintos con al menos una serie directa (el calentamiento no cuenta). */
  directDays: number
  /** Días distintos con contribución secundaria. */
  secondaryDays: number
  /** De esos, días sin trabajo directo de la región. */
  secondaryOnlyDays: number
  sources: VolumeSource[]
}

/** Días planificados en la semana (si no hay calendario, cada día una vez). */
export function scheduledDays(version: Pick<RoutineVersion, 'days' | 'schedule'>): { weekday: number | null; day: RoutineDay }[] {
  if (!version.schedule.length) return version.days.map((day) => ({ weekday: null, day }))
  const byId = new Map(version.days.map((d) => [d.id, d]))
  return [...version.schedule]
    .sort((a, b) => a.weekday - b.weekday)
    .map((s) => ({ weekday: s.weekday, day: byId.get(s.dayId) }))
    .filter((x): x is { weekday: number; day: RoutineDay } => !!x.day)
}

/** Series directas y secundarias por región en un día. */
export function dayRegionSets(day: RoutineDay): Map<Region, { direct: number; secondary: number }> {
  const m = new Map<Region, { direct: number; secondary: number }>()
  for (const re of day.exercises) {
    const c = contributionOf(re.exerciseId)
    for (const it of c.items) {
      const v = m.get(it.region) ?? { direct: 0, secondary: 0 }
      if (it.weight === 1) v.direct += re.prescription.sets
      else if (it.weight === 0.5) v.secondary += re.prescription.sets
      m.set(it.region, v)
    }
  }
  return m
}

export function weeklyRegionVolume(version: Pick<RoutineVersion, 'days' | 'schedule'>): RegionVolume[] {
  const totals = new Map<Region, RegionVolume>()
  const get = (r: Region) => {
    let t = totals.get(r)
    if (!t) {
      t = { region: r, direct: 0, secondary: 0, estimated: 0, directDays: 0, secondaryDays: 0, secondaryOnlyDays: 0, sources: [] }
      totals.set(r, t)
    }
    return t
  }
  for (const r of PANEL_REGIONS) get(r)
  for (const { weekday, day } of scheduledDays(version)) {
    const dayHas = new Map<Region, { d: boolean; s: boolean }>()
    for (const re of day.exercises) {
      const c = contributionOf(re.exerciseId)
      for (const it of c.items) {
        const t = get(it.region)
        t.sources.push({ exerciseId: re.exerciseId, dayId: day.id, dayName: day.name, weekday, sets: re.prescription.sets, weight: it.weight, role: it.role, legacy: c.legacy })
        if (re.prescription.sets <= 0) continue
        const flags = dayHas.get(it.region) ?? { d: false, s: false }
        if (it.weight === 1) {
          t.direct += re.prescription.sets
          flags.d = true
        } else if (it.weight === 0.5) {
          t.secondary += re.prescription.sets
          flags.s = true
        }
        dayHas.set(it.region, flags)
      }
    }
    for (const [r, f] of dayHas) {
      const t = get(r)
      if (f.d) t.directDays++
      if (f.s) {
        t.secondaryDays++
        if (!f.d) t.secondaryOnlyDays++
      }
    }
  }
  for (const t of totals.values()) t.estimated = t.direct + INDIRECT_WEIGHT * t.secondary
  const order = [...PANEL_REGIONS, 'delt_unspecified' as Region]
  return [...totals.values()].filter((t) => PANEL_REGIONS.includes(t.region) || t.sources.length).sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region))
}

/** Frecuencia de práctica de cada ejercicio (días distintos por semana). */
export function exercisePractice(version: Pick<RoutineVersion, 'days' | 'schedule'>): Map<string, number> {
  const m = new Map<string, number>()
  for (const { day } of scheduledDays(version)) {
    for (const id of new Set(day.exercises.map((e) => e.exerciseId))) m.set(id, (m.get(id) ?? 0) + 1)
  }
  return m
}

// ───────────────────────── Tiempo (3.6) ─────────────────────────

export interface DurationBreakdown {
  generalWarmupMin: number
  warmupSetsMin: number
  workMin: number
  restMin: number
  transitionsMin: number
}

function execSecPerSet(exerciseId: string, p: Prescription): number {
  const ex = getExercise(exerciseId)
  const sides = ex?.unilateral ? 2 : 1
  const perSide = isTimePrescription(p, ex) ? ((p.timeMinSec ?? 15) + (p.timeMaxSec ?? 30)) / 2 : ((p.repMin + p.repMax) / 2) * DURATION.secPerRep
  return perSide * sides + (sides === 2 ? DURATION.sideChangeSec : 0)
}

/**
 * Duración estimada de un día (valores de cálculo, no tempos prescritos): calentamiento general, aproximaciones,
 * ejecución (3 s/rep; segundos indicados en isométricos; +15 s al cambiar de lado), descansos entre series y,
 * entre ejercicios, max(descanso previo, 60 s de transición) sin contar dos veces el mismo descanso.
 * En superseries, el descanso se hace tras la pareja.
 */
export function dayDuration(day: RoutineDay): { minutes: number; rounded: number; low: number; high: number; breakdown: DurationBreakdown } {
  const b: DurationBreakdown = { generalWarmupMin: day.exercises.length ? DURATION.generalWarmupMin : 0, warmupSetsMin: 0, workMin: 0, restMin: 0, transitionsMin: 0 }
  const ex = day.exercises
  let i = 0
  while (i < ex.length) {
    const cur = ex[i]
    const pair = cur.superset && ex[i + 1]?.superset === cur.superset ? [cur, ex[i + 1]] : [cur]
    for (const re of pair) {
      b.warmupSetsMin += re.prescription.warmupSets * DURATION.warmupSetMin
      b.workMin += (re.prescription.sets * execSecPerSet(re.exerciseId, re.prescription)) / 60
    }
    const sets = Math.max(...pair.map((re) => re.prescription.sets))
    const rest = Math.max(...pair.map((re) => re.prescription.restSec))
    b.restMin += (Math.max(0, sets - 1) * rest) / 60
    if (pair.length === 2) b.transitionsMin += (sets * 15) / 60 // paso de un ejercicio al otro dentro de la superserie
    i += pair.length
    if (i < ex.length) b.transitionsMin += Math.max(rest, DURATION.transitionSec) / 60
  }
  const minutes = b.generalWarmupMin + b.warmupSetsMin + b.workMin + b.restMin + b.transitionsMin
  const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)
  return { minutes: Math.round(minutes), rounded: r5(minutes), low: r5(minutes * 0.9), high: r5(minutes * 1.1), breakdown: b }
}

/** Texto de duración con margen, redondeado a 5 min (sin falsa precisión). */
export function durationText(day: RoutineDay): string {
  const d = dayDuration(day)
  if (!day.exercises.length) return '0 min'
  return d.low === d.high ? `≈${d.rounded} min` : `${d.low}–${d.high} min`
}

// ───────────────────────── Avisos ─────────────────────────

/** Regiones objetivo con trabajo directo en días naturales consecutivos (incluye domingo → lunes). */
export function recoveryOverlaps(version: Pick<RoutineVersion, 'days' | 'schedule'>, regions: Region[] = DEFAULT_TARGET_REGIONS): { a: number; b: number; regions: Region[] }[] {
  const sched = scheduledDays(version).filter((x) => x.weekday !== null) as { weekday: number; day: RoutineDay }[]
  const byWeekday = new Map(sched.map((s) => [s.weekday, s.day]))
  const out: { a: number; b: number; regions: Region[] }[] = []
  for (const s of sched) {
    const next = (s.weekday + 1) % 7
    const nd = byWeekday.get(next)
    if (!nd || next === s.weekday) continue
    const m1 = dayRegionSets(s.day)
    const m2 = dayRegionSets(nd)
    const shared = regions.filter((r) => (m1.get(r)?.direct ?? 0) > 0 && (m2.get(r)?.direct ?? 0) > 0)
    if (shared.length) out.push({ a: s.weekday, b: next, regions: shared })
  }
  return out
}

export interface RoutineAnalysis {
  volume: RegionVolume[]
  dayMinutes: { dayId: string; minutes: number; text: string }[]
  recoveryWarnings: string[]
  coverageGaps: string[]
}

export function analyzeRoutine(version: Pick<RoutineVersion, 'days' | 'schedule'>, targetRegions: Region[] = DEFAULT_TARGET_REGIONS): RoutineAnalysis {
  const volume = weeklyRegionVolume(version)
  const dayMinutes = version.days.map((d) => ({ dayId: d.id, minutes: dayDuration(d).minutes, text: durationText(d) }))
  const recoveryWarnings = recoveryOverlaps(version, targetRegions).map(
    (o) => `${cap(WEEKDAY_NAME[o.a])} y ${WEEKDAY_NAME[o.b]} son días seguidos y ambos trabajan directamente ${o.regions.map((r) => REGION_LABEL[r].toLowerCase()).join(', ')}. No es peligroso en sí; si notas que llegas cargado, reparte grupos o deja un día entre medias.`,
  )
  const byRegion = new Map(volume.map((v) => [v.region, v]))
  const coverageGaps = targetRegions.filter((r) => (byRegion.get(r)?.direct ?? 0) === 0).map((r) => `${REGION_LABEL[r]}: sin series directas esta semana.`)
  return { volume, dayMinutes, recoveryWarnings, coverageGaps }
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
