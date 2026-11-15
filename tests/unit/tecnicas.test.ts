import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, parseBackupText, restoreBackup, sessionsToCsv } from '../../src/data/backup'
import { db, useDatabase } from '../../src/data/db'
import {
  closeOpenBlocks, createRoutine, familiarizationStatus, finishSession, getProgramState, saveRoutineVersion, saveSession, startSessionFromDay, updateProgramState,
} from '../../src/data/repo'
import { weeklyRegionVolume, dayDuration } from '../../src/domain/engine/analysis'
import { generateRoutine } from '../../src/domain/engine/generator'
import { blockAdvice, historyFor, suggestNext } from '../../src/domain/engine/progression'
import {
  PHASE_RULES, addOneSet, computeProgram, decideReview, enterProgression, exerciseFamiliarity, ordinaryExposures, reviewProposal, setTechnique, supersetProposals, techniqueCandidates, techniqueGate,
} from '../../src/domain/program'
import { DEFAULT_INCREMENTS, defaultProfile } from '../../src/domain/profile'
import { computeRecords, sameStructure, sessionTotals, weeklyRegionSets } from '../../src/domain/records'
import { isValidSession, validDates } from '../../src/domain/sessions'
import {
  addExtraSegment, blockModified, blockText, canRegister, dropSuggestion, endBlock, extendSet, makeBlockSet, registerSegment, reorganizePending, revertBlock, startNextSegment, supersetStep, undoSegment,
} from '../../src/domain/techniques'
import type { Profile, ProgramState, Routine, RoutineVersion, Session, SessionExercise, SetEntry } from '../../src/domain/types'
import { addDays, formatNumber } from '../../src/domain/util'

let n = 0
beforeEach(() => {
  useDatabase(`tec-${Date.now()}-${n++}`)
})

function st(p: Partial<SetEntry> = {}): SetEntry {
  return { id: `x${Math.random().toString(36).slice(2)}`, kind: 'work', weightKg: 40, reps: 10, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: 1, ...p }
}
function sx(exerciseId: string, sets: SetEntry[], extra: Partial<SessionExercise> = {}): SessionExercise {
  return { uid: `u-${exerciseId}-${Math.random().toString(36).slice(2, 6)}`, exerciseId, nameSnapshot: exerciseId, loadTypeSnapshot: 'machine', unilateralSnapshot: false, prescription: { sets: 3, repMin: 10, repMax: 15, rirMin: 1, rirMax: 3, restSec: 90, warmupSets: 0 }, sets, notes: '', painFlag: false, ...extra }
}
function ses(date: string, exercises: SessionExercise[], extra: Partial<Session> = {}): Session {
  return {
    id: `s-${date}-${Math.random().toString(36).slice(2)}`, status: 'completed', routineId: 'r1', routineVersionId: 'v1', dayId: 'd1', title: 'Día A', date, startedAt: new Date(`${date}T18:00:00`).getTime(), endedAt: 1, pausedAt: null, pausedTotalMs: 0,
    exercises, notes: '', rampApplied: false, engineVersion: 't', updatedAt: 1, rest: null, ...extra,
  }
}
/** Sesión válida típica: prensa y press de pecho, 3 series hechas cada uno. */
function validSession(date: string, extra: Partial<Session> = {}): Session {
  return ses(date, [sx('prensa', [st(), st(), st()]), sx('press_pecho_maquina', [st(), st(), st()])], extra)
}
function prof(p: Partial<Profile> = {}): Profile {
  return { ...defaultProfile(0), ...p }
}
function routineAndVersion(): { routine: Routine; version: RoutineVersion } {
  const r = generateRoutine(prof())
  if (r.status !== 'ok') throw new Error('sin propuesta')
  const routine: Routine = { id: 'r1', name: r.draft.name, kind: 'generated', status: 'active', currentVersionId: 'v1', createdAt: 0, updatedAt: 0, startedOn: '2026-01-01' }
  const version: RoutineVersion = { id: 'v1', routineId: 'r1', version: 1, createdAt: 0, engineVersion: r.draft.engineVersion, days: r.draft.days, schedule: r.draft.schedule, rampWeeks: 0, rationale: [], warnings: [], changeNote: '', familiarization: r.draft.familiarization, plan: r.draft.plan }
  return { routine, version }
}
const view = (sessions: Session[], today: string, state: ProgramState = {}, p: Profile = prof()) => {
  const { routine, version } = routineAndVersion()
  return computeProgram({ profile: p, routine, version, sessions, state, today })
}

// ───────────────────────── Fases ─────────────────────────

