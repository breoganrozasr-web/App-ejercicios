import { beforeEach, describe, expect, it } from 'vitest'
import { BACKUP_FORMAT_VERSION, exportBackup, parseBackupText, restoreBackup, sessionsToCsv } from '../../src/data/backup'
import { db, useDatabase } from '../../src/data/db'
import { createRoutine, familiarizationStatus, saveSession, startSessionFromDay, finishSession } from '../../src/data/repo'
import { getExercise } from '../../src/domain/catalog'
import { describeChanges, diffCorrection, lastOpenCorrection, undoLastCorrection } from '../../src/domain/corrections'
import { dayDuration, recoveryOverlaps, weeklyRegionVolume } from '../../src/domain/engine/analysis'
import { contributionOf, muscleMapFor } from '../../src/domain/engine/contribution'
import { ENGINE_VERSION } from '../../src/domain/engine/params'
import { generateRoutine } from '../../src/domain/engine/generator'
import { applyFamiliarization } from '../../src/domain/engine/prescription'
import { historyFor, suggestNext } from '../../src/domain/engine/progression'
import { RECIPES, RECIPE_BY_CODE, RECIPE_BY_ID, RETIRED_TEMPLATES, basicsPractice, buildFromRecipe, buildFingerprint, rankRecipes, recipeMatches, timeAlternatives } from '../../src/domain/engine/recipes'
import { alternativesFor } from '../../src/domain/engine/substitution'
import { TEMPLATES } from '../../src/domain/engine/templates'
import { whySets } from '../../src/domain/explain'
import { DEFAULT_INCREMENTS, defaultProfile } from '../../src/domain/profile'
import { validDates } from '../../src/domain/sessions'
import type { Profile, Session, SessionExercise, SetEntry } from '../../src/domain/types'
import { formatNumber } from '../../src/domain/util'

let n = 0
beforeEach(() => {
  useDatabase(`p3-${Date.now()}-${n++}`)
})

function prof(p: Partial<Profile> = {}): Profile {
  return { ...defaultProfile(0), ...p }
}
const R = (code: string) => RECIPE_BY_CODE[code]
const GROUP: Record<string, string> = { pecho: 'chest', espalda: 'back', 'cuádriceps': 'quads', isquios: 'hamstrings', 'glúteos': 'glutes' }

function st(p: Partial<SetEntry> = {}): SetEntry {
  return { id: `x${Math.random().toString(36).slice(2)}`, kind: 'work', weightKg: 40, reps: 10, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: 1, ...p }
}

describe('C01 · catálogo de 26 recetas completas y búsqueda', () => {
  it('26 recetas con ids y códigos únicos, ejercicios existentes y sesiones no vacías', () => {
    expect(RECIPES).toHaveLength(26)
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(26)
    expect(new Set(RECIPES.map((r) => r.code)).size).toBe(26)
    expect(new Set(RECIPES.map((r) => r.name)).size).toBe(26)
    for (const r of RECIPES) {
      expect(r.sessions.length).toBeGreaterThan(0)
      for (const s of r.sessions) for (const it of s.items) expect(getExercise(it[0]), `${r.code} ${it[0]}`).toBeTruthy()
      expect(r.sessions.map((s) => s.items.reduce((a, i) => a + i[1], 0))).toEqual(r.perSession)
    }
    // Las retiradas no se cuentan como novedades ni duplican la cifra de 26.
    for (const id of Object.keys(RETIRED_TEMPLATES)) expect(RECIPE_BY_ID[id]).toBeUndefined()
  })
  it('busca por PPL, powerbuilding, anterior/posterior, SBD y alias', () => {
    const find = (q: string) => RECIPES.filter((r) => recipeMatches(r, q)).map((r) => r.code)
    expect(find('PPL')).toEqual(['A09', 'A10', 'A11'])
    expect(find('push pull legs')).toEqual(['A09', 'A10', 'A11'])
    expect(find('powerbuilding')).toEqual(['A14', 'A15', 'A16'])
    expect(find('SBD')).toEqual(['A14', 'A15', 'A16', 'A17', 'A18'])
    expect(find('anterior posterior')).toEqual(expect.arrayContaining(['A12', 'A13']))
    expect(find('upper lower')).toEqual(expect.arrayContaining(['A06', 'A07', 'A08', 'A13', 'A15', 'A19', 'A22']))
    expect(find('parque')).toEqual(['A25', 'A26'])
    expect(find('cuerpo completo')).toEqual(expect.arrayContaining(['A01', 'A02', 'A03', 'A04', 'A05']))
  })
})

