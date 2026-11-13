import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, parseBackupText, restoreBackup } from '../../src/data/backup'
import { ForjaDB, SCHEMA_VERSION, db, useDatabase } from '../../src/data/db'
import { finishSession, localDateTime, makeSessionExercise, retimeSession, saveSession, startFreeSession } from '../../src/data/repo'
import { bodyweightOn, kcalRange, sessionMinutes } from '../../src/domain/energy'
import { describePlates, platesFor, warmupPlan } from '../../src/domain/plates'
import { DEFAULT_INCREMENTS } from '../../src/domain/profile'
import { readinessLevel } from '../../src/domain/readiness'
import { lastTrainedByMuscle, previousComparable, sessionRecords, sessionTotals, setRecord } from '../../src/domain/records'
import type { Session, SetEntry } from '../../src/domain/types'
import { formatNumber } from '../../src/domain/util'

let n = 0
beforeEach(() => {
  useDatabase(`feat-${Date.now()}-${n++}`)
})

function set(p: Partial<SetEntry>): SetEntry {
  return { id: `s${Math.random()}`, kind: 'work', weightKg: null, reps: null, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: 1, ...p }
}

function session(id: string, date: string, startedAt: number, exs: { id: string; sets: SetEntry[] }[], extra: Partial<Session> = {}): Session {
  return {
    id, status: 'completed', routineId: 'r1', routineVersionId: 'v1', dayId: 'd1', title: 'Día A', date, startedAt, endedAt: startedAt + 3600000, pausedAt: null, pausedTotalMs: 0,
    exercises: exs.map((e) => ({ ...makeSessionExercise(e.id, null), sets: e.sets })), notes: '', rampApplied: false, engineVersion: 't', updatedAt: startedAt, rest: null, ...extra,
  }
}

describe('Calorías (rango MET, R18)', () => {
  it('calcula 3,5–5 MET × kg × h redondeado a 10 kcal', () => {
    expect(kcalRange(60, 70)).toEqual({ lo: 250, hi: 350 })
    expect(kcalRange(45, 80)).toEqual({ lo: 210, hi: 300 })
  })
  it('sin peso o sin duración no estima', () => {
    expect(kcalRange(60, 0)).toBeNull()
    expect(kcalRange(0, 70)).toBeNull()
  })
  it('usa el peso más cercano anterior a la sesión', () => {
    const bw = [{ id: 'a', date: '2026-10-01', kg: 70 }, { id: 'b', date: '2026-11-01', kg: 72 }]
    expect(bodyweightOn(bw, '2026-10-20')).toBe(70)
    expect(bodyweightOn(bw, '2026-11-10')).toBe(72)
    expect(bodyweightOn(bw, '2026-09-01')).toBe(70)
    expect(bodyweightOn([], '2026-09-01')).toBeNull()
  })
  it('duración: descuenta pausas y usa la declarada en registros a posteriori', () => {
    const s = session('x', '2026-11-10', 0, [], { endedAt: 50 * 60000, pausedTotalMs: 5 * 60000 })
    expect(sessionMinutes(s)).toBe(45)
    expect(sessionMinutes({ ...s, backdated: true, manualDurationMin: 70 })).toBe(70)
  })
})

describe('Discos y calentamiento', () => {
  it('reparte discos por lado con el menor número posible', () => {
    const r = platesFor(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25])
    expect(r.exact).toBe(true)
    expect(r.perSide.reduce((a, b) => a + b, 0)).toBe(40)
    expect(r.perSide.length).toBe(2)
    expect(platesFor(62.5, 20).perSide).toEqual([20, 1.25])
  })
  it('si no es exacto, da lo más cercano por debajo; por debajo de la barra lo indica', () => {
    const r = platesFor(61, 20)
    expect(r.exact).toBe(false)
    expect(r.totalKg).toBe(60)
    expect(platesFor(15, 20).belowBar).toBe(true)
    expect(platesFor(20, 20)).toMatchObject({ perSide: [], exact: true })
  })
  it('agrupa discos repetidos en el texto', () => {
    expect(describePlates([20, 20, 2.5], formatNumber)).toBe('2 × 20 + 2,5')
  })
  it('calentamiento con cargas crecientes, redondeadas y nunca por debajo de la barra', () => {
    const p = warmupPlan(100, 3, 'barbell_total', DEFAULT_INCREMENTS)
    expect(p.map((w) => w.kg)).toEqual([40, 60, 80])
    expect(p.map((w) => w.reps)).toEqual([8, 5, 3])
    const light = warmupPlan(30, 3, 'barbell_total', DEFAULT_INCREMENTS)
    expect(Math.min(...light.map((w) => w.kg))).toBeGreaterThanOrEqual(DEFAULT_INCREMENTS.barKg)
    expect(light.every((w) => w.kg <= 30)).toBe(true)
    expect(warmupPlan(0, 2, 'machine', DEFAULT_INCREMENTS)).toEqual([])
  })
})

