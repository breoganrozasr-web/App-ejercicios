import type { Profile } from '../types'

export type ScopeResult =
  | { kind: 'adult' }
  | { kind: 'youth'; message: string }
  | { kind: 'out'; reasons: string[]; message: string }

/**
 * Decide si un generador GENERAL puede proponer un programa (R13, R14 en docs/EVIDENCIA.md).
 * - Dolor, lesión reciente, enfermedad cardiometabólica o síntomas, embarazo/posparto u otra condición → fuera de alcance
 *   (cuestionario tipo PAR-Q+ / ACSM 2015): se recomienda valoración profesional. El registro manual sigue disponible.
 * - Menores: no se aplica el motor de adultos. 14–17 años → programa conservador específico con supervisión adulta cualificada.
 *   Menores de 14 → no se genera programa; se recomienda un programa supervisado (NSCA 2009; consenso 2014; AAP 2020).
 */
export function checkScope(p: Pick<Profile, 'limitations' | 'ageBand'>): ScopeResult {
  const l = p.limitations
  const reasons: string[] = []
  if (l.painNow) reasons.push('Has indicado dolor persistente al moverte o entrenar.')
  if (l.recentInjury) reasons.push('Has indicado una lesión reciente, cirugía o rehabilitación en curso.')
  if (l.cardioMetabolic) reasons.push('Has indicado una enfermedad cardiovascular, metabólica o renal, o síntomas como dolor en el pecho, mareos o falta de aire desproporcionada.')
  if (l.pregnancy) reasons.push('Has indicado embarazo o posparto reciente.')
  if (l.otherCondition) reasons.push('Has indicado otra condición médica que puede limitar el ejercicio.')
  if (reasons.length && !l.clearedByProfessional) {
    return {
      kind: 'out',
      reasons,
      message:
        'Con estas circunstancias, un generador general no es la herramienta adecuada para proponerte un programa ni para sugerirte subir cargas. Te recomendamos una valoración por un profesional sanitario (y, si procede, un entrenador cualificado). Puedes seguir usando la app como cuaderno: crear tu rutina a mano o registrar sesiones libres.',
    }
  }
  if (p.ageBand === 'under14') {
    return {
      kind: 'out',
      reasons: ['Tienes menos de 14 años.'],
      message:
        'Para tu edad, la fuerza se entrena mejor dentro de un programa supervisado por un adulto cualificado (club, profesorado de Educación Física o entrenador titulado), junto con juego y deporte a diario. Esta app no genera un programa automático para ti, pero puedes usar el cuaderno con quien te supervise.',
    }
  }
  if (p.ageBand === '14to17') {
    return {
      kind: 'youth',
      message:
        'Eres menor de edad: proponemos un programa específico y prudente (técnica primero, cargas ligeras o peso corporal, sin llegar al fallo, sin pruebas de máximos) que debe hacerse con supervisión de un adulto cualificado.',
    }
  }
  return { kind: 'adult' }
}

/** ¿Se deben ofrecer sugerencias automáticas de progresión? (no con señales fuera de alcance no autorizadas). */
export function progressionAllowed(p: Pick<Profile, 'limitations' | 'ageBand'>): boolean {
  return checkScope(p).kind !== 'out'
}
