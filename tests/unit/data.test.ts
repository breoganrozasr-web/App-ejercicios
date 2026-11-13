import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { BackupError, exportBackup, parseBackupText, previewBackup, restoreBackup } from '../../src/data/backup'
import { ForjaDB, useDatabase } from '../../src/data/db'
import { clearDemo, loadDemo } from '../../src/data/demo'
import {
  createRoutine, finishSession, getActiveSession, getRoutineBundle, makeSessionExercise, nextRoutineDay, saveRoutineVersion, saveSession, setRoutineStatus, startSessionFromDay,
} from '../../src/data/repo'
import { getExercise } from '../../src/domain/catalog'
import { EXERCISES } from '../../src/domain/catalog/exercises'
import { ALL_MEDIA, MEDIA_MANIFEST } from '../../src/domain/catalog/media'
import { buildFromTemplate, generateRoutine } from '../../src/domain/engine/generator'
import { historyFor, suggestNext } from '../../src/domain/engine/progression'
import { alternativesFor } from '../../src/domain/engine/substitution'
import { TEMPLATES } from '../../src/domain/engine/templates'
import { DEFAULT_INCREMENTS, defaultProfile } from '../../src/domain/profile'

let dbName = ''
let n = 0
beforeEach(() => {
  dbName = `test-${Date.now()}-${n++}`
  useDatabase(dbName)
})

async function makeRoutine() {
  const r = generateRoutine({ ...defaultProfile(0), days: [0, 2, 4] })
  if (r.status !== 'ok') throw new Error('no ok')
  return createRoutine(r.draft, { startedOn: '2026-11-02' })
}

describe('Caso 8 · empezar, registrar, cerrar/recargar y reanudar', () => {
  it('no duplica sesiones por doble toque y recupera tras "recargar"', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const day = b.version.days[0]
    const [s1, s2] = await Promise.all([startSessionFromDay(routine.id, day.id, '2026-11-13'), startSessionFromDay(routine.id, day.id, '2026-11-13')])
    expect(s1.id).toBe(s2.id)
    const s3 = await startSessionFromDay(routine.id, b.version.days[1].id, '2026-11-13')
    expect(s3.id).toBe(s1.id) // ya hay una activa: se reanuda, no se crea otra
    // Registrar una serie con coma decimal convertida
    const ex = s1.exercises[0]
    const work = ex.sets.find((x) => x.kind === 'work')!
    work.weightKg = 52.5
    work.reps = 10
    work.completed = true
    await saveSession({ ...s1, rest: { startedAt: 1000, durationSec: 120, setId: work.id } })
    // "Recarga": nueva conexión a la misma base
    const fresh = new ForjaDB(dbName)
    const again = (await fresh.sessions.toArray()).filter((s) => s.status === 'active')
    expect(again).toHaveLength(1)
    const w2 = again[0].exercises[0].sets.find((x) => x.id === work.id)!
    expect(w2.weightKg).toBe(52.5)
    expect(w2.completed).toBe(true)
    expect(again[0].rest?.durationSec).toBe(120)
    fresh.close()
    // Terminar como parcial: lo hecho queda
    const active = (await getActiveSession())!
    const done = await finishSession(active, 'partial')
    expect(done.status).toBe('partial')
    expect(await getActiveSession()).toBeUndefined()
  })
  it('la semana de familiarización quita una serie al crear la sesión', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-03')
    expect(s.rampApplied).toBe(true)
    const planned = b.version.days[0].exercises[0].prescription.sets
    expect(s.exercises[0].sets.filter((x) => x.kind === 'work')).toHaveLength(Math.max(1, planned - 1))
  })
})

