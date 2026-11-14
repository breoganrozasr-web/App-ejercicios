import { describe, expect, it } from 'vitest'
import { getExercise, hasEquipment } from '../../src/domain/catalog'
import { dayDuration, recoveryOverlaps, scheduledDays, weeklyRegionVolume } from '../../src/domain/engine/analysis'
import { contributionOf } from '../../src/domain/engine/contribution'
import { buildFromTemplate, distributeBlocks, generateRoutine, pickSpacedDays } from '../../src/domain/engine/generator'
import { describeRir } from '../../src/domain/engine/prescription'
import { checkScope } from '../../src/domain/engine/scope'
import { TEMPLATES } from '../../src/domain/engine/templates'
import { defaultProfile } from '../../src/domain/profile'
import type { Profile, Region, RoutineDay } from '../../src/domain/types'

function profile(patch: Partial<Profile> = {}): Profile {
  return { ...defaultProfile(0), ...patch }
}

/** Recuento independiente (A02): días con al menos una serie de trabajo con contribución directa (peso 1). */
function manualDirectDays(days: RoutineDay[], schedule: { weekday: number; dayId: string }[], region: Region): number {
  return scheduledDays({ days, schedule }).filter(({ day }) => day.exercises.some((e) => e.prescription.sets > 0 && contributionOf(e.exerciseId).items.some((c) => c.region === region && c.weight === 1))).length
}