describe('Controles editoriales del anexo A frente al cálculo real', () => {
  it('series directas y días por grupo coinciden con el control de cada receta (el control no sustituye al cálculo)', () => {
    for (const r of RECIPES) {
      const b = buildFromRecipe(r, prof({ level: 'intermediate', days: [0, 1, 2, 3, 4, 5, 6] }))
      for (const [g, [sets, days]] of Object.entries(r.controls)) {
        const v = b.volume.find((x) => x.region === GROUP[g])!
        expect([r.code, g, v.direct, v.directDays]).toEqual([r.code, g, sets, days])
      }
    }
  })
})

describe('C02 · la dosis estándar no se aplana por el perfil', () => {
  it('un principiante conserva 3 series donde el anexo dice 3; hoy se reduce solo por adaptación', () => {
    const b = buildFromRecipe(R('A02'), prof({ level: 'beginner' }))
    const squat = b.draft.days[0].exercises.find((e) => e.exerciseId === 'sentadilla_barra')!
    expect(squat.prescription.sets).toBe(3)
    expect([squat.prescription.repMin, squat.prescription.repMax]).toEqual([6, 10])
    expect(b.draft.days[0].exercises.find((e) => e.exerciseId === 'elevaciones_laterales')!.prescription.sets).toBe(2)
    expect(b.draft.familiarization).toEqual({ sessions: 4, reason: 'beginner' })
    const today = applyFamiliarization(squat.prescription, getExercise('sentadilla_barra'))
    expect(today.sets).toBe(2)
    expect([today.repMin, today.repMax, today.rirMin, today.rirMax]).toEqual([8, 12, 3, 4])
    const w = whySets(squat, 'd1', b.draft, { adaptationToday: today.sets })
    expect(w.text).toMatch(/dosis base de la plantilla A02/)
    expect(w.text).toMatch(/Hoy es adaptación: 2 en lugar de 3/)
  })
  it('las referencias 4–6/6–8 aprenden con 6–8; las planchas conservan segundos y no tienen RIR', () => {
    const b = buildFromRecipe(R('A15'), prof({ level: 'returning' }))
    const bench = b.draft.days[0].exercises[0]
    expect(bench.prescription.reference).toBe(true)
    expect([bench.prescription.repMin, bench.prescription.repMax, bench.prescription.restSec]).toEqual([4, 6, 180])
    const t = applyFamiliarization(bench.prescription, getExercise(bench.exerciseId))
    expect([t.sets, t.repMin, t.repMax]).toEqual([2, 6, 8])
    const plank = buildFromRecipe(R('A06'), prof()).draft.days[3].exercises.find((e) => e.exerciseId === 'plancha_lateral')!
    expect(plank.prescription).toMatchObject({ unit: 'time', timeMinSec: 15, timeMaxSec: 30, rirMin: 0, rirMax: 0 })
  })
})

describe('C03 · días válidos, sesiones del mismo día, pausa y cambio de plantilla', () => {
  it('varias sesiones el mismo día cuentan uno; cambiar de rutina no reinicia ni acelera', () => {
    const mk = (date: string, routineId: string): Session => ({
      id: `s${Math.random()}`, status: 'completed', routineId, routineVersionId: 'v', dayId: 'd1', title: 'x', date, startedAt: new Date(`${date}T18:00:00`).getTime(), endedAt: 1, pausedAt: null, pausedTotalMs: 0,
      exercises: [{ uid: 'u', exerciseId: 'prensa', nameSnapshot: 'Prensa', loadTypeSnapshot: 'machine', unilateralSnapshot: false, prescription: null, sets: [st(), st()], notes: '', painFlag: false }], notes: '', rampApplied: false, engineVersion: '2.2.0', updatedAt: 1, rest: null,
    })
    const v = { familiarization: { sessions: 4, reason: 'beginner' as const } }
    const s = [mk('2026-11-02', 'a'), mk('2026-11-02', 'a'), mk('2026-11-02', 'b'), mk('2026-11-04', 'b')]
    expect(validDates(s)).toHaveLength(2)
    expect(familiarizationStatus(v, s, 'b')?.completed).toBe(2)
    expect(familiarizationStatus(v, s, 'nueva')?.completed).toBe(2)
    // Una pausa larga no consume días ni los inventa.
    expect(familiarizationStatus(v, [...s, mk('2027-01-30', 'b')], 'b')?.completed).toBe(3)
  })
})

