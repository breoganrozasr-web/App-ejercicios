import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { BACKUP_FORMAT_VERSION, exportBackup, parseBackupText, restoreBackup, sessionsToCsv } from '../../src/data/backup'
import { ForjaDB, SCHEMA_VERSION, db, useDatabase } from '../../src/data/db'
import { createRoutine, getProgramState, startSessionFromDay, updateProgramState } from '../../src/data/repo'
import { getExercise } from '../../src/domain/catalog'
import { ANAT_REGIONS, anatomyOf, regionsByRole } from '../../src/domain/catalog/anatomy'
import { EXERCISES } from '../../src/domain/catalog/exercises'
import { contributionOf } from '../../src/domain/engine/contribution'
import { historyFor, historyForGroup, suggestNext } from '../../src/domain/engine/progression'
import { RECIPE_BY_CODE, buildFromRecipe, buildFingerprint, rankRecipes } from '../../src/domain/engine/recipes'
import { DEFAULT_INCREMENTS, defaultProfile, effectiveLevel, experienceOf, migrateProfile, wantsReturnAdaptation } from '../../src/domain/profile'
import { acceptManualReturn, computeProgram, endReadaptation } from '../../src/domain/program'
import { doneByRegion } from '../../src/domain/records'
import { doLater, validDates } from '../../src/domain/sessions'
import { groupForIndex, groupPrescription, withGroups } from '../../src/domain/setGroups'
import { contextKey } from '../../src/domain/techniques'
import type { Profile, Session, SessionExercise, SetEntry, SetGroup } from '../../src/domain/types'

let n = 0
beforeEach(() => {
  useDatabase(`e4-${Date.now()}-${n++}`)
})

const prof = (p: Partial<Profile> = {}): Profile => ({ ...defaultProfile(0), ...p })
function st(p: Partial<SetEntry> = {}): SetEntry {
  return { id: `x${Math.random().toString(36).slice(2)}`, kind: 'work', weightKg: 40, reps: 10, rir: 2, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: 1, ...p }
}
function sx(exerciseId: string, sets: SetEntry[], extra: Partial<SessionExercise> = {}): SessionExercise {
  return { uid: `u-${exerciseId}-${Math.random().toString(36).slice(2, 6)}`, exerciseId, nameSnapshot: exerciseId, loadTypeSnapshot: getExercise(exerciseId)?.loadType ?? 'machine', unilateralSnapshot: !!getExercise(exerciseId)?.unilateral, prescription: { sets: sets.length, repMin: 8, repMax: 12, rirMin: 1, rirMax: 3, restSec: 90, warmupSets: 0 }, sets, notes: '', painFlag: false, ...extra }
}
function ses(date: string, exercises: SessionExercise[], extra: Partial<Session> = {}): Session {
  return { id: `s-${date}-${Math.random().toString(36).slice(2)}`, status: 'completed', routineId: 'r1', routineVersionId: 'v1', dayId: 'd1', title: 'Día', date, startedAt: new Date(`${date}T18:00:00`).getTime(), endedAt: 1, pausedAt: null, pausedTotalMs: 0, exercises, notes: '', rampApplied: false, engineVersion: '2.3.0', updatedAt: 1, rest: null, ...extra }
}

describe('D01 · migración de los tres perfiles antiguos', () => {
  it('desde cero, intermedio y vuelvo se conservan sin inventar experiencia ni continuidad', () => {
    const old = (level: Profile['level']) => { const p = prof({ level }); delete p.experience; delete p.continuity; return p }
    expect(migrateProfile(old('beginner'))).toMatchObject({ experience: 'beginner', continuity: 'unconfirmed', level: 'beginner' })
    expect(migrateProfile(old('intermediate'))).toMatchObject({ experience: 'intermediate', continuity: 'unconfirmed', level: 'intermediate' })
    const r = migrateProfile(old('returning'))
    expect(r).toMatchObject({ experience: 'unconfirmed', continuity: 'returning', level: 'returning' })
    // Prudente: sigue ofreciendo la vuelta gradual y no se presenta como principiante ni intermedio.
    expect(wantsReturnAdaptation(r)).toBe(true)
    expect(migrateProfile(r)).toEqual(r)
  })
  it('una base del esquema 2 se actualiza al 3 migrando el perfil sin tocar sesiones ni rutinas', async () => {
    const name = `mig3-${Date.now()}`
    const v2 = new Dexie(name)
    v2.version(1).stores({ meta: 'key', profile: 'id', routines: 'id, status, updatedAt', routineVersions: 'id, routineId', overrides: 'id, routineId, fromDate', sessions: 'id, status, date, routineId, startedAt', bodyweight: 'id, date', changelog: 'id, at, entityId', customExercises: 'id', exerciseSettings: 'exerciseId', userMedia: 'id, exerciseId' })
    v2.version(2).stores({ measurements: 'id, date, site', photos: 'id, date' })
    await v2.open()
    const p = prof({ level: 'returning' }); delete p.experience; delete p.continuity
    await v2.table('profile').put(p)
    const s0 = ses('2026-10-01', [sx('prensa', [st({ weightKg: 52.5 })])], { status: 'partial' })
    await v2.table('sessions').put(s0)
    v2.close()
    const v3 = new ForjaDB(name)
    await v3.open()
    expect(v3.verno).toBe(SCHEMA_VERSION)
    expect(await v3.profile.get('me')).toMatchObject({ experience: 'unconfirmed', continuity: 'returning', level: 'returning' })
    expect((await v3.sessions.get(s0.id))?.exercises[0].sets[0].weightKg).toBe(52.5)
    v3.close()
  })
})