describe('B02 · días válidos y familiarización', () => {
  it('cuatro días válidos terminan la familiarización; dos sesiones el mismo día cuentan una vez', () => {
    const v = { familiarization: { sessions: 4, reason: 'beginner' as const } }
    const four = ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'].map((d) => validSession(d))
    expect(familiarizationStatus(v, four.slice(0, 3), 'r1')?.index).toBe(4)
    expect(familiarizationStatus(v, four, 'r1')).toBeNull()
    const sameDay = [validSession('2026-11-02'), validSession('2026-11-02'), validSession('2026-11-02'), validSession('2026-11-02')]
    expect(familiarizationStatus(v, sameDay, 'r1')?.completed).toBe(1)
  })
  it('cuatro días de calendario sin entrenar no terminan nada; una sesión al 50 % no es válida; el calentamiento no cuenta', () => {
    const v = { familiarization: { sessions: 4, reason: 'beginner' as const } }
    expect(familiarizationStatus(v, [], 'r1')?.index).toBe(1)
    const half = ses('2026-11-03', [sx('prensa', [st(), st({ completed: false }), st({ kind: 'warmup' }), st({ kind: 'warmup' })])], { status: 'partial' })
    expect(isValidSession(half)).toBe(false)
    const warmOnly = ses('2026-11-04', [sx('prensa', [st({ kind: 'warmup' }), st({ completed: false })])], { status: 'partial' })
    expect(isValidSession(warmOnly)).toBe(false)
    expect(view([validSession('2026-11-02')], '2026-11-30').learning?.completed).toBe(1)
  })
  it('al completar la familiarización se pasa a Consolidación automáticamente, con la fecha del 4.º día', () => {
    const s = ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09'].map((d) => validSession(d))
    const v = view(s, '2026-11-10')
    expect(v.phase).toBe('consolidation')
    expect(v.learningDoneOn).toBe('2026-11-09')
    expect(view(s, '2026-11-10', { extendLearning: true }).phase).toBe('learning')
  })
  it('intermedio declarado: no empieza de cero y la experiencia procede de su declaración', () => {
    const r = generateRoutine(prof({ level: 'intermediate' }))
    expect(r.status === 'ok' && r.draft.familiarization).toBeNull()
  })
})

function steady(days: number, every: number, start = '2026-09-01'): Session[] {
  return Array.from({ length: days }, (_, i) => validSession(addDays(start, i * every)))
}

describe('B03–B05 · revisión de fase', () => {
  const done = (s: Session[]) => [...['2026-08-20', '2026-08-22', '2026-08-24', '2026-08-26'].map((d) => validSession(d)), ...s]
  it('B03 · doce días válidos en menos de 42 días no disparan la revisión', () => {
    const s = steady(12, 2, '2026-08-20')
    const v = view(s, addDays('2026-08-20', 30))
    expect(v.validDays).toBe(12)
    expect(v.milestones.span).toBe(false)
    expect(v.reviewDue).toBe(false)
  })
  it('B04 · 42 días sin constancia tampoco; los datos de ejemplo y los duplicados no adelantan la fase', () => {
    const few = done([validSession('2026-09-01')])
    expect(view(few, '2026-11-01').reviewDue).toBe(false)
    const demo = [...few, ...steady(12, 2, '2026-09-02').map((s) => ({ ...s, isDemo: true }))]
    expect(view(demo, '2026-11-01').validDays).toBe(5)
    const dup = [...few, ...Array.from({ length: 12 }, () => validSession('2026-09-10'))]
    expect(view(dup, '2026-11-01').validDays).toBe(6)
    expect(view(dup, '2026-11-01').reviewDue).toBe(false)
  })
  it('B05 · cumplir los hitos propone la revisión; no cambia la experiencia declarada ni activa técnicas', () => {
    const s = steady(14, 3, '2026-08-20')
    const v = view(s, '2026-10-20')
    expect(v.phase).toBe('consolidation')
    expect(v.milestones).toEqual({ validDays: true, span: true, refs: true, health: true })
    expect(v.reviewDue).toBe(true)
    expect(v.declared).toBe('beginner')
    expect(techniqueGate(v, {}).allowed).toBe(false)
    const after = computeProgram({ ...routineAndVersion(), profile: prof(), sessions: s, state: enterProgression({}, '2026-10-20', ''), today: '2026-10-21' })
    expect(after.phase).toBe('progression')
    expect(after.declared).toBe('beginner')
    expect(techniqueGate(after, {}).allowed).toBe(false)
    expect(techniqueGate(after, { techniquesConsent: true }).allowed).toBe(true)
  })
  it('sin hitos de referencias no hay revisión aunque haya días y semanas', () => {
    const s = Array.from({ length: 14 }, (_, i) => ses(addDays('2026-08-20', i * 3), [sx('prensa', [st(), st({ completed: false }), st()])]))
    expect(view(s, '2026-10-20').milestones.refs).toBe(false)
  })
  it('con un bloqueo de salud activo no se propone revisión', () => {
    const s = steady(14, 3, '2026-08-20')
    const p = prof({ limitations: { ...prof().limitations, painNow: true } })
    const v = view(s, '2026-10-20', {}, p)
    expect(v.milestones.health).toBe(false)
    expect(v.reviewDue).toBe(false)
  })
})