describe('C04 · frecuencia real de PPL', () => {
  it('PPL 3 da frecuencia 1; PPL 6 y PPL+torso/pierna 5 la calculan; pedir frecuencia 2 no oculta PPL 3', () => {
    const big = ['chest', 'back', 'quads', 'hamstrings']
    const days = (code: string) => buildFromRecipe(R(code), prof({ level: 'intermediate' })).volume.filter((v) => big.includes(v.region)).map((v) => v.directDays)
    expect(days('A09')).toEqual([1, 1, 1, 1])
    expect(days('A10')).toEqual([2, 2, 2, 2])
    expect(days('A11')).toEqual([2, 2, 2, 2])
    const fits = rankRecipes(prof({ level: 'intermediate', frequency: 2, days: [0, 2, 4] }))
    const ppl3 = fits.find((f) => f.recipe.code === 'A09')!
    expect(ppl3).toBeTruthy()
    expect(ppl3.conflicts.find((c) => c.kind === 'frequency')?.text).toMatch(/No encaja con frecuencia 2: pecho 1 día/)
    expect(ppl3.conflicts.find((c) => c.kind === 'frequency')?.hard).toBe(false)
  })
})

describe('C05–C07 · fuerza + hipertrofia', () => {
  it('C05 · A15: pecho 10, espalda 10, cuádriceps 10, isquios 7; el convencional suma 1 secundaria a cuádriceps y a isquios', () => {
    const b = buildFromRecipe(R('A15'), prof({ level: 'intermediate' }))
    const v = (r: string) => b.volume.find((x) => x.region === r)!
    expect([v('chest').direct, v('back').direct, v('quads').direct, v('hamstrings').direct]).toEqual([10, 10, 10, 7])
    expect(v('quads').secondary * 0.5).toBe(1)
    expect(v('hamstrings').secondary * 0.5).toBe(1)
    // Calentamientos y bloques no se suman como series ordinarias.
    expect(b.draft.days[0].exercises[0].prescription.warmupSets).toBeGreaterThan(0)
    expect(v('chest').blocks).toBe(0)
  })
  it('C06 · A15: banca dos días, sentadilla uno y convencional uno; el rumano no cuenta como convencional', () => {
    expect(basicsPractice(R('A15')).map((x) => [x.id, x.days])).toEqual([['sentadilla_barra', 1], ['press_banca_barra', 2], ['peso_muerto_convencional', 1]])
    expect(contributionOf('peso_muerto_convencional').items.map((c) => [c.region, c.weight])).toEqual([['glutes', 1], ['quads', 0.5], ['hamstrings', 0.5]])
  })
  it('C07 · A16 redistribuye brazos y hombros: no es A15 completa más un día', () => {
    const a15 = buildFromRecipe(R('A15'), prof({ level: 'intermediate' }))
    const a16 = buildFromRecipe(R('A16'), prof({ level: 'intermediate' }))
    const total = (b: typeof a15) => b.draft.days.reduce((a, d) => a + d.exercises.reduce((x, e) => x + e.prescription.sets, 0), 0)
    expect(total(a16)).toBeLessThan(total(a15) + R('A16').perSession[4])
    // Lunes de A16 sin laterales ni brazos; el sábado los concentra.
    expect(a16.draft.days[0].exercises.map((e) => e.exerciseId)).not.toContain('curl_mancuernas')
    expect(a16.draft.days[4].exercises.map((e) => e.exerciseId)).toEqual(['elevaciones_laterales', 'curl_mancuernas', 'extension_triceps_cuerda', 'pajaros_tumbado'])
  })
})