describe('A01 · determinismo', () => {
  it('mismo perfil, catálogo y versión de reglas → mismo resultado; sin duplicados en una sesión', () => {
    const patches: Partial<Profile>[] = [{ days: [0, 2, 4] }, { days: [0, 1, 3, 4], level: 'intermediate' }, { days: [1, 4], goal: 'strength' }, { days: [0, 2, 4], minutesPerSession: 30, locations: ['home'], equipment: [] }, { days: [0, 2, 4], goal: 'mixed' }]
    for (const patch of patches) {
      const a = generateRoutine(profile(patch))
      const b = generateRoutine(profile(patch))
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
      if (a.status !== 'ok') continue
      expect(a.draft.engineVersion).toBe('2.0.0')
      expect(a.draft.plan.engineVersion).toBe('2.0.0')
      for (const d of a.draft.days) {
        const ids = d.exercises.map((e) => e.exerciseId)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
    for (const t of TEMPLATES) expect(JSON.stringify(buildFromTemplate(t, profile()))).toBe(JSON.stringify(buildFromTemplate(t, profile())))
  })
})

describe('A02 · la explicación de frecuencia coincide con la propuesta', () => {
  const cases: Partial<Profile>[] = [
    { days: [0, 2, 4] }, // F1: principiante, músculo, gimnasio, L/X/V, 60 min, auto
    { days: [0, 2, 4], frequency: 2 },
    { days: [0, 1, 3, 4], level: 'intermediate' },
    { days: [5] },
    { days: [0, 2, 4], minutesPerSession: 30, locations: ['home'], equipment: [] },
  ]
  for (const patch of cases) {
    it(`perfil ${JSON.stringify(patch)}`, () => {
      const r = generateRoutine(profile(patch))
      if (r.status !== 'ok') throw new Error(r.status)
      const { days, schedule } = r.draft
      const line = r.draft.rationale.find((x) => x.startsWith('Frecuencia directa conseguida'))!
      for (const row of r.frequency.filter((x) => x.target)) {
        const manual = manualDirectDays(days, schedule, row.region)
        expect(row.directDays).toBe(manual)
        const label = { chest: 'pecho', back: 'espalda', quads: 'cuádriceps', hamstrings: 'isquiosurales', glutes: 'glúteos' }[row.region as string]
        if (label) expect(line).toContain(`${label} ${manual}`)
      }
      // Nunca promete «todos 3» o «todos 2» en automático: el texto no usa «unas N veces».
      expect(r.draft.rationale.join(' ')).not.toMatch(/unas \d veces/)
    })
  }
  it('F1 corregido: L/X/V principiante → pecho, espalda, cuádriceps, isquios y glúteos con trabajo directo los 3 días', () => {
    const r = generateRoutine(profile({ days: [0, 2, 4] }))
    if (r.status !== 'ok') throw new Error()
    for (const row of r.frequency.filter((x) => x.target)) expect(row.directDays).toBe(3)
  })
})

describe('A03 · dos días y frecuencia 3', () => {
  it('produce conflicto; la alternativa se recalcula y no promete lo que no consigue', () => {
    const p = profile({ days: [0, 3], frequency: 3 })
    const r = generateRoutine(p)
    expect(r.status).toBe('conflict')
    if (r.status !== 'conflict') return
    expect(r.code).toBe('frequency_exceeds_sessions')
    expect(r.message).toMatch(/imposible por definición/)
    const alt = r.alternatives.find((a) => a.options?.frequencyOverride === 2)!
    expect(alt.table).toBeTruthy()
    const achieved = alt.table!.filter((x) => x.target).every((x) => x.directDays >= 2)
    expect(alt.label.includes('conseguida')).toBe(achieved)
    const ok = generateRoutine(p, alt.options)
    expect(ok.status).toBe('ok')
    if (ok.status !== 'ok') return
    expect(JSON.stringify(ok.frequency)).toBe(JSON.stringify(alt.table))
    expect(r.alternatives.some((a) => a.profileAction === 'add_days')).toBe(true)
  })
  it('sin material para tirón, la alternativa NO se llama «conseguida» y la tabla real lo muestra', () => {
    const p = profile({ days: [0, 3], frequency: 3, locations: ['home'], equipment: [] })
    const r = generateRoutine(p)
    if (r.status !== 'conflict') throw new Error()
    const alt = r.alternatives.find((a) => a.options?.frequencyOverride === 2)!
    expect(alt.label).not.toMatch(/conseguida/)
    expect(alt.table!.find((x) => x.region === 'back')!.directDays).toBe(0)
  })
  it('frecuencia pedida no conseguible con el material → conflicto con tabla real, nunca en silencio', () => {
    const r = generateRoutine(profile({ days: [0, 2, 4], frequency: 2, locations: ['home'], equipment: [] }))
    expect(r.status).toBe('conflict')
    if (r.status !== 'conflict') return
    expect(r.code).toBe('frequency_not_met')
    const accept = r.alternatives[0]
    expect(accept.options?.acceptRealFrequency).toBe(true)
    const ok = generateRoutine(profile({ days: [0, 2, 4], frequency: 2, locations: ['home'], equipment: [] }), accept.options)
    expect(ok.status).toBe('ok')
  })
})

describe('A04 · casa sin material, 3 días, 30 min (apartado 6)', () => {
  const p = profile({ days: [0, 2, 4], minutesPerSession: 30, locations: ['home'], equipment: [] })
  const r = generateRoutine(p)
  it('reproduce la distribución de referencia', () => {
    if (r.status !== 'ok') throw new Error(r.status)
    const d = r.draft.days
    const ids = d.map((day) => day.exercises.map((e) => e.exerciseId))
    expect(ids[0]).toEqual(['sentadilla_peso_corporal', 'flexiones_rodillas', 'puente_gluteo', 'plancha_frontal'])
    expect(ids[1]).toEqual(['zancada_atras_peso_corporal', 'flexiones_rodillas', 'puente_gluteo', 'plancha_lateral'])
    expect(ids[2]).toEqual(['sentadilla_peso_corporal', 'flexiones_rodillas', 'puente_gluteo', 'gemelos_peso_corporal'])
    const rx = (i: number, j: number) => d[i].exercises[j].prescription
    expect([rx(0, 0).sets, rx(0, 0).repMin, rx(0, 0).repMax, rx(0, 0).restSec]).toEqual([2, 10, 20, 90])
    expect([rx(0, 1).sets, rx(0, 1).repMin, rx(0, 1).repMax, rx(0, 1).restSec]).toEqual([2, 6, 15, 120])
    expect([rx(0, 2).sets, rx(0, 2).repMin, rx(0, 2).repMax, rx(0, 2).restSec]).toEqual([2, 10, 20, 90])
    expect([rx(0, 3).sets, rx(0, 3).timeMinSec, rx(0, 3).timeMaxSec, rx(0, 3).restSec]).toEqual([2, 15, 30, 60])
    expect([rx(1, 0).sets, rx(1, 0).repMin, rx(1, 0).repMax, rx(1, 0).restSec]).toEqual([2, 6, 12, 90])
    expect([rx(1, 3).sets, rx(1, 3).timeMinSec, rx(1, 3).timeMaxSec]).toEqual([1, 10, 25])
    expect([rx(2, 3).sets, rx(2, 3).repMin, rx(2, 3).repMax, rx(2, 3).restSec]).toEqual([2, 12, 20, 60])
    expect(r.draft.name).toBe('Casa sin material')
    for (const day of d) expect(dayDuration(day).minutes).toBeLessThanOrEqual(30)
  })
  it('ningún día consta solo de zancadas ni se llama «cuerpo completo» sin tirón', () => {
    if (r.status !== 'ok') throw new Error()
    for (const day of r.draft.days) {
      expect(day.exercises.length).toBeGreaterThan(1)
      expect(day.name).not.toMatch(/Cuerpo completo/)
    }
  })
  it('avisa de la falta de tirón progresable y del límite en isquios; el superman no se usa como sustituto', () => {
    if (r.status !== 'ok') throw new Error()
    const w = r.draft.warnings.join(' ')
    expect(w).toMatch(/Falta tirón de espalda con resistencia progresable/)
    expect(w).toMatch(/isquiosurales/)
    expect(r.draft.days.flatMap((x) => x.exercises).some((e) => e.exerciseId === 'superman')).toBe(false)
  })
  it('no supone banco ni silla, y la plantilla equivalente coincide', () => {
    if (r.status !== 'ok') throw new Error()
    for (const day of r.draft.days) for (const e of day.exercises) expect(getExercise(e.exerciseId)!.equipment).toEqual([])
    const t = buildFromTemplate(TEMPLATES.find((x) => x.id === 'home_none')!, p).draft
    expect(t.days.map((x) => x.exercises.map((e) => e.exerciseId))).toEqual(r.draft.days.map((x) => x.exercises.map((e) => e.exerciseId)))
  })
})

describe('A05 · material desmarcado o excluido nunca aparece', () => {
  it('ni en la propuesta ni como relleno', () => {
    const gymNoMachines = profile({ equipment: ['barbell', 'rack', 'dumbbell', 'bench'], excludedExercises: ['press_banca_barra', 'peso_muerto_rumano_mancuernas'] })
    for (const goal of ['hypertrophy', 'strength', 'mixed', 'general'] as const) {
      const r = generateRoutine({ ...gymNoMachines, goal })
      if (r.status !== 'ok') continue
      for (const d of r.draft.days) for (const e of d.exercises) {
        expect(hasEquipment(gymNoMachines.equipment, getExercise(e.exerciseId)!)).toBe(true)
        expect(gymNoMachines.excludedExercises).not.toContain(e.exerciseId)
      }
    }
    const home = generateRoutine(profile({ days: [0, 2, 4], locations: ['home'], equipment: [], excludedExercises: ['flexiones_rodillas'] }))
    if (home.status !== 'ok') throw new Error()
    expect(home.draft.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))).not.toContain('flexiones_rodillas')
    for (const d of home.draft.days) for (const e of d.exercises) expect(getExercise(e.exerciseId)!.equipment.includes('wall')).toBe(false)
  })
})

