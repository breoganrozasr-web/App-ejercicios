import { describe, expect, it } from 'vitest'
import { nextLoad, suggestNext, type HistoryItem } from '../../src/domain/engine/progression'
import { DEFAULT_INCREMENTS } from '../../src/domain/profile'
import { computeRecords, epley } from '../../src/domain/records'
import type { LoadType, Prescription, Session, SetEntry } from '../../src/domain/types'
import { parseDecimal, formatNumber } from '../../src/domain/util'
import { sessionsToCsv } from '../../src/data/backup'

const RX: Prescription = { sets: 3, repMin: 8, repMax: 12, rirMin: 2, rirMax: 3, restSec: 120, warmupSets: 1 }

function st(p: Partial<SetEntry>): SetEntry {
  return { id: Math.random().toString(36), kind: 'work', weightKg: null, reps: null, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: 1, ...p }
}

function session(exerciseId: string, lt: LoadType, sets: SetEntry[], date = '2026-11-10', painFlag = false, rx: Prescription = RX): Session {
  return {
    id: `s-${date}-${Math.random()}`, status: 'completed', routineId: null, routineVersionId: null, dayId: null, title: 't', date, startedAt: new Date(date).getTime(), endedAt: 1, pausedAt: null, pausedTotalMs: 0,
    exercises: [{ uid: 'u', exerciseId, nameSnapshot: exerciseId, loadTypeSnapshot: lt, unilateralSnapshot: false, prescription: rx, sets, notes: '', painFlag }],
    notes: '', rampApplied: false, engineVersion: 't', updatedAt: 1, rest: null,
  }
}
function hist(...ss: Session[]): HistoryItem[] {
  return ss.map((s) => ({ date: s.date, session: s, ex: s.exercises[0] })).sort((a, b) => (a.date < b.date ? 1 : -1))
}
const base = { prescription: RX, increments: DEFAULT_INCREMENTS, today: '2026-11-13', progressionAllowed: true }

describe('A12 · doble progresión (3×8–12, RIR objetivo 2–3)', () => {
  it('12/12/12 con RIR 2/2/2 → propuesta del siguiente incremento disponible y vuelta a 8', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 2 })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('increase')
    expect(sug.targetWeightKg).toBe(42.5)
    expect(sug.targetReps).toEqual([8, 12])
  })
  it('12/10/8 NO cumple: mantener carga y sumar repeticiones', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 10, 8].map((r) => st({ weightKg: 40, reps: r, rir: 2 })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('repeat')
    expect(sug.targetWeightKg).toBe(40)
  })
  it('12/12/12 con RIR 1/1/1 (por debajo del objetivo 2–3) NO cumple', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 1 })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('repeat')
    expect(sug.detail).toMatch(/objetivo es RIR 2–3/)
  })
  it('RIR ausente conserva la incertidumbre: «podrías subir si te quedó margen», nunca una confirmación', () => {
    const s = session('press_banca_barra', 'barbell_total', [st({ weightKg: 40, reps: 12, rir: 2 }), st({ weightKg: 40, reps: 12 }), st({ weightKg: 40, reps: 12, rir: 3 })])
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('increase_optional')
    expect(sug.title).toMatch(/Podrías subir si te quedó margen/)
  })
  it('en familiarización no se proponen subidas automáticas', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 3 })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s), familiarization: { index: 2, total: 4 } })
    expect(sug.kind).toBe('familiarization')
    expect(sug.targetWeightKg).toBe(40)
  })
  it('esquema distinto al de la última vez: no se compara automáticamente', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 2 })), '2026-11-10', false, { ...RX, repMin: 6, repMax: 10 })
    expect(suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) }).kind).toBe('scheme_changed')
  })
  it('respeta incrementos reales de la rejilla del material', () => {
    expect(nextLoad(40, 2.5, 'barbell_total', DEFAULT_INCREMENTS)).toBe(42.5)
    expect(nextLoad(12, 2, 'dumbbell_each', DEFAULT_INCREMENTS)).toBe(14)
    expect(nextLoad(37.5, 5, 'machine', DEFAULT_INCREMENTS)).toBe(40)
    expect(nextLoad(22.5, 2.5, 'cable', DEFAULT_INCREMENTS)).toBe(25)
  })
  it('A14 · si el siguiente salto supera el 10 %, no se preselecciona: mantener o elegir el salto', () => {
    const rx = { ...RX, repMin: 12, repMax: 15, rirMin: 1, rirMax: 3 }
    const s = session('elevaciones_laterales', 'dumbbell_each', [15, 15, 15].map((r) => st({ weightKg: 4, reps: r, rir: 2 })), '2026-11-10', false, rx)
    const sug = suggestNext({ ...base, prescription: rx, exerciseId: 'elevaciones_laterales', history: hist(s) })
    expect(sug.kind).toBe('increment_review')
    expect(sug.targetWeightKg).toBe(4)
    expect(sug.altWeightKg).toBe(6)
    expect(sug.incrementPct).toBe(50)
    expect(sug.detail).toMatch(/no un límite de seguridad/)
    // Con mancuernas de 1 kg en 10 kg (+10 %): propuesta normal
    const s2 = session('elevaciones_laterales', 'dumbbell_each', [15, 15, 15].map((r) => st({ weightKg: 10, reps: r, rir: 2 })), '2026-11-10', false, rx)
    const sug2 = suggestNext({ ...base, prescription: rx, exerciseId: 'elevaciones_laterales', incrementOverride: 1, history: hist(s2) })
    expect(sug2.kind).toBe('increase')
    expect(sug2.targetWeightKg).toBe(11)
  })
  it('5.2 · tres exposiciones comparables sin mejora → ayuda (no diagnóstico ni descarga)', () => {
    const a = session('prensa', 'machine', [10, 9, 9].map((r) => st({ weightKg: 100, reps: r, rir: 2 })), '2026-11-01')
    const b = session('prensa', 'machine', [10, 9, 8].map((r) => st({ weightKg: 100, reps: r, rir: 2 })), '2026-11-05')
    const c = session('prensa', 'machine', [9, 9, 9].map((r) => st({ weightKg: 100, reps: r, rir: 2 })), '2026-11-10')
    const sug = suggestNext({ ...base, exerciseId: 'prensa', history: hist(a, b, c) })
    expect(sug.kind).toBe('stalled')
    expect(sug.title).toBe('Llevas varias sesiones parecido')
    expect(sug.options).toHaveLength(4)
    // Una sola sesión floja no dispara nada
    expect(suggestNext({ ...base, exerciseId: 'prensa', history: hist(c) }).kind).toBe('repeat')
    // Si mejora, no hay estancamiento
    const d = session('prensa', 'machine', [11, 10, 10].map((r) => st({ weightKg: 100, reps: r, rir: 2 })), '2026-11-12')
    expect(suggestNext({ ...base, exerciseId: 'prensa', history: hist(b, c, d) }).kind).toBe('repeat')
  })
  it('tras una pausa larga propone vuelta gradual con menos carga', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 60, reps: r, rir: 2 })), '2026-09-01')
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('return_after_break')
    expect(sug.targetWeightKg).toBeLessThan(60)
    expect(((sug.targetWeightKg ?? 0) - 20) % 2.5).toBe(0)
  })
  it('molestia marcada o perfil fuera de alcance: no sugiere subir', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 2 })), '2026-11-10', true)
    expect(suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) }).kind).toBe('paused_pain')
    expect(suggestNext({ ...base, progressionAllowed: false, exerciseId: 'press_banca_barra', history: hist(s) }).kind).toBe('paused_scope')
  })
  it('primera vez: empezar ligero, sin prueba de máximo ni carga inventada', () => {
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: [] })
    expect(sug.kind).toBe('first_time')
    expect(sug.detail).toMatch(/No necesitas probar tu máximo/)
    expect(sug.targetWeightKg).toBeUndefined()
  })
})

