/**
 * Modelo de dominio de Forja.
 * Todo lo que se guarda en IndexedDB usa estos tipos. Los IDs son cadenas estables.
 * Las fechas se guardan como milisegundos epoch (number) o como 'YYYY-MM-DD' (string local).
 */

// ───────────────────────── Catálogo ─────────────────────────

export type MuscleId =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  // Solo como secundarios (no tienen objetivo de volumen propio):
  | 'traps'
  | 'lower_back'
  | 'forearms'
  | 'adductors'
  | 'abductors'
  | 'obliques'

export type EquipmentId =
  | 'barbell' // barra olímpica + discos
  | 'ez_bar'
  | 'rack' // jaula/soportes para sentadilla y banca
  | 'dumbbell'
  | 'bench' // banco plano/inclinable (en casa vale un banco o silla estable cuando se indica)
  | 'machine' // máquinas guiadas (prensa, extensiones, etc.)
  | 'cable' // poleas
  | 'smith' // multipower
  | 'pullup_bar'
  | 'low_bar' // barra fija a la altura de la cadera (multipower, rack o parque)
  | 'bands'
  | 'hyper_bench' // banco de hiperextensiones
  | 'chair' // silla/sofá estable (casa)
  | 'step' // escalón o escalera firme
  | 'wall' // pared despejada (flexiones en pared): solo si se confirma

export type Pattern =
  | 'squat' // dominante de rodilla bilateral
  | 'lunge' // dominante de rodilla unilateral
  | 'hinge' // bisagra de cadera
  | 'glute' // extensión de cadera / glúteo
  | 'push_h' // empuje horizontal
  | 'push_v' // empuje vertical
  | 'pull_h' // tirón horizontal
  | 'pull_v' // tirón vertical
  | 'lats_iso'
  | 'chest_iso'
  | 'shoulder_lat' // elevaciones laterales
  | 'shoulder_rear'
  | 'traps'
  | 'biceps'
  | 'triceps'
  | 'knee_ext'
  | 'knee_flex'
  | 'hip_abd'
  | 'hip_add'
  | 'calves'
  | 'core_flex'
  | 'core_stab'
  | 'back_ext'

/**
 * Qué representa el número de "peso" en un ejercicio. Es CLAVE para no sumar ni duplicar pesos ambiguos.
 * - barbell_total: carga total de la barra (barra + discos).
 * - dumbbell_each: peso de UNA mancuerna (si usas dos, cada una pesa eso).
 * - machine: la carga que marca la máquina (no comparable entre máquinas distintas).
 * - cable: la carga que marca la polea.
 * - bodyweight: solo peso corporal; se pueden anotar lastre (añadido) o asistencia (restada).
 * - assisted: máquina/banda de asistencia: el número es la asistencia (más asistencia = más fácil).
 * - band: banda elástica; se anota la resistencia de la banda como texto/nivel.
 * - time: ejercicio por tiempo (isométrico).
 */
export type LoadType =
  | 'barbell_total'
  | 'dumbbell_each'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'assisted'
  | 'band'
  | 'time'

export type Level = 'beginner' | 'returning' | 'intermediate'

export interface MediaRef {
  /** id en el manifiesto de medios */
  mediaId: string
}