describe('A06 · domingo → lunes cuenta como consecutivo', () => {
  it('se detecta y el reparto intenta evitarlo', () => {
    const day = (id: string, ex: string): RoutineDay => ({ id, name: id, focus: 'full', exercises: [{ uid: id, exerciseId: ex, prescription: { sets: 2, repMin: 8, repMax: 12, rirMin: 2, rirMax: 3, restSec: 120, warmupSets: 0 } }] })
    const v = { days: [day('a', 'press_pecho_maquina'), day('b', 'press_banca_mancuernas')], schedule: [{ weekday: 6, dayId: 'a' }, { weekday: 0, dayId: 'b' }] }
    expect(recoveryOverlaps(v).some((o) => o.a === 6 && o.b === 0 && o.regions.includes('chest'))).toBe(true)
    const plan = distributeBlocks(2, 1, [6, 0])
    const shared = plan[0].filter((b) => plan[1].includes(b))
    expect(shared).toHaveLength(0)
  })
  it('elige días espaciados cuando hay más disponibles de los necesarios (semana circular)', () => {
    expect(pickSpacedDays([0, 1, 2, 3, 4, 5, 6], 3)).toEqual([0, 2, 4])
    expect(pickSpacedDays([0, 1, 2], 2)).toEqual([0, 2])
  })
})

