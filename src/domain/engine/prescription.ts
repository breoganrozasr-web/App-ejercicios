import type { Exercise, Goal, Level, Prescription } from '../types'
import { isLoadedDynamic, isPushUp, isTimeEx, repRange, restSeconds, rirRange, timeRange, warmupSets, type SlotRole } from './params'

export interface PrescriptionContext {
  level: Level
  goal: Goal
  youth?: boolean
}

/** Prescripción por defecto (motor 2, tabla 3.2). Todo es editable después. */
export function buildPrescription(ex: Exercise, role: SlotRole, ctx: PrescriptionContext, opts: { reference?: boolean; sets?: number } = {}): Prescription {
  if (ctx.youth) return youthPrescription(ex, role)
  const reference = !!opts.reference
  const c = { goal: ctx.goal, level: ctx.level, role, reference }
  const sets = opts.sets ?? defaultSetsFor(ex, ctx, role, reference)
  if (isTimeEx(ex)) {
    const [tMin, tMax] = timeRange(ex)
    return { sets, repMin: 0, repMax: 0, rirMin: 0, rirMax: 0, restSec: restSeconds(ex, c), warmupSets: 0, timeMinSec: tMin, timeMaxSec: tMax, unit: 'time' }
  }
  const [repMin, repMax] = repRange(ex, c)
  const rir = rirRange(ex, c) ?? [2, 3]
  return {
    sets,
    repMin,
    repMax,
    rirMin: rir[0],
    rirMax: rir[1],
    restSec: restSeconds(ex, c),
    warmupSets: warmupSets(ctx.level, ex, role, reference),
    unit: 'reps',
    ...(reference ? { reference: true } : {}),
  }
}

function defaultSetsFor(ex: Exercise, ctx: PrescriptionContext, role: SlotRole, reference: boolean): number {
  if (isTimeEx(ex)) return ex.id === 'plancha_lateral' ? 1 : 2
  if (reference && ctx.goal === 'strength') return ctx.level === 'beginner' ? 2 : 3
  if (reference && ctx.goal === 'mixed') return 3
  if (ctx.goal === 'general') return 2
  if (role === 'main' && ctx.level !== 'beginner') return 3
  return 2
}

/** Menores (14–17): itinerario separado y supervisado. Técnica primero, sin fallo, 1–2 series (NSCA 2009; AAP 2020). */
function youthPrescription(ex: Exercise, role: SlotRole): Prescription {
  const isTime = isTimeEx(ex)
  return {
    sets: role === 'accessory' ? 1 : 2,
    repMin: isTime ? 0 : ex.category === 'compound' ? 8 : 10,
    repMax: isTime ? 0 : ex.category === 'compound' ? 12 : 15,
    rirMin: isTime ? 0 : 3,
    rirMax: isTime ? 0 : 4,
    restSec: ex.category === 'compound' ? 120 : 90,
    warmupSets: ex.category === 'compound' && isLoadedDynamic(ex) && ex.loadType !== 'band' ? 1 : 0,
    timeMinSec: isTime ? 15 : undefined,
    timeMaxSec: isTime ? 30 : undefined,
    unit: isTime ? 'time' : 'reps',
    note: 'Con supervisión de un adulto cualificado. Sin llegar al fallo.',
  }
}

/**
 * Familiarización (3.1, motor 2): max(1, ceil(series/2)); aprendizaje 8–12 en dinámicos con carga y 6–12 en flexiones
 * (y demás calistenia), salvo rangos base más altos; RIR 3–4. Isométricos: mismo tiempo, sin RIR. No modifica el original.
 * 2.2: las referencias de fuerza con rangos 4–6/6–8 aprenden con 6–8 y margen (carga elegida por la persona; sin 1RM).
 */
export function applyFamiliarization(p: Prescription, ex: Exercise | undefined): Prescription {
  const sets = Math.max(1, Math.ceil(p.sets / 2))
  if (!ex || isTimeEx(ex) || p.unit === 'time') return { ...p, sets }
  let repMin = p.repMin
  let repMax = p.repMax
  if (p.reference && p.repMax <= 8) [repMin, repMax] = [6, 8]
  else if (p.repMin < 10) {
    if (isPushUp(ex) || ex.loadType === 'bodyweight') [repMin, repMax] = [6, 12]
    else [repMin, repMax] = [8, 12]
  }
  return { ...p, sets, repMin, repMax, rirMin: 3, rirMax: 4 }
}

/** Familiarización ANTIGUA (motor 1, por semanas): una serie menos y RIR 3–4. Se conserva para versiones antiguas. */
export function applyRamp(p: Prescription): Prescription {
  return { ...p, sets: Math.max(1, p.sets - 1), rirMin: Math.max(p.rirMin, 3), rirMax: Math.max(p.rirMax, 4) }
}

export function isTimePrescription(p: Prescription, ex?: Exercise): boolean {
  return p.unit === 'time' || (!p.unit && ex?.loadType === 'time')
}

export function describePrescription(p: Prescription, ex?: Exercise): string {
  const sets = `${p.sets} ${p.sets === 1 ? 'serie' : 'series'}`
  if (isTimePrescription(p, ex)) return `${sets} × ${p.timeMinSec ?? 15}–${p.timeMaxSec ?? 30} s${ex?.unilateral ? ' por lado' : ''}`
  const reps = p.repMin === p.repMax ? `${p.repMin}` : `${p.repMin}–${p.repMax}`
  return `${sets} × ${reps} rep${ex?.unilateral ? ' por lado' : ''}`
}

/** Texto de esfuerzo objetivo. Isométricos: sin RIR (F3). */
export function describeRir(p: Prescription, ex?: Exercise): string {
  if (isTimePrescription(p, ex)) return 'sin RIR (para antes de perder la postura)'
  return p.rirMin === p.rirMax ? `RIR ${p.rirMin}` : `RIR ${p.rirMin}–${p.rirMax}`
}