describe('C08–C09 · tiempo', () => {
  it('C08 · un unilateral cuenta los dos lados en el tiempo, pero sus series no se duplican por músculo; aprendizaje ≠ base', () => {
    const b = buildFromRecipe(R('A06'), prof({ level: 'beginner' }))
    const legB = b.draft.days[3]
    const lunge = legB.exercises.find((e) => e.exerciseId === 'zancadas_mancuernas')!
    const one = dayDuration({ ...legB, exercises: [lunge] })
    const asBilateral = dayDuration({ ...legB, exercises: [{ ...lunge, exerciseId: 'sentadilla_mancuernas' }] })
    expect(one.breakdown.workMin).toBeGreaterThan(asBilateral.breakdown.workMin * 1.9)
    const src = b.volume.find((v) => v.region === 'quads')!.sources.find((s) => s.exerciseId === 'zancadas_mancuernas')!
    expect(src.sets).toBe(2)
    expect(b.minutes[3].learning!.minutes).toBeLessThan(b.minutes[3].base.minutes)
  })
  it('C09 · 30 min frente a una receta larga: conflicto y alternativas, sin quitar series', () => {
    const p = prof({ minutesPerSession: 30 })
    const fits = rankRecipes(p)
    const a02 = fits.find((f) => f.recipe.code === 'A02')!
    expect(a02.conflicts.some((c) => c.kind === 'time')).toBe(true)
    expect(a02.build.draft.days[0].exercises.map((e) => e.prescription.sets)).toEqual([3, 3, 3, 3, 2, 2])
    const alts = timeAlternatives(a02, fits, p)
    expect(alts.map((a) => a.label).join(' | ')).toMatch(/Variante breve: Cuerpo completo breve · 3 días/)
    expect(alts[0].label).toMatch(/más minutos/)
  })
})

describe('C10 · material', () => {
  it('sin banco ni anclaje no se proponen recetas que los requieren; casa sin material no anuncia espalda ni isquios cubiertos', () => {
    const home = prof({ locations: ['home'], equipment: ['dumbbell', 'bands', 'pullup_bar'] })
    const fits = rankRecipes(home)
    for (const code of ['A20', 'A21', 'A22', 'A23']) {
      const f = fits.find((x) => x.recipe.code === code)!
      expect(f.fits).toBe(false)
      expect(f.conflicts.find((c) => c.kind === 'material')?.text).toMatch(/banco|anclaje/)
    }
    const none = buildFromRecipe(R('A24'), prof({ locations: ['home'], equipment: ['chair'] }))
    expect(none.volume.find((v) => v.region === 'back')!.direct).toBe(0)
    expect(none.volume.find((v) => v.region === 'hamstrings')!.direct).toBe(0)
    expect(none.draft.warnings.join(' ')).toMatch(/Sin tirón cargado para la espalda ni trabajo específico de isquios/)
  })
})

describe('C11 · días seguidos con músculos reales', () => {
  it('anterior/posterior en L M J V comparte glúteos en días seguidos; en L X V D sigue el domingo → lunes', () => {
    const b = buildFromRecipe(R('A12'), prof({ level: 'intermediate' }))
    const o1 = recoveryOverlaps(b.draft, ['glutes', 'quads', 'hamstrings'])
    expect(o1.some((o) => o.a === 0 && o.b === 1 && o.regions.includes('glutes'))).toBe(true)
    const spaced = { ...b.draft, schedule: b.draft.days.map((d, i) => ({ weekday: [0, 2, 4, 6][i], dayId: d.id })) }
    const o2 = recoveryOverlaps(spaced, ['glutes', 'quads', 'hamstrings'])
    expect(o2.map((o) => [o.a, o.b])).toEqual([[6, 0]])
  })
})