describe('D02 · avanzado', () => {
  it('nivel efectivo intermedio: misma elegibilidad, mismas series, PPL 6 sigue siendo expreso y edad/salud siguen mandando', () => {
    expect(effectiveLevel('advanced')).toBe('intermediate')
    const inter = prof({ experience: 'intermediate', level: 'intermediate', continuity: 'regular', days: [0, 1, 3, 4] })
    const adv = { ...inter, experience: 'advanced' as const }
    const a = rankRecipes(inter).map((f) => [f.recipe.code, f.fits, buildFingerprint(f.build)])
    const b = rankRecipes(adv).map((f) => [f.recipe.code, f.fits, buildFingerprint(f.build)])
    expect(b).toEqual(a)
    expect(rankRecipes(adv).find((f) => f.recipe.code === 'A10')!.conflicts.some((c) => c.kind === 'explicit')).toBe(true)
    const youth = rankRecipes({ ...adv, ageBand: '14to17' })
    expect(youth.every((f) => !f.fits)).toBe(true)
    expect(buildFromRecipe(RECIPE_BY_CODE.A02, { ...adv, limitations: { ...adv.limitations, painNow: true } }).blocked).toBeTruthy()
  })
})

describe('D03–D04 · vuelta gradual sin historial y dimensiones independientes', () => {
  it('una persona nueva conserva una plantilla intermedia y acepta la vuelta: la sesión usa dosis temporal sin cambiar la receta', async () => {
    const p = prof({ experience: 'intermediate', level: 'intermediate', continuity: 'returning' })
    await db().profile.put(p)
    const b = buildFromRecipe(RECIPE_BY_CODE.A15, { ...p, returningAdaptation: false })
    expect(b.draft.familiarization).toBeNull()
    const r = await createRoutine(b.draft)
    await updateProgramState((s) => acceptManualReturn(s, '2026-11-15', null))
    const state = await getProgramState()
    expect(state.readaptation).toMatchObject({ decision: 'accepted', manual: true, sessions: 4 })
    const s = await startSessionFromDay(r.id, 'd1', '2026-11-16')
    expect(s.familiarization?.reason).toBe('readaptation')
    expect(s.exercises[0].prescription?.sets).toBe(2)
    expect(b.draft.days[0].exercises[0].prescription.sets).toBe(3)
    // La experiencia declarada no cambia por la vuelta.
    expect(experienceOf((await db().profile.get('me'))!)).toBe('intermediate')
  })
  it('un hueco sin registros se pregunta; «entrené fuera» no se trata como pausa confirmada; terminar o prolongar es explícito', () => {
    const routine = { id: 'r1', name: 'x', kind: 'template' as const, status: 'active' as const, currentVersionId: 'v1', createdAt: 0, updatedAt: 0, startedOn: '2026-09-01' }
    const version = { id: 'v1', routineId: 'r1', version: 1, createdAt: 0, engineVersion: '2.3.0', days: [], schedule: [], rampWeeks: 0, rationale: [], warnings: [], changeNote: '', familiarization: null }
    const sessions = ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-08', '2026-09-10'].map((d) => ses(d, [sx('prensa', [st(), st()])]))
    const p = prof({ experience: 'intermediate', level: 'intermediate' })
    const v = (state = {}) => computeProgram({ profile: p, routine, version, sessions, state, today: '2026-10-20' })
    expect(v().readaptation.offer).toBe(true)
    const outside = { readaptation: { lastValidBefore: '2026-09-10', decision: 'trained_outside' as const, on: '2026-10-20', sessions: 4 } }
    expect(v(outside).readaptation.offer).toBe(false)
    expect(v(outside).readaptation.trainedOutside).toBe(true)
    expect(validDates(sessions)).toHaveLength(5) // no se inventan sesiones
    const acc = { readaptation: { lastValidBefore: '2026-09-10', decision: 'accepted' as const, on: '2026-10-20', sessions: 4 } }
    const after = [...sessions, ...['2026-10-21', '2026-10-23', '2026-10-25', '2026-10-27'].map((d) => ses(d, [sx('prensa', [st(), st()])]))]
    const ended = computeProgram({ profile: p, routine, version, sessions: after, state: acc, today: '2026-10-28' })
    expect(ended.readaptation.active).toBeNull()
    expect(ended.readaptation.ended).toEqual({ total: 4 })
    expect(endReadaptation(acc, 'extend').readaptation?.sessions).toBe(6)
    expect(endReadaptation(acc, 'continue').readaptation?.endReviewed).toBe(true)
  })
})

