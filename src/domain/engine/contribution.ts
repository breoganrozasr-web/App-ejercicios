import { getExercise } from '../catalog'
import type { Exercise, MuscleId, Region } from '../types'

/**
 * Contabilidad muscular del panel orientativo (motor 2, docs/EVIDENCIA.md · R23).
 * Política conservadora por FAMILIAS de ejercicios, asignadas a mano por id (no por parecido del nombre):
 *   principal = 1 · secundario definido = 0,5 · estabilizador = 0.
 * NO son porcentajes de crecimiento medidos: «no lo contamos» no significa «no recibe estímulo».
 * Los ejercicios fuera de estas familias conservan la clasificación antigua de Forja (principal 1, secundario 0,5),
 * marcada como «heredada» en la interfaz.
 */

export type ContributionRole = 'principal' | 'secundario' | 'estabilizador'

export interface Contribution {
  region: Region
  weight: 1 | 0.5 | 0
  role: ContributionRole
}

export interface ExerciseContribution {
  family: FamilyId | null
  /** true = clasificación antigua (no revisada con la política de familias). */
  legacy: boolean
  items: Contribution[]
  note?: string
}

export type FamilyId =
  | 'press_pecho'
  | 'press_vertical'
  | 'remo'
  | 'jalon_dominada'
  | 'sentadilla_zancada'
  | 'rumano'
  | 'curl_femoral'
  | 'puente'
  | 'extension_rodilla'
  | 'elevacion_lateral'
  | 'pajaros'
  | 'curl_biceps'
  | 'extension_triceps'
  | 'gemelos'
  | 'plancha'

const P = (region: Region): Contribution => ({ region, weight: 1, role: 'principal' })
const S = (region: Region): Contribution => ({ region, weight: 0.5, role: 'secundario' })
const Z = (region: Region): Contribution => ({ region, weight: 0, role: 'estabilizador' })

interface FamilyDef {
  label: string
  ids: string[]
  items: (id: string) => Contribution[]
  note?: string
}

/** Remos en los que el deltoides posterior se cuenta como secundario (codos separados del tronco en la ficha). */
const ROW_REAR_DELT = new Set(['remo_polea_baja', 'remo_mancuerna', 'remo_invertido'])

export const FAMILIES: Record<FamilyId, FamilyDef> = {
  press_pecho: {
    label: 'Press de pecho / flexiones',
    ids: ['press_banca_barra', 'press_banca_mancuernas', 'press_inclinado_barra', 'press_inclinado_mancuernas', 'press_pecho_maquina', 'press_banca_multipower', 'flexiones', 'flexiones_pies_elevados', 'flexiones_pared', 'flexiones_inclinadas', 'flexiones_rodillas'],
    items: () => [P('chest'), S('triceps'), S('delt_front'), Z('core')],
  },
  press_vertical: {
    label: 'Press vertical',
    ids: ['press_militar_barra_sentado', 'press_hombro_mancuernas', 'press_hombro_maquina', 'press_arnold', 'press_hombro_unilateral'],
    items: () => [P('delt_front'), S('triceps')],
    note: 'No se convierte en serie directa de deltoides lateral.',
  },
  remo: {
    label: 'Remo',
    ids: ['remo_polea_baja', 'remo_mancuerna', 'remo_invertido', 'remo_barra_supino'],
    items: (id) => [P('back'), S('biceps'), ...(ROW_REAR_DELT.has(id) ? [S('delt_rear')] : [])],
    note: 'El deltoides posterior solo se cuenta en las variantes donde corresponde.',
  },
  jalon_dominada: {
    label: 'Jalón / dominada',
    ids: ['jalon_pecho', 'jalon_supino', 'jalon_estrecho', 'dominadas', 'dominadas_supinas'],
    items: () => [P('back'), S('biceps')],
    note: 'No se cuenta deltoides lateral.',
  },
  sentadilla_zancada: {
    label: 'Sentadilla / prensa / zancada',
    ids: [
      'prensa', 'prensa_sentada', 'sentadilla_barra', 'sentadilla_frontal', 'sentadilla_mancuernas', 'sentadilla_banco_mancuernas', 'sentadilla_banco_barra', 'sentadilla_multipower',
      'sentadilla_sumo_mancuerna', 'sentadilla_banda', 'sentadilla_peso_corporal', 'sentadilla_silla', 'zancadas_mancuernas', 'zancadas_barra', 'zancadas_caminando',
      'subidas_banco', 'zancada_apoyo', 'subida_escalon', 'zancada_atras_peso_corporal',
    ],
    items: () => [P('quads'), P('glutes'), Z('hamstrings')],
    note: 'Glúteos cuentan como grupo por convención. Los isquios no se dan por cubiertos.',
  },
  rumano: {
    label: 'Peso muerto rumano',
    ids: ['peso_muerto_rumano', 'peso_muerto_rumano_mancuernas'],
    items: () => [P('hamstrings'), P('glutes')],
    note: 'Erectores y agarre: estabilización, no se cuentan en este panel.',
  },
  curl_femoral: { label: 'Curl femoral', ids: ['curl_femoral_tumbado', 'curl_femoral_sentado'], items: () => [P('hamstrings')] },
  puente: {
    label: 'Puente de glúteo',
    ids: ['puente_gluteo'],
    items: () => [P('glutes'), Z('hamstrings')],
    note: 'No da por cubierta la flexión de rodilla de los isquios.',
  },
  extension_rodilla: { label: 'Extensión de rodilla', ids: ['extension_cuadriceps'], items: () => [P('quads')] },
  elevacion_lateral: { label: 'Elevación lateral', ids: ['elevaciones_laterales'], items: () => [P('delt_side')] },
  pajaros: { label: 'Pájaros', ids: ['pajaros_tumbado', 'aperturas_posteriores_banda'], items: () => [P('delt_rear')] },
  curl_biceps: { label: 'Curl de bíceps', ids: ['curl_barra', 'curl_barra_z', 'curl_mancuernas', 'curl_martillo', 'curl_inclinado', 'curl_polea', 'curl_banda', 'curl_concentrado'], items: () => [P('biceps')] },
  extension_triceps: { label: 'Extensión de tríceps', ids: ['extension_triceps_polea', 'extension_triceps_cuerda', 'extension_triceps_sobre_cabeza', 'press_frances', 'patada_triceps'], items: () => [P('triceps')] },
  gemelos: { label: 'Gemelos', ids: ['gemelos_maquina_pie', 'gemelos_sentado_maquina', 'gemelos_prensa', 'gemelos_banda', 'gemelos_peso_corporal'], items: () => [P('calves')] },
  plancha: {
    label: 'Plancha',
    ids: ['plancha_frontal', 'plancha_lateral'],
    items: () => [P('core_iso')],
    note: 'Series de tronco por tiempo: apartado propio; no son series de hombro ni equivalen a encogimientos.',
  },
}

