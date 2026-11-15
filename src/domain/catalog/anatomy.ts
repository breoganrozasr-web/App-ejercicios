import type { Exercise, MuscleId, Pattern } from '../types'

/**
 * Esquema anatómico POR GRUPOS para las fichas (1.5). Es una capa distinta de la contabilidad de series (mapas de
 * cómputo 1 y 2 de engine/contribution.ts): aquí no hay pesos, porcentajes de activación ni estimaciones de crecimiento.
 * Roles: «principal» (motor principal de la acción), «colabora» (participa en la acción) y «estabiliza» (sostiene una
 * posición; solo cuando la ficha lo documenta). Orientación funcional con OpenStax, Anatomy and Physiology 2e, 11.5–11.6
 * (fuente S04) y las fichas ya revisadas; no determina por sí sola la hipertrofia de una variante (F13–F16).
 */
export type AnatRegion =
  | 'chest' | 'delt_front' | 'delt_side' | 'delt_rear' | 'lats' | 'upper_back' | 'lower_back' | 'biceps' | 'triceps' | 'forearms'
  | 'abs' | 'obliques' | 'glutes' | 'abductors' | 'quads' | 'hamstrings' | 'adductors' | 'calves'

export type AnatRole = 'primary' | 'secondary' | 'stabilizer'

export const ANAT_REGIONS: AnatRegion[] = ['chest', 'delt_front', 'delt_side', 'delt_rear', 'upper_back', 'lats', 'lower_back', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'glutes', 'abductors', 'quads', 'hamstrings', 'adductors', 'calves']

export const ANAT_LABEL: Record<AnatRegion, string> = {
  chest: 'Pecho', delt_front: 'Hombro anterior', delt_side: 'Hombro lateral', delt_rear: 'Hombro posterior', upper_back: 'Espalda alta (trapecio y escápulas)', lats: 'Dorsal',
  lower_back: 'Zona lumbar (extensores)', biceps: 'Flexores del codo (bíceps)', triceps: 'Tríceps', forearms: 'Antebrazo', abs: 'Abdomen', obliques: 'Oblicuos', glutes: 'Glúteos',
  abductors: 'Abductores (glúteo medio)', quads: 'Cuádriceps', hamstrings: 'Isquiosurales', adductors: 'Aductores', calves: 'Pantorrilla (gemelos y sóleo)',
}

export const ROLE_LABEL: Record<AnatRole, string> = { primary: 'Principal', secondary: 'Colabora', stabilizer: 'Estabiliza' }

export interface AnatomyMap {
  roles: Partial<Record<AnatRegion, AnatRole>>
  /** Procedencia del dato (estable, sin inventar precisión). */
  source: 'ficha-revisada' | 'patron' | 'grupos-propios' | 'sin-mapa'
  note?: string
}

type R = Partial<Record<AnatRegion, AnatRole>>
const P: AnatRole = 'primary'
const C: AnatRole = 'secondary'
const E: AnatRole = 'stabilizer'

/** Por patrón (acción principal). */
const BY_PATTERN: Record<Pattern, R> = {
  push_h: { chest: P, delt_front: C, triceps: C },
  chest_iso: { chest: P, delt_front: C },
  push_v: { delt_front: P, delt_side: C, triceps: C, upper_back: C },
  pull_v: { lats: P, biceps: C, upper_back: C, delt_rear: C, forearms: C },
  pull_h: { lats: P, upper_back: P, biceps: C, delt_rear: C, forearms: C },
  lats_iso: { lats: P },
  shoulder_lat: { delt_side: P, upper_back: C },
  shoulder_rear: { delt_rear: P, upper_back: C },
  traps: { upper_back: P, forearms: E },
  biceps: { biceps: P, forearms: C },
  triceps: { triceps: P },
  squat: { quads: P, glutes: P, adductors: C },
  lunge: { quads: P, glutes: P, adductors: C, abductors: E },
  hinge: { hamstrings: P, glutes: P, adductors: C, lower_back: E, forearms: E },
  glute: { glutes: P, hamstrings: C },
  back_ext: { lower_back: P, glutes: P, hamstrings: C },
  knee_flex: { hamstrings: P, calves: C },
  knee_ext: { quads: P },
  hip_abd: { abductors: P },
  hip_add: { adductors: P },
  calves: { calves: P },
  core_flex: { abs: P, obliques: C },
  core_stab: { abs: P, obliques: C },
}

