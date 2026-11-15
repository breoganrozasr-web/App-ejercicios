import { getExercise, setCustomExercises } from '../domain/catalog'
import type { RoutineDraft } from '../domain/engine/generator'
import { ENGINE_VERSION } from '../domain/engine/params'
import { applyFamiliarization, applyRamp } from '../domain/engine/prescription'
import { computeProgram, logState } from '../domain/program'
import { completionRatio, sessionWorkSummary, validDates } from '../domain/sessions'
import { endBlock, isBlock, makeBlockSet, plannedWorkRows } from '../domain/techniques'
import type {
  ChangeLogEntry, Exercise, Prescription, Profile, ProgramState, Routine, RoutineDay, RoutineExercise, RoutineTechnique, RoutineVersion, ScheduleOverride, Session, SessionExercise, SetEntry, SetKind,
} from '../domain/types'
import { addDays, daysBetween, newId, toLocalDate, weekStart } from '../domain/util'
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
  draft: Pick<RoutineDraft, 'name' | 'templateId' | 'days' | 'schedule' | 'rampWeeks' | 'rationale' | 'warnings' | 'engineVersion'> & Partial<Pick<RoutineDraft, 'familiarization' | 'plan'>> & { kind: Routine['kind'] },
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
    ...(draft.familiarization !== undefined ? { familiarization: draft.familiarization } : {}),
    ...(draft.plan ? { plan: draft.plan } : {}),
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
  patch: Partial<Pick<RoutineVersion, 'days' | 'schedule' | 'rampWeeks' | 'rationale' | 'warnings' | 'engineVersion' | 'plan' | 'familiarization'>>,
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

/** Siguiente día de la rutina: rota tras el último día entrenado. Sin historial, empieza por el primer día.
 *  Si la última sesión fue parcial y se eligió «repetir otro día», se propone el mismo día. */
export function nextRoutineDay(version: RoutineVersion, sessions: Session[], routineId: string, today = toLocalDate()): RoutineDay | null {
  if (!version.days.length) return null
  const done = sessions
    .filter((s) => s.routineId === routineId && (s.status === 'completed' || s.status === 'partial') && s.dayId)
    .sort((a, b) => b.startedAt - a.startedAt)
  const last = done[0]
  if (last) {
    const idx = version.days.findIndex((d) => d.id === last.dayId)
    if (idx >= 0) return last.status === 'partial' && last.partialAction === 'repeat' ? version.days[idx] : version.days[(idx + 1) % version.days.length]
  }
  void today
  return version.days[0]
}

export { completionRatio, sessionWorkSummary }

/**
 * Familiarización (motor 2 + ampliación del 14/11/2026): cuenta los DÍAS VÁLIDOS de la rutina (sesiones terminadas con al
 * menos el 70 % de las series de trabajo, sin datos de ejemplo; como máximo uno por fecha local, así que dos sesiones el
 * mismo día no aceleran nada). Sin fecha de caducidad: las ausencias no la consumen.
 * Devuelve la sesión que tocaría (1-based) o null si ya terminó.
 */
