import type { EquipmentId, Exercise, Location } from '../types'
import { EXERCISES, EXERCISE_BY_ID } from './exercises'

let customExercises: Exercise[] = []
let merged: Record<string, Exercise> = { ...EXERCISE_BY_ID }

/** Registra los ejercicios propios guardados en la base de datos (contenido de la persona usuaria). */
export function setCustomExercises(list: Exercise[]): void {
  customExercises = list.map((e) => ({ ...e, custom: true }))
  merged = { ...EXERCISE_BY_ID }
  for (const e of customExercises) merged[e.id] = e
}

export function getExercise(id: string): Exercise | undefined {
  return merged[id]
}

export function allExercises(includeArchived = false): Exercise[] {
  const list = [...EXERCISES, ...customExercises]
  return includeArchived ? list : list.filter((e) => !e.archived)
}

export const GYM_EQUIPMENT: EquipmentId[] = [
  'barbell', 'ez_bar', 'rack', 'dumbbell', 'bench', 'machine', 'cable', 'smith', 'pullup_bar', 'low_bar', 'bands', 'hyper_bench', 'chair',
]
export const HOME_BASIC_EQUIPMENT: EquipmentId[] = ['dumbbell', 'bands', 'pullup_bar', 'chair']
export const HOME_NONE_EQUIPMENT: EquipmentId[] = ['chair']
export const OUTDOOR_EQUIPMENT: EquipmentId[] = ['pullup_bar', 'low_bar', 'chair']

export const LOCATION_DEFAULT_EQUIPMENT: Record<Location, EquipmentId[]> = {
  gym: GYM_EQUIPMENT,
  home: HOME_NONE_EQUIPMENT,
  outdoor: OUTDOOR_EQUIPMENT,
}

/** ¿Está disponible todo el material que necesita el ejercicio? Un banco sirve como "silla o banco estable". */
export function hasEquipment(available: EquipmentId[], ex: Exercise): boolean {
  const set = new Set(available)
  if (set.has('bench')) set.add('chair')
  return ex.equipment.every((e) => set.has(e))
}