describe('C12 · contexto de prescripción', () => {
  const ex = (rx: [number, number], w: number, reps: number[]): SessionExercise => ({ uid: `u${Math.random()}`, exerciseId: 'press_banca_barra', nameSnapshot: 'Press', loadTypeSnapshot: 'barbell_total', unilateralSnapshot: false, prescription: { sets: 3, repMin: rx[0], repMax: rx[1], rirMin: 2, rirMax: 3, restSec: 180, warmupSets: 0, unit: 'reps' }, sets: reps.map((r) => st({ weightKg: w, reps: r, rir: 2 })), notes: '', painFlag: false })
  const sess = (date: string, e: SessionExercise): Session => ({ id: `s${date}`, status: 'completed', routineId: 'r', routineVersionId: 'v', dayId: 'd', title: 't', date, startedAt: new Date(`${date}T18:00:00`).getTime(), endedAt: 1, pausedAt: null, pausedTotalMs: 0, exercises: [e], notes: '', rampApplied: false, engineVersion: '2.2.0', updatedAt: 1, rest: null })
  it('banca 4–6 y banca 8–10 en la misma semana mantienen sugerencias separadas; un ejercicio nuevo no hereda kg', () => {
    const sessions = [sess('2026-11-02', ex([4, 6], 80, [6, 6, 6])), sess('2026-11-05', ex([8, 10], 60, [9, 8, 8]))]
    const h = historyFor('press_banca_barra', sessions)
    const heavy = suggestNext({ exerciseId: 'press_banca_barra', prescription: ex([4, 6], 0, []).prescription!, history: h, increments: DEFAULT_INCREMENTS, today: '2026-11-09', progressionAllowed: true })
    expect(heavy.kind).toBe('increase')
    expect(heavy.targetWeightKg).toBe(82.5)
    const vol = suggestNext({ exerciseId: 'press_banca_barra', prescription: ex([8, 10], 0, []).prescription!, history: h, increments: DEFAULT_INCREMENTS, today: '2026-11-12', progressionAllowed: true })
    expect(vol.kind).not.toBe('scheme_changed')
    expect(vol.targetWeightKg).toBe(60)
    const fresh = suggestNext({ exerciseId: 'peso_muerto_convencional', prescription: ex([4, 6], 0, []).prescription!, history: historyFor('peso_muerto_convencional', sessions), increments: DEFAULT_INCREMENTS, today: '2026-11-12', progressionAllowed: true })
    expect(fresh.targetWeightKg).toBeUndefined()
  })
})

describe('C13 · determinismo', () => {
  it('mismo perfil y versiones → misma propuesta; la preferencia de reparto cambia el orden de forma explicable', () => {
    const p = prof({ level: 'intermediate', days: [0, 1, 3, 4] })
    const a = rankRecipes(p).map((f) => [f.recipe.code, buildFingerprint(f.build)])
    const b = rankRecipes(p).map((f) => [f.recipe.code, buildFingerprint(f.build)])
    expect(a).toEqual(b)
    expect(rankRecipes(p)[0].recipe.code).toBe('A06')
    const ppl = rankRecipes({ ...p, splitPref: 'ppl' })
    expect(ppl[0].recipe.splits).toContain('ppl')
    expect(ppl[0].reasons.join(' ')).toMatch(/Reparto preferido/)
    const mixed = rankRecipes({ ...p, goal: 'mixed' })
    expect(mixed[0].recipe.code).toBe('A15')
  })
})

describe('C14–C15 · aceptar, cancelar y conservar', () => {
  it('construir y comparar no guarda nada; las rutinas de plantillas retiradas siguen resolviéndose', async () => {
    const before = await db().routines.count()
    rankRecipes(prof())
    buildFromRecipe(R('A15'), prof())
    expect(await db().routines.count()).toBe(before)
    const legacy = TEMPLATES.find((t) => t.id === 'strength3_gym')!
    expect(legacy).toBeTruthy()
    expect(RETIRED_TEMPLATES.strength3_gym.why).toMatch(/No se ha convertido en la SBD/)
  })
  it('el mapa muscular de cada rutina se conserva: v1 para motores anteriores, v2 para las nuevas', () => {
    expect(muscleMapFor({ engineVersion: '1.0.0' })).toBe('v1')
    expect(muscleMapFor({ engineVersion: '2.1.0' })).toBe('v1')
    expect(muscleMapFor({ engineVersion: '2.2.0' })).toBe('v2')
    const old = { days: [{ id: 'd1', name: 'A', focus: 'custom' as const, exercises: [{ uid: 'a', exerciseId: 'press_hombro_mancuernas', prescription: { sets: 3, repMin: 8, repMax: 12, rirMin: 2, rirMax: 3, restSec: 120, warmupSets: 0 } }] }], schedule: [{ weekday: 0, dayId: 'd1' }] }
    expect(weeklyRegionVolume({ ...old, engineVersion: '2.1.0' }).find((v) => v.region === 'delt_side')!.secondary).toBe(0)
    expect(weeklyRegionVolume({ ...old, engineVersion: '2.2.0' }).find((v) => v.region === 'delt_side')!.secondary).toBe(3)
  })
})

