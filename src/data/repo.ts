import { getExercise, setCustomExercises } from '../domain/catalog'
import type { RoutineDraft } from '../domain/engine/generator'
import { ENGINE_VERSION } from '../domain/engine/params'
import { applyRamp } from '../domain/engine/prescription'
import type {
  ChangeLogEntry, Exercise, Prescription, Profile, Routine, RoutineDay, RoutineExercise, RoutineVersion, ScheduleOverride, Session, SessionExercise, SetEntry, SetKind,
} from '../domain/types'
import { addDays, daysBetween, newId, toLocalDate, weekStart, weekdayMon0 } from '../domain/util'
import { db } from './db'

// ───────────────────────── Meta ─────────────────────────

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db().meta.get(key)
  return row ? (row.value as T) : fallback
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await db().meta.put({ key, value })
}

export async function log(entity: ChangeLogEntry['entity'], entityId: string, summary: string): Promise<void> {
  await db().changelog.put({ id: newId('log'), at: Date.now(), entity, entityId, summary })
}

// ───────────────────────── Perfil ─────────────────────────

export async function getProfile(): Promise<Profile | undefined> {
  return db().profile.get('me')
}
export async function saveProfile(p: Profile, summary = 'Perfil actualizado'): Promise<void> {
  await db().transaction('rw', db().profile, db().changelog, async () => {
    await db().profile.put({ ...p, updatedAt: Date.now() })
    await log('profile', 'me', summary)
  })
}

// ───────────────────────── Ejercicios propios ─────────────────────────

export async function loadCustomExercises(): Promise<Exercise[]> {
  const list = await db().customExercises.toArray()
  setCustomExercises(list)
  return list
}
export async function saveCustomExercise(e: Exercise): Promise<void> {
  await db().customExercises.put({ ...e, custom: true })
  await loadCustomExercises()
}

// ───────────────────────── Rutinas ─────────────────────────

export async function createRoutine(
  draft: Pick<RoutineDraft, 'name' | 'kind' | 'templateId' | 'days' | 'schedule' | 'rampWeeks' | 'rationale' | 'warnings' | 'engineVersion'>,
  opts: { makeCurrent?: boolean; startedOn?: string; changeNote?: string; isDemo?: boolean } = {},
): Promise<Routine> {
  const now = Date.now()
  const routineId = newId('rt')
  const versionId = newId('rv')
  const routine: Routine = {
    id: routineId,
    name: draft.name,
    kind: draft.kind,
    templateId: draft.templateId,
    status: 'active',
    currentVersionId: versionId,
    createdAt: now,
    updatedAt: now,
    startedOn: opts.startedOn ?? toLocalDate(),
    isDemo: opts.isDemo,
  }
  const version: RoutineVersion = {
    id: versionId,
    routineId,
    version: 1,
    createdAt: now,
    engineVersion: draft.engineVersion,
    days: draft.days,
    schedule: draft.schedule,
    rampWeeks: draft.rampWeeks,
    rationale: draft.rationale,
    warnings: draft.warnings,
    changeNote: opts.changeNote ?? 'Versión inicial',
  }
  await db().transaction('rw', [db().routines, db().routineVersions, db().meta, db().changelog], async () => {
    await db().routines.add(routine)
    await db().routineVersions.add(version)
    if (opts.makeCurrent !== false) await setMeta('currentRoutineId', routineId)
    await log('routine', routineId, `Rutina creada: ${draft.name}`)
  })
  return routine
}

export async function createBlankRoutine(name = 'Mi rutina'): Promise<Routine> {
  return createRoutine(
    { name, kind: 'blank', days: [{ id: 'd1', name: 'Día A', focus: 'custom', exercises: [] }], schedule: [], rampWeeks: 0, rationale: ['Rutina creada a mano.'], warnings: [], engineVersion: ENGINE_VERSION },
    { changeNote: 'Rutina en blanco' },
  )
}