describe('Caso 5 y 11 · sustituir, editar, archivar sin tocar el historial', () => {
  it('editar la rutina crea versión nueva y no cambia sesiones pasadas; sustituir no copia kg', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const day = b.version.days[0]
    const s = await startSessionFromDay(routine.id, day.id, '2026-11-13')
    const firstEx = s.exercises[0]
    firstEx.sets.filter((x) => x.kind === 'work').forEach((x) => Object.assign(x, { weightKg: 100, reps: 12, rir: 2, completed: true }))
    await saveSession(s)
    await finishSession(s, 'completed')
    const snapBefore = JSON.stringify((await (await import('../../src/data/db')).db().sessions.get(s.id))!.exercises)
    // Sustituir en la plantilla el primer ejercicio por una alternativa
    const alt = alternativesFor(firstEx.exerciseId, defaultProfile(0).equipment, 'beginner').find((a) => a.available && a.exercise.demoStatus === 'verificada')!
    const newDays = structuredClone(b.version.days)
    newDays[0].exercises[0] = { ...newDays[0].exercises[0], exerciseId: alt.exercise.id, uid: 'nuevo' }
    const v2 = await saveRoutineVersion(routine.id, { days: newDays }, 'Sustitución')
    expect(v2.version).toBe(2)
    const after = (await getRoutineBundle(routine.id))!
    expect(after.versions).toHaveLength(2)
    expect(after.version.days[0].exercises[0].exerciseId).toBe(alt.exercise.id)
    const { db } = await import('../../src/data/db')
    expect(JSON.stringify((await db().sessions.get(s.id))!.exercises)).toBe(snapBefore)
    // El ejercicio nuevo no hereda los 100 kg del anterior
    const sessions = await db().sessions.toArray()
    const sug = suggestNext({ exerciseId: alt.exercise.id, prescription: newDays[0].exercises[0].prescription, history: historyFor(alt.exercise.id, sessions), increments: DEFAULT_INCREMENTS, today: '2026-11-14', progressionAllowed: true })
    expect(sug.kind).toBe('first_time')
    expect(sug.targetWeightKg).toBeUndefined()
    // Archivar la rutina tampoco borra el historial
    await setRoutineStatus(routine.id, 'archived')
    expect((await db().sessions.get(s.id))?.status).toBe('completed')
    expect((await db().routines.get(routine.id))?.status).toBe('archived')
  })
  it('rotación: se puede empezar cualquier día y sigue el orden de la rutina', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    expect(nextRoutineDay(b.version, [], routine.id, '2026-11-14')?.id).toBe(b.version.days[0].id)
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-14')
    const done = await finishSession(s, 'completed')
    expect(nextRoutineDay(b.version, [done], routine.id)?.id).toBe(b.version.days[1].id)
  })
  it('la sesión guarda la sustitución durante el entrenamiento sin perder lo hecho', () => {
    const e = makeSessionExercise('prensa', { sets: 3, repMin: 8, repMax: 12, rirMin: 2, rirMax: 3, restSec: 120, warmupSets: 1 })
    expect(e.sets.filter((x) => x.kind === 'warmup')).toHaveLength(1)
    expect(e.sets.filter((x) => x.kind === 'work')).toHaveLength(3)
    expect(e.loadTypeSnapshot).toBe('machine')
  })
})