export interface Exercise {
  id: string
  name: string
  synonyms: string[]
  primary: MuscleId[]
  secondary: MuscleId[]
  /** Todo el material imprescindible. Alternativas de material se modelan como ejercicios distintos. */
  equipment: EquipmentId[]
  pattern: Pattern
  category: 'compound' | 'isolation' | 'core'
  /** Nivel mínimo recomendado para usarlo en rutinas generadas. */
  minLevel: Level
  loadType: LoadType
  /** true si se registra por lado (zancada, remo a una mano...). */
  unilateral: boolean
  /** Perfil de repeticiones: condiciona los rangos por defecto. */
  repProfile: 'heavy' | 'moderate' | 'light'
  instructions: string[]
  errors: string[]
  media: MediaRef[]
  /** 'verificada': demo revisada que corresponde a esta variante. 'pendiente': sin demo válida (no se usa en rutinas incluidas). */
  demoStatus: 'verificada' | 'pendiente'
  /** Ejercicio más fácil/difícil de la misma familia (progresión de variantes). */
  easier?: string
  harder?: string
  /** Contenido creado por la persona usuaria. */
  custom?: boolean
  /** Nota visible sobre la variante (p. ej. "la ilustración muestra máquina de fondos asistidos"). */
  variantNote?: string
  archived?: boolean
  createdAt?: number
  /** Tres claves para ver durante la sesión (fichas enriquecidas). */
  keys?: string[]
  /** «Aprender este ejercicio» (fichas enriquecidas con la redacción de la especificación del 14/11/2026). */
  learn?: ExerciseLearn
}

export interface ExerciseLearn {
  /** Preparación y ejecución. */
  detail: string
  /** Variantes y alternativas. */
  alternatives?: string
  /** Avisos de alcance de la ficha. */
  notes?: string[]
  /** Códigos de fuente (T1–T9 técnicas, E1–E14 científicas). */
  sources: string[]
}

export interface MediaItem {
  id: string
  exerciseId: string
  kind: 'frames' | 'video_embed' | 'user_image'
  provider: 'everkinetic' | 'wikimedia-commons' | 'youtube' | 'user'
  /** Rutas relativas a la app (frames) o URL externa (vídeo). */
  frames?: string[]
  /** Duración de cada fotograma (ms). Si falta, se alterna con fundido (dos posiciones). */
  frameDurationsMs?: number[] | null
  /** Dibujo en color: no se invierten los colores en tema oscuro. */
  colored?: boolean
  embedUrl?: string
  watchUrl?: string
  sourceUrl: string
  sourceFiles?: string[]
  author: string
  license: string
  licenseUrl: string
  attribution: string
  modifications?: string
  cachePolicy: 'offline_permitido' | 'solo_online'
  checkedAt: string
  verification: string
  bytes?: number
}

// ───────────────────────── Perfil ─────────────────────────

export type Goal = 'hypertrophy' | 'strength' | 'mixed' | 'general'
export type Location = 'gym' | 'home' | 'outdoor'
export type AgeBand = 'under14' | '14to17' | '18to39' | '40to64' | '65plus'
export type FrequencyPref = 'auto' | 1 | 2 | 3

/** Señales que sacan a la persona del alcance de un generador general. */
export interface Limitations {
  painNow: boolean // dolor articular o muscular persistente al moverse/entrenar
  recentInjury: boolean // lesión reciente, cirugía o rehabilitación en curso
  cardioMetabolic: boolean // enfermedad cardiovascular, metabólica o renal, o síntomas (dolor torácico, mareos, ahogo desproporcionado)
  pregnancy: boolean // embarazo o posparto reciente
  otherCondition: boolean // otra condición médica que limite el ejercicio
  notes: string
  /** La persona declara que un profesional sanitario la ha valorado y autorizado. */
  clearedByProfessional: boolean
}

export interface Increments {
  barbellKg: number // salto mínimo de carga total en barra (p. ej. 2,5 = 1,25 por lado)
  dumbbellKg: number // salto entre mancuernas disponibles
  machineKg: number
  cableKg: number
  barKg: number // peso de la barra vacía
}

/**
 * Regiones del panel de volumen (motor 2). No son medidas de crecimiento: es una contabilidad orientativa
 * (principal 1, secundario 0,5, estabilizador 0; ver docs/EVIDENCIA.md, sección 4 del encargo).
 */