describe('B06 · posponer conserva la rutina y respeta el plazo', () => {
  it('no se vuelve a ofrecer antes de 14 días Y 4 días válidos más (lo que ocurra después)', () => {
    const s = steady(14, 3, '2026-08-20')
    const st0 = decideReview({}, 'postponed', '2026-10-20', 14)
    expect(view(s, '2026-10-21', st0).reviewDue).toBe(false)
    expect(view(s, '2026-11-05', st0).reviewDue).toBe(false) // 16 días, pero sin días válidos nuevos
    const more = [...s, ...['2026-10-22', '2026-10-24', '2026-10-26'].map((d) => validSession(d))]
    expect(view(more, '2026-11-05', st0).reviewDue).toBe(false) // 3 días válidos más
    const enough = [...more, validSession('2026-10-28')]
    expect(view(enough, '2026-10-30', st0).reviewDue).toBe(false) // 4 más, pero sin 14 días
    expect(view(enough, '2026-11-03', st0).reviewDue).toBe(true)
    expect(st0.log?.[0].text).toMatch(/más adelante/)
  })
})

describe('B07 · aceptar crea versión solo si cambia el plan y conserva las sesiones', () => {
  it('propuesta comparada: mantener es válido; +1 serie solo con prioridad, tiempo y respuestas favorables', async () => {
    const p = prof({ priorityRegions: ['chest'], minutesPerSession: 75 })
    const r = generateRoutine(p)
    if (r.status !== 'ok') throw new Error()
    const yes = { control: true, tolerance: true, time: true }
    const prop = reviewProposal(r.draft, p, yes)
    expect(prop.extra?.region).toBe('chest')
    expect(prop.extra?.directAfter).toBe((prop.extra?.directBefore ?? 0) + 1)
    expect(reviewProposal(r.draft, p, { ...yes, tolerance: false }).extra).toBeNull()
    expect(reviewProposal(r.draft, prof(), yes).extra).toBeNull() // sin prioridad expresa
    expect(reviewProposal(r.draft, prof({ goal: 'strength', priorityRegions: ['chest'] }), yes).notes.join(' ')).toMatch(/No se introducen máximos/)
    // Aplicar la opción crea una versión nueva; las sesiones no cambian.
    const routine = await createRoutine({ ...r.draft, kind: 'generated' })
    const s = validSession('2026-11-02', { routineId: routine.id })
    await db().sessions.put(s)
    const v2 = await saveRoutineVersion(routine.id, { days: addOneSet(r.draft.days, prop.extra?.uid as string) }, 'Revisión de fase')
    expect(v2.version).toBe(2)
    expect(await db().routineVersions.where('routineId').equals(routine.id).count()).toBe(2)
    expect(await db().sessions.get(s.id)).toEqual(s)
  })
})

describe('B08 · pausa larga y ejercicios nuevos', () => {
  it('tras 21 días sin entrenar se OFRECE readaptación (no se aplica sola) y no se borra la fase', () => {
    const s = steady(14, 3, '2026-08-20')
    const st0 = enterProgression({}, '2026-10-01', '')
    const v = view(s, '2026-11-20', st0)
    expect(v.readaptation.gapDays).toBeGreaterThanOrEqual(PHASE_RULES.readaptationGapDays)
    expect(v.readaptation.offer).toBe(true)
    expect(v.readaptation.active).toBeNull()
    expect(v.phase).toBe('progression')
    const acc: ProgramState = { ...st0, readaptation: { lastValidBefore: v.lastValid as string, decision: 'accepted', on: '2026-11-20', sessions: 4 } }
    const v2 = view([...s, validSession('2026-11-20')], '2026-11-21', acc)
    expect(v2.readaptation.active).toEqual({ index: 2, total: 4 })
    expect(v2.readaptation.offer).toBe(false)
    expect(v2.phase).toBe('progression')
    const dec: ProgramState = { ...st0, readaptation: { lastValidBefore: v.lastValid as string, decision: 'declined', on: '2026-11-20', sessions: 4 } }
    expect(view(s, '2026-11-25', dec).readaptation.offer).toBe(false)
  })
  it('un ejercicio nuevo no hereda dominio aunque la fase sea Progresión', () => {
    const s = steady(14, 3, '2026-08-20')
    const f = exerciseFamiliarity('curl_polea', s, enterProgression({}, '2026-10-01', ''))
    expect(f.level).toBe('unknown')
    expect(f.techniqueReady).toBe(false)
    expect(exerciseFamiliarity('prensa', s, {}).level).toBe('known')
    expect(exerciseFamiliarity('prensa', s, {}).techniqueReady).toBe(false) // falta la confirmación
    expect(exerciseFamiliarity('curl_polea', [], { knownExercises: { curl_polea: { at: 1, basis: 'prior' } } }).techniqueReady).toBe(true)
  })
})

