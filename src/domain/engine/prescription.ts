import type { Exercise, Goal, Level, Prescription } from '../types'
import { defaultSets, repRange, restSeconds, rirRange, warmupSets, type SlotRole } from './params'

export interface PrescriptionContext {
  level: Level
  goal: Goal
  youth?: boolean
}

/** Prescripción por defecto de un ejercicio según su papel en la sesión. Todo es editable después. */
export function buildPrescription(ex: Exercise, role: SlotRole, ctx: PrescriptionContext): Prescription {
  if (ctx.youth) return youthPrescription(ex, role)
  const [repMin, repMax] = repRange(ctx.goal, ctx.level, ex, role)
  const [rirMin, rirMax] = rirRange(ctx.goal, ctx.level, ex, role, false)
  const p: Prescription = {
    sets: defaultSets(ctx.level, role),
    repMin,
    repMax,
    rirMin,
    rirMax,
    restSec: restSeconds(ctx.goal, ex, role),
    warmupSets: warmupSets(ctx.level, ex, role),
  }
  if (ex.loadType === 'time') {
    p.repMin = 0
    p.repMax = 0
    p.timeMinSec = ctx.level === 'beginner' ? 20 : 30
    p.timeMaxSec = ctx.level === 'beginner' ? 40 : 60
  }
  return p
}

/** Menores (14–17): técnica primero, sin fallo, 1–2 series, 8–15 repeticiones, descansos amplios (NSCA 2009; AAP 2020). */
function youthPrescription(ex: Exercise, role: SlotRole): Prescription {
  const isTime = ex.loadType === 'time'
  return {
    sets: role === 'accessory' ? 1 : 2,
    repMin: isTime ? 0 : ex.category === 'compound' ? 8 : 10,
    repMax: isTime ? 0 : ex.category === 'compound' ? 12 : 15,
    rirMin: 3,
    rirMax: 4,
    restSec: ex.category === 'compound' ? 120 : 90,
    warmupSets: ex.category === 'compound' && ex.loadType !== 'bodyweight' ? 1 : 0,
    timeMinSec: isTime ? 15 : undefined,
    timeMaxSec: isTime ? 30 : undefined,
    note: 'Con supervisión de un adulto cualificado. Sin llegar al fallo.',
  }
}

/** Aplica la fase de familiarización: una serie menos (mínimo 1) y RIR 3–4. No modifica el original. */
export function applyRamp(p: Prescription): Prescription {
  return { ...p, sets: Math.max(1, p.sets - 1), rirMin: Math.max(p.rirMin, 3), rirMax: Math.max(p.rirMax, 4) }
}

export function describePrescription(p: Prescription, ex?: Exercise): string {
  const sets = `${p.sets} ${p.sets === 1 ? 'serie' : 'series'}`
  if (ex?.loadType === 'time') return `${sets} × ${p.timeMinSec ?? 20}–${p.timeMaxSec ?? 40} s`
  const reps = p.repMin === p.repMax ? `${p.repMin}` : `${p.repMin}–${p.repMax}`
  return `${sets} × ${reps} rep${ex?.unilateral ? ' por lado' : ''}`
}

export function describeRir(p: Prescription): string {
  return p.rirMin === p.rirMax ? `RIR ${p.rirMin}` : `RIR ${p.rirMin}–${p.rirMax}`
}