export type Region =
  | 'chest'
  | 'back'
  | 'delt_front'
  | 'delt_side'
  | 'delt_rear'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  /** Tronco con repeticiones (encogimientos, etc.). */
  | 'core'
  /** Tronco por tiempo (planchas): unidad propia, no se suma con el dinámico. */
  | 'core_iso'
  /** Hombro sin región: clasificación antigua de ejercicios no revisados con la política nueva. */
  | 'delt_unspecified'

export interface Profile {
  id: 'me'
  level: Level
  goal: Goal
  /** Días de la semana disponibles: 0 = lunes … 6 = domingo. */
  days: number[]
  minutesPerSession: number
  locations: Location[]
  equipment: EquipmentId[]
  frequency: FrequencyPref
  excludedExercises: string[]
  priorityMuscles: MuscleId[]
  preferences: string
  ageBand: AgeBand
  limitations: Limitations
  increments: Increments
  createdAt: number
  updatedAt: number
  /** Prioridades por región (motor 2). Si falta, se deriva de priorityMuscles. */
  priorityRegions?: Region[]
  /** Grupos añadidos al objetivo de frecuencia (opción avanzada). Por defecto: pecho, espalda, cuádriceps, isquios y glúteos. */
  frequencyExtraRegions?: Region[]
  /** Fuerza/mixto: hasta 3 ejercicios de referencia, en orden de prioridad. */
  strengthRefs?: string[]
  /** Vuelta tras pausa: empezar con 4 sesiones de adaptación (por defecto sí). */
  returningAdaptation?: boolean
}

// ───────────────────────── Rutinas ─────────────────────────

export interface Prescription {
  sets: number
  repMin: number
  repMax: number
  /** Repeticiones en reserva objetivo (rango). */
  rirMin: number
  rirMax: number
  restSec: number
  warmupSets: number
  /** Para ejercicios por tiempo: segundos objetivo. */
  timeMinSec?: number
  timeMaxSec?: number
  note?: string
  /** Unidad de la serie (motor 2). Sin valor = dato antiguo: se deduce del ejercicio. */
  unit?: 'reps' | 'time' | 'distance'
  /** Ejercicio de referencia de fuerza (se practica primero). */
  reference?: boolean
}

export interface RoutineExercise {
  /** id único dentro de la versión */
  uid: string
  exerciseId: string
  prescription: Prescription
  /** Grupo de superserie (mismo valor = se alternan). Opción avanzada. */
  superset?: string
  /** Accesorio opcional: es lo primero que se quita si no hay tiempo. */
  optional?: boolean
  /** Técnica elegida para este ejercicio (series descendentes o rest-pause). Sin valor = series normales. */
  technique?: RoutineTechnique
}

/** Método de un bloque especial. Sin método = serie convencional. No es un tipo de calentamiento. */
export type SetMethod = 'drop' | 'rest_pause'

/**
 * Técnica configurada en la rutina (queda registrada en la versión).
 * - reorganize: dos series normales se sustituyen por un bloque (inicial + bajada/miniserie). Puede ahorrar tiempo; no se garantiza la misma dosis.
 * - extend: la última serie se prolonga con una bajada/miniserie. Añade trabajo.
 */
export interface RoutineTechnique {
  method: SetMethod
  mode: 'reorganize' | 'extend'
  /** Bajadas o miniseries tras el tramo inicial: 1 por defecto; 2 solo si se elige expresamente. */
  extra: 1 | 2
}

export interface RoutineDay {
  id: string
  name: string
  focus: SessionFocus
  exercises: RoutineExercise[]
}

export type SessionFocus = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'arms_shoulders' | 'custom'

export interface MuscleVolume {
  muscle: MuscleId
  directSets: number
  indirectSets: number
  /** directas + 0,5 × indirectas (estimación documentada). */
  weighted: number
  /** Nº de días de la semana en que recibe al menos una serie directa. */
  frequencyDirect: number
  /** Nº de días con estímulo directo o indirecto. */
  frequencyAny: number
}