describe('B09–B10 · cuándo se proponen técnicas', () => {
  const s = steady(14, 3, '2026-08-20')
  it('B09 · principiante, familiarización, menor o salud: nunca', () => {
    expect(techniqueGate(view([], '2026-11-01'), { techniquesConsent: true }).reasons.join(' ')).toMatch(/familiarización/)
    expect(techniqueGate(view(s, '2026-10-20', {}), { techniquesConsent: true }).reasons.join(' ')).toMatch(/Progresión o si declaraste nivel intermedio/)
    const youth = view(s, '2026-10-20', enterProgression({}, '2026-10-01', ''), prof({ ageBand: '14to17' }))
    expect(techniqueGate(youth, { techniquesConsent: true }).allowed).toBe(false)
    const ill = view(s, '2026-10-20', enterProgression({}, '2026-10-01', ''), prof({ limitations: { ...prof().limitations, cardioMetabolic: true } }))
    expect(techniqueGate(ill, { techniquesConsent: true }).allowed).toBe(false)
    const ra: ProgramState = { readaptation: { lastValidBefore: '2026-10-08', decision: 'accepted', on: '2026-11-20', sessions: 4 }, progressionSince: '2026-10-01', techniquesConsent: true }
    expect(techniqueGate(view(s, '2026-11-21', ra), ra).reasons.join(' ')).toMatch(/readaptación/)
  })
  it('B10 · nueva fase sin consentimiento específico mantiene las técnicas desactivadas', () => {
    const v = view(s, '2026-10-21', enterProgression({}, '2026-10-20', ''))
    expect(techniqueGate(v, {}).allowed).toBe(false)
    expect(techniqueGate(v, {}).reasons[0]).toMatch(/Quiero usar técnicas/)
  })
  it('candidatos: aislamientos estables, al final, fuera de superseries, conocidos; máx. 1 por sesión y 2 por semana', () => {
    const p = prof({ level: 'intermediate', goal: 'hypertrophy', minutesPerSession: 90 })
    const r = generateRoutine(p)
    if (r.status !== 'ok') throw new Error()
    const ids = new Set(r.draft.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))
    const known: ProgramState = { knownExercises: Object.fromEntries([...ids].map((id) => [id, { at: 1, basis: 'prior' as const }])) }
    const c = techniqueCandidates(r.draft, [], known)
    expect(c.candidates.every((x) => ['extension_cuadriceps', 'curl_femoral_tumbado', 'curl_femoral_sentado', 'curl_mancuernas', 'curl_martillo', 'curl_polea', 'curl_inclinado', 'curl_concentrado', 'extension_triceps_polea', 'extension_triceps_cuerda', 'elevaciones_laterales'].includes(x.exerciseId))).toBe(true)
    expect(c.candidates.some((x) => /sentadilla|peso_muerto|press_banca_barra/.test(x.exerciseId))).toBe(false)
    expect(techniqueCandidates(r.draft, [], {}).candidates).toHaveLength(0)
    if (c.candidates.length) {
      const first = c.candidates[0]
      const days = setTechnique(r.draft.days, first.uid, { method: 'drop', mode: 'reorganize', extra: 1 })
      const again = techniqueCandidates({ days, schedule: r.draft.schedule }, [], known)
      expect(again.candidates.some((x) => x.dayId === first.dayId)).toBe(false)
    }
  })
})

// ───────────────────────── Bloques ─────────────────────────

describe('B11 · 40 × 10 + 30 × 8 son dos tramos', () => {
  it('se guardan como dos tramos con sus cargas; nunca 40 × 18 ni un 1RM nuevo', () => {
    let b = makeBlockSet('drop', 'extend')
    b = registerSegment(b, { weightKg: 40, reps: 10, rir: 1 }, 1000)
    b = startNextSegment(b, 13000)
    b = registerSegment(b, { weightKg: 30, reps: 8, rir: 0 }, 40000)
    expect(b.block?.segments.map((s) => [s.weightKg, s.reps])).toEqual([[40, 10], [30, 8]])
    expect(b.block?.segments[1].pauseSec).toBe(12)
    expect(b.weightKg).toBeNull()
    expect(b.reps).toBeNull()
    expect(b.completed).toBe(true)
    expect(blockText(b, 'machine', formatNumber)).toBe('40 kg × 10 (RIR 1) → cambio 12 s · 30 kg × 8 (RIR 0)')
    const s = ses('2026-11-10', [sx('curl_polea', [st({ weightKg: 25, reps: 12 }), b], { loadTypeSnapshot: 'cable' })])
    const rec = computeRecords([s], 'curl_polea', true)
    expect(rec?.bestLoadForReps.some((r) => r.kg === 40)).toBe(false)
    expect(sessionTotals(s)).toMatchObject({ sets: 1, reps: 12, blocks: 1, segments: 2, segmentReps: 18 })
  })
})

