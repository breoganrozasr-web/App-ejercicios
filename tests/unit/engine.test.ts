import { describe, expect, it } from 'vitest'
import { getExercise, hasEquipment, HOME_NONE_EQUIPMENT } from '../../src/domain/catalog'
import { analyzeRoutine, recoveryOverlaps, scheduledDays } from '../../src/domain/engine/analysis'
import { buildFromTemplate, distributeClusters, generateRoutine, pickSpacedDays } from '../../src/domain/engine/generator'
import { checkScope } from '../../src/domain/engine/scope'
import { TEMPLATES } from '../../src/domain/engine/templates'
import { defaultProfile } from '../../src/domain/profile'
import type { Profile, RoutineDay } from '../../src/domain/types'

function profile(patch: Partial<Profile> = {}): Profile {
  return { ...defaultProfile(0), ...patch }
}

function patternsOf(days: RoutineDay[]): Set<string> {
  return new Set(days.flatMap((d) => d.exercises.map((e) => getExercise(e.exerciseId)!.pattern)))
}

describe('Caso 1 · principiante, 3 días, gimnasio', () => {
  const r = generateRoutine(profile({ level: 'beginner', days: [0, 2, 4], minutesPerSession: 60 }))
  it('genera una rutina coherente de cuerpo completo', () => {
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    expect(r.draft.days).toHaveLength(3)
    for (const d of r.draft.days) expect(d.exercises.length).toBeGreaterThanOrEqual(3)
    const pats = patternsOf(r.draft.days)
    for (const p of ['squat', 'hinge', 'push_h', 'push_v', 'pull_v', 'pull_h']) expect(pats.has(p)).toBe(true)
    // Nada por encima del nivel ni sin demostración verificada
    for (const d of r.draft.days) for (const e of d.exercises) {
      const ex = getExercise(e.exerciseId)!
      expect(ex.minLevel).toBe('beginner')
      expect(ex.demoStatus).toBe('verificada')
      expect(e.prescription.rirMin).toBeGreaterThanOrEqual(2) // margen al aprender, nunca fallo
      expect(e.prescription.repMin).toBeGreaterThanOrEqual(6) // sin 1–5 rep para principiantes
    }
    expect(r.draft.rampWeeks).toBe(2)
  })
  it('estima duración real (calentamiento, descansos, transiciones) dentro del tiempo disponible', () => {
    if (r.status !== 'ok') throw new Error()
    const a = analyzeRoutine(r.draft)
    for (const d of a.dayMinutes) {
      expect(d.minutes).toBeGreaterThan(20)
      expect(d.minutes).toBeLessThanOrEqual(63)
      expect(d.breakdown.generalWarmupMin).toBeGreaterThan(0)
      expect(d.breakdown.restMin).toBeGreaterThan(0)
      expect(d.breakdown.warmupSetsMin).toBeGreaterThan(0)
    }
    expect(r.overBudget).toBe(false)
  })
  it('la frecuencia se calcula del calendario final, no del nombre del split', () => {
    if (r.status !== 'ok') throw new Error()
    const a = analyzeRoutine(r.draft)
    const days = scheduledDays(r.draft)
    for (const v of a.volume) {
      const manual = days.filter(({ day }) => day.exercises.some((e) => getExercise(e.exerciseId)!.primary.includes(v.muscle))).length
      expect(v.frequencyDirect).toBe(manual)
    }
    const byM = new Map(a.volume.map((v) => [v.muscle, v]))
    expect(byM.get('quads')!.frequencyDirect).toBeGreaterThanOrEqual(2)
    expect(byM.get('back')!.frequencyDirect).toBeGreaterThanOrEqual(2)
    // Volumen de partida moderado (6–10 aprox. en grupos grandes), con estimación de indirectas al 0,5
    for (const m of ['chest', 'back', 'quads', 'glutes'] as const) {
      expect(byM.get(m)!.weighted).toBeGreaterThanOrEqual(5)
      expect(byM.get(m)!.weighted).toBeLessThanOrEqual(11)
    }
  })
})