export interface RoutineAnalysis {
  volume: MuscleVolume[]
  dayMinutes: { dayId: string; minutes: number; breakdown: DurationBreakdown }[]
  /** Pares de días con el mismo grupo entrenado en días naturales consecutivos (incluye domingo→lunes). */
  recoveryWarnings: string[]
  coverageGaps: string[]
}

export interface DurationBreakdown {
  generalWarmupMin: number
  warmupSetsMin: number
  workMin: number
  restMin: number
  transitionsMin: number
}

export interface RoutineVersion {
  id: string
  routineId: string
  version: number
  createdAt: number
  engineVersion: string
  days: RoutineDay[]
  /** Asignación día de la semana (0=lunes) → id de día de rutina. */
  schedule: { weekday: number; dayId: string }[]
  /** Semanas de familiarización: una serie menos y más margen (RIR) al principio. */
  rampWeeks: number
  rationale: string[]
  warnings: string[]
  changeNote: string
  /** Motor 2: familiarización por sesiones completadas (≥70 % de las series). Sustituye a rampWeeks en versiones nuevas. */
  familiarization?: { sessions: number; reason: 'beginner' | 'returning' } | null
  /** Entradas del plan guardadas para reproducirlo (la cobertura real se calcula de days/schedule). */
  plan?: RoutinePlanInfo
}

export interface RoutinePlanInfo {
  engineVersion: string
  goal: Goal
  level: Level
  /** Frecuencia pedida: 'auto' o 1/2/3. */
  desiredFrequency: FrequencyPref
  /** Grupos a los que se aplica la frecuencia pedida. */
  targetRegions: Region[]
  /** Fuerza/mixto: referencias en orden de prioridad. */
  references: string[]
  minutes: number
}

export type RoutineKind = 'template' | 'generated' | 'custom' | 'blank'

export interface Routine {
  id: string
  name: string
  kind: RoutineKind
  templateId?: string
  status: 'active' | 'archived'
  currentVersionId: string
  createdAt: number
  updatedAt: number
  /** Fecha (YYYY-MM-DD) en que se activó; sirve para contar semanas. */
  startedOn: string
  isDemo?: boolean
}

/** Mover una sesión concreta a otra fecha sin tocar la plantilla. */
export interface ScheduleOverride {
  id: string
  routineId: string
  /** Fecha original planificada (YYYY-MM-DD). */
  fromDate: string
  /** Nueva fecha (YYYY-MM-DD) o null si se salta. */
  toDate: string | null
  dayId: string
}

// ───────────────────────── Sesiones ─────────────────────────

export type SetKind = 'warmup' | 'work'

export interface SetEntry {
  id: string
  kind: SetKind
  /** kg según el loadType del ejercicio (null = sin anotar). 0 es un valor válido. */
  weightKg: number | null
  reps: number | null
  /** Repeticiones en reserva declaradas (opcional, null = no anotado; NUNCA se inventa). */
  rir: number | null
  durationSec: number | null
  distanceM: number | null
  /** Asistencia (kg) en máquina/banda: más asistencia = más fácil. */
  assistKg: number | null
  /** Lastre añadido sobre el peso corporal. */
  addedKg: number | null
  /** Texto libre para bandas ("roja", "media"...). */
  bandLabel: string | null
  side: 'both' | 'left' | 'right'
  completed: boolean
  completedAt: number | null
  /** Isométricos: esfuerzo percibido 0–10 (opcional; no es RIR ni se convierte a RIR). */
  effort?: number | null
  /**
   * Bloque especial (serie descendente o rest-pause). Sin valor = serie convencional.
   * En un bloque, weightKg/reps de la serie quedan vacíos: lo real está en block.segments (tramo a tramo).
   */
  method?: SetMethod
  block?: SpecialBlock
}