describe('D05–D06 · esquema anatómico separado del cómputo', () => {
  it('las 99 fichas tienen mapa con regiones válidas y al menos un principal; los propios sin grupos dicen «sin mapa»', () => {
    expect(EXERCISES).toHaveLength(99)
    for (const ex of EXERCISES) {
      const m = anatomyOf(ex)
      expect(regionsByRole(m, 'primary').length, ex.id).toBeGreaterThan(0)
      for (const r of Object.keys(m.roles)) expect(ANAT_REGIONS, `${ex.id}:${r}`).toContain(r)
    }
    const own = { ...EXERCISES[0], id: 'propio_x', custom: true, primary: [], secondary: [] }
    expect(anatomyOf(own).source).toBe('sin-mapa')
    expect(anatomyOf({ ...own, primary: ['back'] }).roles).toEqual({ lats: 'primary', upper_back: 'primary' })
  })
  it('cada variante muestra su papel; los roles no cambian los factores 1/0,5 de los mapas históricos', () => {
    const roles = (id: string) => anatomyOf(getExercise(id)!).roles
    expect(roles('press_banca_barra')).toMatchObject({ chest: 'primary', triceps: 'secondary', delt_front: 'secondary' })
    expect(roles('press_hombro_mancuernas')).toMatchObject({ delt_front: 'primary', delt_side: 'secondary' })
    expect(roles('peso_muerto_convencional')).toMatchObject({ glutes: 'primary', lower_back: 'stabilizer' })
    expect(roles('peso_muerto_rumano')).toMatchObject({ hamstrings: 'primary', glutes: 'primary' })
    expect(roles('curl_femoral_sentado')).toMatchObject({ hamstrings: 'primary' })
    expect(roles('hip_thrust_barra')).toMatchObject({ glutes: 'primary' })
    expect(contributionOf('peso_muerto_convencional', 'v2').items.map((c) => c.weight)).toEqual([1, 0.5, 0.5])
    expect(contributionOf('press_hombro_mancuernas', 'v1').items.some((c) => c.region === 'delt_side')).toBe(false)
  })
})

describe('D07–D08 · realizado por semana local', () => {
  it('parciales aportan lo hecho; sin calentamientos, ejemplos ni doble conteo; bloques aparte; unilateral por lado; domingo dentro y lunes siguiente fuera', () => {
    const monday = '2026-11-09'
    const partial = ses('2026-11-10', [sx('prensa', [st(), st(), st({ completed: false }), st({ kind: 'warmup' })])], { status: 'partial' })
    const lunge = ses('2026-11-15', [sx('zancadas_mancuernas', [st(), st(), st()])])
    const demo = ses('2026-11-12', [sx('prensa', [st(), st()])], { isDemo: true })
    const nextWeek = ses('2026-11-16', [sx('prensa', [st(), st()])])
    const block = ses('2026-11-11', [sx('extension_cuadriceps', [st(), { ...st({ weightKg: null, reps: null }), method: 'drop', block: { plannedSegments: 2, segments: [{ id: 'a', weightKg: 40, reps: 10, rir: 1, pauseSec: null, completedAt: 1 }], nextStartedAt: null, ended: 'complete', target: { firstRepMin: 8, firstRepMax: 12, nextRepMin: 6, nextRepMax: 12, rirMin: 0, rirMax: 2 }, origin: 'extend' } }])])
    const out = doneByRegion([partial, lunge, demo, nextWeek, block], monday)
    const q = out.find((r) => r.region === 'quads')!
    expect(q.direct).toBe(2 + 3 + 1) // parcial 2, zancada 3 por lado (no 6), extensión 1 convencional
    expect(q.blocks).toBe(1)
    expect(q.days).toBe(3)
    expect(out.find((r) => r.region === 'glutes')!.direct).toBe(5)
  })
})