describe('B12 · cargas de una bajada', () => {
  it('estrictamente menores y disponibles, ~20 %, empate → la menor; sin aviso de subida del 10 %', () => {
    expect(dropSuggestion(40, 'machine', DEFAULT_INCREMENTS)).toEqual({ kg: 30, pct: 25 })
    expect(dropSuggestion(25, 'cable', DEFAULT_INCREMENTS)).toEqual({ kg: 20, pct: 20 })
    expect(dropSuggestion(12, 'dumbbell_each', DEFAULT_INCREMENTS)).toEqual({ kg: 10, pct: 17 })
    expect(dropSuggestion(40, 'barbell_total', DEFAULT_INCREMENTS)).toEqual({ kg: 32.5, pct: 19 })
    expect(dropSuggestion(50, 'machine', DEFAULT_INCREMENTS, undefined, 15)?.kg).toBe(40) // empate 45/40 → 40
    expect(dropSuggestion(10, 'machine', DEFAULT_INCREMENTS)).toBeNull() // 5 kg sería −50 %: carga a mano
    expect(dropSuggestion(5, 'machine', DEFAULT_INCREMENTS)).toBeNull()
    expect(dropSuggestion(40, 'bodyweight', DEFAULT_INCREMENTS)).toBeNull()
    for (const prev of [7.5, 13, 22, 37, 41, 66]) {
      const d = dropSuggestion(prev, 'cable', DEFAULT_INCREMENTS)
      if (d) {
        expect(d.kg).toBeLessThan(prev)
        expect(Math.abs(d.kg / 2.5 - Math.round(d.kg / 2.5))).toBeLessThan(1e-9)
      }
    }
  })
})

describe('B13 · rest-pause conserva carga y pausas', () => {
  it('registra la pausa real; un cambio de carga se identifica como bloque modificado', () => {
    let b = makeBlockSet('rest_pause', 'extend')
    b = registerSegment(b, { weightKg: 20, reps: 12, rir: 1 }, 0)
    expect(canRegister(b)).toBe(false)
    b = startNextSegment(b, 22000)
    b = startNextSegment(b, 30000) // doble toque: no cambia el inicio
    b = registerSegment(b, { weightKg: 20, reps: 4, rir: 1 }, 35000)
    expect(b.block?.segments[1].pauseSec).toBe(22)
    expect(blockModified(b, 'machine')).toBe(false)
    expect(blockText(b, 'machine', formatNumber)).toMatch(/· pausa 22 s · 20 kg × 4/)
    let m = makeBlockSet('rest_pause', 'extend')
    m = registerSegment(m, { weightKg: 20, reps: 12, rir: 1 }, 0)
    m = registerSegment(startNextSegment(m, 20000), { weightKg: 15, reps: 5, rir: 1 }, 30000)
    expect(blockModified(m, 'machine')).toBe(true)
  })
})

describe('B14–B15 · guardado por tramo, deshacer y terminar antes', () => {
  it('deshacer un tramo no borra los anteriores; registrar dos veces el mismo tramo no lo duplica', () => {
    let b = makeBlockSet('drop', 'extend')
    b = registerSegment(b, { weightKg: 40, reps: 10, rir: null }, 0)
    const again = registerSegment(b, { weightKg: 40, reps: 10, rir: null }, 10) // sin «Continuar bajada»: ignorado
    expect(again.block?.segments).toHaveLength(1)
    b = registerSegment(startNextSegment(b, 5000), { weightKg: 30, reps: 8, rir: null }, 9000)
    b = undoSegment(b)
    expect(b.block?.segments.map((s) => s.weightKg)).toEqual([40])
    expect(b.completed).toBe(false)
  })
  it('B15 · terminar antes conserva lo hecho y el estado parcial; sin inventar el tramo pendiente', () => {
    let b = makeBlockSet('drop', 'extend', 2)
    b = registerSegment(b, { weightKg: 40, reps: 10, rir: null }, 0)
    b = endBlock(b, 1000)
    expect(b.block?.ended).toBe('early')
    expect(b.block?.segments).toHaveLength(1)
    expect(b.completed).toBe(true)
    // Al cerrar la sesión con un bloque a medias, se cierra con lo hecho.
    let open = makeBlockSet('rest_pause', 'routine')
    open = registerSegment(open, { weightKg: 20, reps: 12, rir: null }, 0)
    const closed = closeOpenBlocks(ses('2026-11-10', [sx('curl_polea', [open])], { status: 'active' }))
    expect(closed.exercises[0].sets[0].block?.ended).toBe('early')
    // Otra bajada solo si se elige; máximo 3 tramos.
    let c = registerSegment(makeBlockSet('drop', 'extend'), { weightKg: 40, reps: 10, rir: null }, 0)
    c = registerSegment(startNextSegment(c, 5000), { weightKg: 30, reps: 8, rir: null }, 9000)
    expect(c.block?.ended).toBe('complete')
    c = addExtraSegment(c, 10000)
    expect(c.block?.plannedSegments).toBe(3)
    expect(addExtraSegment(c, 11000).block?.plannedSegments).toBe(3)
  })
})