export function familiarizationStatus(version: Pick<RoutineVersion, 'familiarization'>, sessions: Session[], routineId: string, excludeSessionId?: string): { index: number; total: number; completed: number } | null {
  const fam = version.familiarization
  if (!fam) return null
  // 2.2: los días válidos cuentan aunque se haya cambiado de rutina o de plantilla (cambiar no reinicia el aprendizaje).
  void routineId
  const completed = validDates(sessions, (s) => s.id !== excludeSessionId).length
  if (completed >= fam.sessions) return null
  return { index: completed + 1, total: fam.sessions, completed }
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

/**
 * Crea un ejercicio de sesión. Con una técnica de la rutina (y fuera de familiarización/readaptación), las series de
 * trabajo previstas son las convencionales que quedan más un bloque al final; si no, todas convencionales.
 */
export function makeSessionExercise(exerciseId: string, prescription: Prescription | null, superset?: string, technique?: RoutineTechnique): SessionExercise {
  const ex = getExercise(exerciseId)
  const sets: SetEntry[] = []
  if (prescription) {
    for (let i = 0; i < prescription.warmupSets; i++) sets.push(emptySet('warmup'))
    const rows = plannedWorkRows(prescription, superset ? undefined : technique, ex?.loadType ?? 'machine')
    for (let i = 0; i < rows.conventional; i++) sets.push(emptySet('work'))
    if (rows.block) sets.push(makeBlockSet(rows.block.method, 'routine', rows.block.extra, 'both', rows.block.replaces))
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
/** Registro a posteriori: hora de inicio real y duración declarada (no hay cronómetro). */
export interface BackdateOpts {
  startedAt: number
  durationMin: number
}

export async function startSessionFromDay(routineId: string, dayId: string, date = toLocalDate(), backdate?: BackdateOpts): Promise<Session> {
  return db().transaction('rw', [db().sessions, db().routines, db().routineVersions, db().meta, db().profile], async () => {
    const active = await db().sessions.where('status').equals('active').first()
    if (active) return active
    const routine = await db().routines.get(routineId)
    if (!routine) throw new Error('Rutina no encontrada')
    const version = await db().routineVersions.get(routine.currentVersionId)
    if (!version) throw new Error('Versión no encontrada')
    const day = version.days.find((d) => d.id === dayId)
    if (!day) throw new Error('Día no encontrado')
    const state = await getProgramState()
    const profile = await db().profile.get('me')
    const all = await db().sessions.toArray()
    const sessions = all.filter((s) => s.routineId === routineId)
    // En Progresión ya no se aplica la familiarización de una rutina (la fase no retrocede al cambiar de rutina).
    const inProgression = !!state.progressionSince
    // Motor 2: familiarización por días válidos. Versiones antiguas: semanas (se conserva su regla).
    let fam: Session['familiarization'] = null
    const famStatus = version.familiarization && !inProgression ? familiarizationStatus(version, all, routineId) : null
    if (famStatus) fam = { index: famStatus.index, total: famStatus.total }
    else if (version.familiarization && !inProgression && state.extendLearning) {
      // Aprendizaje prolongado a petición: misma dosis de familiarización.
      fam = { index: validDates(sessions).length + 1, total: version.familiarization.sessions, reason: 'extended' }
    } else if (profile) {
      // Readaptación aceptada tras una pausa de 21 días o más.
      const view = computeProgram({ profile, routine, version, sessions: all, state, today: date })
      if (view.readaptation.active) fam = { index: view.readaptation.active.index, total: view.readaptation.active.total, reason: 'readaptation' }
    }
    // Rutinas del motor 1: semanas de familiarización (o aprendizaje prolongado a petición).
    const ramp = !fam && !version.familiarization && !inProgression && (isRampWeek(routine, version, date) || (!!state.extendLearning && version.rampWeeks > 0))
    const now = Date.now()
    const session: Session = {
      id: newId('ses'),
      status: 'active',
      routineId,
      routineVersionId: version.id,
      dayId,
      title: day.name,
      date,
      startedAt: backdate?.startedAt ?? now,
      endedAt: null,
      pausedAt: null,
      pausedTotalMs: 0,
      // Durante la familiarización o la readaptación no se usan bloques especiales: series normales con más margen.
      exercises: day.exercises.map((re: RoutineExercise) => makeSessionExercise(re.exerciseId, fam ? applyFamiliarization(re.prescription, getExercise(re.exerciseId)) : ramp ? applyRamp(re.prescription) : structuredClone(re.prescription), re.superset, fam || ramp ? undefined : re.technique)),
      notes: '',
      rampApplied: ramp || !!fam,
      familiarization: fam,
      engineVersion: version.engineVersion,
      updatedAt: now,
      rest: null,
      ...(backdate ? { backdated: true, manualDurationMin: backdate.durationMin } : {}),
    }
    await db().sessions.add(session)
    return session
  })
}

export async function startFreeSession(date = toLocalDate(), backdate?: BackdateOpts): Promise<Session> {
  return db().transaction('rw', db().sessions, async () => {
    const active = await db().sessions.where('status').equals('active').first()
    if (active) return active
    const now = Date.now()
    const s: Session = {
      id: newId('ses'), status: 'active', routineId: null, routineVersionId: null, dayId: null, title: 'Sesión libre', date, startedAt: backdate?.startedAt ?? now, endedAt: null,
      pausedAt: null, pausedTotalMs: 0, exercises: [], notes: '', rampApplied: false, engineVersion: ENGINE_VERSION, updatedAt: now, rest: null,
      ...(backdate ? { backdated: true, manualDurationMin: backdate.durationMin } : {}),
    }
    await db().sessions.add(s)
    return s
  })
}

// ───────────────────────── Guardado de la sesión activa (F8) ─────────────────────────
//
// Problema reproducido (prueba e2e «F8»): con escrituras encadenadas a IndexedDB, una ráfaga de cambios (p. ej. escribir
// una nota) seguida de una recarga inmediata perdía los últimos caracteres: la cadena iba por detrás y la recarga
// cortaba escrituras pendientes. Solución:
//  1) Diario síncrono en localStorage (write-ahead): cada cambio queda guardado antes de devolver el control.
//  2) Escrituras a IndexedDB coalescentes: si hay una en curso, solo se escribe después la versión más reciente.
//  3) Al arrancar, recoverJournal() aplica el diario si es más reciente que la base.

const JOURNAL_PREFIX = 'forja-wal:'
const pendingWrites = new Map<string, Session>()
let inflight: Promise<void> | null = null

function journalWrite(s: Session): void {
  try {
    localStorage.setItem(JOURNAL_PREFIX + s.id, JSON.stringify(s))
  } catch {
    /* sin almacenamiento local: queda IndexedDB */
  }
}
function journalClear(id: string, upTo: number): void {
  try {
    const raw = localStorage.getItem(JOURNAL_PREFIX + id)
    if (!raw) return
    const j = JSON.parse(raw) as Session
    if ((j.updatedAt ?? 0) <= upTo) localStorage.removeItem(JOURNAL_PREFIX + id)
  } catch {
    /* nada */
  }
}
export function journalDrop(id: string): void {
  try {
    localStorage.removeItem(JOURNAL_PREFIX + id)
  } catch {
    /* nada */
  }
}

async function drain(): Promise<void> {
  let failed: unknown = null
  while (pendingWrites.size) {
    const [id, cur] = pendingWrites.entries().next().value as [string, Session]
    pendingWrites.delete(id)
    try {
      await db().sessions.put(cur)
      if (!pendingWrites.has(id)) journalClear(id, cur.updatedAt)
    } catch (e) {
      failed = e
    }
  }
  inflight = null
  if (failed) throw failed
}

export function saveSession(s: Session): Promise<void> {
  const copy: Session = { ...s, updatedAt: Math.max(Date.now(), (s.updatedAt ?? 0) + 1) }
  journalWrite(copy)
  pendingWrites.set(copy.id, copy)
  if (!inflight) inflight = drain()
  return inflight
}
export function flushWrites(): Promise<unknown> {
  return (inflight ?? Promise.resolve()).catch(() => undefined)
}

/** Aplica el diario local si es más reciente que lo guardado en IndexedDB (tras una recarga o cierre brusco). */
export async function recoverJournal(): Promise<number> {
  let n = 0
  let keys: string[] = []
  try {
    keys = Object.keys(localStorage).filter((k) => k.startsWith(JOURNAL_PREFIX))
  } catch {
    return 0
  }
  for (const k of keys) {
    try {
      const j = JSON.parse(localStorage.getItem(k) ?? 'null') as Session | null
      if (!j?.id) {
        localStorage.removeItem(k)
        continue
      }
      const cur = await db().sessions.get(j.id)
      if (cur && (cur.updatedAt ?? 0) >= (j.updatedAt ?? 0)) {
        localStorage.removeItem(k)
        continue
      }
      // Solo se recuperan sesiones que siguen activas (no resucita sesiones terminadas o descartadas).
      if (!cur && j.status !== 'active') {
        localStorage.removeItem(k)
        continue
      }
      if (cur && cur.status !== 'active') {
        localStorage.removeItem(k)
        continue
      }
      await db().sessions.put(j)
      localStorage.removeItem(k)
      n++
    } catch {
      /* diario dañado: se ignora */
    }
  }
  return n
}

/** Al terminar la sesión, un bloque empezado y sin cerrar se cierra con lo hecho (estado «antes de tiempo»); no se inventa nada. */
export function closeOpenBlocks(s: Session, now = Date.now()): Session {
  return { ...s, exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => (isBlock(x) && !x.completed && (x.block?.segments.length ?? 0) > 0 ? endBlock(x, now) : x)) })) }
}