describe('Preparación del día (R19)', () => {
  it('baja con poco sueño, poca energía o muchas agujetas', () => {
    expect(readinessLevel({ sleep: 2, energy: 4, soreness: 1, at: 0 })).toBe('low')
    expect(readinessLevel({ sleep: 4, energy: 2, soreness: 1, at: 0 })).toBe('low')
    expect(readinessLevel({ sleep: 4, energy: 4, soreness: 4, at: 0 })).toBe('low')
    expect(readinessLevel({ sleep: 3, energy: 3, soreness: 3, at: 0 })).toBe('ok')
    expect(readinessLevel(null)).toBeNull()
  })
})

describe('Último entrenamiento por músculo (R20)', () => {
  it('toma la fecha más reciente con series completadas donde el músculo es principal', () => {
    const a = session('a', '2026-11-01', 1, [{ id: 'press_banca_barra', sets: [set({ weightKg: 60, reps: 8 })] }])
    const b = session('b', '2026-11-05', 2, [{ id: 'press_banca_barra', sets: [set({ weightKg: 60, reps: 8, completed: false })] }])
    const last = lastTrainedByMuscle([a, b])
    expect(last.chest).toBe('2026-11-01')
    expect(last.calves).toBeNull()
  })
})

describe('Récords (R22)', () => {
  const prior = [set({ weightKg: 60, reps: 8 }), set({ weightKg: 65, reps: 5 })]
  it('la primera vez no es un récord', () => {
    expect(setRecord(set({ weightKg: 60, reps: 8 }), 'barbell_total', [], formatNumber)).toBeNull()
  })
  it('más carga para las mismas repeticiones', () => {
    const r = setRecord(set({ weightKg: 62.5, reps: 8 }), 'barbell_total', prior, formatNumber)
    expect(r?.kind).toBe('load')
    expect(r?.detail).toContain('antes 60 kg')
  })
  it('más repeticiones con la misma carga', () => {
    const r = setRecord(set({ weightKg: 60, reps: 10 }), 'barbell_total', prior, formatNumber)
    expect(r?.kind).toBe('reps_at_load')
    expect(r?.detail).toContain('antes 8')
  })
  it('igualar no es récord; menos tampoco', () => {
    expect(setRecord(set({ weightKg: 60, reps: 8 }), 'barbell_total', prior, formatNumber)).toBeNull()
    expect(setRecord(set({ weightKg: 55, reps: 8 }), 'barbell_total', prior, formatNumber)).toBeNull()
  })
  it('peso corporal: más repeticiones sin asistencia; tiempo: más segundos', () => {
    expect(setRecord(set({ reps: 12 }), 'bodyweight', [set({ reps: 10 })], formatNumber)?.kind).toBe('reps')
    expect(setRecord(set({ reps: 12, assistKg: 20 }), 'bodyweight', [set({ reps: 10 })], formatNumber)).toBeNull()
    expect(setRecord(set({ durationSec: 50 }), 'time', [set({ durationSec: 45 })], formatNumber)?.kind).toBe('time')
  })
  it('resumen de sesión: un récord por ejercicio, comparado con sesiones anteriores', () => {
    const old = session('o', '2026-11-01', 1000, [{ id: 'press_banca_barra', sets: [set({ weightKg: 60, reps: 8 })] }])
    const cur = session('c', '2026-11-05', 2000, [{ id: 'press_banca_barra', sets: [set({ weightKg: 62.5, reps: 8 }), set({ weightKg: 65, reps: 8 })] }])
    const recs = sessionRecords(cur, [old, cur], formatNumber)
    expect(recs).toHaveLength(1)
    expect(recs[0].rec.value).toBe('65 kg × 8')
    expect(sessionRecords(old, [old, cur], formatNumber)).toHaveLength(0)
    expect(previousComparable(cur, [old, cur])?.id).toBe('o')
    expect(sessionTotals(cur)).toEqual({ sets: 2, reps: 16, exercises: 1 })
  })
})