describe('B16 · reorganizar y prolongar', () => {
  it('sustituir dos series pendientes no toca las hechas; prolongar solo una pendiente y vuelve atrás sin pérdidas', () => {
    const done = st({ weightKg: 30, reps: 12 })
    const ex = sx('curl_polea', [st({ kind: 'warmup' }), done, st({ completed: false, weightKg: null, reps: null }), st({ completed: false, weightKg: null, reps: null })])
    const r = reorganizePending(ex, 'drop')
    expect(r?.sets).toHaveLength(3)
    expect(r?.sets[1]).toEqual(done)
    expect(r?.sets[2].method).toBe('drop')
    expect(r?.sets[2].block?.replaces).toBe(2)
    expect(reorganizePending(r as SessionExercise, 'drop')).toBeNull()
    const back = revertBlock(r as SessionExercise, (r as SessionExercise).sets[2].id)
    expect(back?.sets.filter((s) => s.kind === 'work' && !s.completed)).toHaveLength(2)
    expect(extendSet(ex, done.id, 'drop')).toBeNull()
    const ext = extendSet(ex, ex.sets[3].id, 'rest_pause')
    expect(ext?.sets[3].block?.origin).toBe('extend')
    const started = { ...(ext as SessionExercise), sets: (ext as SessionExercise).sets.map((s, i) => (i === 3 ? registerSegment(s, { weightKg: 20, reps: 12, rir: null }, 0) : s)) }
    expect(revertBlock(started, started.sets[3].id)).toBeNull()
  })
})

describe('B17 · métricas separadas', () => {
  it('series convencionales y bloques aparte, sin conversión; tonelaje por tramo sin duplicar', () => {
    let b = registerSegment(makeBlockSet('drop', 'extend'), { weightKg: 40, reps: 10, rir: null }, 0)
    b = registerSegment(startNextSegment(b, 1), { weightKg: 30, reps: 8, rir: null }, 2)
    const s = ses('2026-11-10', [sx('extension_cuadriceps', [st({ weightKg: 40, reps: 12 }), st({ weightKg: 40, reps: 12 }), b])])
    const w = weeklyRegionSets([s], 1, '2026-11-12')[0]
    expect(w.direct.quads).toBe(2)
    expect(w.blocks.quads).toEqual({ blocks: 1, segments: 2 })
    expect(sessionTotals(s).tonnage).toBe(40 * 12 * 2 + 40 * 10 + 30 * 8)
    expect(sessionTotals(s).tonnageBlocks).toBe(640)
    // Rutina: bloque previsto aparte del presupuesto de series.
    const r = generateRoutine(prof({ level: 'intermediate', minutesPerSession: 90 }))
    if (r.status !== 'ok') throw new Error()
    const day = r.draft.days.find((d) => d.exercises.some((e) => e.exerciseId === 'extension_cuadriceps' || e.exerciseId === 'curl_femoral_sentado' || e.exerciseId === 'curl_femoral_tumbado'))
    if (day) {
      const re = day.exercises.find((e) => ['extension_cuadriceps', 'curl_femoral_sentado', 'curl_femoral_tumbado'].includes(e.exerciseId))!
      const before = weeklyRegionVolume(r.draft)
      const days = setTechnique(r.draft.days, re.uid, { method: 'drop', mode: 'reorganize', extra: 1 })
      const after = weeklyRegionVolume({ days, schedule: r.draft.schedule })
      const region = re.exerciseId === 'extension_cuadriceps' ? 'quads' : 'hamstrings'
      const occ = r.draft.schedule.filter((x) => x.dayId === day.id).length
      expect(after.find((v) => v.region === region)?.direct).toBe((before.find((v) => v.region === region)?.direct ?? 0) - Math.min(2, re.prescription.sets) * occ)
      expect(after.find((v) => v.region === region)?.blocks).toBe(occ)
      // Reorganizar ahorra tiempo en la estimación; prolongar añade.
      const dd = days.find((d) => d.id === day.id)!
      expect(dayDuration(dd).minutes).toBeLessThanOrEqual(dayDuration(day).minutes)
      const ext = setTechnique(r.draft.days, re.uid, { method: 'drop', mode: 'extend', extra: 1 }).find((d) => d.id === day.id)!
      expect(dayDuration(ext).minutes).toBeGreaterThanOrEqual(dayDuration(day).minutes)
    }
  })
})

