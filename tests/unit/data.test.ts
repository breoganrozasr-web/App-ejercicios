import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { BackupError, exportBackup, parseBackupText, previewBackup, restoreBackup } from '../../src/data/backup'
import { ForjaDB, db, useDatabase } from '../../src/data/db'
import { clearDemo, loadDemo } from '../../src/data/demo'
import {
  createRoutine, deleteSession, familiarizationStatus, finishSession, flushWrites, getActiveSession, getRoutineBundle, makeSessionExercise, nextRoutineDay, recoverJournal, resumeSession, saveRoutineVersion, saveSession, setPartialAction, setRoutineStatus, startSessionFromDay,
} from '../../src/data/repo'
import { EXTERNAL_DEMOS, hasExternalDemo } from '../../src/domain/catalog/external'
import { getExercise } from '../../src/domain/catalog'
import { APPROX_REFERENCE, EXERCISES } from '../../src/domain/catalog/exercises'
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
  it('A07 · familiarización por sesiones: mitad de series y RIR 3–4; 1/7 series no cuenta para salir de ella', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    expect(b.version.familiarization).toEqual({ sessions: 4, reason: 'beginner' })
    const day = b.version.days[0]
    const s = await startSessionFromDay(routine.id, day.id, '2026-11-03')
    expect(s.familiarization).toEqual({ index: 1, total: 4 })
    const base = day.exercises[0].prescription
    expect(s.exercises[0].sets.filter((x) => x.kind === 'work')).toHaveLength(Math.max(1, Math.ceil(base.sets / 2)))
    expect(s.exercises[0].prescription!.rirMin).toBe(3)
    // Parcial con 1 de 7 series: NO cuenta
    const one = structuredClone(s)
    one.exercises[0].sets.find((x) => x.kind === 'work')!.completed = true
    await finishSession(one, 'partial')
    const s2 = await startSessionFromDay(routine.id, day.id, '2026-11-05')
    expect(s2.familiarization).toEqual({ index: 1, total: 4 })
    // Una sesión con ≥70 % de las series sí cuenta (sin fecha de caducidad)
    const full = structuredClone(s2)
    for (const e of full.exercises) for (const x of e.sets) if (x.kind === 'work') x.completed = true
    await finishSession(full, 'completed')
    const all = await db().sessions.toArray()
    expect(familiarizationStatus(b.version, all, routine.id)).toMatchObject({ index: 2, completed: 1 })
  })
  it('las versiones antiguas (motor 1, por semanas) conservan su regla', async () => {
    const r = generateRoutine({ ...defaultProfile(0), days: [0, 2, 4] })
    if (r.status !== 'ok') throw new Error()
    const legacy = await createRoutine({ ...r.draft, familiarization: undefined, rampWeeks: 2 }, { startedOn: '2026-11-02' })
    const b = (await getRoutineBundle(legacy.id))!
    expect(b.version.familiarization).toBeUndefined()
    const s = await startSessionFromDay(legacy.id, b.version.days[0].id, '2026-11-03')
    expect(s.rampApplied).toBe(true)
    expect(s.familiarization).toBeNull()
    expect(s.exercises[0].sets.filter((x) => x.kind === 'work')).toHaveLength(Math.max(1, b.version.days[0].exercises[0].prescription.sets - 1))
  })
})

describe('A15 · sesión parcial: retomar no duplica; repetir crea una nueva', () => {
  it('retomar reabre la MISMA sesión; «repetir» propone el mismo día y la siguiente es nueva', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-03')
    const mod = structuredClone(s)
    mod.exercises[0].sets.find((x) => x.kind === 'work')!.completed = true
    const partial = await finishSession(mod, 'partial')
    const resumed = await resumeSession(partial.id)
    expect(resumed.id).toBe(partial.id)
    expect(resumed.status).toBe('active')
    expect(await db().sessions.count()).toBe(1)
    expect(resumed.exercises[0].sets.filter((x) => x.completed)).toHaveLength(1)
    const again = await finishSession(resumed, 'partial')
    await setPartialAction(again.id, 'repeat')
    const all = await db().sessions.toArray()
    expect(nextRoutineDay(b.version, all, routine.id)?.id).toBe(b.version.days[0].id)
    const fresh = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-05')
    expect(fresh.id).not.toBe(partial.id)
    expect(await db().sessions.count()).toBe(2)
    // «Cerrar y pasar a la siguiente»
    await setPartialAction(again.id, 'next')
    await db().sessions.delete(fresh.id)
    expect(nextRoutineDay(b.version, await db().sessions.toArray(), routine.id)?.id).toBe(b.version.days[1].id)
  })
  it('no se puede retomar una parcial si hay otro entrenamiento en curso', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-03')
    const partial = await finishSession(s, 'partial')
    await startSessionFromDay(routine.id, b.version.days[1].id, '2026-11-04')
    await expect(resumeSession(partial.id)).rejects.toThrow(/en curso/)
  })
})