describe('A13 · ejercicio incompleto no sube; completo dentro de una sesión parcial sí se evalúa', () => {
  it('con una serie pendiente no hay subida', () => {
    const s = session('press_banca_barra', 'barbell_total', [st({ weightKg: 40, reps: 12, rir: 2 }), st({ weightKg: 40, reps: 12, rir: 2 }), st({ weightKg: 40, reps: null, completed: false })])
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('repeat')
    expect(sug.detail).toMatch(/2 de 3 series/)
  })
  it('sesión parcial (otro ejercicio sin hacer) con este ejercicio completo → se evalúa', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 2 })))
    s.status = 'partial'
    s.exercises.push({ uid: 'v', exerciseId: 'jalon_pecho', nameSnapshot: 'j', loadTypeSnapshot: 'cable', unilateralSnapshot: false, prescription: RX, sets: [st({ completed: false })], notes: '', painFlag: false })
    expect(suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) }).kind).toBe('increase')
  })
})

describe('A11 · isométricos: segundos y esfuerzo opcional, sin RIR ni kg', () => {
  const PLANK: Prescription = { sets: 2, repMin: 0, repMax: 0, rirMin: 0, rirMax: 0, restSec: 60, warmupSets: 0, timeMinSec: 15, timeMaxSec: 30, unit: 'time' }
  it('progresa dentro del rango de tiempo y luego ofrece variante, sin alargar indefinidamente', () => {
    const s1 = session('plancha_frontal', 'time', [st({ durationSec: 20, effort: 6 }), st({ durationSec: 18 })], '2026-11-10', false, PLANK)
    const a = suggestNext({ ...base, prescription: PLANK, exerciseId: 'plancha_frontal', history: hist(s1) })
    expect(a.kind).toBe('more_time')
    expect(a.targetWeightKg).toBeUndefined()
    const s2 = session('plancha_frontal', 'time', [st({ durationSec: 30 }), st({ durationSec: 31 })], '2026-11-12', false, PLANK)
    const b = suggestNext({ ...base, prescription: PLANK, exerciseId: 'plancha_frontal', history: hist(s1, s2) })
    expect(b.kind).toBe('harder_variant')
    expect(b.targetTimeSec).toBe(30)
  })
  it('el RIR antiguo de una plancha se conserva pero no decide nada', () => {
    const s = session('plancha_frontal', 'time', [st({ durationSec: 20, rir: 0 }), st({ durationSec: 20, rir: 0 })], '2026-11-10', false, PLANK)
    const a = suggestNext({ ...base, prescription: PLANK, exerciseId: 'plancha_frontal', history: hist(s) })
    expect(a.kind).toBe('more_time')
    expect(s.exercises[0].sets[0].rir).toBe(0)
  })
})