describe('Caso 2 · casa sin material', () => {
  const p = profile({ locations: ['home'], equipment: [...HOME_NONE_EQUIPMENT], days: [0, 2, 4] })
  const r = generateRoutine(p)
  it('no incluye máquinas ni material que no se tiene', () => {
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    for (const d of r.draft.days) for (const e of d.exercises) {
      const ex = getExercise(e.exerciseId)!
      expect(hasEquipment(HOME_NONE_EQUIPMENT, ex)).toBe(true)
      expect(ex.equipment.some((q) => ['machine', 'cable', 'smith', 'barbell', 'dumbbell', 'bands', 'pullup_bar', 'low_bar'].includes(q))).toBe(false)
    }
  })
  it('muestra la carencia de tirón en lugar de simular un tirón cargado', () => {
    if (r.status !== 'ok') return
    expect(r.draft.warnings.join(' ')).toMatch(/tirón con carga/)
    const pats = patternsOf(r.draft.days)
    expect(pats.has('pull_h') || pats.has('pull_v')).toBe(false)
  })
  it('la plantilla de casa sin material tampoco usa material oculto y declara las demostraciones pendientes', () => {
    const t = TEMPLATES.find((x) => x.id === 'home_none')!
    const { draft, warnings } = buildFromTemplate(t, p)
    for (const d of draft.days) for (const e of d.exercises) expect(hasEquipment(HOME_NONE_EQUIPMENT, getExercise(e.exerciseId)!)).toBe(true)
    expect(warnings.join(' ')).toMatch(/demostración pendiente/i)
  })
})

describe('Caso 3 · dos días y frecuencia 3', () => {
  it('explica la incompatibilidad y ofrece alternativas sin cambiar nada en silencio', () => {
    const r = generateRoutine(profile({ days: [0, 3], frequency: 3 }))
    expect(r.status).toBe('conflict')
    if (r.status !== 'conflict') return
    expect(r.message).toMatch(/3 veces/)
    expect(r.message).toMatch(/2 sesiones/)
    expect(r.alternatives.length).toBeGreaterThanOrEqual(2)
    const freq2 = r.alternatives.find((a) => a.options?.frequencyOverride === 2)
    expect(freq2).toBeTruthy()
    expect(r.alternatives.some((a) => a.profileAction === 'add_days')).toBe(true)
    // Al elegir la alternativa explícitamente sí se genera
    const ok = generateRoutine(profile({ days: [0, 3], frequency: 3 }), freq2!.options)
    expect(ok.status).toBe('ok')
  })
})

describe('Caso 4 · días consecutivos y domingo→lunes', () => {
  it('detecta el solapamiento domingo→lunes y reduce la dosis', () => {
    const r = generateRoutine(profile({ days: [5, 6, 0], frequency: 3 }))
    expect(r.status).toBe('ok')
    if (r.status !== 'ok') return
    const ov = recoveryOverlaps(r.draft)
    expect(ov.some((o) => o.a === 6 && o.b === 0)).toBe(true)
    expect(ov.some((o) => o.a === 5 && o.b === 6)).toBe(true)
    expect(r.draft.rationale.join(' ')).toMatch(/se reduce una serie/)
    const monday = r.draft.days.find((d) => r.draft.schedule.find((s) => s.weekday === 0)?.dayId === d.id)!
    expect(monday.exercises.some((e) => e.prescription.note?.includes('Dosis reducida'))).toBe(true)
  })
  it('con 4 días en bloques consecutivos alterna zonas para no repetir músculos en días seguidos', () => {
    const r = generateRoutine(profile({ level: 'returning', days: [0, 1, 3, 4] }))
    if (r.status !== 'ok') throw new Error(r.status)
    expect(recoveryOverlaps(r.draft)).toHaveLength(0)
    expect(r.draft.days.map((d) => d.focus).sort()).toEqual(['legs', 'legs', 'upper', 'upper'])
  })
  it('elige días espaciados cuando hay más disponibles de los necesarios', () => {
    expect(pickSpacedDays([0, 1, 2, 3, 4, 5, 6], 3)).toEqual([0, 2, 4])
    expect(pickSpacedDays([0, 1, 2], 2)).toEqual([0, 2])
  })
  it('reparto de frecuencia: con 3 sesiones y frecuencia 1 sale empuje/tirón/pierna', () => {
    const plans = distributeClusters(3, 1, [0, 2, 4])
    expect(plans.map((p) => p.clusters.join('+')).sort()).toEqual(['legs', 'pull', 'push'])
  })
})

