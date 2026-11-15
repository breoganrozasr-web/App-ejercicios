import { getExercise, hasEquipment } from '../catalog'
import { EQUIPMENT_LABEL } from '../catalog/exercises'
import type {
  EquipmentId, Exercise, Goal, Level, Location, Prescription, Profile, Region, RoutineDay, RoutineExercise, RoutineExerciseOrigin, RoutinePlanInfo, SplitPref,
} from '../types'
import { WEEKDAY_SHORT, stableHash } from '../util'
import { dayDuration, exercisePractice, weeklyRegionVolume, type RegionVolume } from './analysis'
import { DEFAULT_TARGET_REGIONS, REGION_LABEL } from './contribution'
import { pendingWarning, targetRegionsFor, type FrequencyRow, type RoutineDraft } from './generator'
import { AUTO_SESSION_CAP, ENGINE_VERSION, FAMILIARIZATION_SESSIONS, isBodyweightDynamic, isLoadedDynamic, warmupSets } from './params'
import { applyFamiliarization } from './prescription'
import { RECIPE_DATA, type RecipeData, type RecipeItem } from './recipes-data'
import { checkScope } from './scope'
import { alternativesFor } from './substitution'

/**
 * Catálogo editorial de 26 plantillas (encargo del 15/11/2026, anexo A). Cada receta tiene su DOSIS PROPIA:
 * no se aplana a dos series ni a un mismo rango por el perfil. El perfil decide la elegibilidad (edad, salud, material),
 * el orden del catálogo y la dosis TEMPORAL de aprendizaje, nunca la receta base. Son propuestas editoriales de Forja,
 * no rutinas validadas como conjunto en ensayos.
 */

/** Versión de los contenidos editoriales de las plantillas (fecha del anexo). */
export const TEMPLATE_CONTENT_VERSION = '2026-11-15'

export type RecipeSplit = 'full' | 'upper_lower' | 'ppl' | 'ant_post' | 'strength'
export type RecipePlace = 'gym' | 'machines' | 'home_db' | 'home_mixed' | 'home_none' | 'park'

interface RecipeMeta {
  /** Id estable, independiente del título visible. Las continuaciones conservan el id de la plantilla anterior. */
  id: string
  /** Versión editorial: 2 = continuación de una plantilla anterior con el mismo significado; 1 = nueva. */
  version: number
  name: string
  /** Objetivos: el primero es el principal. */
  goals: Goal[]
  splits: RecipeSplit[]
  place: RecipePlace
  /** Niveles con los que «encaja» (el catálogo completo se ve siempre). */
  levels: Level[]
  forWhom: string
  summary: string
  /** Límites de cobertura que hay que ver antes de elegir. */
  limits?: string[]
  /** Solo por elección explícita (no se recomienda automáticamente). */
  explicitOnly?: boolean
  /** Solo encaja si se ha pedido prioridad de pierna/glúteos. */
  lowerPriority?: boolean
  /** Variante breve de esta receta (si existe) y receta estándar de una breve. */
  briefVariant?: string
  standardOf?: string
  /** Practica sentadilla/banca/peso muerto como levantamientos específicos. */
  sbd?: boolean
  aliases: string[]
}

const FULL = ['full body', 'cuerpo completo', 'fullbody']
const UL = ['torso pierna', 'torso/pierna', 'upper lower', 'upper/lower']
const PPL = ['ppl', 'push pull legs', 'empuje tiron pierna', 'empuje/tiron/pierna']
const AP = ['anterior', 'posterior', 'anterior posterior', 'anterior/posterior']
const PB = ['powerbuilding', 'fuerza y musculo', 'fuerza e hipertrofia', 'mixta', 'basicos y accesorios']
const SBD = ['sbd', 'powerlifting', 'sentadilla banca peso muerto', 'peso muerto']
const BRIEF = ['breve', 'poco tiempo', 'corta', 'rapida']
const ALL: Level[] = ['beginner', 'returning', 'intermediate']