describe('F8 · guardado: diario síncrono y escrituras coalescentes', () => {
  it('lo último escrito sobrevive aunque la escritura a IndexedDB no haya terminado (recarga brusca)', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-03')
    let cur = s
    for (const ch of 'agarre neutro') {
      cur = { ...cur, exercises: cur.exercises.map((e, i) => (i === 0 ? { ...e, notes: e.notes + ch } : e)) }
      void saveSession(cur)
    }
    // Simula la recarga: la base aún puede tener una versión antigua; el diario local tiene la última.
    await db().sessions.put({ ...s, updatedAt: s.updatedAt })
    expect(localStorage.getItem(`forja-wal:${s.id}`)).toBeTruthy()
    await recoverJournal()
    await flushWrites()
    const back = await db().sessions.get(s.id)
    expect(back!.exercises[0].notes).toBe('agarre neutro')
  })
  it('el diario no resucita una sesión descartada o terminada', async () => {
    const routine = await makeRoutine()
    const b = (await getRoutineBundle(routine.id))!
    const s = await startSessionFromDay(routine.id, b.version.days[0].id, '2026-11-03')
    void saveSession({ ...s, notes: 'x' })
    await deleteSession(s.id)
    await recoverJournal()
    expect(await db().sessions.get(s.id)).toBeUndefined()
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
  it('las rutinas incluidas usan ejercicios con demostración local verificada o, si está pendiente, con referencia externa declarada', () => {
    for (const t of TEMPLATES) {
      for (const level of ['beginner', 'intermediate'] as const) {
        const { draft } = buildFromTemplate(t, { ...defaultProfile(0), level })
        for (const d of draft.days) for (const e of d.exercises) {
          const ex = getExercise(e.exerciseId)!
          expect(ex.demoStatus === 'verificada' || hasExternalDemo(ex.id), `${t.id}: ${e.exerciseId}`).toBe(true)
          if (ex.demoStatus !== 'verificada') expect(draft.warnings.join(' ').includes(ex.name), `${t.id}: aviso de ${ex.id}`).toBe(true)
        }
      }
    }
  })
  it('A19 · cada demostración externa está asociada al ID exacto de la especificación', () => {
    const expected: Record<string, string> = {
      T1: 'press_pecho_maquina', T2: 'peso_muerto_rumano_mancuernas', T3: 'curl_femoral_sentado', T4: 'prensa_sentada', T5: 'flexiones_inclinadas',
      T6: 'flexiones_rodillas', T7: 'puente_gluteo', T8: 'plancha_frontal', T9: 'zancada_atras_peso_corporal',
      // Encargo 4 (D25): V01–V04 asociados a la variante exacta (sin fusionar convencional con rumano).
      V01: 'peso_muerto_convencional', V02: 'hip_thrust_barra', V03: 'remo_pecho_apoyado', V04: 'remo_banda_anclaje',
    }
    expect(EXTERNAL_DEMOS).toHaveLength(13)
    for (const d of EXTERNAL_DEMOS) {
      expect(d.exerciseId).toBe(expected[d.code])
      expect(getExercise(d.exerciseId), d.exerciseId).toBeTruthy()
      expect(d.pageUrl).toMatch(/^https:\/\//)
    }
    const videos = Object.fromEntries(EXTERNAL_DEMOS.filter((d) => d.videoUrl).map((d) => [d.code, d.videoUrl]))
    expect(videos).toEqual({ T1: 'https://www.youtube.com/watch?v=lRo9zZ7EwpM', T2: 'https://www.youtube.com/watch?v=V8Hdl1FiNt4', T3: 'https://www.youtube.com/watch?v=_2Kd0d-JEUM', T5: 'https://www.youtube.com/watch?v=0JUrOH--Kdk', T7: 'https://www.youtube.com/watch?v=Z3cY3d3BBo4', T9: 'https://www.youtube.com/watch?v=gd1a7i7-CMY', V01: 'https://www.youtube.com/watch?v=Z6gcRfPNcZo', V04: 'https://www.youtube.com/watch?v=qykwviNOIyc' })
    // La zancada atrás no usa una zancada al frente como sustituto
    expect(APPROX_REFERENCE.zancada_atras_peso_corporal).toBeUndefined()
  })
  it('A20 · el catálogo mantiene sus IDs (93 observados + 2 nuevos + 4 fichas del anexo C), sin perder ninguno', () => {
    const ids = new Set(EXERCISES.map((e) => e.id))
    for (const id of ['press_banca_barra', 'prensa', 'plancha_frontal', 'zancada_atras_peso_corporal', 'flexiones_inclinadas', 'sentadilla_peso_corporal', 'gemelos_peso_corporal']) expect(ids.has(id)).toBe(true)
    expect(ids.size).toBe(EXERCISES.length)
    expect(EXERCISES.length).toBe(99)
    for (const id of ['peso_muerto_convencional', 'hip_thrust_barra', 'remo_pecho_apoyado', 'remo_banda_anclaje']) expect(ids.has(id)).toBe(true)
  })
  it('el manifiesto de docs coincide con el de la app', () => {
    const docs = JSON.parse(readFileSync(resolve(root, 'docs/media-manifest.json'), 'utf8'))
    expect(docs.items.length).toBe(MEDIA_MANIFEST.items.length)
  })
})