/** Variantes con una diferencia documentada en su ficha. */
const BY_ID: Record<string, { roles: R; note?: string }> = {
  peso_muerto_convencional: { roles: { glutes: P, hamstrings: P, quads: P, adductors: C, lower_back: E, upper_back: E, forearms: E }, note: 'Erectores, espalda alta y agarre estabilizan: no son series directas de espalda.' },
  sentadilla_barra: { roles: { quads: P, glutes: P, adductors: C, lower_back: E, abs: E }, note: 'Con la barra en la espalda, el tronco estabiliza.' },
  sentadilla_frontal: { roles: { quads: P, glutes: P, adductors: C, upper_back: E, abs: E } },
  remo_barra_supino: { roles: { lats: P, upper_back: P, biceps: C, delt_rear: C, lower_back: E, hamstrings: E }, note: 'Tronco inclinado sin apoyo: zona lumbar e isquios sostienen la posición.' },
  remo_pecho_apoyado: { roles: { lats: P, upper_back: P, biceps: C, delt_rear: C }, note: 'El apoyo de pecho reduce la demanda de sostener el tronco, sin eliminar toda estabilización.' },
  remo_banda_anclaje: { roles: { lats: P, upper_back: P, biceps: C, delt_rear: C, abs: E } },
  flexiones: { roles: { chest: P, triceps: C, delt_front: C, abs: E } },
  flexiones_rodillas: { roles: { chest: P, triceps: C, delt_front: C, abs: E } },
  flexiones_inclinadas: { roles: { chest: P, triceps: C, delt_front: C, abs: E } },
  flexiones_pies_elevados: { roles: { chest: P, triceps: C, delt_front: C, abs: E } },
  flexiones_pared: { roles: { chest: P, triceps: C, delt_front: C } },
  press_hombro_unilateral: { roles: { delt_front: P, delt_side: C, triceps: C, obliques: E, abs: E }, note: 'De pie y con una mano: el tronco evita inclinarse.' },
  plancha_lateral: { roles: { obliques: P, abs: C, abductors: E } },
  plancha_frontal: { roles: { abs: P, obliques: C, delt_front: E } },
  hip_thrust_barra: { roles: { glutes: P, hamstrings: C, quads: C } },
  puente_gluteo: { roles: { glutes: P, hamstrings: C } },
  zancadas_mancuernas: { roles: { quads: P, glutes: P, adductors: C, abductors: E, forearms: E } },
  pullover_polea: { roles: { lats: P, triceps: C } },
  pullover_mancuerna: { roles: { lats: P, chest: C, triceps: C } },
  gemelos_sentado_maquina: { roles: { calves: P }, note: 'Rodilla flexionada: el sóleo trabaja en condiciones distintas que de pie.' },
  encogimientos_mancuernas: { roles: { upper_back: P, forearms: E } },
  curl_martillo: { roles: { biceps: P, forearms: C }, note: 'Agarre neutro: participan otros flexores del codo, no solo el bíceps.' },
  dominadas: { roles: { lats: P, biceps: C, upper_back: C, delt_rear: C, forearms: C, abs: E } },
  dominadas_supinas: { roles: { lats: P, biceps: C, upper_back: C, forearms: C, abs: E } },
  remo_invertido: { roles: { lats: P, upper_back: P, biceps: C, delt_rear: C, abs: E, glutes: E } },
}

/** Grupos de la ficha (MuscleId) → regiones del esquema. Hombro y espalda sin detalle se dibujan como grupo agregado. */
const FROM_MUSCLE: Record<MuscleId, AnatRegion[]> = {
  chest: ['chest'], back: ['lats', 'upper_back'], shoulders: ['delt_front', 'delt_side', 'delt_rear'], biceps: ['biceps'], triceps: ['triceps'], quads: ['quads'],
  hamstrings: ['hamstrings'], glutes: ['glutes'], calves: ['calves'], abs: ['abs'], traps: ['upper_back'], lower_back: ['lower_back'], forearms: ['forearms'],
  adductors: ['adductors'], abductors: ['abductors'], obliques: ['obliques'],
}

/** Esquema anatómico de un ejercicio: variante documentada, patrón o, en ejercicios propios, los grupos elegidos. */
export function anatomyOf(ex: Exercise): AnatomyMap {
  if (ex.custom) {
    const roles: R = {}
    for (const m of ex.secondary) for (const r of FROM_MUSCLE[m] ?? []) roles[r] = C
    for (const m of ex.primary) for (const r of FROM_MUSCLE[m] ?? []) roles[r] = P
    return Object.keys(roles).length ? { roles, source: 'grupos-propios', note: 'Según los grupos que elegiste al crear el ejercicio.' } : { roles: {}, source: 'sin-mapa', note: 'Sin mapa definido: elige sus grupos musculares al editar el ejercicio.' }
  }
  const byId = BY_ID[ex.id]
  if (byId) return { roles: byId.roles, source: 'ficha-revisada', note: byId.note }
  return { roles: BY_PATTERN[ex.pattern] ?? {}, source: 'patron' }
}

export function regionsByRole(m: AnatomyMap, role: AnatRole): AnatRegion[] {
  return ANAT_REGIONS.filter((r) => m.roles[r] === role)
}
