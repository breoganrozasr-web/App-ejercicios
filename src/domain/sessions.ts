import { FAMILIARIZATION_MIN_COMPLETION } from './engine/params'
import type { Session, SessionExercise } from './types'

/**
 * Utilidades de sesión sin acceso a datos (dominio puro).
 * Un bloque especial (descendente o rest-pause) es UNA fila de trabajo: cuenta como una unidad prevista y como hecha
 * cuando se terminó con al menos un tramo. Nunca se convierte en varias series ni en calentamiento.
 */

export function sessionWorkSummary(s: Pick<Session, 'exercises'>): { planned: number; done: number } {
  let planned = 0
  let done = 0
  for (const e of s.exercises) for (const set of e.sets) if (set.kind === 'work') {
    planned++
    if (set.completed) done++
  }
  return { planned, done }
}

/** Proporción de series de trabajo hechas en una sesión (el calentamiento no cuenta). */
export function completionRatio(s: Pick<Session, 'exercises'>): number {
  const { planned, done } = sessionWorkSummary(s)
  return planned ? done / planned : 0
}

/**
 * Sesión válida para la familiarización y las fases: terminada (completa o parcial), sin datos de ejemplo y con al menos
 * el 70 % de las series de trabajo previstas hechas.
 */
export function isValidSession(s: Session): boolean {
  if (s.isDemo) return false
  if (s.status !== 'completed' && s.status !== 'partial') return false
  const { planned, done } = sessionWorkSummary(s)
  return planned > 0 && done / planned >= FAMILIARIZATION_MIN_COMPLETION
}

/** Días válidos: como máximo uno por fecha local (dos sesiones el mismo día no aceleran nada). Orden ascendente. */
export function validDates(sessions: Session[], pred: (s: Session) => boolean = () => true): string[] {
  return [...new Set(sessions.filter((s) => isValidSession(s) && pred(s)).map((s) => s.date))].sort()
}

/** Pareja de superserie de un ejercicio dentro de la sesión (mismo grupo y contiguo). Una etiqueta sin pareja no es superserie. */
export function supersetPartner(list: Pick<SessionExercise, 'uid' | 'superset'>[], uid: string): number {
  const i = list.findIndex((e) => e.uid === uid)
  const e = list[i]
  if (!e?.superset) return -1
  if (list[i + 1]?.superset === e.superset) return i + 1
  if (list[i - 1]?.superset === e.superset) return i - 1
  return -1
}

export function inSuperset(list: Pick<SessionExercise, 'uid' | 'superset'>[], uid: string): boolean {
  return supersetPartner(list, uid) >= 0
}

/**
 * «Hacer después» (1.5): lleva un ejercicio pendiente (y su pareja de superserie, como grupo) al final del trabajo de esta
 * sesión. Conserva lo terminado y el orden planificado (`plannedIndex`); no toca descansos ni la rutina base.
 * Devuelve la lista sin cambios si no hay nada pendiente o ya es lo último.
 */
export function doLater<T extends Pick<SessionExercise, 'uid' | 'superset' | 'sets' | 'plannedIndex' | 'movedLater'>>(list: T[], uid: string): T[] {
  const withPlan = list.map((e, i) => (e.plannedIndex === undefined ? { ...e, plannedIndex: i } : e))
  const i = withPlan.findIndex((e) => e.uid === uid)
  if (i < 0) return list
  const p = supersetPartner(withPlan, uid)
  const idx = p >= 0 ? [Math.min(i, p), Math.max(i, p)] : [i]
  const group = idx.map((k) => withPlan[k])
  const pending = group.some((e) => e.sets.some((x) => x.kind === 'work' && !x.completed))
  if (!pending || idx[idx.length - 1] === withPlan.length - 1) return list
  const rest = withPlan.filter((_, k) => !idx.includes(k))
  return [...rest, ...group.map((e) => ({ ...e, movedLater: true }))]
}