describe('A07 · familiarización visible y por sesiones', () => {
  it('desde cero: 4 sesiones; se ve la dosis de hoy y la posterior; mitad de series y RIR 3–4', async () => {
    const r = generateRoutine(profile({ days: [0, 2, 4] }))
    if (r.status !== 'ok') throw new Error()
    expect(r.draft.familiarization).toEqual({ sessions: 4, reason: 'beginner' })
    expect(r.draft.rampWeeks).toBe(0)
    const { familiarizationPreview } = await import('../../src/domain/engine/generator')
    const prev = familiarizationPreview(r.draft.days[0].exercises[0])
    expect(prev.today).toMatch(/^1 serie × 8–12 rep · RIR 3–4/)
    expect(prev.after).toMatch(/^2 series × 8–12 rep · RIR 2–3/)
  })
  it('vuelta tras pausa: adaptación opcional; intermedio: sin familiarización', () => {
    const ret = generateRoutine(profile({ level: 'returning' }))
    if (ret.status !== 'ok') throw new Error()
    expect(ret.draft.familiarization?.reason).toBe('returning')
    const skip = generateRoutine(profile({ level: 'returning' }), { skipAdaptation: true })
    if (skip.status !== 'ok') throw new Error()
    expect(skip.draft.familiarization).toBeNull()
    const int = generateRoutine(profile({ level: 'intermediate' }))
    if (int.status !== 'ok') throw new Error()
    expect(int.draft.familiarization).toBeNull()
  })
})

describe('A08 · fuerza prioriza referencias y no alarga para completar dianas de hipertrofia', () => {
  it('referencias primero, sin opción de «completar volumen», dentro del tiempo', () => {
    const p = profile({ level: 'intermediate', goal: 'strength', days: [0, 2, 4], strengthRefs: ['sentadilla_barra', 'press_banca_barra', 'peso_muerto_rumano'] })
    const r = generateRoutine(p)
    if (r.status !== 'ok') throw new Error()
    for (const d of r.draft.days) {
      expect(d.exercises[0].prescription.reference).toBe(true)
      expect(d.exercises[0].prescription.repMin).toBe(4)
      expect(d.exercises[0].prescription.restSec).toBe(180)
      expect(dayDuration(d).minutes).toBeLessThanOrEqual(p.minutesPerSession)
    }
    expect(r.timeAdjustments.every((t) => !String(t.id).includes('fill'))).toBe(true)
    expect(r.draft.rationale.join(' ')).toMatch(/No se alargan las sesiones/)
    // La referencia prioritaria se practica más o igual que las demás
    const count = (id: string) => r.draft.days.filter((d) => d.exercises.some((e) => e.exerciseId === id)).length
    expect(count('sentadilla_barra')).toBeGreaterThanOrEqual(count('peso_muerto_rumano'))
  })
  it('sin referencias elegidas: provisionales y avisadas', () => {
    const r = generateRoutine(profile({ level: 'intermediate', goal: 'strength' }))
    if (r.status !== 'ok') throw new Error()
    expect(r.draft.warnings.join(' ')).toMatch(/Referencias provisionales/)
  })
})

describe('A09 · cada cifra de volumen tiene origen; la estabilización no suma', () => {
  it('las directas son la suma de sus fuentes con peso 1; las secundarias, de las de peso 0,5', () => {
    const r = generateRoutine(profile({ days: [0, 2, 4] }))
    if (r.status !== 'ok') throw new Error()
    for (const v of weeklyRegionVolume(r.draft)) {
      expect(v.direct).toBe(v.sources.filter((s) => s.weight === 1).reduce((a, s) => a + s.sets, 0))
      expect(v.secondary).toBe(v.sources.filter((s) => s.weight === 0.5).reduce((a, s) => a + s.sets, 0))
      expect(v.estimated).toBe(v.direct + 0.5 * v.secondary)
    }
  })
  it('sentadilla/prensa no da medias series a isquios; puente no cubre isquios; press vertical no es deltoides lateral', () => {
    expect(contributionOf('prensa').items.find((c) => c.region === 'hamstrings')?.weight).toBe(0)
    expect(contributionOf('puente_gluteo').items.find((c) => c.region === 'hamstrings')?.weight ?? 0).toBe(0)
    expect(contributionOf('press_hombro_mancuernas').items.some((c) => c.region === 'delt_side')).toBe(false)
    expect(contributionOf('plancha_frontal').items.map((c) => c.region)).toEqual(['core_iso'])
    expect(contributionOf('crunch_polea').legacy).toBe(true)
  })
})

