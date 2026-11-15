import { hasExternalDemo } from '../catalog/external'
import { allExercises, getExercise, hasEquipment } from '../catalog'
import { LEVEL_RANK } from '../catalog/exercises'
import type { EquipmentId, Exercise, Level, Pattern } from '../types'
import { patternChangeNote } from '../content/functions'

/** Patrones "cercanos" para cuando no hay alternativa del mismo patrón. */
const NEAR: Partial<Record<Pattern, Pattern[]>> = {
  squat: ['lunge'],
  lunge: ['squat'],
  hinge: ['glute', 'back_ext', 'knee_flex'],
  glute: ['hinge'],
  pull_v: ['pull_h'],
  pull_h: ['pull_v'],
  push_h: ['push_v'],
  push_v: ['push_h'],
  chest_iso: ['push_h'],
  knee_ext: ['squat'],
  knee_flex: ['hinge'],
  core_flex: ['core_stab'],
  core_stab: ['core_flex'],
}

export interface Alternative {
  exercise: Exercise
  score: number
  reasons: string[]
  available: boolean
}

/**
 * Alternativas para sustituir un ejercicio conservando patrón, músculo principal, material y nivel en lo posible.
 * Nunca se trasladan los kg: la sustitución empieza sin carga sugerida (historial separado por ejercicio).
 */
export function alternativesFor(exerciseId: string, equipment: EquipmentId[] | null, level: Level, excluded: string[] = []): Alternative[] {
  const base = getExercise(exerciseId)
  if (!base) return []
  const out: Alternative[] = []
  for (const ex of allExercises()) {
    if (ex.id === base.id || excluded.includes(ex.id)) continue
    const same = ex.pattern === base.pattern
    const near = NEAR[base.pattern]?.includes(ex.pattern)
    if (!same && !near) continue
    const reasons: string[] = []
    let score = 0
    if (same) { score += 50; reasons.push('misma función') } else { score += 20; reasons.push(patternChangeNote(base.pattern, ex.pattern) ?? 'cambia el patrón: revisa la cobertura del plan') }
    const sharedPrimary = ex.primary.filter((m) => base.primary.includes(m)).length
    score += sharedPrimary * 10
    if (sharedPrimary) reasons.push('mismo músculo principal')
    const available = equipment ? hasEquipment(equipment, ex) : true
    // Orden (6.4): primero misma función con tu material; después, las que cambian el plan.
    if (available) score += 25
    else reasons.push('requiere otro material')
    if (LEVEL_RANK[ex.minLevel] <= LEVEL_RANK[level]) score += 5
    else { score -= 10; reasons.push('más técnico para tu nivel') }
    if (ex.loadType === base.loadType) score += 3
    else reasons.push('otro tipo de carga: los kg no se comparan')
    if (ex.demoStatus === 'verificada') score += 4
    else if (hasExternalDemo(ex.id)) {
      score += 2
      reasons.push('demostración externa (requiere internet)')
    } else reasons.push('demostración pendiente')
    out.push({ exercise: ex, score, reasons, available })
  }
  return out.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'es'))
}