export async function finishSession(s0: Session, status: 'completed' | 'partial'): Promise<Session> {
  await flushWrites()
  journalDrop(s0.id)
  const now = Date.now()
  const s = closeOpenBlocks(s0, now)
  const pausedExtra = s.pausedAt ? now - s.pausedAt : 0
  // Al terminar (también tras retomar una parcial) se vuelve a ofrecer la elección si queda parcial.
  const base: Session = { ...s }
  delete base.partialAction
  const done: Session = s.backdated
    ? { ...base, status, endedAt: s.startedAt + (s.manualDurationMin ?? 60) * 60000, pausedAt: null, pausedTotalMs: 0, rest: null, updatedAt: now }
    : { ...base, status, endedAt: now, pausedAt: null, pausedTotalMs: s.pausedTotalMs + pausedExtra, rest: null, updatedAt: now }
  await db().transaction('rw', [db().sessions, db().meta], async () => {
    await db().sessions.put(done)
    const n = await getMeta<number>('sessionsSinceBackup', 0)
    await setMeta('sessionsSinceBackup', n + 1)
  })
  return done
}

export async function deleteSession(id: string): Promise<Session | undefined> {
  await flushWrites()
  journalDrop(id)
  const s = await db().sessions.get(id)
  await db().sessions.delete(id)
  return s
}