/** Guarda una NUEVA versión (las anteriores se conservan; las sesiones ya hechas guardan su propia copia). */
export async function saveRoutineVersion(
  routineId: string,
  patch: Partial<Pick<RoutineVersion, 'days' | 'schedule' | 'rampWeeks' | 'rationale' | 'warnings'>>,
  changeNote: string,
  rename?: string,
): Promise<RoutineVersion> {
  return db().transaction('rw', [db().routines, db().routineVersions, db().changelog], async () => {
    const r = await db().routines.get(routineId)
    if (!r) throw new Error('Rutina no encontrada')
    const cur = await db().routineVersions.get(r.currentVersionId)
    if (!cur) throw new Error('Versión no encontrada')
    const all = await db().routineVersions.where('routineId').equals(routineId).toArray()
    const next: RoutineVersion = {
      ...cur,
      ...patch,
      id: newId('rv'),
      version: Math.max(...all.map((v) => v.version)) + 1,
      createdAt: Date.now(),
      changeNote,
    }
    await db().routineVersions.add(next)
    await db().routines.update(routineId, { currentVersionId: next.id, updatedAt: Date.now(), ...(rename ? { name: rename } : {}) })
    await log('routine', routineId, `${changeNote} (v${next.version})`)
    return next
  })
}

export async function getRoutineBundle(routineId: string): Promise<{ routine: Routine; version: RoutineVersion; versions: RoutineVersion[] } | null> {
  const routine = await db().routines.get(routineId)
  if (!routine) return null
  const versions = (await db().routineVersions.where('routineId').equals(routineId).toArray()).sort((a, b) => b.version - a.version)
  const version = versions.find((v) => v.id === routine.currentVersionId) ?? versions[0]
  if (!version) return null
  return { routine, version, versions }
}

export async function duplicateRoutine(routineId: string): Promise<Routine | null> {
  const b = await getRoutineBundle(routineId)
  if (!b) return null
  return createRoutine(
    { name: `${b.routine.name} (copia)`, kind: 'custom', templateId: b.routine.templateId, days: structuredClone(b.version.days), schedule: [...b.version.schedule], rampWeeks: 0, rationale: b.version.rationale, warnings: b.version.warnings, engineVersion: b.version.engineVersion },
    { makeCurrent: false, changeNote: `Duplicada de «${b.routine.name}»` },
  )
}

export async function setRoutineStatus(routineId: string, status: Routine['status']): Promise<void> {
  await db().transaction('rw', [db().routines, db().meta, db().changelog], async () => {
    await db().routines.update(routineId, { status, updatedAt: Date.now() })
    if (status === 'archived' && (await getMeta('currentRoutineId', null)) === routineId) await setMeta('currentRoutineId', null)
    await log('routine', routineId, status === 'archived' ? 'Rutina archivada' : 'Rutina restaurada')
  })
}

export async function setCurrentRoutine(routineId: string | null): Promise<void> {
  await setMeta('currentRoutineId', routineId)
}

export async function renameRoutine(routineId: string, name: string): Promise<void> {
  await db().routines.update(routineId, { name, updatedAt: Date.now() })
}

export async function deleteRoutine(routineId: string): Promise<void> {
  // Solo borra la rutina y sus versiones; las sesiones registradas conservan su copia y siguen en el historial.
  await db().transaction('rw', [db().routines, db().routineVersions, db().overrides, db().meta, db().changelog], async () => {
    await db().routines.delete(routineId)
    await db().routineVersions.where('routineId').equals(routineId).delete()
    await db().overrides.where('routineId').equals(routineId).delete()
    if ((await getMeta('currentRoutineId', null)) === routineId) await setMeta('currentRoutineId', null)
    await log('routine', routineId, 'Rutina eliminada (el historial de sesiones se conserva)')
  })
}

// ───────────────────────── Calendario ─────────────────────────

export interface PlannedItem {
  date: string
  dayId: string
  dayName: string
  moved: boolean
  originalDate: string
}