describe('Sesión registrada a posteriori y cambio de fecha', () => {
  it('usa la hora y la duración declaradas al terminar', async () => {
    const startedAt = localDateTime('2026-11-10', '19:30')
    const s = await startFreeSession('2026-11-10', { startedAt, durationMin: 55 })
    expect(s.backdated).toBe(true)
    s.exercises.push(makeSessionExercise('press_banca_barra', null))
    s.exercises[0].sets[0] = { ...s.exercises[0].sets[0], weightKg: 50, reps: 10, completed: true }
    await saveSession(s)
    const done = await finishSession(s, 'completed')
    expect(done.date).toBe('2026-11-10')
    expect(done.endedAt).toBe(startedAt + 55 * 60000)
    expect(sessionMinutes(done)).toBe(55)
  })
  it('cambiar la fecha mueve inicio y fin juntos', () => {
    const s = session('x', '2026-11-10', localDateTime('2026-11-10', '18:00'), [])
    const moved = retimeSession(s, '2026-11-08')
    expect(moved.date).toBe('2026-11-08')
    expect(moved.endedAt! - moved.startedAt).toBe(s.endedAt! - s.startedAt)
    expect(new Date(moved.startedAt).getDate()).toBe(8)
    const longer = retimeSession(s, '2026-11-10', { hhmm: '07:15', durationMin: 90 })
    expect(new Date(longer.startedAt).getHours()).toBe(7)
    expect(longer.endedAt! - longer.startedAt).toBe(90 * 60000)
  })
})

describe('Esquema v2: actualización sin pérdida y copias con fotos opcionales', () => {
  it('una base v1 existente se actualiza a v2 conservando los datos', async () => {
    const name = `mig-${Date.now()}`
    const v1 = new Dexie(name)
    v1.version(1).stores({
      meta: 'key', profile: 'id', routines: 'id, status, updatedAt', routineVersions: 'id, routineId', overrides: 'id, routineId, fromDate',
      sessions: 'id, status, date, routineId, startedAt', bodyweight: 'id, date', changelog: 'id, at, entityId', customExercises: 'id', exerciseSettings: 'exerciseId', userMedia: 'id, exerciseId',
    })
    await v1.open()
    await v1.table('sessions').put(session('old', '2026-10-01', 5, [{ id: 'press_banca_barra', sets: [set({ weightKg: 40, reps: 10 })] }]))
    await v1.table('bodyweight').put({ id: 'bw1', date: '2026-10-01', kg: 71 })
    v1.close()
    const v2 = new ForjaDB(name)
    await v2.open()
    expect(v2.verno).toBe(SCHEMA_VERSION)
    expect((await v2.sessions.get('old'))?.exercises[0].sets[0].weightKg).toBe(40)
    expect((await v2.bodyweight.get('bw1'))?.kg).toBe(71)
    await v2.measurements.put({ id: 'm1', date: '2026-11-01', site: 'waist', cm: 82 })
    expect(await v2.measurements.count()).toBe(1)
    v2.close()
  })

  it('las fotos no se exportan salvo que se pida; reemplazar sin fotos las conserva', async () => {
    const photo = { id: 'p1', date: '2026-11-01', pose: 'front' as const, dataUrl: 'data:image/jpeg;base64,AAAA', bytes: 3, width: 1, height: 1, createdAt: 1 }
    await db().photos.put(photo)
    await db().measurements.put({ id: 'm1', date: '2026-11-01', site: 'arm', cm: 33 })
    const plain = await exportBackup()
    expect(plain.tables.photos).toBeUndefined()
    expect(plain.tables.measurements).toHaveLength(1)
    expect(plain.schemaVersion).toBe(2)
    const withPhotos = await exportBackup({ includePhotos: true })
    expect(withPhotos.tables.photos).toHaveLength(1)

    const parsed = parseBackupText(JSON.stringify(plain))
    await db().measurements.clear()
    await restoreBackup(parsed, 'replace')
    expect(await db().photos.count()).toBe(1) // la copia no traía fotos: se conservan
    expect(await db().measurements.count()).toBe(1)

    const parsedWith = parseBackupText(JSON.stringify({ ...withPhotos, tables: { ...withPhotos.tables, photos: [] } }))
    await restoreBackup(parsedWith, 'replace')
    expect(await db().photos.count()).toBe(0) // la copia sí traía la tabla de fotos (vacía): reemplazo completo
  })

  it('acepta copias del esquema 1 y rechaza medidas no válidas', () => {
    expect(() => parseBackupText(JSON.stringify({ format: 'forja-backup', formatVersion: 1, schemaVersion: 1, tables: { bodyweight: [] } }))).not.toThrow()
    expect(() => parseBackupText(JSON.stringify({ format: 'forja-backup', formatVersion: 1, schemaVersion: 2, tables: { measurements: [{ id: 'x', date: '2026-01-01', site: 'waist', cm: 'mucho' }] } }))).toThrow(/medida/)
    expect(() => parseBackupText(JSON.stringify({ format: 'forja-backup', formatVersion: 1, schemaVersion: 3, tables: {} }))).toThrow(/incompatible/)
  })
})