describe('B18 · superseries A1 → transición → A2 → descanso de la ronda', () => {
  it('transición si la serie del compañero está pendiente; luego el mayor de los descansos', () => {
    const a = sx('curl_polea', [st({ completed: true }), st({ completed: false })], { superset: 'ss1', prescription: { sets: 2, repMin: 10, repMax: 15, rirMin: 1, rirMax: 3, restSec: 60, warmupSets: 0 } })
    const b = sx('extension_triceps_polea', [st({ completed: false }), st({ completed: false })], { superset: 'ss1', prescription: { sets: 2, repMin: 10, repMax: 15, rirMin: 1, rirMax: 3, restSec: 90, warmupSets: 0 } })
    const list = [a, b]
    const rest = (i: number) => list[i].prescription?.restSec ?? 90
    expect(supersetStep(list, a.uid, a.sets[0].id, rest)).toEqual({ kind: 'transition', partner: 1, durationSec: 15 })
    const list2 = [a, { ...b, sets: [st({ completed: true }), b.sets[1]] }]
    expect(supersetStep(list2, list2[1].uid, list2[1].sets[0].id, rest)).toEqual({ kind: 'round', durationSec: 90 })
    // Separarlos (sin pareja) conserva lo registrado y vuelve al descanso normal.
    const solo = [{ ...a, superset: undefined }, { ...b, superset: undefined }]
    expect(supersetStep(solo, a.uid, a.sets[0].id, rest)).toBeNull()
    expect(solo[0].sets[0]).toEqual(a.sets[0])
  })
  it('propuestas: bíceps + tríceps o accesorios de regiones distintas, sin tocar referencias', () => {
    const r = generateRoutine(prof({ level: 'intermediate', minutesPerSession: 90, priorityRegions: ['biceps', 'triceps'] }))
    if (r.status !== 'ok') throw new Error()
    for (const p of supersetProposals(r.draft)) {
      expect(p.minutesAfter).toBeLessThan(p.minutesBefore)
      const day = r.draft.days.find((d) => d.id === p.dayId)!
      for (const uid of [p.a, p.b]) expect(day.exercises.find((e) => e.uid === uid)?.prescription.reference).toBeFalsy()
    }
  })
})

describe('B19 · no se comparan contextos incompatibles', () => {
  it('convertir series en un bloque o pasar a superserie inicia una referencia nueva', () => {
    const rx = { sets: 3, repMin: 10, repMax: 15, rirMin: 1, rirMax: 3, restSec: 90, warmupSets: 0 }
    const prev = ses('2026-11-03', [sx('curl_polea', [st({ weightKg: 30, reps: 15, rir: 2 }), st({ weightKg: 30, reps: 15, rir: 2 }), st({ weightKg: 30, reps: 15, rir: 2 })], { prescription: rx, loadTypeSnapshot: 'cable' })])
    const history = historyFor('curl_polea', [prev])
    const base = { exerciseId: 'curl_polea', prescription: rx, history, increments: DEFAULT_INCREMENTS, today: '2026-11-10', progressionAllowed: true }
    expect(suggestNext({ ...base, context: 'convencional|individual' }).kind).toBe('increase')
    const changed = suggestNext({ ...base, context: 'drop2|individual' })
    expect(changed.kind).toBe('context_changed')
    expect(changed.detail).toMatch(/ni se interpreta como un retroceso/)
    expect(suggestNext({ ...base, context: 'convencional|superserie' }).kind).toBe('context_changed')
    const withBlock = ses('2026-11-10', [sx('curl_polea', [st(), makeBlockSet('drop', 'routine')])])
    expect(sameStructure(prev, withBlock)).toBe(false)
  })
  it('los bloques se comparan solo con bloques iguales y no proponen subidas de kg', () => {
    const mk = (date: string, r1: number, r2: number) => {
      let b = registerSegment(makeBlockSet('drop', 'routine'), { weightKg: 30, reps: r1, rir: null }, 0)
      b = registerSegment(startNextSegment(b, 1000), { weightKg: 22.5, reps: r2, rir: null }, 9000)
      return ses(date, [sx('curl_polea', [b], { loadTypeSnapshot: 'cable' })])
    }
    const h = historyFor('curl_polea', [mk('2026-11-01', 9, 7), mk('2026-11-05', 10, 8)])
    const adv = blockAdvice(makeBlockSet('drop', 'routine'), 'cable', h, formatNumber)
    expect(adv.firstLoad).toBe(30)
    expect(adv.diff).toBe('Con las mismas cargas: +1 / +1 repeticiones por tramo respecto a la vez anterior.')
    expect(blockAdvice(makeBlockSet('rest_pause', 'routine'), 'cable', h, formatNumber).comparable).toBe(0)
    expect(ordinaryExposures('curl_polea', [mk('2026-11-01', 9, 7)])).toHaveLength(0)
  })
})