describe('C16–C17 · correcciones de sesiones guardadas', () => {
  it('corrige dos tramos 40×10 → 30×8 sin fusionarlos; CSV coherente; deshacer restaura; no duplica días válidos', async () => {
    const r = generateRoutine(prof({ level: 'intermediate' }))
    if (r.status !== 'ok') throw new Error()
    const routine = await createRoutine({ ...r.draft, kind: 'generated' })
    const s0 = await startSessionFromDay(routine.id, r.draft.days[0].id, '2026-11-10')
    const exu = s0.exercises[s0.exercises.length - 1]
    const block: SetEntry = { ...st({ weightKg: null, reps: null }), method: 'drop', block: { plannedSegments: 2, segments: [{ id: 'g1', weightKg: 40, reps: 10, rir: 1, pauseSec: null, completedAt: 1 }, { id: 'g2', weightKg: 30, reps: 8, rir: 0, pauseSec: 12, completedAt: 2 }], nextStartedAt: null, ended: 'complete', target: { firstRepMin: 8, firstRepMax: 12, nextRepMin: 6, nextRepMax: 12, rirMin: 0, rirMax: 2 }, origin: 'extend' } }
    const done = await finishSession({ ...s0, exercises: s0.exercises.map((e) => ({ ...e, sets: [...e.sets.map((x) => ({ ...x, completed: true, weightKg: 20, reps: 10 })), ...(e.uid === exu.uid ? [block] : [])] })) }, 'completed')
    const edited = structuredClone(done)
    const b = edited.exercises.find((e) => e.uid === exu.uid)!.sets.find((x) => x.method === 'drop')!
    b.block!.segments[1].reps = 9
    edited.exercises[0].sets.find((x) => x.kind === 'work')!.rir = 2
    const changes = diffCorrection(done, edited)
    expect(changes.map((c) => c.field).sort()).toEqual(['reps', 'rir'])
    expect(describeChanges(done, changes, formatNumber).join(' | ')).toMatch(/bloque \d+, tramo 2: 8 → 9 rep/)
    const corrected: Session = { ...edited, corrections: [{ id: 'c1', at: 5, changes }] }
    await saveSession(corrected)
    const seg = corrected.exercises.find((e) => e.uid === exu.uid)!.sets.find((x) => x.method === 'drop')!.block!.segments
    expect(seg.map((g) => [g.weightKg, g.reps])).toEqual([[40, 10], [30, 9]])
    const csv = sessionsToCsv([corrected]).split('\r\n').filter((l) => l.includes(';descendente;'))
    expect(csv).toHaveLength(2)
    expect(csv[1]).toMatch(/;30;9;0;.*;descendente;[^;]+;1;12;completo;;[^;]*;sí;;;;$/)
    const undone = undoLastCorrection(corrected, 9)!
    expect(undone.exercises.find((e) => e.uid === exu.uid)!.sets.find((x) => x.method === 'drop')!.block!.segments.map((g) => g.reps)).toEqual([10, 8])
    expect(lastOpenCorrection(undone)).toBeNull()
    expect(undone.corrections![0].undoneAt).toBe(9)
    // Corregir valores no cambia la fecha ni duplica el día válido.
    expect(validDates([done, corrected, undone])).toHaveLength(1)
  })
})

