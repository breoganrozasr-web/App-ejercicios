import { describe, expect, it } from 'vitest'
import { nextLoad, predictReps, suggestNext, type HistoryItem } from '../../src/domain/engine/progression'
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

describe('Caso 6 · 3 × 8–12', () => {
  it('12/12/12 con margen (RIR anotado) → sube el menor incremento y vuelve a 8', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 2 })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('increase')
    expect(sug.targetWeightKg).toBe(42.5)
    expect(sug.targetReps).toEqual([8, 12])
  })
  it('12/10/8 NO completa el rango: mantener carga y sumar repeticiones', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 10, 8].map((r) => st({ weightKg: 40, reps: r, rir: 1 })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('repeat')
    expect(sug.targetWeightKg).toBe(40)
  })
  it('sin RIR anotado no se inventa: la subida es opcional y decide la persona', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r })))
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) })
    expect(sug.kind).toBe('increase_optional')
    expect(sug.detail).toMatch(/No anotaste RIR/)
  })
  it('al fallo (RIR 0) en el máximo: repetir carga', () => {
    const s = session('press_banca_barra', 'barbell_total', [12, 12, 12].map((r) => st({ weightKg: 40, reps: r, rir: 0 })))
    expect(suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) }).kind).toBe('repeat')
  })
  it('series incompletas o menos series de las requeridas: conservador', () => {
    const s = session('press_banca_barra', 'barbell_total', [st({ weightKg: 40, reps: 12, rir: 2 }), st({ weightKg: 40, reps: 12, rir: 2 }), st({ weightKg: 40, reps: null, completed: false })])
    expect(suggestNext({ ...base, exerciseId: 'press_banca_barra', history: hist(s) }).kind).toBe('repeat')
  })
  it('respeta incrementos reales y redondeo de la rejilla del material', () => {
    expect(nextLoad(40, 2.5, 'barbell_total', DEFAULT_INCREMENTS)).toBe(42.5)
    expect(nextLoad(12, 2, 'dumbbell_each', DEFAULT_INCREMENTS)).toBe(14)
    expect(nextLoad(37.5, 5, 'machine', DEFAULT_INCREMENTS)).toBe(40) // fuera de rejilla → siguiente valor disponible
    expect(nextLoad(22.5, 2.5, 'cable', DEFAULT_INCREMENTS)).toBe(25)
  })
  it('si el salto disponible es demasiado grande, no se impone', () => {
    // 4 kg → 6 kg (+50 %): con 15 repeticiones a 4 kg no se llegaría a 12 con 6 kg
    const s = session('elevaciones_laterales', 'dumbbell_each', [15, 15, 15].map((r) => st({ weightKg: 4, reps: r, rir: 1 })), '2026-11-10', false, { ...RX, repMin: 12, repMax: 15 })
    const sug = suggestNext({ ...base, prescription: { ...RX, repMin: 12, repMax: 15 }, exerciseId: 'elevaciones_laterales', history: hist(s) })
    expect(sug.kind).toBe('increment_too_large')
    expect(sug.targetWeightKg).toBe(4)
    expect(predictReps(4, 16, 6)).toBeLessThan(11)
  })
  it('incremento configurable por ejercicio (p. ej. mancuernas de 1 kg)', () => {
    const s = session('elevaciones_laterales', 'dumbbell_each', [15, 15, 15].map((r) => st({ weightKg: 10, reps: r, rir: 2 })), '2026-11-10', false, { ...RX, repMin: 12, repMax: 15 })
    const sug = suggestNext({ ...base, prescription: { ...RX, repMin: 12, repMax: 15 }, exerciseId: 'elevaciones_laterales', incrementOverride: 1, history: hist(s) })
    expect(sug.kind).toBe('increase')
    expect(sug.targetWeightKg).toBe(11)
    // Con el salto por defecto de 2 kg (+20 %) la app no lo impone
    expect(suggestNext({ ...base, prescription: { ...RX, repMin: 12, repMax: 15 }, exerciseId: 'elevaciones_laterales', history: hist(s) }).kind).toBe('increment_too_large')
  })
  it('una sesión floja aislada no provoca descarga; dos seguidas sugieren revisar', () => {
    const bad1 = session('prensa', 'machine', [7, 6, 6].map((r) => st({ weightKg: 100, reps: r, rir: 1 })), '2026-11-08')
    expect(suggestNext({ ...base, exerciseId: 'prensa', history: hist(bad1) }).kind).toBe('repeat')
    const bad2 = session('prensa', 'machine', [7, 7, 6].map((r) => st({ weightKg: 100, reps: r, rir: 1 })), '2026-11-11')
    expect(suggestNext({ ...base, exerciseId: 'prensa', history: hist(bad1, bad2) }).kind).toBe('review')
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
  it('primera vez: guía para elegir carga sin prueba de máximo', () => {
    const sug = suggestNext({ ...base, exerciseId: 'press_banca_barra', history: [] })
    expect(sug.kind).toBe('first_time')
    expect(sug.detail).toMatch(/Sin prueba de máximo/)
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
  it('carga cero válida (máquina/barra vacía) y peso corporal con lastre', () => {
    const s = session('flexiones', 'bodyweight', [12, 12, 12].map((r) => st({ addedKg: 0, reps: r, rir: 2 })), '2026-11-10', false, { ...RX, repMin: 8, repMax: 12 })
    const sug = suggestNext({ ...base, exerciseId: 'flexiones', history: hist(s) })
    expect(sug.kind).toBe('harder_variant')
    expect(sug.harderExerciseId).toBe('flexiones_pies_elevados')
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
