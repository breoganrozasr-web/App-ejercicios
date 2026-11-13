import Dexie, { type Table } from 'dexie'
import type {
  BodyWeightEntry, ChangeLogEntry, Exercise, ExerciseSetting, MeasurementEntry, MetaEntry, Profile, ProgressPhoto, Routine, RoutineVersion, ScheduleOverride, Session,
} from '../domain/types'

/** Imagen o enlace de demostración aportado por la persona usuaria para un ejercicio propio. */
export interface UserMedia {
  id: string
  exerciseId: string
  kind: 'image' | 'link'
  /** data URL (imagen) o URL externa (enlace). */
  value: string
  mime?: string
  bytes?: number
  createdAt: number
}

/**
 * Esquema versionado. Para cambiarlo: añadir this.version(N+1).stores({...}).upgrade(tx => ...)
 * SIN borrar las versiones anteriores. Nunca se borra la base al actualizar la app.
 */
export const SCHEMA_VERSION = 2

export class ForjaDB extends Dexie {
  meta!: Table<MetaEntry, string>
  profile!: Table<Profile, string>
  routines!: Table<Routine, string>
  routineVersions!: Table<RoutineVersion, string>
  overrides!: Table<ScheduleOverride, string>
  sessions!: Table<Session, string>
  bodyweight!: Table<BodyWeightEntry, string>
  changelog!: Table<ChangeLogEntry, string>
  customExercises!: Table<Exercise, string>
  exerciseSettings!: Table<ExerciseSetting, string>
  userMedia!: Table<UserMedia, string>
  measurements!: Table<MeasurementEntry, string>
  photos!: Table<ProgressPhoto, string>

  constructor(name = 'forja') {
    super(name)
    this.version(1).stores({
      meta: 'key',
      profile: 'id',
      routines: 'id, status, updatedAt',
      routineVersions: 'id, routineId',
      overrides: 'id, routineId, fromDate',
      sessions: 'id, status, date, routineId, startedAt',
      bodyweight: 'id, date',
      changelog: 'id, at, entityId',
      customExercises: 'id',
      exerciseSettings: 'exerciseId',
      userMedia: 'id, exerciseId',
    })
    // v2: medidas corporales y fotos de progreso. Solo añade tablas: los datos de v1 no se tocan.
    this.version(2).stores({
      measurements: 'id, date, site',
      photos: 'id, date',
    })
  }
}

export const TABLES = [
  'meta', 'profile', 'routines', 'routineVersions', 'overrides', 'sessions', 'bodyweight', 'changelog', 'customExercises', 'exerciseSettings', 'userMedia', 'measurements', 'photos',
] as const
export type TableName = (typeof TABLES)[number]

let instance: ForjaDB | null = null
export function db(): ForjaDB {
  if (!instance) instance = new ForjaDB()
  return instance
}
/** Solo para pruebas: usar una base distinta. */
export function useDatabase(name: string): ForjaDB {
  instance = new ForjaDB(name)
  return instance
}