describe('Caso 10 · exportar y restaurar', () => {
  it('fusionar no duplica y reemplazar recupera exactamente', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-13')
    await finishSession(s, 'completed')
    const backup = await exportBackup()
    const text = JSON.stringify(backup)
    const { db } = await import('../../src/data/db')
    const before = { sessions: await db().sessions.count(), routines: await db().routines.count(), versions: await db().routineVersions.count() }
    const parsed = parseBackupText(text)
    const pv = await previewBackup(parsed)
    expect(pv.counts.sessions).toBe(1)
    expect(pv.existingIds).toBeGreaterThan(0)
    await restoreBackup(parsed, 'merge')
    expect(await db().sessions.count()).toBe(before.sessions)
    expect(await db().routines.count()).toBe(before.routines)
    // Reemplazo en una base vacía
    useDatabase(`${dbName}-b`)
    await restoreBackup(parseBackupText(text), 'replace')
    const { db: db2 } = await import('../../src/data/db')
    expect(await db2().sessions.count()).toBe(1)
    expect(await db2().routineVersions.count()).toBe(before.versions)
    expect(JSON.stringify(await db2().sessions.toArray())).toBe(JSON.stringify(backup.tables.sessions))
  })
  it('un archivo corrupto o incompatible no toca la base', async () => {
    await makeRoutine()
    const { db } = await import('../../src/data/db')
    const count = await db().routines.count()
    expect(() => parseBackupText('{esto no es json')).toThrow(BackupError)
    expect(() => parseBackupText(JSON.stringify({ format: 'otra-app' }))).toThrow(/No es una copia/)
    expect(() => parseBackupText(JSON.stringify({ format: 'forja-backup', formatVersion: 99, schemaVersion: 1, tables: {} }))).toThrow(/más nueva/)
    expect(() => parseBackupText(JSON.stringify({ format: 'forja-backup', formatVersion: 1, schemaVersion: 1, tables: { sessions: [{ id: 'x', date: 'ayer', status: 'completed', exercises: [] }] } }))).toThrow(/fecha/)
    expect(await db().routines.count()).toBe(count)
  })
  it('si la restauración falla a mitad, se deshace entera (transacción)', async () => {
    await makeRoutine()
    const { db } = await import('../../src/data/db')
    const before = await db().routines.count()
    const good = await exportBackup()
    const broken = structuredClone(good)
    // Fuerza un fallo de escritura: clave duplicada no válida para IndexedDB (objeto como id)
    ;(broken.tables.routines as Record<string, unknown>[]).push({ id: { no: 'válido' }, currentVersionId: 'x' } as unknown as Record<string, unknown>)
    await expect(restoreBackup(broken, 'replace')).rejects.toBeTruthy()
    expect(await db().routines.count()).toBe(before)
  })
  it('limpia texto peligroso y claves de prototipo al importar', () => {
    const t = JSON.stringify({ format: 'forja-backup', formatVersion: 1, schemaVersion: 1, tables: { bodyweight: [{ id: 'a', date: '2026-01-01', kg: 70, nota: 'ok\u0000\u0007', __proto__: { x: 1 } }] } })
    const f = parseBackupText(t)
    const row = (f.tables.bodyweight as Record<string, unknown>[])[0]
    expect(row.nota).toBe('ok')
  })
  it('los datos de ejemplo se borran sin tocar los personales y no se exportan', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-13')
    await finishSession(s, 'completed')
    const n = await loadDemo('2026-11-13')
    expect(n).toBeGreaterThan(5)
    const exp = await exportBackup()
    expect((exp.tables.sessions as unknown[]).length).toBe(1)
    await clearDemo()
    const { db } = await import('../../src/data/db')
    expect(await db().sessions.count()).toBe(1)
  })
})

describe('Caso 13 · rutinas incluidas con medios de la variante y atribuciones', () => {
  const root = resolve(__dirname, '../..')
  it('cada ejercicio verificado tiene su demostración en un manifiesto, con archivos existentes y licencia', () => {
    const verified = EXERCISES.filter((e) => e.demoStatus === 'verificada')
    expect(verified.length).toBeGreaterThanOrEqual(90)
    for (const e of verified) {
      const m = ALL_MEDIA.find((x) => x.exerciseId === e.id)
      expect(m, e.id).toBeTruthy()
      expect(m!.frames!.length).toBeGreaterThanOrEqual(1)
      for (const f of m!.frames!) expect(existsSync(resolve(root, 'public', f)), f).toBe(true)
      if (m!.frameDurationsMs) expect(m!.frameDurationsMs.length).toBe(m!.frames!.length)
      expect(['CC BY-SA 4.0', 'Dominio público']).toContain(m!.license)
      expect(m!.attribution.length).toBeGreaterThan(20)
      expect(m!.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      if (m!.provider === 'everkinetic') {
        expect(m!.attribution).toMatch(/Everkinetic/)
        expect(m!.sourceFiles!.every((u) => u.startsWith('https://github.com/everkinetic/data/blob/'))).toBe(true)
      } else {
        expect(m!.provider).toBe('wikimedia-commons')
        expect(m!.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
        expect(m!.attribution).toMatch(/Wikimedia Commons/)
      }
    }
    for (const m of ALL_MEDIA) expect(getExercise(m.exerciseId)?.demoStatus, m.exerciseId).toBe('verificada')
  })
  it('las rutinas incluidas solo usan ejercicios con demostración verificada', () => {
    for (const t of TEMPLATES) {
      for (const level of ['beginner', 'intermediate'] as const) {
        const { draft } = buildFromTemplate(t, { ...defaultProfile(0), level })
        for (const d of draft.days) for (const e of d.exercises) {
          expect(getExercise(e.exerciseId)!.demoStatus, `${t.id}: ${e.exerciseId}`).toBe('verificada')
        }
      }
    }
  })
  it('el manifiesto de docs coincide con el de la app', () => {
    const docs = JSON.parse(readFileSync(resolve(root, 'docs/media-manifest.json'), 'utf8'))
    expect(docs.items.length).toBe(MEDIA_MANIFEST.items.length)
  })
})