describe('A10 · unilateral: 2 series por pierna no duplican el total semanal, pero sí el tiempo', () => {
  it('cuenta 2 series para cada pierna y duplica la ejecución', () => {
    const rx = { sets: 2, repMin: 10, repMax: 10, rirMin: 2, rirMax: 3, restSec: 90, warmupSets: 0 }
    const uni: RoutineDay = { id: 'u', name: 'u', focus: 'legs', exercises: [{ uid: 'u1', exerciseId: 'zancadas_mancuernas', prescription: rx }] }
    const bi: RoutineDay = { id: 'b', name: 'b', focus: 'legs', exercises: [{ uid: 'b1', exerciseId: 'sentadilla_mancuernas', prescription: rx }] }
    const vu = weeklyRegionVolume({ days: [uni], schedule: [] }).find((v) => v.region === 'quads')!
    const vb = weeklyRegionVolume({ days: [bi], schedule: [] }).find((v) => v.region === 'quads')!
    expect(vu.direct).toBe(2)
    expect(vb.direct).toBe(2)
    expect(dayDuration(uni).breakdown.workMin).toBeGreaterThan(dayDuration(bi).breakdown.workMin * 1.9)
  })
})

describe('A11 · plancha por tiempo, sin RIR', () => {
  it('la prescripción es por segundos y no muestra RIR', () => {
    const r = generateRoutine(profile({ days: [0, 2, 4] }))
    if (r.status !== 'ok') throw new Error()
    const plank = r.draft.days.flatMap((d) => d.exercises).find((e) => e.exerciseId === 'plancha_frontal')!
    expect(plank.prescription.unit).toBe('time')
    expect(describeRir(plank.prescription, getExercise('plancha_frontal'))).not.toMatch(/RIR \d/)
    // Prescripción ANTIGUA (motor 1) de una plancha: tampoco se muestra RIR (F3)
    expect(describeRir({ sets: 2, repMin: 0, repMax: 0, rirMin: 2, rirMax: 3, restSec: 60, warmupSets: 0, timeMinSec: 20, timeMaxSec: 40 }, getExercise('plancha_frontal'))).not.toMatch(/RIR 2/)
  })
})

describe('Tiempo (3.6)', () => {
  it('redondea a 5 min con margen y no acorta descansos para encajar', () => {
    const r = generateRoutine(profile({ days: [5] }))
    if (r.status !== 'ok') throw new Error()
    const d = dayDuration(r.draft.days[0])
    expect(d.rounded % 5).toBe(0)
    expect(d.low).toBeLessThanOrEqual(d.rounded)
    expect(d.high).toBeGreaterThanOrEqual(d.rounded)
    for (const e of r.draft.days[0].exercises) expect(e.prescription.restSec).toBeGreaterThanOrEqual(60)
  })
  it('un solo día: sesión equilibrada, sin amontonar la dosis de tres días', () => {
    const r = generateRoutine(profile({ days: [5] }))
    if (r.status !== 'ok') throw new Error()
    const chest = r.frequency.find((x) => x.region === 'chest')!
    expect(chest.direct).toBeLessThanOrEqual(3)
    expect(r.overBudget).toBe(false)
  })
  it('si no cabe: propone menos series u otro reparto y no los aplica solo', () => {
    const p = profile({ level: 'intermediate', minutesPerSession: 30, days: [0, 2, 4, 5, 6] })
    const r = generateRoutine(p)
    if (r.status !== 'ok') throw new Error()
    if (!r.overBudget) return
    expect(r.timeAdjustments.length).toBeGreaterThan(0)
    for (const t of r.timeAdjustments) expect(['reduce_sets', 'add_day']).toContain(t.id)
  })
})