const FAMILY_OF: Record<string, FamilyId> = {}
for (const [fid, def] of Object.entries(FAMILIES) as [FamilyId, FamilyDef][]) for (const id of def.ids) FAMILY_OF[id] = fid

/** Conversión de la clasificación antigua (músculos) a regiones. Los no listados no se contabilizan en el panel. */
const LEGACY_REGION: Partial<Record<MuscleId, Region>> = {
  chest: 'chest',
  back: 'back',
  shoulders: 'delt_unspecified',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  abs: 'core',
  obliques: 'core',
}

export function familyOf(exerciseId: string): FamilyId | null {
  return FAMILY_OF[exerciseId] ?? null
}

export function contributionOf(exOrId: Exercise | string): ExerciseContribution {
  const ex = typeof exOrId === 'string' ? getExercise(exOrId) : exOrId
  if (!ex) return { family: null, legacy: true, items: [] }
  const fam = ex.custom ? null : FAMILY_OF[ex.id]
  if (fam) {
    const def = FAMILIES[fam]
    return { family: fam, legacy: false, items: def.items(ex.id), note: def.note }
  }
  // Clasificación heredada: principal 1, secundario 0,5 (conservada tal cual, marcada como antigua).
  const items: Contribution[] = []
  const seen = new Set<Region>()
  for (const m of ex.primary) {
    const r = LEGACY_REGION[m]
    if (r && !seen.has(r)) {
      items.push(P(r))
      seen.add(r)
    }
  }
  for (const m of ex.secondary) {
    const r = LEGACY_REGION[m]
    if (r && !seen.has(r)) {
      items.push(S(r))
      seen.add(r)
    }
  }
  return { family: null, legacy: true, items }
}

/** Regiones que reciben trabajo DIRECTO (peso 1) de un ejercicio. */
export function directRegions(exerciseId: string): Region[] {
  return contributionOf(exerciseId).items.filter((c) => c.weight === 1).map((c) => c.region)
}

export const REGION_LABEL: Record<Region, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  delt_front: 'Deltoides anterior',
  delt_side: 'Deltoides lateral',
  delt_rear: 'Deltoides posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiosurales',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  core: 'Tronco (repeticiones)',
  core_iso: 'Tronco por tiempo',
  delt_unspecified: 'Hombro sin región (dato antiguo)',
}

/** Orden del panel. */
export const PANEL_REGIONS: Region[] = ['chest', 'back', 'delt_front', 'delt_side', 'delt_rear', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'core_iso']

/** Grupos a los que se aplica por defecto la frecuencia pedida (3.4). */
export const DEFAULT_TARGET_REGIONS: Region[] = ['chest', 'back', 'quads', 'hamstrings', 'glutes']

/** Grupos con presupuesto semanal propio de series directas (3.3). Glúteos se cubren con los patrones que ya los trabajan. */
export const BUDGET_REGIONS: Region[] = ['chest', 'back', 'quads', 'hamstrings']

/** Prioridades antiguas (músculos) → regiones. «Hombros» = las tres regiones. */
export function regionsFromMuscles(muscles: MuscleId[]): Region[] {
  const out = new Set<Region>()
  for (const m of muscles) {
    if (m === 'shoulders') ['delt_front', 'delt_side', 'delt_rear'].forEach((r) => out.add(r as Region))
    else if (m === 'abs' || m === 'obliques') out.add('core')
    else {
      const r = LEGACY_REGION[m]
      if (r) out.add(r)
    }
  }
  return [...out]
}
