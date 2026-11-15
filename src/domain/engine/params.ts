import type { Exercise, Goal, Level, Region } from '../types'
import { BUDGET_REGIONS } from './contribution'

/**
 * Parámetros del motor 2. Son VALORES INICIALES DE FORJA (decisiones prácticas revisables), no cifras óptimas
 * universales: los estudios justifican principios generales, no validan este algoritmo (docs/EVIDENCIA.md, sección 2.3).
 */

/**
 * 2.2.0: 26 recetas editoriales con dosis propia, mapa muscular 2 (anexo B), contexto de prescripción y modelo de tiempo
 * con aproximaciones por básico (encargo del 15/11/2026). 2.1.0: días válidos, fases y técnicas registrables.
 */
export const ENGINE_VERSION = '2.2.0'

export type SlotRole = 'main' | 'secondary' | 'accessory'

// ───────────────────────── Clasificación auxiliar ─────────────────────────

export const isTimeEx = (ex: Exercise) => ex.loadType === 'time'
export const isBodyweightDynamic = (ex: Exercise) => ex.loadType === 'bodyweight'
export const isPushUp = (ex: Exercise) => ex.loadType === 'bodyweight' && ex.pattern === 'push_h'
const LOADED: Exercise['loadType'][] = ['barbell_total', 'dumbbell_each', 'machine', 'cable', 'assisted', 'band']
export const isLoadedDynamic = (ex: Exercise) => LOADED.includes(ex.loadType)

// ───────────────────────── 3.2 Repeticiones, esfuerzo y descansos (adultos) ─────────────────────────

export interface RxContext {
  goal: Goal
  level: Level
  role: SlotRole
  /** Ejercicio de referencia de fuerza (o pesado del día en mixto). */
  reference: boolean
}

/** Rango de repeticiones. Los rangos se solapan a propósito: el objetivo cambia el énfasis, no crea categorías excluyentes. */
export function repRange(ex: Exercise, c: RxContext): [number, number] {
  if (isTimeEx(ex)) return [0, 0]
  if (isBodyweightDynamic(ex)) {
    // Calistenia dinámica: rango inicial 6–15; sentadillas y puentes sin carga 10–20; gemelos 12–20.
    if (ex.pattern === 'calves') return [12, 20]
    if (ex.pattern === 'squat' || ex.pattern === 'glute') return [10, 20]
    if (ex.pattern === 'lunge') return [6, 12]
    if (ex.category === 'core') return [10, 15]
    return [6, 15]
  }
  const iso = ex.category !== 'compound'
  const highIso = ex.pattern === 'shoulder_lat' || ex.pattern === 'calves'
  if (c.reference && (c.goal === 'strength' || c.goal === 'mixed')) {
    if (c.goal === 'mixed') return [5, 8]
    return c.level === 'intermediate' ? [4, 6] : c.level === 'returning' ? [5, 8] : [6, 10]
  }
  if (c.goal === 'strength') return iso ? (highIso ? [12, 20] : [10, 15]) : [8, 12]
  if (c.goal === 'general') return iso ? (highIso ? [12, 20] : [10, 15]) : [8, 15]
  // Músculo (y resto del mixto)
  if (iso) return highIso ? [12, 20] : [10, 15]
  return [8, 12]
}

/** RIR objetivo. Nunca fallo por defecto. Isométricos: sin RIR (se usa esfuerzo percibido opcional). */
export function rirRange(ex: Exercise, c: RxContext): [number, number] | null {
  if (isTimeEx(ex)) return null
  if (c.reference) return [2, 3]
  if (c.goal === 'general') return [2, 3]
  const iso = ex.category !== 'compound'
  if (iso) return [1, 3]
  return c.level === 'intermediate' ? [1, 3] : [2, 3]
}

/** Descanso inicial (editable; +30/+60 s durante la sesión). */
export function restSeconds(ex: Exercise, c: RxContext): number {
  if (isTimeEx(ex)) return 60
  if (c.reference && (c.goal === 'strength' || c.goal === 'mixed')) return 180
  if (isBodyweightDynamic(ex)) {
    if (ex.pattern === 'calves' || ex.category === 'core') return 60
    if (isPushUp(ex)) return 120
    if (ex.pattern === 'squat' || ex.pattern === 'lunge' || ex.pattern === 'glute') return 90
    return 120
  }
  if (ex.category === 'core') return 60
  if (ex.category !== 'compound') return 90
  return 120
}

/** Tiempo de isométricos (plancha inicial 2×15–30 s; lateral 1×10–25 s por lado). Pauta práctica editable. */
export function timeRange(ex: Exercise): [number, number] {
  if (ex.id === 'plancha_lateral') return [10, 25]
  return [15, 30]
}

/** Series de aproximación (no cuentan como volumen). */
export function warmupSets(level: Level, ex: Exercise, role: SlotRole, reference: boolean): number {
  if (!isLoadedDynamic(ex) || ex.loadType === 'band' || ex.loadType === 'assisted') return 0
  if (ex.category !== 'compound') return 0
  if (reference || role === 'main') return level === 'beginner' ? 2 : 3
  return 1
}