/** Tramo REAL de un bloque: su propia carga y repeticiones (40 kg × 10 → 30 kg × 8 son dos tramos, no 40 × 18). */
export interface BlockSegment {
  id: string
  weightKg: number | null
  assistKg?: number | null
  addedKg?: number | null
  reps: number | null
  rir: number | null
  /** Pausa real antes de este tramo, en segundos (cambio de carga o pausa breve). null en el tramo inicial. */
  pauseSec: number | null
  /** Carga sugerida cuando se registró (informativa; lo que cuenta es la real). */
  suggestedKg?: number | null
  completedAt: number
}

export interface BlockTarget {
  /** Tramo inicial. */
  firstRepMin: number
  firstRepMax: number
  /** Bajadas o miniseries. */
  nextRepMin: number
  nextRepMax: number
  /** RIR orientativo por tramo (opcional al registrar; se admite 0). */
  rirMin: number
  rirMax: number
  /** Rest-pause: pausa breve objetivo (s). */
  pauseSec?: number
  /** Descendente: reducción orientativa (%). */
  dropPct?: number
}

export interface SpecialBlock {
  /** Tramos previstos: inicial + bajadas (descendente) o + miniseries (rest-pause). Máximo 3. */
  plannedSegments: number
  segments: BlockSegment[]
  /** Inicio del tramo pendiente (tras «Continuar bajada» o al terminar la pausa breve). */
  nextStartedAt: number | null
  /** Cómo terminó: con todos los tramos previstos o antes de tiempo. null = sin terminar. */
  ended: 'complete' | 'early' | null
  target: BlockTarget
  /** Origen: configurado en la rutina, reorganizando dos series pendientes o prolongando una serie. */
  origin: 'routine' | 'reorganize' | 'extend'
  /** Series normales a las que sustituye (2 al reorganizar, 1 al prolongar): para volver a series normales sin perder nada. */
  replaces?: number
  /** Lo que se está escribiendo del tramo actual (se guarda al momento; se vacía al registrar el tramo). */
  draft?: { weightKg: number | null; reps: number | null; rir: number | null }
}

export interface SessionExercise {
  uid: string
  exerciseId: string
  /** Copia del nombre en el momento de la sesión (no cambia si se edita el catálogo). */
  nameSnapshot: string
  loadTypeSnapshot: LoadType
  unilateralSnapshot: boolean
  prescription: Prescription | null
  sets: SetEntry[]
  notes: string
  /** La persona marca molestia o dolor: frena sugerencias de progresión. */
  painFlag: boolean
  superset?: string
  /** Si se sustituyó durante la sesión, id del ejercicio planificado originalmente. */
  replacedFrom?: string
  /** Ejercicios de peso corporal: el campo de kg es lastre (añadido) o asistencia (restada). */
  bwMode?: 'added' | 'assist'
}

export type SessionStatus = 'active' | 'completed' | 'partial' | 'discarded'

export interface Session {
  id: string
  status: SessionStatus
  routineId: string | null
  routineVersionId: string | null
  dayId: string | null
  title: string
  /** Fecha local (YYYY-MM-DD) del día de entrenamiento. */
  date: string
  startedAt: number
  endedAt: number | null
  /** Pausa: momento en que se pausó (null si no está pausada). */
  pausedAt: number | null
  pausedTotalMs: number
  exercises: SessionExercise[]
  notes: string
  /** Semana de familiarización aplicada al crear la sesión. */
  rampApplied: boolean
  engineVersion: string
  isDemo?: boolean
  updatedAt: number
  /** Temporizador de descanso persistido como marca temporal. */
  rest: RestTimerState | null
  /** Cómo llegaba la persona a la sesión (opcional; se pregunta al empezar). */
  readiness?: Readiness | null
  /** Sesión registrada a posteriori (sin cronómetro). */
  backdated?: boolean
  /** Duración declarada en minutos (sesiones registradas a posteriori). */
  manualDurationMin?: number
  /** Qué hacer con una sesión parcial: retomarla, pasar a la siguiente o repetirla otro día. */
  partialAction?: 'resume' | 'next' | 'repeat'
  /** Familiarización aplicada al crear la sesión (motor 2): número de sesión dentro de la fase. */
  familiarization?: { index: number; total: number; reason?: 'readaptation' | 'extended' } | null
}