describe('B20–B21 · copias, CSV y propuestas', () => {
  it('JSON conserva bloques y fases; CSV conserva tramos y métodos; copias antiguas siguen valiendo', async () => {
    let b = registerSegment(makeBlockSet('drop', 'reorganize'), { weightKg: 40, reps: 10, rir: 1 }, 0)
    b = registerSegment(startNextSegment(b, 12000), { weightKg: 30, reps: 8, rir: 0 }, 20000)
    const s = ses('2026-11-10', [sx('extension_cuadriceps', [st({ weightKg: 40, reps: 12 }), b])])
    await db().sessions.put(s)
    await updateProgramState((x) => ({ ...enterProgression(x, '2026-11-01', ''), techniquesConsent: true }), 'prueba')
    const file = await exportBackup()
    expect(file.formatVersion).toBe(2)
    const text = JSON.stringify(file)
    useDatabase(`tec-restore-${n++}`)
    await restoreBackup(parseBackupText(text), 'replace')
    const back = await db().sessions.get(s.id)
    expect(back?.exercises[0].sets[1].block?.segments.map((x) => [x.weightKg, x.reps, x.pauseSec])).toEqual([[40, 10, null], [30, 8, 12]])
    const ps = await getProgramState()
    expect(ps.progressionSince).toBe('2026-11-01')
    expect(ps.techniquesConsent).toBe(true)
    const csv = sessionsToCsv([s])
    const lines = csv.split('\r\n')
    expect(lines[0]).toMatch(/;metodo;id_bloque;tramo;pausa_s;estado_bloque;superserie$/)
    const blockLines = lines.filter((l) => l.includes(';descendente;'))
    expect(blockLines).toHaveLength(2)
    expect(blockLines[0]).toMatch(/;40;10;1;.*;descendente;[^;]+;0;;completo;$/)
    expect(blockLines[1]).toMatch(/;30;8;0;.*;descendente;[^;]+;1;12;completo;$/)
    expect(lines.find((l) => l.includes(';convencional;'))).toBeTruthy()
    // Copia antigua (formato 1, sin bloques ni programa)
    const old = { ...file, formatVersion: 1, appVersion: '1.2.0', tables: { ...file.tables, meta: [] } }
    expect(() => parseBackupText(JSON.stringify(old))).not.toThrow()
  })
  it('B21 · una propuesta no se registra como entrenamiento hecho', async () => {
    const r = generateRoutine(prof())
    if (r.status !== 'ok') throw new Error()
    const routine = await createRoutine({ ...r.draft, kind: 'generated' })
    const days = setTechnique(r.draft.days, r.draft.days[0].exercises[0].uid, { method: 'rest_pause', mode: 'extend', extra: 1 })
    await saveRoutineVersion(routine.id, { days }, 'Técnica')
    expect(await db().sessions.count()).toBe(0)
    expect(validDates(await db().sessions.toArray())).toHaveLength(0)
  })
})

describe('Sesiones con técnica de la rutina', () => {
  it('la técnica de la rutina crea un bloque al empezar; en familiarización o readaptación no', async () => {
    const r = generateRoutine(prof({ level: 'intermediate' }))
    if (r.status !== 'ok') throw new Error()
    const day = r.draft.days[0]
    const target = day.exercises[day.exercises.length - 1]
    const routine = await createRoutine({ ...r.draft, kind: 'generated', days: setTechnique(r.draft.days, target.uid, { method: 'drop', mode: 'reorganize', extra: 1 }) })
    const s = await startSessionFromDay(routine.id, day.id, '2026-11-10')
    const ex = s.exercises.find((e) => e.exerciseId === target.exerciseId)!
    const lt = ex.loadTypeSnapshot
    if (['barbell_total', 'dumbbell_each', 'machine', 'cable'].includes(lt)) {
      expect(ex.sets.filter((x) => x.method === 'drop')).toHaveLength(1)
      expect(ex.sets.filter((x) => x.kind === 'work' && !x.method)).toHaveLength(Math.max(0, target.prescription.sets - 2))
    }
    await finishSession({ ...s, exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, completed: true })) })) }, 'completed')
    // Principiante en familiarización: sin bloques aunque la rutina tenga técnica.
    const rb = generateRoutine(prof())
    if (rb.status !== 'ok') throw new Error()
    const d0 = rb.draft.days[0]
    const rt = await createRoutine({ ...rb.draft, kind: 'generated', days: setTechnique(rb.draft.days, d0.exercises[0].uid, { method: 'rest_pause', mode: 'extend', extra: 1 }) })
    const s2 = await startSessionFromDay(rt.id, d0.id, '2026-11-11')
    expect(s2.familiarization?.index).toBe(1)
    expect(s2.exercises.every((e) => e.sets.every((x) => !x.method))).toBe(true)
    await saveSession(s2)
  })
})