/** Retomar lo pendiente de una sesión parcial: la MISMA sesión vuelve a estar activa (no duplica series ni récords). */
export async function resumeSession(id: string): Promise<Session> {
  return db().transaction('rw', [db().sessions, db().changelog], async () => {
    const active = await db().sessions.where('status').equals('active').first()
    if (active && active.id !== id) throw new Error('Ya hay un entrenamiento en curso. Termínalo o descártalo antes de retomar otro.')
    const s = await db().sessions.get(id)
    if (!s) throw new Error('Sesión no encontrada')
    if (s.status === 'active') return s
    const now = Date.now()
    const gap = s.endedAt ? now - s.endedAt : 0
    const next: Session = { ...s, status: 'active', endedAt: null, pausedAt: null, pausedTotalMs: s.backdated ? s.pausedTotalMs : s.pausedTotalMs + gap, rest: null, partialAction: 'resume', updatedAt: now }
    await db().sessions.put(next)
    await log('session', id, 'Sesión parcial retomada')
    return next
  })
}

/** Decisión sobre una sesión parcial: pasar a la siguiente o repetir el mismo día otro día (crea una sesión nueva al empezar). */
export async function setPartialAction(id: string, action: 'next' | 'repeat'): Promise<void> {
  await db().transaction('rw', [db().sessions, db().changelog], async () => {
    const s = await db().sessions.get(id)
    if (!s) return
    await db().sessions.put({ ...s, partialAction: action, updatedAt: Date.now() })
    await log('session', id, action === 'repeat' ? 'Parcial: repetir esta sesión otro día' : 'Parcial: cerrar y pasar a la siguiente')
  })
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

/** Hora local (HH:MM) de una fecha YYYY-MM-DD → epoch ms. */
export function localDateTime(date: string, hhmm: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (hhmm || '18:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).getTime()
}

/**
 * Cambia la fecha (y opcionalmente la hora y la duración) de una sesión terminada. Mueve inicio y fin juntos.
 * Devuelve la sesión modificada (sin guardar).
 */
export function retimeSession(s: Session, date: string, opts: { hhmm?: string; durationMin?: number } = {}): Session {
  const cur = new Date(s.startedAt)
  const hhmm = opts.hhmm ?? `${String(cur.getHours()).padStart(2, '0')}:${String(cur.getMinutes()).padStart(2, '0')}`
  const startedAt = localDateTime(date, hhmm)
  const durMs = opts.durationMin !== undefined ? opts.durationMin * 60000 + s.pausedTotalMs : (s.endedAt ?? s.startedAt) - s.startedAt
  return { ...s, date, startedAt, endedAt: startedAt + durMs, ...(s.backdated && opts.durationMin !== undefined ? { manualDurationMin: opts.durationMin } : {}) }
}

export async function allSessions(): Promise<Session[]> {
  return db().sessions.toArray()
}

export async function finishedSessions(): Promise<Session[]> {
  return (await db().sessions.toArray()).filter((s) => s.status === 'completed' || s.status === 'partial')
}

// ───────────────────────── Programa (fases y técnicas) ─────────────────────────

export const PROGRAM_KEY = 'program'

export async function getProgramState(): Promise<ProgramState> {
  return (await getMeta<ProgramState | null>(PROGRAM_KEY, null)) ?? {}
}

/** Cambia el estado del programa y deja constancia de la decisión (no borra nada del historial). */
export async function updateProgramState(f: (s: ProgramState) => ProgramState, logText?: string): Promise<ProgramState> {
  return db().transaction('rw', [db().meta, db().changelog], async () => {
    const cur = await getProgramState()
    let next = f(structuredClone(cur))
    if (logText) next = logState(next, logText)
    await setMeta(PROGRAM_KEY, next)
    if (logText) await log('profile', 'program', logText)
    return next
  })
}

export function currentWeekRange(today = toLocalDate()): { start: string; end: string } {
  const start = weekStart(today)
  return { start, end: addDays(start, 6) }
}