describe('C21 · copia de seguridad con las propiedades nuevas', () => {
  it('formato 3 aditivo; restaura origen de dosis, plantilla, correcciones y tolerancia; un archivo inválido no deja cambios', async () => {
    const b = buildFromRecipe(R('A15'), prof({ level: 'intermediate' }))
    await createRoutine(b.draft)
    const file = await exportBackup()
    expect(file.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    const v = file.tables.routineVersions![0] as { plan: { template: { code: string }; muscleMap: string }; days: { exercises: { origin: { base: { sets: number } } }[] }[] }
    expect(v.plan.template.code).toBe('A15')
    expect(v.plan.muscleMap).toBe('v2')
    expect(v.days[0].exercises[0].origin.base.sets).toBe(3)
    const text = JSON.stringify(file)
    const before = await db().routines.count()
    expect(() => parseBackupText(text.replace(`"formatVersion":${BACKUP_FORMAT_VERSION}`, `"formatVersion":${BACKUP_FORMAT_VERSION + 1}`))).toThrow(/versión más nueva/)
    expect(await db().routines.count()).toBe(before)
    useDatabase(`p3-restore-${Date.now()}`)
    await restoreBackup(parseBackupText(text), 'replace')
    const rv = (await db().routineVersions.toArray())[0]
    expect(rv.plan?.template?.id).toBe('sh4')
    expect(rv.days[0].exercises[0].origin?.base?.templateId).toBe('sh4')
  })
})

describe('C22 · menores y señales de salud', () => {
  it('las recetas adultas no se usan con menores ni con señales de salud sin valorar, aunque se entre desde el catálogo', () => {
    const youth = rankRecipes(prof({ ageBand: '14to17' }))
    expect(youth.every((f) => !f.fits && f.conflicts.some((c) => c.kind === 'blocked'))).toBe(true)
    const pain = prof({ limitations: { ...prof().limitations, painNow: true } })
    expect(buildFromRecipe(R('A02'), pain).blocked).toBeTruthy()
    const g = generateRoutine(prof({ ageBand: '14to17' }))
    expect(g.status === 'ok' && g.draft.youth).toBe(true)
  })
})

describe('Sustituciones con motivo (6.4)', () => {
  it('primero la misma función con tu material; bisagra frente a curl se explica como cambio de función', () => {
    const alts = alternativesFor('curl_femoral_sentado', prof().equipment, 'intermediate')
    expect(alts[0].exercise.pattern).toBe('knee_flex')
    const rdl = alts.find((a) => a.exercise.id === 'peso_muerto_rumano')!
    expect(rdl.reasons.join(' ')).toMatch(/bisagra de cadera en lugar de flexión de rodilla/)
    expect(alts.indexOf(rdl)).toBeGreaterThan(alts.findIndex((a) => a.exercise.id === 'curl_femoral_tumbado'))
  })
  it('una exclusión del perfil se sustituye por la misma función y se explica', () => {
    const b = buildFromRecipe(R('A15'), prof({ level: 'intermediate', excludedExercises: ['curl_femoral_sentado'] }))
    expect(b.substitutions[0]).toMatchObject({ from: 'curl_femoral_sentado', to: 'curl_femoral_tumbado' })
    expect(b.draft.days[1].exercises.find((e) => e.exerciseId === 'curl_femoral_tumbado')?.origin?.adaptations?.[0].kind).toBe('exclusion')
  })
})

describe('Ficha y sesión con los ejercicios nuevos', () => {
  it('el convencional se registra en kg totales y una sesión de A15 lo crea sin heredar del rumano', async () => {
    expect(getExercise('peso_muerto_convencional')!.loadType).toBe('barbell_total')
    expect(getExercise('remo_pecho_apoyado')!.loadType).toBe('dumbbell_each')
    expect(getExercise('remo_banda_anclaje')!.equipment).toContain('band_anchor')
    const b = buildFromRecipe(R('A15'), prof({ level: 'intermediate' }))
    const routine = await createRoutine(b.draft)
    const s = await startSessionFromDay(routine.id, 'd4', '2026-11-13')
    expect(s.exercises[0].exerciseId).toBe('peso_muerto_convencional')
    expect(s.exercises[0].prescription?.sets).toBe(2)
    expect(s.engineVersion).toBe(ENGINE_VERSION)
  })
})