describe('Caso 7 · asistencia, unilateral, mancuernas por unidad, carga cero y coma decimal', () => {
  it('coma decimal y valores límite', () => {
    expect(parseDecimal('12,5')).toBe(12.5)
    expect(parseDecimal('12.5')).toBe(12.5)
    expect(parseDecimal('0')).toBe(0)
    expect(parseDecimal('0,0')).toBe(0)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('1.234,5')).toBe(1234.5)
    expect(formatNumber(12.5)).toBe('12,5')
  })
  it('A14 · asistencia: completar el rango propone MENOS asistencia; bandas sin kilos inventados', () => {
    const band = session('curl_banda', 'band', [15, 15].map((r) => st({ bandLabel: 'roja', reps: r, rir: 2 })), '2026-11-10', false, { ...RX, sets: 2, repMin: 10, repMax: 15, rirMin: 1 })
    const sb = suggestNext({ ...base, prescription: { ...RX, sets: 2, repMin: 10, repMax: 15, rirMin: 1 }, exerciseId: 'curl_banda', history: hist(band) })
    expect(sb.kind).toBe('harder_variant')
    expect(sb.targetWeightKg).toBeUndefined()
    expect(sb.detail).toMatch(/no tienen kilos equivalentes/)
  })
  it('asistencia: completar el rango propone MENOS asistencia (más difícil)', () => {
    const s = session('fondos_asistidos', 'assisted', [12, 12, 12].map((r) => st({ assistKg: 30, reps: r, rir: 2 })))
    const sug = suggestNext({ ...base, exerciseId: 'fondos_asistidos', history: hist(s) })
    expect(sug.kind).toBe('reduce_assistance')
    expect(sug.targetAssistKg).toBe(25)
  })
  it('asistencia: el "récord" es la menor asistencia, no la mayor', () => {
    const s1 = session('fondos_asistidos', 'assisted', [st({ assistKg: 40, reps: 10 })], '2026-11-01')
    const s2 = session('fondos_asistidos', 'assisted', [st({ assistKg: 25, reps: 8 })], '2026-11-08')
    const r = computeRecords([s1, s2], 'fondos_asistidos', true)!
    expect(r.minAssist?.kg).toBe(25)
    expect(r.bestE1rm).toBeNull()
  })
  it('mancuernas: el peso es por unidad y no se duplica en récords ni estimaciones', () => {
    const s = session('press_banca_mancuernas', 'dumbbell_each', [st({ weightKg: 12.5, reps: 10, rir: 2 })])
    const r = computeRecords([s], 'press_banca_mancuernas', true)!
    expect(r.bestLoadForReps.find((x) => x.reps === 10)?.kg).toBe(12.5)
    expect(r.bestE1rm?.kg).toBeCloseTo(epley(12.5, 10), 2)
    expect(r.bestE1rm?.kg).toBeLessThan(20)
  })
  it('1RM estimado solo con 1–10 repeticiones y nunca para menores', () => {
    const s = session('prensa', 'machine', [st({ weightKg: 100, reps: 15 })])
    expect(computeRecords([s], 'prensa', true)!.bestE1rm).toBeNull()
    const s2 = session('prensa', 'machine', [st({ weightKg: 100, reps: 8 })])
    expect(computeRecords([s2], 'prensa', false)!.bestE1rm).toBeNull()
  })
  it('peso corporal: variante más difícil solo si es posible con tu material (A05)', () => {
    const s = session('flexiones', 'bodyweight', [12, 12, 12].map((r) => st({ addedKg: 0, reps: r, rir: 2 })), '2026-11-10', false, { ...RX, repMin: 8, repMax: 12 })
    const sug = suggestNext({ ...base, exerciseId: 'flexiones', history: hist(s) })
    expect(sug.kind).toBe('harder_variant')
    expect(sug.harderExerciseId).toBe('flexiones_pies_elevados')
    const noChair = suggestNext({ ...base, exerciseId: 'flexiones', history: hist(s), available: (id) => id !== 'flexiones_pies_elevados' })
    expect(noChair.harderExerciseId).toBeUndefined()
  })
  it('unilateral: las repeticiones son por lado y el CSV usa coma decimal y lado', () => {
    const s = session('zancadas_mancuernas', 'dumbbell_each', [st({ weightKg: 7.5, reps: 10, side: 'left' }), st({ weightKg: 7.5, reps: 10, side: 'right' })])
    s.exercises[0].unilateralSnapshot = true
    const csv = sessionsToCsv([s])
    expect(csv).toContain('7,5')
    expect(csv).toContain('izquierdo')
    expect(csv).toContain('kg por mancuerna')
    expect(csv.split('\r\n')).toHaveLength(3)
  })
})