describe('A21 · salud y menores conservan sus restricciones', () => {
  it('dolor o condición médica → sin programa automático, con derivación profesional', () => {
    const p = profile()
    p.limitations = { ...p.limitations, painNow: true }
    expect(generateRoutine(p).status).toBe('out_of_scope')
    expect(checkScope(p).kind).toBe('out')
    p.limitations.clearedByProfessional = true
    expect(generateRoutine(p).status).toBe('ok')
  })
  it('menores de 14 sin programa; 14–17 itinerario propio, nunca la tabla adulta', () => {
    expect(generateRoutine(profile({ ageBand: 'under14' })).status).toBe('out_of_scope')
    const y = generateRoutine(profile({ ageBand: '14to17', level: 'intermediate', goal: 'strength', strengthRefs: ['sentadilla_barra'] }))
    if (y.status !== 'ok') throw new Error()
    expect(y.draft.youth).toBe(true)
    expect(y.draft.familiarization).toBeNull()
    for (const d of y.draft.days) for (const e of d.exercises) {
      const time = e.prescription.unit === 'time'
      if (!time) expect(e.prescription.rirMin).toBeGreaterThanOrEqual(3)
      expect(e.prescription.sets).toBeLessThanOrEqual(2)
      expect(e.prescription.reference).toBeFalsy()
      expect(e.prescription.note).toMatch(/supervisión/)
    }
  })
  it('seis días nunca se proponen solos a principiantes', () => {
    const r = generateRoutine(profile({ level: 'beginner', days: [0, 1, 2, 3, 4, 5] }))
    if (r.status !== 'ok') throw new Error()
    expect(r.draft.days.length).toBeLessThanOrEqual(3)
  })
})

describe('Plantillas incluidas (motor 2)', () => {
  it('todas generan días con el material de la plantilla y declaran su frecuencia real', () => {
    for (const t of TEMPLATES) {
      const { draft } = buildFromTemplate(t, profile({ level: 'intermediate' }))
      expect(draft.days.length).toBe(t.sessions.length)
      for (const d of draft.days) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(3)
        for (const e of d.exercises) expect(hasEquipment(t.equipment, getExercise(e.exerciseId)!)).toBe(true)
      }
      const line = draft.rationale.find((x) => x.startsWith('Frecuencia directa con el calendario'))!
      for (const r of ['chest', 'back', 'quads'] as Region[]) {
        const n = manualDirectDays(draft.days, draft.schedule, r)
        expect(line).toContain(`${{ chest: 'pecho', back: 'espalda', quads: 'cuádriceps' }[r as 'chest']} ${n}`)
      }
    }
  })
  it('PPL de 3 días: frecuencia 1 y no se vende como frecuencia 2', () => {
    const t = TEMPLATES.find((x) => x.id === 'ppl3_gym')!
    const { draft } = buildFromTemplate(t, profile())
    for (const r of ['chest', 'back', 'quads'] as Region[]) expect(manualDirectDays(draft.days, draft.schedule, r)).toBe(1)
    expect(t.description).toMatch(/no es una frecuencia 2/)
  })
  it('cuerpo completo 3 días: pecho, espalda, cuádriceps, isquios y glúteos con trabajo directo los 3 días', () => {
    const { draft } = buildFromTemplate(TEMPLATES.find((x) => x.id === 'fb3_gym')!, profile())
    for (const r of ['chest', 'back', 'quads', 'hamstrings', 'glutes'] as Region[]) expect(manualDirectDays(draft.days, draft.schedule, r)).toBe(3)
  })
  it('fuerza: referencias con rangos bajos solo con experiencia', () => {
    const t = TEMPLATES.find((x) => x.id === 'strength3_gym')!
    const beg = buildFromTemplate(t, profile({ level: 'beginner' })).draft
    const int = buildFromTemplate(t, profile({ level: 'intermediate' })).draft
    const squatBeg = beg.days[0].exercises.find((e) => e.exerciseId === 'sentadilla_barra')!
    const squatInt = int.days[0].exercises.find((e) => e.exerciseId === 'sentadilla_barra')!
    expect(squatBeg.prescription.repMin).toBe(6)
    expect(squatInt.prescription.repMin).toBe(4)
    expect(squatInt.prescription.restSec).toBe(180)
  })
})
