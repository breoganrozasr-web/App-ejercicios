import { GYM_EQUIPMENT } from './catalog'
import type { Continuity, Experience, Increments, Level, Limitations, Profile } from './types'

export const DEFAULT_INCREMENTS: Increments = { barbellKg: 2.5, dumbbellKg: 2, machineKg: 5, cableKg: 2.5, barKg: 20 }

export const NO_LIMITATIONS: Limitations = {
  painNow: false, recentInjury: false, cardioMetabolic: false, pregnancy: false, otherCondition: false, notes: '', clearedByProfessional: false,
}

export function defaultProfile(now = Date.now()): Profile {
  return {
    id: 'me',
    level: 'beginner',
    experience: 'beginner',
    continuity: 'not_started',
    goal: 'hypertrophy',
    days: [0, 2, 4],
    minutesPerSession: 60,
    locations: ['gym'],
    equipment: [...GYM_EQUIPMENT],
    frequency: 'auto',
    excludedExercises: [],
    priorityMuscles: [],
    preferences: '',
    ageBand: '18to39',
    limitations: { ...NO_LIMITATIONS },
    increments: { ...DEFAULT_INCREMENTS },
    createdAt: now,
    updatedAt: now,
  }
}

// ───────────────────────── Experiencia y continuidad (1.5) ─────────────────────────

export const EXPERIENCE_LABEL: Record<Experience, string> = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado', unconfirmed: 'Sin confirmar' }
export const EXPERIENCE_HELP: Record<Exclude<Experience, 'unconfirmed'>, string> = {
  beginner: 'Estoy aprendiendo a entrenar y a regular el esfuerzo.',
  intermediate: 'Conozco los ejercicios habituales y tengo experiencia siguiendo una rutina.',
  advanced: 'Tengo una trayectoria consistente y experiencia ajustando mi entrenamiento.',
}
export const CONTINUITY_LABEL: Record<Continuity, string> = { regular: 'Entreno con regularidad', returning: 'Vuelvo tras una pausa', not_started: 'Aún no he empezado', unconfirmed: 'Sin confirmar' }

/** Experiencia del perfil: el campo nuevo o, si falta (perfil anterior), la migración de `level`. */
export function experienceOf(p: Pick<Profile, 'level' | 'experience'>): Experience {
  if (p.experience) return p.experience
  return p.level === 'beginner' ? 'beginner' : p.level === 'intermediate' ? 'intermediate' : 'unconfirmed'
}

export function continuityOf(p: Pick<Profile, 'level' | 'continuity'>): Continuity {
  if (p.continuity) return p.continuity
  return p.level === 'returning' ? 'returning' : 'unconfirmed'
}

/**
 * Nivel EFECTIVO del motor (se guarda en `level` para que toda la elegibilidad siga centralizada):
 * principiante → beginner; intermedio y avanzado → intermediate (avanzado nunca tiene menos opciones ni más series);
 * experiencia sin confirmar → returning (comportamiento prudente heredado, sin presentarlo como personalizado).
 */
export function effectiveLevel(e: Experience): Level {
  return e === 'beginner' ? 'beginner' : e === 'unconfirmed' ? 'returning' : 'intermediate'
}

/** ¿Pide la propuesta empezar con adaptación tras la pausa? Situación actual «vuelvo» y no lo ha desactivado. */
export function wantsReturnAdaptation(p: Pick<Profile, 'level' | 'continuity' | 'returningAdaptation'>): boolean {
  return (continuityOf(p) === 'returning' || p.level === 'returning') && p.returningAdaptation !== false
}

/** Perfil migrado a las dimensiones de la 1.5 (idempotente; no inventa datos que no constan). */
export function migrateProfile(p: Profile): Profile {
  const experience = experienceOf(p)
  const continuity = continuityOf(p)
  return { ...p, experience, continuity, level: effectiveLevel(experience) }
}

/** ¿Está avanzado o intermedio (para textos de elegibilidad que antes decían «intermedio»)? */
export function isExperienced(p: Pick<Profile, 'level' | 'experience'>): boolean {
  const e = experienceOf(p)
  return e === 'intermediate' || e === 'advanced'
}