describe('Caso 15 · generación repetida', () => {
  it('mismo perfil → misma rutina, sin duplicados en una sesión', () => {
    for (const patch of [{ days: [0, 2, 4] }, { days: [0, 1, 3, 4], level: 'intermediate' as const }, { days: [1, 4], goal: 'strength' as const }]) {
      const a = generateRoutine(profile(patch))
      const b = generateRoutine(profile(patch))
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
      if (a.status !== 'ok') continue
      for (const d of a.draft.days) {
        const ids = d.exercises.map((e) => e.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })
  it('las plantillas también son deterministas', () => {
    for (const t of TEMPLATES) expect(JSON.stringify(buildFromTemplate(t, profile()))).toBe(JSON.stringify(buildFromTemplate(t, profile())))
  })
})

describe('Alcance: limitaciones, menores y 6 días', () => {
  it('dolor o condición médica → sin programa automático, con derivación profesional', () => {
    const p = profile()
    p.limitations = { ...p.limitations, painNow: true }
    const r = generateRoutine(p)
    expect(r.status).toBe('out_of_scope')
    expect(checkScope(p).kind).toBe('out')
    p.limitations.clearedByProfessional = true
    expect(generateRoutine(p).status).toBe('ok')
  })
  it('menores de 14 sin programa; 14–17 programa prudente específico', () => {
    expect(generateRoutine(profile({ ageBand: 'under14' })).status).toBe('out_of_scope')
    const y = generateRoutine(profile({ ageBand: '14to17', level: 'intermediate', goal: 'strength' }))
    expect(y.status).toBe('ok')
    if (y.status !== 'ok') return
    expect(y.draft.youth).toBe(true)
    for (const d of y.draft.days) for (const e of d.exercises) {
      expect(e.prescription.rirMin).toBeGreaterThanOrEqual(3)
      expect(e.prescription.sets).toBeLessThanOrEqual(2)
      expect(getExercise(e.exerciseId)!.loadType === 'barbell_total' && e.prescription.repMin < 8).toBe(false)
    }
  })
  it('el empuje/tirón/pierna de 6 días nunca es la recomendación automática', () => {
    for (const level of ['beginner', 'returning', 'intermediate'] as const) {
      const r = generateRoutine(profile({ level, days: [0, 1, 2, 3, 4, 5] }))
      if (r.status !== 'ok') throw new Error()
      expect(r.draft.days.length).toBeLessThanOrEqual(5)
    }
  })
  it('si no cabe en el tiempo, ofrece ajustes explicados y no los aplica solo', () => {
    const r = generateRoutine(profile({ level: 'intermediate', minutesPerSession: 30 }))
    if (r.status !== 'ok') throw new Error()
    expect(r.overBudget).toBe(true)
    expect(r.timeAdjustments.length).toBeGreaterThan(0)
    for (const t of r.timeAdjustments) expect(t.explanation.length).toBeGreaterThan(20)
    const applied = generateRoutine(profile({ level: 'intermediate', minutesPerSession: 30 }), r.timeAdjustments[0].options)
    if (applied.status !== 'ok') throw new Error()
    const max = Math.max(...analyzeRoutine(applied.draft).dayMinutes.map((d) => d.minutes))
    expect(max).toBeLessThan(Math.max(...analyzeRoutine(r.draft).dayMinutes.map((d) => d.minutes)))
  })
})

describe('Plantillas incluidas', () => {
  it('todas generan días completos con el material de la plantilla', () => {
    for (const t of TEMPLATES) {
      const { draft } = buildFromTemplate(t, profile({ level: 'intermediate' }))
      expect(draft.days.length).toBe(t.sessions.length)
      for (const d of draft.days) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(3)
        for (const e of d.exercises) expect(hasEquipment(t.equipment, getExercise(e.exerciseId)!)).toBe(true)
      }
    }
  })
  it('PPL de 3 días muestra frecuencia efectiva 1 en los grupos principales', () => {
    const t = TEMPLATES.find((x) => x.id === 'ppl3_gym')!
    const a = analyzeRoutine(buildFromTemplate(t, profile()).draft)
    const byM = new Map(a.volume.map((v) => [v.muscle, v]))
    for (const m of ['chest', 'back', 'quads'] as const) expect(byM.get(m)!.frequencyDirect).toBe(1)
  })
  it('la plantilla de fuerza usa rangos bajos solo con experiencia', () => {
    const t = TEMPLATES.find((x) => x.id === 'strength3_gym')!
    const beg = buildFromTemplate(t, profile({ level: 'beginner' })).draft
    const int = buildFromTemplate(t, profile({ level: 'intermediate' })).draft
    const squatBeg = beg.days[0].exercises.find((e) => e.exerciseId === 'sentadilla_barra')!
    const squatInt = int.days[0].exercises.find((e) => e.exerciseId === 'sentadilla_barra')!
    expect(squatBeg.prescription.repMin).toBeGreaterThanOrEqual(6)
    expect(squatInt.prescription.repMin).toBe(4)
    expect(squatInt.prescription.restSec).toBeGreaterThanOrEqual(180)
  })
})