describe('D13 · «Hacer después»', () => {
  it('conserva lo terminado y el orden planificado; una superserie se mueve como grupo', () => {
    const a = sx('prensa', [st(), st({ completed: false })])
    const b = sx('curl_mancuernas', [st({ completed: false })], { superset: 'ss1' })
    const c = sx('extension_triceps_cuerda', [st({ completed: false })], { superset: 'ss1' })
    const d = sx('crunch_polea', [st({ completed: false })])
    const moved = doLater([a, b, c, d], b.uid)
    expect(moved.map((e) => e.exerciseId)).toEqual(['prensa', 'crunch_polea', 'curl_mancuernas', 'extension_triceps_cuerda'])
    expect(moved.map((e) => e.plannedIndex)).toEqual([0, 3, 1, 2])
    expect(moved[2].movedLater).toBe(true)
    const done = sx('prensa', [st()])
    expect(doLater([done, d], done.uid)).toEqual([done, d])
    expect(moved[0].sets[0].completed).toBe(true)
  })
})

describe('D15 · contexto de material', () => {
  it('Polea A y Polea B no se comparan automáticamente; sin contexto mantiene la clave antigua', () => {
    const e = sx('remo_polea_baja', [st()])
    expect(contextKey(e, [e])).toBe('convencional|individual')
    expect(contextKey({ ...e, equipmentContext: 'Polea A' }, [e])).not.toBe(contextKey({ ...e, equipmentContext: 'Polea B' }, [e]))
    const hist = historyFor('remo_polea_baja', [ses('2026-11-10', [{ ...e, equipmentContext: 'Polea A' }])])
    const sug = suggestNext({ exerciseId: 'remo_polea_baja', prescription: e.prescription!, history: hist, increments: DEFAULT_INCREMENTS, today: '2026-11-12', progressionAllowed: true, context: contextKey({ ...e, equipmentContext: 'Polea B' }, [e]) })
    expect(sug.kind).toBe('context_changed')
    expect(sug.detail).toMatch(/Polea A/)
  })
})

describe('D16 · objetivos por serie', () => {
  const principal: SetGroup = { id: 'g-main', label: 'principal', count: 1, repMin: 4, repMax: 6, rirMin: 2, rirMax: 3, restSec: 180 }
  const compl: SetGroup = { id: 'g-comp', label: 'complementaria', count: 2, repMin: 6, repMax: 8, rirMin: 2, rirMax: 3, restSec: 150 }
  const rx = withGroups({ sets: 3, repMin: 4, repMax: 6, rirMin: 2, rirMax: 3, restSec: 180, warmupSets: 2, unit: 'reps' }, [principal, compl])
  const exo = (date: string, mainReps: number, comp: number[]) => ses(date, [{ ...sx('press_banca_barra', []), loadTypeSnapshot: 'barbell_total', prescription: rx, sets: [st({ weightKg: 80, reps: mainReps, groupId: 'g-main' }), ...comp.map((r) => st({ weightKg: 70, reps: r, groupId: 'g-comp' }))] }])
  it('cada grupo usa su referencia: la principal sube y las complementarias no (no todas en el máximo)', () => {
    expect(rx.sets).toBe(3)
    expect(groupForIndex(rx, 0)?.id).toBe('g-main')
    expect(groupForIndex(rx, 2)?.id).toBe('g-comp')
    const h = historyFor('press_banca_barra', [exo('2026-11-10', 6, [8, 6])])
    const sMain = suggestNext({ exerciseId: 'press_banca_barra', prescription: groupPrescription(rx, principal), history: historyForGroup(h, principal), increments: DEFAULT_INCREMENTS, today: '2026-11-13', progressionAllowed: true })
    const sComp = suggestNext({ exerciseId: 'press_banca_barra', prescription: groupPrescription(rx, compl), history: historyForGroup(h, compl), increments: DEFAULT_INCREMENTS, today: '2026-11-13', progressionAllowed: true })
    expect(sMain.kind).toBe('increase')
    expect(sMain.targetWeightKg).toBe(82.5)
    expect(sComp.kind).not.toBe('increase')
    expect(sComp.targetWeightKg).toBe(70)
  })
  it('reordenar los grupos no cambia su identidad; omitidas no satisfacen el objetivo', () => {
    const swapped = withGroups(rx, [compl, principal])
    const h = historyFor('press_banca_barra', [exo('2026-11-10', 6, [8, 8])].map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, prescription: swapped })) })))
    expect(historyForGroup(h, principal)[0].ex.sets.map((x) => x.reps)).toEqual([6])
    const omitted = historyFor('press_banca_barra', [ses('2026-11-10', [{ ...exo('2026-11-10', 6, [8, 8]).exercises[0], sets: [st({ weightKg: 80, reps: 6, groupId: 'g-main' }), st({ weightKg: 70, reps: 8, groupId: 'g-comp' }), st({ weightKg: 70, reps: null, completed: false, groupId: 'g-comp' })] }])])
    const s = suggestNext({ exerciseId: 'press_banca_barra', prescription: groupPrescription(rx, compl), history: historyForGroup(omitted, compl), increments: DEFAULT_INCREMENTS, today: '2026-11-13', progressionAllowed: true })
    expect(s.kind).not.toBe('increase')
  })
})

