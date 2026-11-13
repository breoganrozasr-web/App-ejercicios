import type { Exercise, Goal, Level, MuscleId } from '../types'

/**
 * Parámetros del motor. Son DECISIONES PRÁCTICAS de programación, no fórmulas óptimas.
 * Cada bloque indica la evidencia que lo hace razonable (ver docs/EVIDENCIA.md, reglas R1–R14).
 */

export const ENGINE_VERSION = '1.0.0'

/** R3 · Volumen semanal orientativo por músculo, en series "fraccionales" (directa = 1, indirecta = 0,5).
 *  Punto de partida práctico con rendimientos decrecientes; NO es un mínimo (Pelland 2025; Schoenfeld 2017; Iversen 2021). */
export const WEEKLY_SETS: Record<Level, { big: [number, number]; small: [number, number]; minor: [number, number] }> = {
  beginner: { big: [6, 9], small: [4, 8], minor: [3, 6] },
  returning: { big: [8, 12], small: [6, 10], minor: [4, 8] },
  intermediate: { big: [10, 16], small: [8, 12], minor: [6, 10] },
}

export const BIG_MUSCLES: MuscleId[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes']
export const SMALL_MUSCLES: MuscleId[] = ['biceps', 'triceps']
export const MINOR_MUSCLES: MuscleId[] = ['calves', 'abs']

export function weeklyTarget(level: Level, muscle: MuscleId, goal: Goal, priority: boolean): [number, number] {
  const t = WEEKLY_SETS[level]
  let r: [number, number] = BIG_MUSCLES.includes(muscle) ? t.big : SMALL_MUSCLES.includes(muscle) ? t.small : t.minor
  // Condición física general: algo menos de volumen (adherencia y tiempo).
  if (goal === 'general') r = [Math.max(3, r[0] - 2), Math.max(5, r[1] - 3)]
  // Prioridad muscular elegida por la persona: +2 series como máximo.
  if (priority) r = [r[0] + 1, r[1] + 2]
  return r
}

/** R4 · Aviso si un músculo recibe muchas series en una sola sesión (Remmert 2025, preprint: evidencia débil). */
export const PER_SESSION_SOFT_CAP = 10

/** R5 · Rango de repeticiones por objetivo, nivel y perfil del ejercicio.
 *  Hipertrofia similar en un rango amplio de cargas si se entrena cerca del fallo (Schoenfeld 2017; López 2021).
 *  Cargas altas para fuerza máxima (Currier 2023; ACSM 2026), pero sin máximos ni 1–3 rep para principiantes. */
export function repRange(goal: Goal, level: Level, ex: Exercise, role: SlotRole): [number, number] {
  if (ex.loadType === 'time') return [0, 0]
  const bodyweight = ex.loadType === 'bodyweight' || ex.loadType === 'assisted'
  if (bodyweight && ex.repProfile !== 'moderate') return [8, 20]
  if (bodyweight) return [5, 12]
  const p = ex.repProfile
  if (goal === 'strength') {
    if (role === 'main' && p === 'heavy') return level === 'intermediate' ? [4, 6] : level === 'returning' ? [5, 8] : [6, 8]
    if (role === 'main') return [6, 10]
    return p === 'light' ? [10, 15] : [8, 12]
  }
  if (goal === 'mixed') {
    if (role === 'main' && p === 'heavy') return level === 'beginner' ? [6, 10] : [5, 8]
    return p === 'light' ? [10, 15] : [8, 12]
  }
  if (goal === 'general') return p === 'light' ? [12, 15] : [8, 12]
  // hipertrofia
  if (p === 'heavy') return level === 'beginner' ? [8, 12] : [6, 10]
  if (p === 'moderate') return [8, 12]
  if (ex.pattern === 'shoulder_lat' || ex.pattern === 'calves' || ex.pattern === 'shoulder_rear') return [12, 20]
  return [10, 15]
}

export type SlotRole = 'main' | 'secondary' | 'accessory'

/** R6 · Repeticiones en reserva (RIR) objetivo. Cerca del fallo ≠ fallo; el fallo no se impone
 *  (Refalo 2024; Robinson 2024; Grgic 2022). Más margen al aprender (imprecisión del RIR: Halperin 2022; Steele 2017). */
export function rirRange(goal: Goal, level: Level, ex: Exercise, role: SlotRole, ramp: boolean): [number, number] {
  if (ramp) return [3, 4]
  if (level === 'beginner') return [2, 3]
  if (goal === 'general') return [2, 4]
  if (goal === 'strength' && role === 'main') return [2, 3]
  if (ex.category === 'isolation' && level === 'intermediate' && goal === 'hypertrophy') return [1, 2]
  return [1, 3]
}

/** R7 · Descanso orientativo: 2–3 min en ejercicios exigentes, 1–2 min en accesorios (Singer 2024; Grgic 2018).
 *  Nunca por debajo de 60 s de forma automática. */
export function restSeconds(goal: Goal, ex: Exercise, role: SlotRole): number {
  if (ex.category === 'core') return 60
  if (ex.category === 'isolation') return 90
  if (role === 'main' && ex.repProfile === 'heavy') return goal === 'strength' ? 180 : 150
  return 120
}
export const MIN_REST_SEC = 60

/** Series de aproximación antes de las series de trabajo (no cuentan como volumen). */
export function warmupSets(level: Level, ex: Exercise, role: SlotRole): number {
  if (ex.loadType === 'bodyweight' || ex.loadType === 'time' || ex.loadType === 'band') return 0
  if (ex.category !== 'compound') return 0
  if (role === 'main') return level === 'beginner' ? 2 : 3
  return 1
}

/** Series de trabajo por defecto según papel del ejercicio y nivel (Krieger 2009/2010: 2–3 series por ejercicio). */
export function defaultSets(level: Level, role: SlotRole): number {
  if (level === 'beginner') return role === 'accessory' ? 2 : 3
  if (level === 'returning') return role === 'accessory' ? 2 : 3
  return role === 'accessory' ? 3 : 3
}

/** R8 · Familiarización: las primeras semanas, una serie menos y RIR 3–4. Decisión práctica. */
export const RAMP_WEEKS: Record<Level, number> = { beginner: 2, returning: 1, intermediate: 0 }

/** Sesiones máximas que el generador propone AUTOMÁTICAMENTE por nivel (ACSM 2009: 2–3 d principiantes, 3–4 intermedios).
 *  La persona puede elegir más con plantillas o frecuencia explícita (con aviso). */
export const AUTO_SESSION_CAP: Record<Level, number> = { beginner: 3, returning: 4, intermediate: 5 }

/** Duración (estimación). */
export const DURATION = {
  generalWarmupMin: 5,
  warmupSetMin: 1.5,
  secPerRep: 3.5,
  setupPerSetSec: 15,
  transitionSec: 75,
}

/** R10 · Doble progresión: incremento máximo razonable de una vez (ACSM 2009: 2–10 %). */
export const MAX_INCREMENT_FRACTION = 0.1
/** Tras este nº de días sin hacer un ejercicio se propone una vuelta gradual (heurística). */
export const RETURN_AFTER_DAYS = 21
/** Margen mínimo (RIR) en todas las series para dar por "compatible" el esfuerzo al subir carga. */
export const MIN_RIR_FOR_INCREASE = 1