const META: Record<string, RecipeMeta> = {
  A01: { id: 'fb2_gym', version: 2, name: 'Cuerpo completo · 2 días', goals: ['hypertrophy', 'mixed'], splits: ['full'], place: 'gym', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio', summary: 'Dos sesiones de cuerpo completo con sentadilla o bisagra, press, tirón y curl femoral cada día. Tres series en los principales y dos en los accesorios.', briefVariant: 'A03', aliases: [...FULL, 'gimnasio'] },
  A02: { id: 'fb3_gym', version: 2, name: 'Cuerpo completo · 3 días', goals: ['hypertrophy'], splits: ['full'], place: 'gym', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio', summary: 'Tres sesiones de cuerpo completo (A, B y C) con trabajo directo de pecho, espalda, cuádriceps, isquios y glúteos cada día.', briefVariant: 'A04', aliases: [...FULL, 'gimnasio'] },
  A03: { id: 'fb2_brief', version: 1, name: 'Cuerpo completo breve · 2 días', goals: ['general', 'hypertrophy'], splits: ['full'], place: 'gym', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio con poco tiempo', summary: 'Cuatro ejercicios por sesión a dos series. Es una dosis reducida elegida: menos trabajo semanal que la estándar, no un atajo equivalente.', standardOf: 'A01', aliases: [...FULL, ...BRIEF] },
  A04: { id: 'fb3_brief', version: 1, name: 'Cuerpo completo breve · 3 días', goals: ['general', 'hypertrophy'], splits: ['full'], place: 'gym', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio con poco tiempo', summary: 'Tres sesiones cortas de cuatro ejercicios a dos series. Dosis reducida respecto a la estándar de tres días.', standardOf: 'A02', aliases: [...FULL, ...BRIEF] },
  A05: { id: 'fb3_machines', version: 1, name: 'Cuerpo completo en máquinas · 3 días', goals: ['hypertrophy'], splits: ['full'], place: 'machines', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio', summary: 'Máquinas y poleas, sin barra libre. Prensa, press, remo y curl femoral con tres o dos series.', limits: ['No cubre directamente todos los músculos en cada sesión: los glúteos reciben trabajo directo dos días (prensa).'], aliases: [...FULL, 'maquinas', 'sin barra'] },
  A06: { id: 'ul4_gym', version: 2, name: 'Torso / pierna · 4 días', goals: ['hypertrophy'], splits: ['upper_lower'], place: 'gym', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con adaptación', summary: 'Dos sesiones de torso y dos de pierna. Cada gran grupo recibe trabajo directo dos días por semana.', briefVariant: 'A07', aliases: [...UL, 'gimnasio'] },
  A07: { id: 'ul4_brief', version: 1, name: 'Torso / pierna breve · 4 días', goals: ['general', 'hypertrophy'], splits: ['upper_lower'], place: 'gym', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio con poco tiempo', summary: 'Torso/pierna con tres o cuatro ejercicios por sesión. Dosis reducida respecto a la estándar de cuatro días.', standardOf: 'A06', aliases: [...UL, ...BRIEF] },
  A08: { id: 'ulf3', version: 1, name: 'Torso / pierna / cuerpo completo · 3 días', goals: ['hypertrophy'], splits: ['upper_lower', 'full'], place: 'gym', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio', summary: 'Torso, pierna y un cuerpo completo: tres días con dos exposiciones a los grandes grupos.', aliases: [...UL, ...FULL] },
  A09: { id: 'ppl3_gym', version: 2, name: 'Empuje / tirón / pierna (PPL) · 3 días', goals: ['hypertrophy'], splits: ['ppl'], place: 'gym', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con adaptación', summary: 'Empuje, tirón y pierna una vez por semana: cada gran grupo tiene trabajo directo un día. Es una preferencia válida, no inferior por definición.', aliases: [...PPL] },
  A10: { id: 'ppl6_gym', version: 2, name: 'Empuje / tirón / pierna (PPL) · 6 días', goals: ['hypertrophy'], splits: ['ppl'], place: 'gym', levels: ['intermediate'], forWhom: 'Intermedio, solo si la eliges expresamente', summary: 'Empuje, tirón y pierna dos veces. Cada día lleva menos dosis que en el PPL de tres días: seis días no significan por sí solos más series semanales.', explicitOnly: true, aliases: [...PPL, '6 dias'] },
  A11: { id: 'ppl_ul5', version: 1, name: 'PPL + torso / pierna · 5 días', goals: ['hypertrophy'], splits: ['ppl', 'upper_lower'], place: 'gym', levels: ['intermediate'], forWhom: 'Intermedio', summary: 'Híbrida de cinco días: empuje, tirón y pierna, más un torso y una segunda pierna.', aliases: [...PPL, ...UL] },
  A12: { id: 'antpost4', version: 1, name: 'Anterior / posterior · 4 días', goals: ['hypertrophy'], splits: ['ant_post'], place: 'gym', levels: ['intermediate'], forWhom: 'Intermedio', summary: 'Cuerpo completo con énfasis anterior (sentadilla, press) o posterior (bisagra, tirón). Son énfasis prácticos, no compartimentos anatómicos: los glúteos trabajan en sentadilla y en bisagra.', limits: ['En días seguidos hay solapamiento real (glúteos en sentadilla y bisagra). Puedes usar lunes, miércoles, viernes y domingo; revisa también domingo → lunes.'], aliases: [...AP, ...FULL] },
  A13: { id: 'ul4_antpost', version: 1, name: 'Torso / pierna: anterior y posterior · 4 días', goals: ['hypertrophy'], splits: ['upper_lower', 'ant_post'], place: 'gym', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con adaptación', summary: 'Torso/pierna con un día de pierna de énfasis anterior (cuádriceps) y otro posterior (bisagra, glúteos, curl). Cada día tiene énfasis, no exclusividad.', aliases: [...UL, ...AP, 'pierna anterior', 'pierna posterior'] },
  A14: { id: 'sh3', version: 1, name: 'Fuerza + hipertrofia · 3 días', goals: ['mixed'], splits: ['strength', 'full'], place: 'gym', levels: ['returning', 'intermediate'], forWhom: 'Vuelta con experiencia o intermedio', summary: 'Sentadilla, press de banca y peso muerto convencional como referencias, con accesorios para músculo. El remo y el jalón completan el tirón de torso; no son un cuarto levantamiento.', sbd: true, aliases: [...PB, ...SBD] },
  A15: { id: 'sh4', version: 1, name: 'Fuerza + hipertrofia · 4 días', goals: ['mixed'], splits: ['strength', 'upper_lower'], place: 'gym', levels: ['returning', 'intermediate'], forWhom: 'Vuelta con experiencia o intermedio', summary: 'Opción destacada si quieres básicos y accesorios: banca dos días, sentadilla uno y peso muerto convencional uno. El rumano no cuenta como práctica del convencional.', sbd: true, aliases: [...PB, ...SBD, ...UL] },
  A16: { id: 'sh5', version: 1, name: 'Fuerza + hipertrofia · 5 días', goals: ['mixed'], splits: ['strength', 'upper_lower'], place: 'gym', levels: ['intermediate'], forWhom: 'Intermedio', summary: 'Redistribuye hombros y brazos a un quinto día; no es la de cuatro días más un día extra de brazos.', sbd: true, aliases: [...PB, ...SBD, 'brazos'] },
  A17: { id: 'sbd3', version: 1, name: 'Fuerza SBD · 3 días', goals: ['strength'], splits: ['strength'], place: 'gym', levels: ['returning', 'intermediate'], forWhom: 'Intermedio; vuelta tras una pausa mediante readaptación', summary: 'Practica la sentadilla dos días, la banca tres y el peso muerto convencional uno. Desarrollo de fuerza sin pico competitivo ni test de máximo obligatorio.', sbd: true, aliases: [...SBD, 'fuerza'] },
  A18: { id: 'sbd4', version: 1, name: 'Fuerza SBD · 4 días', goals: ['strength'], splits: ['strength'], place: 'gym', levels: ['returning', 'intermediate'], forWhom: 'Intermedio; vuelta tras una pausa mediante readaptación', summary: 'Sentadilla dos días, banca dos y peso muerto convencional uno. Accesorios deliberadamente moderados.', sbd: true, aliases: [...SBD, 'fuerza'] },
  A19: { id: 'ul5_lower', version: 1, name: 'Torso / pierna con prioridad de tren inferior · 5 días', goals: ['hypertrophy'], splits: ['upper_lower'], place: 'gym', levels: ['intermediate'], forWhom: 'Intermedio que prioriza pierna o glúteos', summary: 'Tres sesiones de pierna con la dosis repartida y dos de torso. Solo si has pedido prioridad de pierna o glúteos; no se prescribe por sexo.', lowerPriority: true, aliases: [...UL, 'gluteos', 'pierna', 'prioridad pierna'] },
  A20: { id: 'home_db2', version: 1, name: 'Casa con mancuernas y banco · 2 días', goals: ['hypertrophy'], splits: ['full'], place: 'home_db', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio', summary: 'Cuerpo completo con mancuernas ajustables y un banco estable e inclinable.', limits: ['Sin tirón vertical: la espalda recibe tirón horizontal (remos), no jalón ni dominada.'], aliases: [...FULL, 'casa', 'mancuernas', 'banco'] },
  A21: { id: 'home_db3', version: 1, name: 'Casa con mancuernas y banco · 3 días', goals: ['hypertrophy'], splits: ['full'], place: 'home_db', levels: ALL, forWhom: 'Inicio, vuelta tras una pausa o intermedio', summary: 'Tres sesiones de cuerpo completo con mancuernas ajustables y banco.', limits: ['Las piernas pueden quedar limitadas por la carga que tengas: si te sobran repeticiones, Forja te propondrá variantes (con tu confirmación), no repeticiones interminables.', 'Sin tirón vertical (jalón o dominada).'], aliases: [...FULL, 'casa', 'mancuernas', 'banco'] },
  A22: { id: 'home_db_ul4', version: 1, name: 'Casa: torso / pierna con mancuernas · 4 días', goals: ['hypertrophy'], splits: ['upper_lower'], place: 'home_db', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con adaptación', summary: 'Torso/pierna en casa con mancuernas ajustables y banco.', limits: ['Sin tirón vertical (jalón o dominada).'], aliases: [...UL, 'casa', 'mancuernas'] },
  A23: { id: 'home_mixed3', version: 1, name: 'Casa con material mixto · 3 días', goals: ['hypertrophy', 'general'], splits: ['full'], place: 'home_mixed', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con sustituciones', summary: 'Mancuernas, bandas con un anclaje diseñado para ello y barra de dominadas. Todo ese material es necesario.', limits: ['Si te faltan el anclaje o la barra, usa una plantilla de mancuernas: no improvises anclajes en puertas ni muebles.'], aliases: [...FULL, 'casa', 'bandas', 'dominadas', 'mancuernas'] },
  A24: { id: 'home_none', version: 2, name: 'Casa sin material · 3 días', goals: ['general'], splits: ['full'], place: 'home_none', levels: ALL, forWhom: 'Inicio o vuelta tras una pausa', summary: 'Peso corporal en el suelo: pierna, empuje, glúteos y tronco. Cobertura parcial.', limits: ['Sin tirón cargado para la espalda ni trabajo específico de isquios: el puente trabaja glúteos y no sustituye al curl femoral ni al rumano.', 'Lo resolvería, por ejemplo, una barra de dominadas, una banda con anclaje apto o mancuernas. No es un programa completo de hipertrofia.'], aliases: [...FULL, 'casa', 'sin material', 'peso corporal'] },
  A25: { id: 'park2', version: 1, name: 'Parque / calistenia · 2 días', goals: ['general', 'hypertrophy'], splits: ['full'], place: 'park', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con variantes accesibles', summary: 'Barra alta, barra baja y un banco o escalón estable. Dominadas, remo invertido, flexiones y pierna con peso corporal.', limits: ['Isquios con cobertura limitada: el puente no cuenta como curl.', 'Si no llegas al rango de dominadas, usa asistencia o una sustitución: nunca hace falta forzar 6 repeticiones. Las piernas pueden necesitar resistencia adicional.'], aliases: [...FULL, 'parque', 'calistenia', 'barras'] },
  A26: { id: 'park_calisthenics', version: 2, name: 'Parque / calistenia · 3 días', goals: ['general', 'hypertrophy'], splits: ['full'], place: 'park', levels: ALL, forWhom: 'Vuelta tras una pausa o intermedio; desde cero, con variantes accesibles', summary: 'Tres sesiones en el parque con dominadas, remo invertido, flexiones y pierna con peso corporal.', limits: ['Isquios con cobertura limitada: el puente no cuenta como curl.', 'Las piernas pueden necesitar resistencia adicional; si no llegas al rango de dominadas, usa asistencia o una sustitución.'], aliases: [...FULL, 'parque', 'calistenia', 'barras'] },
}

export const PLACE_LABEL: Record<RecipePlace, string> = { gym: 'Gimnasio completo', machines: 'Máquinas y poleas', home_db: 'Casa: mancuernas y banco', home_mixed: 'Casa: material mixto', home_none: 'Casa sin material', park: 'Parque / calistenia' }
export const SPLIT_LABEL: Record<RecipeSplit, string> = { full: 'Cuerpo completo', upper_lower: 'Torso / pierna', ppl: 'Empuje / tirón / pierna', ant_post: 'Anterior / posterior', strength: 'Fuerza y básicos' }
export const GOAL_LABEL: Record<Goal, string> = { hypertrophy: 'Músculo', mixed: 'Fuerza + músculo', strength: 'Fuerza', general: 'General' }
export const SPLIT_PREF_LABEL: Record<SplitPref, string> = { none: 'Sin preferencia de reparto', full: 'Cuerpo completo', upper_lower: 'Torso / pierna', ppl: 'Empuje / tirón / pierna', ant_post: 'Anterior / posterior', strength: 'Fuerza y básicos (SBD)' }
const PLACE_LOCATION: Record<RecipePlace, Location> = { gym: 'gym', machines: 'gym', home_db: 'home', home_mixed: 'home', home_none: 'home', park: 'outdoor' }

export interface Recipe extends RecipeData, RecipeMeta {
  /** Material imprescindible: unión del material de sus ejercicios. */
  equipment: EquipmentId[]
  location: Location
}

/** Ids de las referencias de fuerza (práctica específica de sentadilla, banca y peso muerto convencional). */
const SBD_IDS = new Set(['sentadilla_barra', 'press_banca_barra', 'peso_muerto_convencional'])

export const RECIPES: Recipe[] = RECIPE_DATA.map((d) => {
  const meta = META[d.code]
  const equipment = [...new Set(d.sessions.flatMap((s) => s.items.flatMap((i) => getExercise(i[0])?.equipment ?? [])))].sort()
  return { ...d, ...meta, equipment, location: PLACE_LOCATION[meta.place] }
})

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
export const RECIPE_BY_CODE: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.code, r]))

/** Plantillas anteriores retiradas del catálogo: las rutinas y sesiones que las usaron siguen funcionando (guardan su copia). */
export const RETIRED_TEMPLATES: Record<string, { name: string; why: string }> = {
  strength3_gym: { name: 'Fuerza básica · 3 días', why: 'Era una plantilla de fuerza para empezar. No se ha convertido en la SBD de 3 días (pensada para intermedios): compárala con una propuesta actualizada si quieres.' },
  mixed4_gym: { name: 'Mixta fuerza + músculo · 4 días', why: 'Sustituida en el catálogo por las recetas de fuerza + hipertrofia, que cambian la elegibilidad. Tu rutina no se modifica.' },
  home_basic: { name: 'Casa con material básico · 3 días', why: 'Sustituida por «Casa con material mixto» (exige un anclaje para bandas) y por las plantillas de mancuernas. Tu rutina no se modifica.' },
}

// ───────────────────────── Dosis base (apartado 3.3) ─────────────────────────

/** ¿Es una referencia de fuerza? Sentadilla, banca o convencional a pocas repeticiones (≤ 8) en las recetas A14–A18. */
export function isStrengthReference(recipe: Pick<Recipe, 'sbd'>, item: RecipeItem): boolean {
  return !!recipe.sbd && SBD_IDS.has(item[0]) && item[4] === 'rep' && item[3] <= 8
}

/**
 * Prescripción base de una fila de la receta. Series y rango: los del anexo. RIR, descanso y aproximaciones: valores
 * iniciales prácticos del apartado 3.3 (editables; +30/+60 s en la sesión). No se multiplica nada por el perfil.
 */
export function recipePrescription(ex: Exercise, item: RecipeItem, opts: { reference: boolean; firstCompound: boolean; level: Level }): Prescription {
  const [, sets, min, max, unit] = item
  if (unit === 's') return { sets, repMin: 0, repMax: 0, rirMin: 0, rirMax: 0, restSec: 60, warmupSets: 0, timeMinSec: min, timeMaxSec: max, unit: 'time' }
  const compound = ex.category === 'compound'
  let rir: [number, number]
  let rest: number
  if (opts.reference) {
    rir = [2, 3]
    rest = 180
  } else if (ex.category === 'core') {
    rir = [1, 3]
    rest = 60
  } else if (isBodyweightDynamic(ex)) {
    rir = opts.level === 'beginner' ? [2, 3] : [1, 3]
    rest = ex.pattern === 'pull_v' || ex.pattern === 'pull_h' || ex.pattern === 'push_h' ? 120 : ex.pattern === 'calves' ? 60 : 90
  } else if (compound) {
    rir = opts.level === 'beginner' ? [2, 3] : [1, 3]
    rest = ex.loadType === 'band' ? 120 : 150
  } else {
    rir = [1, 3]
    rest = 90
  }
  const role = opts.reference || opts.firstCompound ? 'main' : 'secondary'
  const wu = compound && isLoadedDynamic(ex) ? warmupSets(opts.level, ex, role, opts.reference) : 0
  const note = opts.reference && ex.id === 'peso_muerto_convencional' ? 'Si necesitas más descanso en el convencional, usa 240–300 s (+60 s en la sesión).' : undefined
  return { sets, repMin: min, repMax: max, rirMin: rir[0], rirMax: rir[1], restSec: rest, warmupSets: wu, unit: 'reps', ...(opts.reference ? { reference: true } : {}), ...(note ? { note } : {}) }
}

// ───────────────────────── Construcción de la propuesta ─────────────────────────

export interface RecipeSubstitution {
  from: string
  to: string | null
  reason: string
}

export interface DayMinutes {
  dayId: string
  base: { minutes: number; low: number; high: number }
  learning: { minutes: number; low: number; high: number } | null
}

export interface RecipeBuild {
  recipe: Recipe
  draft: RoutineDraft
  /** Material que falta en el perfil (la receta no se puede elegir sin él). */
  missing: EquipmentId[]
  /** Ejercicios excluidos en el perfil: sustitución con el mismo patrón y material disponible (o retirada si no hay). */
  substitutions: RecipeSubstitution[]
  /** Protección que impide usar la receta (menores o señales de salud). */
  blocked: string | null
  minutes: DayMinutes[]
  maxMinutes: number
  maxLearningMinutes: number | null
  table: FrequencyRow[]
  volume: RegionVolume[]
}

const LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function fmtRange(d: { low: number; high: number }): string {
  return d.low === d.high ? `≈${d.low} min` : `${d.low}–${d.high} min`
}
export { fmtRange as minutesText }

/**
 * Construye la propuesta de una receta para un perfil. No guarda nada. Mismo perfil + misma versión editorial = mismo
 * resultado. Las exclusiones del perfil se sustituyen por el mismo patrón con material disponible (y se explica).
 */
export function buildFromRecipe(r: Recipe, profile: Profile, opts: { learningDone?: boolean } = {}): RecipeBuild {
  const scope = checkScope(profile)
  const blocked = scope.kind === 'youth'
    ? 'Estas plantillas son recetas para adultos y no sustituyen el programa supervisado para menores. Usa la propuesta para menores.'
    : scope.kind === 'out'
      ? `${scope.message} Puedes ver la plantilla, pero no se propone como rutina mientras haya señales de salud sin valorar.`
      : null
  const level: Level = profile.level
  const excluded = new Set(profile.excludedExercises)
  const substitutions: RecipeSubstitution[] = []
  const missing = new Set<EquipmentId>()
  const references: string[] = []
  const days: RoutineDay[] = r.sessions.map((s, di) => {
    const id = `d${di + 1}`
    let compoundSeen = false
    const exercises: RoutineExercise[] = []
    s.items.forEach((item) => {
      let exId = item[0]
      const base = getExercise(exId)
      if (!base) return
      const adaptations: NonNullable<RoutineExerciseOrigin['adaptations']> = []
      if (excluded.has(exId)) {
        const alt = alternativesFor(exId, profile.equipment, level, [...excluded]).find((a) => a.available && a.exercise.pattern === base.pattern && !a.exercise.custom)
        if (!alt) {
          substitutions.push({ from: exId, to: null, reason: `Lo has excluido y no hay otra variante del mismo patrón con tu material: se quita de «${s.name}». Revisa la cobertura.` })
          return
        }
        substitutions.push({ from: exId, to: alt.exercise.id, reason: `Lo has excluido: se usa ${alt.exercise.name} (mismo patrón, tu material). Los kg no se trasladan.` })
        adaptations.push({ kind: 'exclusion', text: `Sustituye a ${base.name} (excluido en tu perfil).`, at: 0 })
        exId = alt.exercise.id
      }
      const ex = getExercise(exId) as Exercise
      for (const e of ex.equipment) if (!hasEquipment(profile.equipment, { ...ex, equipment: [e] })) missing.add(e)
      const reference = isStrengthReference(r, [exId, ...item.slice(1)] as RecipeItem)
      const firstCompound = ex.category === 'compound' && isLoadedDynamic(ex) && !compoundSeen
      if (ex.category === 'compound' && isLoadedDynamic(ex)) compoundSeen = true
      if (reference && !references.includes(exId)) references.push(exId)
      const prescription = recipePrescription(ex, item, { reference, firstCompound, level })
      const origin: RoutineExerciseOrigin = {
        base: { templateId: r.id, templateVersion: r.version, sets: item[1], repMin: item[4] === 'rep' ? item[2] : 0, repMax: item[4] === 'rep' ? item[3] : 0, ...(item[4] === 's' ? { timeMinSec: item[2], timeMaxSec: item[3] } : {}) },
        ...(adaptations.length ? { adaptations } : {}),
        ...(r.sbd ? { role: reference ? 'strength' as const : 'complement' as const } : {}),
      }
      exercises.push({ uid: `${id}-${exercises.length}-${exId}`, exerciseId: exId, prescription, origin })
    })
    return { id, name: s.name, focus: focusOf(r, s.name), exercises }
  })
  const schedule = r.sessions.map((s, i) => ({ weekday: s.weekday, dayId: days[i].id }))
  const targets = targetRegionsFor(profile)
  const version = { days, schedule, engineVersion: ENGINE_VERSION, plan: { muscleMap: 'v2' as const } }
  const volume = weeklyRegionVolume(version)
  const table = frequencyRows(volume, targets, profile)
  // Aprendizaje / adaptación: dosis temporal (no cambia la receta). Se calcula aparte para mostrar las dos duraciones.
  const famReason: 'beginner' | 'returning' | null = blocked || opts.learningDone ? null : level === 'beginner' ? 'beginner' : level === 'returning' && profile.returningAdaptation !== false ? 'returning' : null
  const familiarization = famReason ? { sessions: FAMILIARIZATION_SESSIONS, reason: famReason } : null
  const minutes: DayMinutes[] = days.map((d) => {
    const b = dayDuration(d)
    const l = familiarization ? dayDuration({ ...d, exercises: d.exercises.map((re) => ({ ...re, technique: undefined, prescription: applyFamiliarization(re.prescription, getExercise(re.exerciseId)) })) }) : null
    return { dayId: d.id, base: { minutes: b.minutes, low: b.low, high: b.high }, learning: l ? { minutes: l.minutes, low: l.low, high: l.high } : null }
  })
  const maxMinutes = Math.max(0, ...minutes.map((m) => m.base.minutes))
  const maxLearningMinutes = familiarization ? Math.max(0, ...minutes.map((m) => m.learning?.minutes ?? 0)) : null
  const warnings: string[] = [...(r.limits ?? [])]
  for (const s of substitutions) warnings.push(s.reason)
  if (missing.size) warnings.push(`Te falta material para esta plantilla: ${[...missing].map((e) => EQUIPMENT_LABEL[e].toLowerCase()).join(', ')}. No se propone con ejercicios que no puedes hacer.`)
  if (r.explicitOnly) warnings.push('Solo por elección explícita: Forja no la propone automáticamente.')
  if (!r.levels.includes(level)) warnings.push(`Pensada para: ${r.forWhom.toLowerCase()}. Tu perfil indica otro nivel; puedes verla y elegirla, pero no es la recomendación inicial.`)
  for (const id of new Set(days.flatMap((d) => d.exercises.map((e) => e.exerciseId)).filter((x) => getExercise(x)?.demoStatus !== 'verificada'))) warnings.push(pendingWarning(id))
  const freqTxt = table.filter((t) => t.target).map((t) => `${REGION_LABEL[t.region].toLowerCase()} ${t.directDays}`).join(', ')
  const rationale = [
    r.summary,
    `Dosis base de la plantilla ${r.code} «${r.name}» (versión editorial ${r.version}, ${TEMPLATE_CONTENT_VERSION}): series y rangos propios de cada ejercicio, sin aplanarlos por tu perfil. Es una propuesta editorial de Forja, no una rutina evaluada como conjunto en ensayos.`,
    `Frecuencia directa con este calendario: ${freqTxt}. Los días con solo trabajo indirecto se muestran aparte.`,
    'Repeticiones, margen (RIR) y descansos: valores iniciales prácticos y editables. Referencias de fuerza: RIR 2–3 y 180 s; compuestos: 150 s; accesorios: 90 s. Sin fallo ni máximos obligatorios.',
    ...(familiarization ? [`${famReason === 'beginner' ? 'Aprendizaje' : 'Adaptación tras la pausa'}: tus primeros ${familiarization.sessions} días válidos llevan max(1, mitad de series), rangos de aprendizaje y RIR 3–4. Después, la dosis base. Tu avance depende de días válidos, no de que pase una semana.`] : []),
    ...(opts.learningDone && (level === 'beginner' || level === 'returning') ? ['Ya completaste la fase de Aprendizaje: empieza con la dosis base. Los ejercicios nuevos para ti conservan su propio aprendizaje (carga cómoda y margen).'] : []),
  ]
  const plan: RoutinePlanInfo = {
    engineVersion: ENGINE_VERSION, goal: r.goals[0], level, desiredFrequency: profile.frequency, targetRegions: targets, references, minutes: profile.minutesPerSession,
    template: { id: r.id, code: r.code, version: r.version, contentVersion: TEMPLATE_CONTENT_VERSION }, muscleMap: 'v2',
  }
  const draft: RoutineDraft = {
    name: r.name, kind: 'template', templateId: r.id, days, schedule, rampWeeks: 0, familiarization, plan, rationale, warnings: [...new Set(warnings)], engineVersion: ENGINE_VERSION, youth: false,
  }
  return { recipe: r, draft, missing: [...missing], substitutions, blocked, minutes, maxMinutes, maxLearningMinutes, table, volume }
}

function focusOf(r: Recipe, sessionName: string): RoutineDay['focus'] {
  const n = sessionName.toLowerCase()
  if (n.startsWith('torso')) return 'upper'
  if (n.startsWith('pierna')) return 'legs'
  if (n.startsWith('empuje')) return 'push'
  if (n.startsWith('tirón')) return 'pull'
  if (n.startsWith('hombros')) return 'arms_shoulders'
  return r.splits.includes('full') || r.splits.includes('ant_post') ? 'full' : 'custom'
}

function frequencyRows(volume: RegionVolume[], targets: Region[], profile: Profile): FrequencyRow[] {
  const desired = profile.frequency === 'auto' ? null : profile.frequency
  const order: Region[] = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'delt_front', 'delt_side', 'delt_rear', 'biceps', 'triceps', 'calves', 'core', 'core_iso']
  const by = new Map(volume.map((v) => [v.region, v]))
  return order.map((region) => {
    const v = by.get(region)
    const target = targets.includes(region)
    return { region, desired: target ? desired : null, target, directDays: v?.directDays ?? 0, secondaryOnlyDays: v?.secondaryOnlyDays ?? 0, direct: v?.direct ?? 0, estimated: v?.estimated ?? 0 }
  })
}

// ───────────────────────── Resúmenes para tarjetas y comparador ─────────────────────────

/** Calendario corto: «L J» o «L M J V». */
export function calendarText(r: Pick<Recipe, 'sessions'>): string {
  return r.sessions.map((s) => LETTER[s.weekday]).join(' ')
}

/** Frecuencia real resumida de los grandes grupos (sin prometer más de lo que hay). */
export function frequencySummary(b: Pick<RecipeBuild, 'volume'>): string {
  const by = new Map(b.volume.map((v) => [v.region, v.directDays]))
  const parts = DEFAULT_TARGET_REGIONS.map((r) => [r, by.get(r) ?? 0] as const)
  const vals = new Set(parts.map((p) => p[1]))
  if (vals.size === 1) return `Pecho, espalda, cuádriceps, isquios y glúteos: ${parts[0][1]} ${parts[0][1] === 1 ? 'día' : 'días'}/semana`
  return parts.map(([r, d]) => `${REGION_LABEL[r].toLowerCase()} ${d}`).join(' · ') + ' días/semana'
}

/** Práctica semanal de básicos (días con el ejercicio exacto; el rumano no cuenta como convencional). */
export function basicsPractice(r: Recipe): { id: string; name: string; days: number }[] {
  const p = exercisePractice({ days: r.sessions.map((s, i) => ({ id: `d${i}`, name: s.name, focus: 'custom', exercises: s.items.map((it) => ({ uid: it[0], exerciseId: it[0], prescription: { sets: it[1], repMin: it[2], repMax: it[3], rirMin: 2, rirMax: 3, restSec: 90, warmupSets: 0 } })) })), schedule: r.sessions.map((s, i) => ({ weekday: s.weekday, dayId: `d${i}` })) })
  return ['sentadilla_barra', 'press_banca_barra', 'peso_muerto_convencional'].filter((id) => p.has(id)).map((id) => ({ id, name: getExercise(id)?.name ?? id, days: p.get(id) ?? 0 }))
}

// ───────────────────────── Búsqueda ─────────────────────────

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim()
}

/** Busca por nombre, código, alias (PPL, upper lower, powerbuilding, SBD…), reparto, lugar y ejercicios. */
export function recipeMatches(r: Recipe, q: string): boolean {
  const nq = normalize(q).replace(/[/·]/g, ' ').replace(/\s+/g, ' ')
  if (!nq) return true
  const hay = normalize([r.name, r.code, ...r.aliases, ...r.splits.map((s) => SPLIT_LABEL[s]), PLACE_LABEL[r.place], ...r.sessions.flatMap((s) => s.items.map((i) => getExercise(i[0])?.name ?? ''))].join(' | ')).replace(/[/·]/g, ' ')
  return nq.split(' ').every((w) => hay.includes(w))
}

// ───────────────────────── Selección determinista (apartado 4.3) ─────────────────────────

export interface RecipeConflict {
  kind: 'blocked' | 'material' | 'place' | 'days' | 'level' | 'goal' | 'explicit' | 'priority' | 'frequency' | 'time'
  text: string
  /** Impide que «encaje» (la plantilla sigue visible en el catálogo completo). */
  hard: boolean
}

export interface RecipeFit {
  recipe: Recipe
  build: RecipeBuild
  fits: boolean
  conflicts: RecipeConflict[]
  /** Por qué encaja (para la tarjeta). */
  reasons: string[]
  /** Clave de orden: menor = antes. */
  rank: number[]
}

const GOAL_COMPAT: Record<Goal, Goal[]> = { hypertrophy: ['hypertrophy', 'mixed', 'general'], mixed: ['mixed', 'strength', 'hypertrophy'], strength: ['strength', 'mixed', 'hypertrophy'], general: ['general', 'hypertrophy'] }
const LOWER: Region[] = ['quads', 'hamstrings', 'glutes']

/**
 * Orden fijo de desempate (documentado en EVIDENCIA): puntos de partida prácticos «sin preferencia» del apartado 4.3.
 * 2 días: cuerpo completo estándar o breve; 3: cuerpo completo o torso/pierna/cuerpo completo (PPL 3 como alternativa);
 * 4: torso/pierna, pierna anterior/posterior o anterior/posterior; 5: PPL+torso/pierna; casa y parque según material.
 */
const TIE_ORDER = ['A01', 'A02', 'A06', 'A15', 'A14', 'A17', 'A18', 'A16', 'A11', 'A08', 'A13', 'A12', 'A09', 'A05', 'A21', 'A22', 'A20', 'A23', 'A26', 'A25', 'A24', 'A03', 'A04', 'A07', 'A19', 'A10']

export function sessionTarget(profile: Profile): number {
  const available = new Set(profile.days).size
  return Math.min(available, AUTO_SESSION_CAP[profile.level])
}

/** Evalúa todas las recetas para un perfil y las ordena. Determinista: sin azar y con desempate fijo. */
export function rankRecipes(profile: Profile, opts: { split?: SplitPref; learningDone?: boolean } = {}): RecipeFit[] {
  const split = opts.split ?? profile.splitPref ?? 'none'
  const available = new Set(profile.days).size
  const target = sessionTarget(profile)
  const priorities = new Set(profile.priorityRegions ?? [])
  const wantsLower = LOWER.some((r) => priorities.has(r))
  const out: RecipeFit[] = RECIPES.map((r) => {
    const build = buildFromRecipe(r, profile, { learningDone: opts.learningDone })
    const k = r.sessions.length
    const conflicts: RecipeConflict[] = []
    const reasons: string[] = []
    if (build.blocked) conflicts.push({ kind: 'blocked', text: build.blocked, hard: true })
    if (build.missing.length) conflicts.push({ kind: 'material', text: `Falta material: ${build.missing.map((e) => EQUIPMENT_LABEL[e].toLowerCase()).join(', ')}.`, hard: true })
    if (k > available) conflicts.push({ kind: 'days', text: `Necesita ${k} días y tienes ${available} marcados.`, hard: true })
    if (!profile.locations.includes(r.location)) conflicts.push({ kind: 'place', text: `Pensada para ${PLACE_LABEL[r.place].toLowerCase()}; tu perfil no marca ese lugar.`, hard: true })
    if (r.explicitOnly) conflicts.push({ kind: 'explicit', text: 'Solo por elección explícita (no se recomienda automáticamente).', hard: true })
    if (!r.levels.includes(profile.level)) conflicts.push({ kind: 'level', text: `Pensada para: ${r.forWhom.toLowerCase()}.`, hard: true })
    if (r.lowerPriority && !wantsLower) conflicts.push({ kind: 'priority', text: 'Solo si has pedido prioridad de pierna o glúteos.', hard: true })
    const goalIdxs = r.goals.map((g) => GOAL_COMPAT[profile.goal].indexOf(g)).filter((i) => i >= 0)
    const goalIdx = goalIdxs.length ? Math.min(...goalIdxs) : 9
    if (goalIdx === 9) conflicts.push({ kind: 'goal', text: `Objetivo distinto del tuyo (${GOAL_LABEL[r.goals[0]].toLowerCase()}).`, hard: true })
    if (profile.frequency !== 'auto') {
      const f = profile.frequency
      const short = build.table.filter((t) => t.target && t.directDays < f)
      if (short.length) conflicts.push({ kind: 'frequency', text: `No encaja con frecuencia ${f}: ${short.map((t) => `${REGION_LABEL[t.region].toLowerCase()} ${t.directDays} ${t.directDays === 1 ? 'día' : 'días'}`).join(', ')}.`, hard: false })
    }
    const overTime = build.maxMinutes > profile.minutesPerSession * 1.05
    if (overTime) {
      const longest = build.minutes.reduce((a, b) => (b.base.minutes > a.base.minutes ? b : a))
      conflicts.push({ kind: 'time', text: `Sesión más larga ${fmtRange(longest.base)}; indicas ${profile.minutesPerSession} min.`, hard: false })
    }
    if (k === target) reasons.push(`Usa ${k} de tus ${available} días`)
    if (split !== 'none' && matchesSplit(r, split)) reasons.push(`Reparto preferido: ${SPLIT_PREF_LABEL[split].toLowerCase()}`)
    if (goalIdx === 0) reasons.push(`Objetivo: ${GOAL_LABEL[r.goals[0]].toLowerCase()}`)
    if (!overTime) reasons.push(`Cabe en ${profile.minutesPerSession} min`)
    const fits = !conflicts.some((c) => c.hard)
    const dayRank = k === target ? 0 : k < target ? 1 + (target - k) : 10 + (k - target)
    const splitRank = split === 'none' ? 0 : matchesSplit(r, split) ? 0 : 1
    const freqRank = conflicts.some((c) => c.kind === 'frequency') ? 1 : 0
    const placeRank = profile.locations.includes(r.location) ? 0 : 1
    const lowerRank = r.lowerPriority && wantsLower ? 0 : 1
    const rank = [fits ? 0 : 1, splitRank, dayRank, placeRank, goalIdx, freqRank, overTime ? 1 : 0, wantsLower ? lowerRank : 0, TIE_ORDER.indexOf(r.code)]
    return { recipe: r, build, fits, conflicts, reasons, rank }
  })
  return out.sort((a, b) => cmp(a.rank, b.rank))
}

function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0)
  return 0
}

export function matchesSplit(r: Recipe, split: SplitPref): boolean {
  if (split === 'none') return true
  if (split === 'strength') return r.splits.includes('strength')
  return r.splits.includes(split)
}

/** Alternativas cuando la receta no cabe en el tiempo indicado (no se recorta nada sin aceptación). */
export function timeAlternatives(fit: RecipeFit, all: RecipeFit[], profile: Profile): { label: string; detail: string; recipeId?: string }[] {
  const out: { label: string; detail: string; recipeId?: string }[] = []
  const r = fit.recipe
  const max = fit.build.maxMinutes
  out.push({ label: `Indicar más minutos (≈${Math.ceil(max / 5) * 5})`, detail: 'Cambia el tiempo de tu perfil y mantén la receta completa.' })
  if (r.briefVariant) {
    const b = all.find((x) => x.recipe.code === r.briefVariant)
    if (b) out.push({ label: `Variante breve: ${b.recipe.name}`, detail: `Sesión más larga ≈${b.build.maxMinutes} min. Menos dosis y cobertura: no promete el mismo resultado.`, recipeId: b.recipe.id })
  }
  const other = all.find((x) => x.fits && x.recipe.id !== r.id && x.build.maxMinutes <= profile.minutesPerSession * 1.05 && x.recipe.sessions.length >= r.sessions.length)
  if (other) out.push({ label: `Otro reparto: ${other.recipe.name}`, detail: `Sesión más larga ≈${other.build.maxMinutes} min.`, recipeId: other.recipe.id })
  out.push({ label: 'Editar una sesión concreta', detail: 'Tras elegirla, puedes quitar o mover un ejercicio concreto viendo el cambio de dosis antes de guardar.' })
  return out
}

/** Id estable de una propuesta (para comparar «misma propuesta»). */
export function buildFingerprint(b: RecipeBuild): string {
  return stableHash(JSON.stringify([b.recipe.id, b.recipe.version, b.draft.days.map((d) => d.exercises.map((e) => [e.exerciseId, e.prescription.sets, e.prescription.repMin, e.prescription.repMax]))]))
}

export function weekdaysText(r: Pick<Recipe, 'sessions'>): string {
  return r.sessions.map((s) => WEEKDAY_SHORT[s.weekday]).join(' ')
}