describe('D19 · copia formato 4', () => {
  it('ida y vuelta con los campos nuevos; las copias anteriores se restauran; una app anterior rechazaría la 4', async () => {
    await db().profile.put(prof({ experience: 'advanced', continuity: 'returning', level: 'intermediate' }))
    await db().meta.put({ key: 'favoriteExercises', value: ['prensa'] })
    await db().exerciseSettings.put({ exerciseId: 'remo_polea_baja', contexts: ['Polea A'], note: 'asiento 3' })
    const s = ses('2026-11-10', [{ ...sx('press_banca_barra', [st({ groupId: 'g1' })]), equipmentContext: 'Rack 2', plannedIndex: 0, prescription: withGroups({ sets: 1, repMin: 4, repMax: 6, rirMin: 2, rirMax: 3, restSec: 180, warmupSets: 0 }, [{ id: 'g1', label: 'principal', count: 1, repMin: 4, repMax: 6, rirMin: 2, rirMax: 3, restSec: 180 }]) }])
    await db().sessions.put(s)
    const file = await exportBackup()
    expect(file.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(BACKUP_FORMAT_VERSION).toBe(4)
    const text = JSON.stringify(file)
    useDatabase(`e4-restore-${Date.now()}`)
    await restoreBackup(parseBackupText(text), 'replace')
    expect(await db().profile.get('me')).toMatchObject({ experience: 'advanced', continuity: 'returning' })
    expect((await db().meta.get('favoriteExercises'))?.value).toEqual(['prensa'])
    expect((await db().exerciseSettings.get('remo_polea_baja'))?.contexts).toEqual(['Polea A'])
    const back = (await db().sessions.get(s.id))!
    expect(back.exercises[0].equipmentContext).toBe('Rack 2')
    expect(back.exercises[0].sets[0].groupId).toBe('g1')
    const csv = sessionsToCsv([back]).split('\r\n')
    expect(csv[0]).toMatch(/;grupo_prescripcion;objetivo_serie;contexto_material$/)
    expect(csv[1]).toMatch(/;principal;4–6 · RIR 2–3 · 180 s;Rack 2$/)
    // Una copia de formato 3 (1.4) se sigue restaurando.
    expect(() => parseBackupText(text.replace(`"formatVersion":${BACKUP_FORMAT_VERSION}`, '"formatVersion":3'))).not.toThrow()
    expect(() => parseBackupText(text.replace(`"formatVersion":${BACKUP_FORMAT_VERSION}`, `"formatVersion":${BACKUP_FORMAT_VERSION + 1}`))).toThrow(/versión más nueva/)
  })
  it('D02 · al restaurar una copia de la 1.4 (perfil sin experiencia) el perfil se migra como en la actualización', async () => {
    const file = await exportBackup()
    const old = JSON.parse(JSON.stringify(file))
    old.formatVersion = 3
    old.tables.profile = [{ ...prof({ level: 'returning' }), experience: undefined, continuity: undefined }].map((p) => { const q = { ...p } as Record<string, unknown>; delete q.experience; delete q.continuity; return q })
    useDatabase(`e4-restore14-${Date.now()}`)
    await restoreBackup(parseBackupText(JSON.stringify(old)), 'replace')
    expect(await db().profile.get('me')).toMatchObject({ experience: 'unconfirmed', continuity: 'returning', level: 'returning' })
  })
})