export function plannedForWeek(version: RoutineVersion, weekMonday: string, overrides: ScheduleOverride[]): PlannedItem[] {
  const names = new Map(version.days.map((d) => [d.id, d.name]))
  const out: PlannedItem[] = []
  for (const s of version.schedule) {
    const date = addDays(weekMonday, s.weekday)
    const ov = overrides.find((o) => o.fromDate === date && o.dayId === s.dayId)
    if (ov && ov.toDate === null) continue
    out.push({ date: ov?.toDate ?? date, dayId: s.dayId, dayName: names.get(s.dayId) ?? '', moved: !!ov, originalDate: date })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** Siguiente día de la rutina: rota tras el último día entrenado; si no hay historial, el planificado hoy o el primero. */
export function nextRoutineDay(version: RoutineVersion, sessions: Session[], routineId: string, today = toLocalDate()): RoutineDay | null {
  if (!version.days.length) return null
  const done = sessions
    .filter((s) => s.routineId === routineId && (s.status === 'completed' || s.status === 'partial') && s.dayId)
    .sort((a, b) => b.startedAt - a.startedAt)
  const last = done[0]
  if (last) {
    const idx = version.days.findIndex((d) => d.id === last.dayId)
    if (idx >= 0) return version.days[(idx + 1) % version.days.length]
  }
  const todaySched = version.schedule.find((s) => s.weekday === weekdayMon0(today))
  if (todaySched) return version.days.find((d) => d.id === todaySched.dayId) ?? version.days[0]
  return version.days[0]
}

export async function moveSession(routineId: string, fromDate: string, dayId: string, toDate: string | null): Promise<void> {
  const existing = await db().overrides.where('routineId').equals(routineId).toArray()
  const same = existing.find((o) => o.fromDate === fromDate && o.dayId === dayId)
  await db().overrides.put({ id: same?.id ?? newId('ov'), routineId, fromDate, toDate, dayId })
}

// ───────────────────────── Sesiones ─────────────────────────

function emptySet(kind: SetKind): SetEntry {
  return { id: newId('set'), kind, weightKg: null, reps: null, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: false, completedAt: null }
}

export function makeSessionExercise(exerciseId: string, prescription: Prescription | null, superset?: string): SessionExercise {
  const ex = getExercise(exerciseId)
  const sets: SetEntry[] = []
  if (prescription) {
    for (let i = 0; i < prescription.warmupSets; i++) sets.push(emptySet('warmup'))
    for (let i = 0; i < prescription.sets; i++) sets.push(emptySet('work'))
  } else {
    sets.push(emptySet('work'))
  }
  return {
    uid: newId('se'),
    exerciseId,
    nameSnapshot: ex?.name ?? exerciseId,
    loadTypeSnapshot: ex?.loadType ?? 'machine',
    unilateralSnapshot: ex?.unilateral ?? false,
    prescription,
    sets,
    notes: '',
    painFlag: false,
    superset,
  }
}

export function newSet(kind: SetKind, copyFrom?: SetEntry): SetEntry {
  const s = emptySet(kind)
  if (copyFrom) {
    s.weightKg = copyFrom.weightKg
    s.assistKg = copyFrom.assistKg
    s.addedKg = copyFrom.addedKg
    s.bandLabel = copyFrom.bandLabel
    s.side = copyFrom.side
  }
  return s
}

export async function getActiveSession(): Promise<Session | undefined> {
  const list = await db().sessions.where('status').equals('active').toArray()
  return list.sort((a, b) => b.startedAt - a.startedAt)[0]
}

function isRampWeek(routine: Routine, version: RoutineVersion, today: string): boolean {
  if (!version.rampWeeks) return false
  return Math.floor(daysBetween(routine.startedOn, today) / 7) < version.rampWeeks
}

/**
 * Empieza una sesión desde un día de rutina. Si ya hay una sesión activa, la devuelve (evita duplicados por doble toque).
 * La sesión guarda una COPIA de la prescripción: editar o borrar la rutina después no cambia el historial.
 */
export async function startSessionFromDay(routineId: string, dayId: string, date = toLocalDate()): Promise<Session> {
  return db().transaction('rw', [db().sessions, db().routines, db().routineVersions], async () => {
    const active = await db().sessions.where('status').equals('active').first()
    if (active) return active
    const routine = await db().routines.get(routineId)
    if (!routine) throw new Error('Rutina no encontrada')
    const version = await db().routineVersions.get(routine.currentVersionId)
    if (!version) throw new Error('Versión no encontrada')
    const day = version.days.find((d) => d.id === dayId)
    if (!day) throw new Error('Día no encontrado')
    const ramp = isRampWeek(routine, version, date)
    const now = Date.now()
    const session: Session = {
      id: newId('ses'),
      status: 'active',
      routineId,
      routineVersionId: version.id,
      dayId,
      title: day.name,
      date,
      startedAt: now,
      endedAt: null,
      pausedAt: null,
      pausedTotalMs: 0,
      exercises: day.exercises.map((re: RoutineExercise) => makeSessionExercise(re.exerciseId, ramp ? applyRamp(re.prescription) : structuredClone(re.prescription), re.superset)),
      notes: '',
      rampApplied: ramp,
      engineVersion: version.engineVersion,
      updatedAt: now,
      rest: null,
    }
    await db().sessions.add(session)
    return session
  })
}

export async function startFreeSession(date = toLocalDate()): Promise<Session> {
  return db().transaction('rw', db().sessions, async () => {
    const active = await db().sessions.where('status').equals('active').first()
    if (active) return active
    const now = Date.now()
    const s: Session = {
      id: newId('ses'), status: 'active', routineId: null, routineVersionId: null, dayId: null, title: 'Sesión libre', date, startedAt: now, endedAt: null,
      pausedAt: null, pausedTotalMs: 0, exercises: [], notes: '', rampApplied: false, engineVersion: ENGINE_VERSION, updatedAt: now, rest: null,
    }
    await db().sessions.add(s)
    return s
  })
}

// Escrituras serializadas: cada cambio se guarda en orden (sin carreras entre escrituras rápidas).
let writeChain: Promise<unknown> = Promise.resolve()
export function saveSession(s: Session): Promise<void> {
  const copy: Session = { ...s, updatedAt: Date.now() }
  const p = writeChain.then(() => db().sessions.put(copy))
  writeChain = p.catch(() => undefined)
  return p.then(() => undefined)
}
export function flushWrites(): Promise<unknown> {
  return writeChain
}

export async function finishSession(s: Session, status: 'completed' | 'partial'): Promise<Session> {
  await flushWrites()
  const now = Date.now()
  const pausedExtra = s.pausedAt ? now - s.pausedAt : 0
  const done: Session = { ...s, status, endedAt: now, pausedAt: null, pausedTotalMs: s.pausedTotalMs + pausedExtra, rest: null, updatedAt: now }
  await db().transaction('rw', [db().sessions, db().meta], async () => {
    await db().sessions.put(done)
    const n = await getMeta<number>('sessionsSinceBackup', 0)
    await setMeta('sessionsSinceBackup', n + 1)
  })
  return done
}

export async function deleteSession(id: string): Promise<Session | undefined> {
  await flushWrites()
  const s = await db().sessions.get(id)
  await db().sessions.delete(id)
  return s
}

export async function restoreSession(s: Session): Promise<void> {
  await db().sessions.put(s)
}

/** Edita una sesión ya terminada (con confirmación en la UI) y deja constancia en el registro de cambios. */
export async function updateFinishedSession(s: Session, summary: string): Promise<void> {
  await db().transaction('rw', [db().sessions, db().changelog], async () => {
    await db().sessions.put({ ...s, updatedAt: Date.now() })
    await log('session', s.id, summary)
  })
}

export async function allSessions(): Promise<Session[]> {
  return db().sessions.toArray()
}

export async function finishedSessions(): Promise<Session[]> {
  return (await db().sessions.toArray()).filter((s) => s.status === 'completed' || s.status === 'partial')
}

export function sessionWorkSummary(s: Session): { planned: number; done: number } {
  let planned = 0
  let done = 0
  for (const e of s.exercises) for (const set of e.sets) if (set.kind === 'work') {
    planned++
    if (set.completed) done++
  }
  return { planned, done }
}

export function currentWeekRange(today = toLocalDate()): { start: string; end: string } {
  const start = weekStart(today)
  return { start, end: addDays(start, 6) }
}