// ───────────────────────── Programa (fases) ─────────────────────────

/** Fase del programa: cómo organiza Forja tus propuestas. No certifica el nivel físico ni cambia la experiencia declarada. */
export type ProgramPhase = 'learning' | 'consolidation' | 'progression'

/** Decisiones guardadas del programa (meta «program»; viaja en las copias). Aprendizaje se deriva de la familiarización. */
export interface ProgramState {
  /** Fecha (YYYY-MM-DD) de entrada en Progresión al aceptar la revisión. Sin valor = Consolidación. */
  progressionSince?: string | null
  /** Última revisión pospuesta o descartada: no se vuelve a ofrecer antes de 14 días y 4 días válidos más. */
  review?: { decision: 'postponed' | 'declined'; on: string; validDaysAt: number } | null
  /** Aprendizaje prolongado a petición: se mantiene la dosis de familiarización hasta que se termine. */
  extendLearning?: boolean
  /** Readaptación tras una pausa de 21 días o más: se ofrece, nunca se aplica en silencio. */
  readaptation?: { lastValidBefore: string; decision: 'accepted' | 'declined'; on: string; sessions: number } | null
  /** «Quiero usar técnicas para ahorrar tiempo o variar». Sin consentimiento no se proponen técnicas. */
  techniquesConsent?: boolean
  /** Ejercicios que la persona confirma manejar (con historial) o declara conocer de antes (sin historial). */
  knownExercises?: Record<string, { at: number; basis: 'history' | 'prior' }>
  /** Avisos ya vistos (p. ej. paso a Consolidación de una versión de rutina). */
  seen?: string[]
  /** Registro de decisiones (no se borra). */
  log?: { at: number; text: string }[]
}

/** Autoevaluación 1–5. Sueño y energía: 1 = muy mal/baja, 5 = muy bien/alta. Agujetas: 1 = ninguna, 5 = muchas. */
export interface Readiness {
  sleep: number
  energy: number
  soreness: number
  at: number
}

export type MeasureSite = 'waist' | 'hips' | 'chest' | 'arm' | 'thigh' | 'calf' | 'neck'

/** Medida corporal con cinta métrica (cm). */
export interface MeasurementEntry {
  id: string
  date: string
  site: MeasureSite
  cm: number
  isDemo?: boolean
}

export type PhotoPose = 'front' | 'side' | 'back'

/** Foto de progreso: solo en este dispositivo (JPEG comprimido en data URL). */
export interface ProgressPhoto {
  id: string
  date: string
  pose: PhotoPose
  dataUrl: string
  bytes: number
  width: number
  height: number
  createdAt: number
}

export interface RestTimerState {
  startedAt: number
  durationSec: number
  /** id de la serie que lo inició */
  setId: string | null
  /**
   * Tipo (sin valor = descanso normal): transición de A1 a A2 en una superserie (sin aviso sonoro),
   * descanso de la ronda de superserie, o pausa breve de rest-pause.
   */
  kind?: 'rest' | 'transition' | 'round' | 'short'
  /** Texto corto para la barra (p. ej. «Ahora: extensión de tríceps»). */
  label?: string
}

export interface BodyWeightEntry {
  id: string
  date: string
  kg: number
  isDemo?: boolean
}

export interface ChangeLogEntry {
  id: string
  at: number
  entity: 'session' | 'routine' | 'profile' | 'backup'
  entityId: string
  summary: string
}

export interface ExerciseSetting {
  exerciseId: string
  incrementKg?: number
  restSec?: number
  note?: string
}

export interface MetaEntry {
  key: string
  value: unknown
}