/** Series máximas por ejercicio en una sesión: si el presupuesto del día pide más, se reparte en dos ejercicios. */
export function maxSetsPerExercise(): number {
  return 3
}

// ───────────────────────── 3.3 Volumen semanal (presupuestos iniciales) ─────────────────────────

export interface Budget {
  /** Rango orientativo de series directas semanales. */
  min: number
  max: number
  /** Valor con el que empieza la propuesta. */
  start: number
}

/**
 * Presupuesto semanal de series DIRECTAS para pecho, espalda, cuádriceps e isquios (3.3).
 * Desde cero (y vuelta tras pausa): 6–8. Intermedio: 8–12. Prioridad expresa: el extremo superior
 * (12–16 solo como opción manual, nunca automática). Condición general: 4–6. Fuerza: sin dianas de hipertrofia.
 * Son presupuestos, no mínimos.
 */
export function weeklyBudget(region: Region, level: Level, goal: Goal, priority: boolean): Budget | null {
  if (!BUDGET_REGIONS.includes(region)) return null
  if (goal === 'strength') return null
  if (goal === 'general') return { min: 4, max: 6, start: priority ? 6 : 4 }
  if (level === 'intermediate') return { min: 8, max: 12, start: priority ? 12 : 8 }
  return { min: 6, max: 8, start: priority ? 8 : 6 }
}

/** Series directas opcionales para hombro lateral/posterior y brazos (0–4 según prioridad y tiempo) y gemelos/tronco (2–4 si encajan). */
export function optionalAim(region: Region, priority: boolean, goal: Goal): number {
  if (region === 'calves' || region === 'core' || region === 'core_iso') return priority ? 4 : 2
  if (region === 'delt_side' || region === 'delt_rear' || region === 'biceps' || region === 'triceps') return priority ? 4 : goal === 'strength' || goal === 'general' ? 0 : 2
  return 0
}

/** Máximo de series por opción manual de «más trabajo» para una prioridad (3.3). */
export const PRIORITY_CEILING = 16

// ───────────────────────── 3.1 Familiarización ─────────────────────────

/** Sesiones de familiarización (desde cero) o adaptación (vuelta tras pausa). Decisión práctica revisable. */
export const FAMILIARIZATION_SESSIONS = 4
/** Una sesión cuenta como completada para salir de la familiarización si se hizo al menos este % de las series de trabajo. */
export const FAMILIARIZATION_MIN_COMPLETION = 0.7

// ───────────────────────── Calendario ─────────────────────────

/** Sesiones que el generador propone AUTOMÁTICAMENTE por nivel. Seis días nunca se proponen solos a principiantes. */
export const AUTO_SESSION_CAP: Record<Level, number> = { beginner: 3, returning: 4, intermediate: 5 }

// ───────────────────────── 3.6 Tiempo (valores de cálculo, no tempos prescritos) ─────────────────────────

export const DURATION = {
  /** Preparación general (3–5 min): se usa el punto medio. */
  generalWarmupMin: 4,
  /** Aproximaciones del primer básico pesado del día (≈6–10 min) y de otro básico pesado (3–5 min adicionales). */
  firstHeavyWarmupMin: 8,
  otherHeavyWarmupMin: 4,
  /** Resto de primeros patrones exigentes con aproximación (2–4 min según las aproximaciones previstas). */
  otherWarmupMin: [2, 3] as [number, number],
  /** Compatibilidad: minutos por serie de aproximación (modelo anterior, solo informativo). */
  warmupSetMin: 1,
  secPerRep: 3,
  /** Cambio de lado en ejercicios unilaterales. */
  sideChangeSec: 15,
  /** Transición entre ejercicios (equipo, ajuste). Entre ejercicios se cuenta max(descanso previo, transición). */
  transitionSec: 60,
}

// ───────────────────────── 5.1 Progresión ─────────────────────────

/** Umbral de REVISIÓN de interfaz: si el siguiente salto supera el 10 %, no se preselecciona (no es un límite de seguridad). */
export const INCREMENT_REVIEW_FRACTION = 0.1
/** Compatibilidad con código anterior. */
export const MAX_INCREMENT_FRACTION = INCREMENT_REVIEW_FRACTION
/** Tras este nº de días sin hacer un ejercicio se propone una vuelta gradual (heurística). */
export const RETURN_AFTER_DAYS = 21
/** Exposiciones comparables sin mejora que activan la ayuda de estancamiento (disparador, no diagnóstico). */
export const STALL_EXPOSURES = 3

/**
 * Compatibilidad: rango orientativo antiguo usado por pantallas de progreso. Devuelve el presupuesto del motor 2
 * o, para grupos sin presupuesto propio, null.
 */
export function weeklyTarget(level: Level, region: Region, goal: Goal, priority: boolean): [number, number] | null {
  const b = weeklyBudget(region, level, goal, priority)
  return b ? [b.min, b.max] : null
}
