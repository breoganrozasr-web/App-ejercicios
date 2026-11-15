import { getExercise } from './catalog'
import { dayDuration, exercisePractice, scheduledDays, weeklyRegionVolume } from './engine/analysis'
import { REGION_LABEL, contributionOf } from './engine/contribution'
import { priorityRegionsOf } from './engine/generator'
import { PRIORITY_CEILING, maxSetsPerExercise, optionalAim, weeklyBudget } from './engine/params'
import { checkScope } from './engine/scope'
import { validDates } from './sessions'
import { MAX_WEEKLY_BLOCKS, TECHNIQUE_FRIENDLY, blocksOf, canUseMethod, conventionalWork, pairKind } from './techniques'
import type { Level, Profile, ProgramPhase, ProgramState, Region, Routine, RoutineDay, RoutineTechnique, RoutineVersion, Session, SetMethod } from './types'
import { addDays, daysBetween, newId } from './util'

/**
 * Fases del programa (ampliación del 14/11/2026, apartado 2): Aprendizaje → Consolidación → Progresión.
 * Tres cosas distintas: la experiencia DECLARADA (perfil; nunca cambia sola), la FASE (cómo organiza Forja sus propuestas)
 * y la FAMILIARIDAD con cada ejercicio (historial y declaración).
 * Los umbrales son REGLAS DE PRODUCTO para proponer una revisión: ningún estudio valida que 12 sesiones o seis semanas
 * conviertan a alguien en intermedio. No certifican técnica ni dominio físico.
 */
export const PHASE_RULES = {
  /** Días válidos (≥70 % de las series previstas, sin ejemplo, uno por fecha) para proponer la revisión. */
  reviewValidDays: 12,
  /** Días entre la primera sesión válida y hoy. */
  reviewSpanDays: 42,
  /** Ejercicios de referencia con exposiciones comparables completas… */
  reviewRefs: 2,
  /** …y cuántas exposiciones en cada uno. */
  reviewRefExposures: 3,
  /** Tras posponer o descartar, no se vuelve a ofrecer antes de 14 días Y 4 días válidos más. */
  snoozeDays: 14,
  snoozeValidDays: 4,
  /** Pausa a partir de la que se ofrece readaptación (orientativa, no mide pérdida muscular). */
  readaptationGapDays: 21,
  readaptationSessions: 4,
  /** Exposiciones ordinarias completas para poder proponer una técnica en un ejercicio (más la confirmación). */
  techniqueExposures: 4,
} as const

export const PHASE_LABEL: Record<ProgramPhase, string> = { learning: 'Aprendizaje', consolidation: 'Consolidación', progression: 'Progresión' }

// ───────────────────────── Exposiciones y familiaridad ─────────────────────────

/**
 * Exposiciones ordinarias completas de un ejercicio: fechas (sin datos de ejemplo) en que se hizo con series convencionales,
 * todas las previstas completadas y sin bloques especiales. Una por fecha.
 */
export function ordinaryExposures(exerciseId: string, sessions: Session[]): string[] {
  const dates = new Set<string>()
  for (const s of sessions) {
    if (s.isDemo || (s.status !== 'completed' && s.status !== 'partial')) continue
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId || blocksOf(e.sets).length) continue
      const work = conventionalWork(e.sets)
      if (work.length && work.every((x) => x.completed)) dates.add(s.date)
    }
  }
  return [...dates].sort()
}

export type Familiarity = 'unknown' | 'learning' | 'known'
export const FAMILIARITY_LABEL: Record<Familiarity, string> = { unknown: 'Desconocido', learning: 'En aprendizaje', known: 'Conocido' }

export interface FamiliarityInfo {
  level: Familiarity
  exposures: number
  /** Confirmación de la persona: con historial («lo manejo con control») o experiencia previa sin historial. */
  declared: 'history' | 'prior' | null
  /** Se le puede proponer una técnica: 4 exposiciones ordinarias + confirmación, o experiencia previa declarada. */
  techniqueReady: boolean
}

/** Familiaridad con un ejercicio. Un ejercicio nuevo no hereda el dominio de otros ni de la fase general. */
export function exerciseFamiliarity(exerciseId: string, sessions: Session[], state: ProgramState): FamiliarityInfo {
  const exposures = ordinaryExposures(exerciseId, sessions).length
  const declared = state.knownExercises?.[exerciseId]?.basis ?? null
  const level: Familiarity = declared === 'prior' || exposures >= PHASE_RULES.techniqueExposures ? 'known' : exposures > 0 ? 'learning' : 'unknown'
  const techniqueReady = declared === 'prior' || (declared === 'history' && exposures >= PHASE_RULES.techniqueExposures)
  return { level, exposures, declared, techniqueReady }
}

/**
 * Ejercicios de referencia de la rutina: las referencias del plan (fuerza/mixto) o, si no hay, los multiarticulares
 * ordenados por práctica semanal (los principales de la rutina).
 */
export function referenceExercises(version: Pick<RoutineVersion, 'days' | 'schedule' | 'plan'>): string[] {
  const all = version.days.flatMap((d) => d.exercises)
  const uniq = (ids: string[]) => [...new Set(ids)]
  const fromPlan = uniq((version.plan?.references ?? []).filter((id) => all.some((e) => e.exerciseId === id)))
  if (fromPlan.length) return fromPlan
  const flagged = uniq(all.filter((e) => e.prescription.reference).map((e) => e.exerciseId))
  if (flagged.length) return flagged
  const practice = exercisePractice(version)
  const compounds = uniq(all.filter((e) => getExercise(e.exerciseId)?.category === 'compound').map((e) => e.exerciseId))
  return compounds.map((id, i) => ({ id, i })).sort((a, b) => (practice.get(b.id) ?? 0) - (practice.get(a.id) ?? 0) || a.i - b.i).map((x) => x.id)
}

// ───────────────────────── Vista del programa ─────────────────────────

export interface ProgramInput {
  profile: Profile
  routine: Routine | null
  version: RoutineVersion | null
  sessions: Session[]
  state: ProgramState
  today: string
}

export interface ProgramView {
  phase: ProgramPhase
  declared: Level
  youth: boolean
  healthBlock: boolean
  /** Familiarización de la rutina actual (Aprendizaje). */
  learning: { completed: number; total: number; unit: 'days' | 'weeks'; reason: 'beginner' | 'returning' | 'motor1'; extended: boolean } | null
  /** Fecha en que se completó la familiarización de la versión actual (para avisar del paso a Consolidación). */
  learningDoneOn: string | null
  validDays: number
  firstValid: string | null
  lastValid: string | null
  /** Días entre la primera sesión válida y hoy. */
  spanDays: number
  refs: { exerciseId: string; exposures: number }[]
  refsRequired: number
  milestones: { validDays: boolean; span: boolean; refs: boolean; health: boolean }
  /** Hitos cumplidos en Consolidación (aunque se haya pospuesto). */
  reviewReady: boolean
  /** Hitos cumplidos y sin aplazamiento vigente: se muestra la tarjeta. */
  reviewDue: boolean
  snooze: { untilDate: string; untilValidDays: number; active: boolean } | null
  readaptation: { offer: boolean; gapDays: number; active: { index: number; total: number } | null; ended: { total: number } | null; trainedOutside: boolean }
}

export function computeProgram(i: ProgramInput): ProgramView {
  const scope = checkScope(i.profile)
  const youth = scope.kind === 'youth'
  const healthBlock = scope.kind === 'out'
  const real = i.sessions.filter((s) => !s.isDemo)
  const dates = validDates(real)
  const validDays = dates.length
  const firstValid = dates[0] ?? null
  const lastValid = dates[dates.length - 1] ?? null
  const spanDays = firstValid ? Math.max(0, daysBetween(firstValid, i.today)) : 0
  const inProgression = !!i.state.progressionSince

  let learning: ProgramView['learning'] = null
  let learningDoneOn: string | null = null
  if (i.routine && i.version && !inProgression) {
    const fam = i.version.familiarization
    if (fam) {
      // Días válidos de todas las rutinas: cambiar de plantilla no reinicia ni acelera el aprendizaje (encargo 15/11/2026, 3.2).
      const rd = validDates(real)
      if (rd.length < fam.sessions) learning = { completed: rd.length, total: fam.sessions, unit: 'days', reason: fam.reason, extended: false }
      else {
        learningDoneOn = rd[fam.sessions - 1]
        if (i.state.extendLearning) learning = { completed: rd.length, total: fam.sessions, unit: 'days', reason: fam.reason, extended: true }
      }
    } else if (i.version.rampWeeks > 0) {
      const weeks = Math.floor(daysBetween(i.routine.startedOn, i.today) / 7)
      if (weeks < i.version.rampWeeks) learning = { completed: weeks, total: i.version.rampWeeks, unit: 'weeks', reason: 'motor1', extended: false }
      else {
        learningDoneOn = addDays(i.routine.startedOn, i.version.rampWeeks * 7)
        if (i.state.extendLearning) learning = { completed: weeks, total: i.version.rampWeeks, unit: 'weeks', reason: 'motor1', extended: true }
      }
    }
  }
  const phase: ProgramPhase = inProgression ? 'progression' : learning ? 'learning' : 'consolidation'

  const refIds = i.version ? referenceExercises(i.version) : []
  const refs = refIds.map((id) => ({ exerciseId: id, exposures: ordinaryExposures(id, real).length }))
  const refsRequired = refIds.length ? Math.min(PHASE_RULES.reviewRefs, refIds.length) : PHASE_RULES.reviewRefs
  const refsOk = refIds.length > 0 && refs.filter((r) => r.exposures >= PHASE_RULES.reviewRefExposures).length >= refsRequired
  const milestones = { validDays: validDays >= PHASE_RULES.reviewValidDays, span: spanDays >= PHASE_RULES.reviewSpanDays, refs: refsOk, health: !healthBlock }
  const reviewReady = phase === 'consolidation' && !youth && milestones.validDays && milestones.span && milestones.refs && milestones.health
  const r = i.state.review
  const snooze = r ? { untilDate: addDays(r.on, PHASE_RULES.snoozeDays), untilValidDays: r.validDaysAt + PHASE_RULES.snoozeValidDays, active: false } : null
  if (snooze) snooze.active = i.today < snooze.untilDate || validDays < snooze.untilValidDays
  const reviewDue = reviewReady && !snooze?.active

  const gapDays = lastValid ? Math.max(0, daysBetween(lastValid, i.today)) : 0
  const ra = i.state.readaptation
  let active: { index: number; total: number } | null = null
  let ended: { total: number } | null = null
  if (ra?.decision === 'accepted') {
    const since = validDates(real, (s) => s.date >= ra.on).length
    if (since < ra.sessions) active = { index: since + 1, total: ra.sessions }
    else if (!ra.endReviewed) ended = { total: ra.sessions }
  }
  const offer = !youth && !!lastValid && gapDays >= PHASE_RULES.readaptationGapDays && !(ra && ra.lastValidBefore === lastValid) && phase !== 'learning' && !active

  return {
    phase, declared: i.profile.level, youth, healthBlock, learning, learningDoneOn, validDays, firstValid, lastValid, spanDays, refs, refsRequired, milestones, reviewReady, reviewDue,
    snooze, readaptation: { offer, gapDays, active, ended, trainedOutside: ra?.decision === 'trained_outside' && ra.lastValidBefore === lastValid },
  }
}

/** Próximo punto de revisión, en texto. */
export function nextReviewText(v: ProgramView): string {
  if (v.youth) return 'Programa supervisado para menores: los cambios se revisan con quien te supervisa.'
  if (v.phase === 'learning' && v.learning) {
    if (v.learning.extended) return 'Has elegido prolongar el aprendizaje: seguirá hasta que decidas terminarlo.'
    return v.learning.unit === 'days'
      ? `Al completar ${v.learning.total} días válidos de familiarización pasarás a Consolidación (llevas ${v.learning.completed}).`
      : `La familiarización de esta rutina antigua dura ${v.learning.total} semanas desde que empezó.`
  }
  if (v.phase === 'progression') return 'Sin revisión programada. Si cambian tu objetivo, tu material o tu tiempo, pide una propuesta nueva para compararla.'
  if (v.snooze?.active && v.reviewReady) return `Revisión pospuesta: se volverá a ofrecer a partir del ${v.snooze.untilDate.split('-').reverse().join('/')} y con ${v.snooze.untilValidDays} días válidos (llevas ${v.validDays}).`
  if (v.reviewReady) return 'Ya puedes revisar tu programa.'
  const missing: string[] = []
  if (!v.milestones.validDays) missing.push(`${PHASE_RULES.reviewValidDays - v.validDays} días válidos más (llevas ${v.validDays} de ${PHASE_RULES.reviewValidDays})`)
  if (!v.milestones.span) missing.push(v.firstValid ? `${PHASE_RULES.reviewSpanDays - v.spanDays} días más desde tu primera sesión válida` : 'empezar a registrar sesiones')
  if (!v.milestones.refs) missing.push(`${PHASE_RULES.reviewRefExposures} sesiones completas en ${v.refsRequired} ejercicios de referencia`)
  if (!v.milestones.health) missing.push('que tu perfil no tenga señales de salud activas')
  return `Revisión cuando se cumpla todo: ${missing.join('; ')}. La fecha sola nunca basta.`
}

// ───────────────────────── Revisión breve y propuesta comparada ─────────────────────────

export interface ReviewAnswers {
  /** ¿Manejas los ejercicios con control? */
  control: boolean | null
  /** ¿Toleras bien la rutina? */
  tolerance: boolean | null
  /** ¿El tiempo disponible sigue siendo adecuado? */
  time: boolean | null
}

export interface ReviewExtra {
  region: Region
  dayId: string
  dayName: string
  uid: string
  exerciseId: string
  setsBefore: number
  directBefore: number
  directAfter: number
  minutesBefore: number
  minutesAfter: number
}

/** Veces por semana que se hace cada día (sin calendario: una). */
function dayOccurrences(version: Pick<RoutineVersion, 'days' | 'schedule'>): Map<string, number> {
  const m = new Map<string, number>()
  if (!version.schedule.length) for (const d of version.days) m.set(d.id, 1)
  for (const s of version.schedule) m.set(s.dayId, (m.get(s.dayId) ?? 0) + 1)
  return m
}

/**
 * Propuesta comparada al revisar la fase. Mantener la rutina es siempre válido: subir de fase NO obliga a más series,
 * dificultad ni días. Solo con una prioridad expresa, tiempo disponible y respuestas favorables se ofrece, como opción,
 * +1 serie semanal para ESE grupo (un ejercicio que trabaje la región, en un día que se hace una vez por semana).
 * Fuerza: se prioriza la práctica de las referencias; no se introducen máximos ni se pasa todo a 4–6 repeticiones.
 */
export function reviewProposal(version: Pick<RoutineVersion, 'days' | 'schedule'>, profile: Profile, a: ReviewAnswers): { extra: ReviewExtra | null; notes: string[] } {
  const notes: string[] = []
  if (a.control === false) notes.push('Si aún no manejas algún ejercicio con control, lo más útil es mantener la rutina y seguir practicándolo. No añadimos nada.')
  if (a.tolerance === false) notes.push('Si la rutina se te hace pesada, no añadimos series. Puedes seguir como estás o pedir una propuesta más corta desde Rutinas.')
  if (a.time === false) notes.push('Si tu tiempo disponible ha cambiado, actualízalo en el perfil y pide una propuesta nueva para compararla. Mientras, tu rutina se mantiene.')
  if (profile.goal === 'strength') notes.push('Fuerza: sigue practicando y progresando tus ejercicios de referencia conocidos. No se introducen máximos ni se pasan todos los ejercicios a 4–6 repeticiones.')
  const favourable = a.control === true && a.tolerance === true && a.time === true
  if (!favourable || profile.goal === 'strength') return { extra: null, notes }
  const occ = dayOccurrences(version)
  const volume = weeklyRegionVolume(version)
  for (const region of priorityRegionsOf(profile)) {
    const budget = weeklyBudget(region, profile.level, profile.goal, true)
    const limit = budget ? PRIORITY_CEILING : optionalAim(region, true, profile.goal)
    const cur = volume.find((v) => v.region === region)?.direct ?? 0
    if (!limit || cur + 1 > limit) continue
    const options: ReviewExtra[] = []
    for (const day of version.days) {
      if ((occ.get(day.id) ?? 0) !== 1) continue
      const before = dayDuration(day).minutes
      for (const re of day.exercises) {
        if (re.optional || re.technique || re.prescription.sets >= maxSetsPerExercise()) continue
        if (!contributionOf(re.exerciseId).items.some((c) => c.region === region && c.weight === 1)) continue
        const after = dayDuration({ ...day, exercises: day.exercises.map((e) => (e.uid === re.uid ? { ...e, prescription: { ...e.prescription, sets: e.prescription.sets + 1 } } : e)) }).minutes
        if (after > profile.minutesPerSession * 1.05) continue
        options.push({ region, dayId: day.id, dayName: day.name, uid: re.uid, exerciseId: re.exerciseId, setsBefore: re.prescription.sets, directBefore: cur, directAfter: cur + 1, minutesBefore: before, minutesAfter: after })
      }
    }
    // La que deja la sesión más corta; en empate, la primera (orden de días y de ejercicios).
    const best = options.reduce<ReviewExtra | null>((b, o) => (!b || o.minutesAfter < b.minutesAfter ? o : b), null)
    if (best) return { extra: best, notes }
    notes.push(`${REGION_LABEL[region]}: no cabe una serie más en tu tiempo sin cambiar la estructura; se mantiene.`)
  }
  return { extra: null, notes }
}

/** Aplica +1 serie a un ejercicio (nueva versión; nunca se toca una sesión en curso). */
export function addOneSet(days: RoutineDay[], uid: string): RoutineDay[] {
  return days.map((d) => ({ ...d, exercises: d.exercises.map((e) => (e.uid === uid ? { ...e, prescription: { ...e.prescription, sets: e.prescription.sets + 1 } } : e)) }))
}

// ───────────────────────── Técnicas: elegibilidad y propuestas ─────────────────────────

export interface TechniqueGate {
  allowed: boolean
  reasons: string[]
}

/**
 * ¿Se pueden PROPONER series descendentes o rest-pause? Registrar lo que hiciste siempre es posible; proponer, no.
 * Adulto, sin señal de salud, fuera de familiarización y readaptación, en Progresión o con nivel intermedio declarado,
 * y con el consentimiento «Quiero usar técnicas para ahorrar tiempo o variar». Subir de fase no las activa.
 */
export function techniqueGate(v: ProgramView, state: ProgramState): TechniqueGate {
  const reasons: string[] = []
  if (!state.techniquesConsent) reasons.push('No has activado «Quiero usar técnicas para ahorrar tiempo o variar».')
  if (v.youth) reasons.push('No se proponen en el itinerario de menores.')
  if (v.healthBlock) reasons.push('No se proponen con una señal de salud activa en tu perfil.')
  if (v.phase === 'learning') reasons.push('No se proponen durante la familiarización.')
  if (v.readaptation.active) reasons.push('No se proponen durante la readaptación.')
  if (v.phase === 'consolidation' && v.declared !== 'intermediate') reasons.push('Se ofrecen en la fase de Progresión o si declaraste nivel intermedio o avanzado.')
  return { allowed: reasons.length === 0, reasons }
}

/** Bloques especiales previstos por semana en una rutina (según el calendario). */
export function weeklyPlannedBlocks(version: Pick<RoutineVersion, 'days' | 'schedule'>): number {
  return scheduledDays(version).reduce((n, { day }) => n + day.exercises.filter((e) => e.technique).length, 0)
}

export interface TechniqueCandidate {
  dayId: string
  dayName: string
  uid: string
  exerciseId: string
  sets: number
  methods: SetMethod[]
  canReorganize: boolean
}

/**
 * Ejercicios en los que se puede proponer UN bloque (descendente o rest-pause) al final de la sesión: aislamientos estables
 * de la lista, después de los multiarticulares del día, fuera de superseries, conocidos (4 exposiciones + confirmación o
 * experiencia previa), como máximo un bloque por sesión y dos por semana.
 */
export function techniqueCandidates(version: Pick<RoutineVersion, 'days' | 'schedule'>, sessions: Session[], state: ProgramState): { candidates: TechniqueCandidate[]; notes: string[] } {
  const notes: string[] = []
  const candidates: TechniqueCandidate[] = []
  const weekly = weeklyPlannedBlocks(version)
  if (weekly >= MAX_WEEKLY_BLOCKS) return { candidates, notes: [`Esta rutina ya tiene ${weekly} bloques especiales por semana: es el máximo inicial de Forja.`] }
  const occ = dayOccurrences(version)
  for (const day of version.days) {
    if (day.exercises.some((e) => e.technique)) continue
    if (weekly + (occ.get(day.id) ?? 1) > MAX_WEEKLY_BLOCKS) continue
    const lastCompound = day.exercises.reduce((m, e, i) => (getExercise(e.exerciseId)?.category === 'compound' ? i : m), -1)
    day.exercises.forEach((re, idx) => {
      if (idx < lastCompound || !TECHNIQUE_FRIENDLY.has(re.exerciseId) || re.superset) return
      const ex = getExercise(re.exerciseId)
      if (!ex) return
      const fam = exerciseFamiliarity(re.exerciseId, sessions, state)
      if (!fam.techniqueReady) {
        notes.push(`${ex.name}: ${fam.exposures >= PHASE_RULES.techniqueExposures ? 'confirma en su ficha que lo manejas con control' : `hacen falta ${PHASE_RULES.techniqueExposures} sesiones completas (llevas ${fam.exposures}) y tu confirmación, o declarar que ya lo conocías`}.`)
        return
      }
      const methods = (['drop', 'rest_pause'] as SetMethod[]).filter((m) => canUseMethod(m, ex.loadType))
      if (methods.length) candidates.push({ dayId: day.id, dayName: day.name, uid: re.uid, exerciseId: re.exerciseId, sets: re.prescription.sets, methods, canReorganize: re.prescription.sets >= 2 })
    })
  }
  return { candidates, notes: [...new Set(notes)] }
}

/** Pone o quita la técnica de un ejercicio de la rutina (nueva versión). */
export function setTechnique(days: RoutineDay[], uid: string, tech: RoutineTechnique | null): RoutineDay[] {
  return days.map((d) => ({
    ...d,
    exercises: d.exercises.map((e) => {
      if (e.uid !== uid) return e
      const next = { ...e }
      if (tech) next.technique = tech
      else delete next.technique
      return next
    }),
  }))
}

// ───────────────────────── Superseries propuestas ─────────────────────────

export interface SupersetProposal {
  dayId: string
  dayName: string
  a: string
  b: string
  kind: 'antagonist' | 'distinct'
  minutesBefore: number
  minutesAfter: number
}

const isAccessory = (exerciseId: string) => {
  const ex = getExercise(exerciseId)
  return !!ex && ex.category === 'isolation' && ex.loadType !== 'time'
}
const regionsOf = (id: string) => contributionOf(id).items.filter((c) => c.weight === 1).map((c) => c.region)

/** Agrupa dos ejercicios en superserie: el segundo pasa justo detrás del primero (nueva versión). */
export function pairExercises(days: RoutineDay[], dayId: string, a: string, b: string): RoutineDay[] {
  return days.map((d) => {
    if (d.id !== dayId) return d
    const list = d.exercises.filter((e) => e.uid !== b)
    const ib = d.exercises.find((e) => e.uid === b)
    const ia = list.findIndex((e) => e.uid === a)
    if (!ib || ia < 0) return d
    const tag = `ss-${newId().slice(0, 6)}`
    list.splice(ia + 1, 0, ib)
    return { ...d, exercises: list.map((e) => (e.uid === a || e.uid === b ? { ...e, superset: tag } : e)) }
  })
}

/**
 * Superseries para ahorrar tiempo: curl de bíceps + extensión de tríceps o dos accesorios de regiones diferentes.
 * Las referencias y los multiarticulares quedan al principio con sus descansos completos. Una propuesta por día como máximo.
 * Parejas del mismo músculo: solo por elección manual.
 */
export function supersetProposals(version: Pick<RoutineVersion, 'days' | 'schedule'>): SupersetProposal[] {
  const out: SupersetProposal[] = []
  for (const day of version.days) {
    if (day.exercises.some((e) => e.superset)) continue
    const acc = day.exercises.filter((e) => !e.technique && !e.prescription.reference && isAccessory(e.exerciseId))
    let pair: [string, string, 'antagonist' | 'distinct'] | null = null
    const bi = acc.find((e) => regionsOf(e.exerciseId).includes('biceps'))
    const tri = acc.find((e) => regionsOf(e.exerciseId).includes('triceps'))
    if (bi && tri) pair = [bi.uid, tri.uid, 'antagonist']
    else {
      outer: for (let i = 0; i < acc.length; i++) for (let j = i + 1; j < acc.length; j++) {
        if (pairKind(acc[i].exerciseId, acc[j].exerciseId) === 'distinct') {
          pair = [acc[i].uid, acc[j].uid, 'distinct']
          break outer
        }
      }
    }
    if (!pair) continue
    const before = dayDuration(day).minutes
    const paired = pairExercises([day], day.id, pair[0], pair[1])[0]
    const after = dayDuration(paired).minutes
    if (after < before) out.push({ dayId: day.id, dayName: day.name, a: pair[0], b: pair[1], kind: pair[2], minutesBefore: before, minutesAfter: after })
  }
  return out
}

// ───────────────────────── Decisiones (funciones puras sobre el estado) ─────────────────────────

export function logState(state: ProgramState, text: string, at = Date.now()): ProgramState {
  return { ...state, log: [...(state.log ?? []), { at, text }].slice(-200) }
}

export function decideReview(state: ProgramState, decision: 'postponed' | 'declined', today: string, validDays: number): ProgramState {
  return logState({ ...state, review: { decision, on: today, validDaysAt: validDays } }, decision === 'postponed' ? 'Revisión de fase: más adelante' : 'Revisión de fase: seguir como estoy')
}

export function enterProgression(state: ProgramState, today: string, note: string): ProgramState {
  return logState({ ...state, progressionSince: today, review: null, extendLearning: false }, `Entrada en Progresión${note ? ` (${note})` : ''}`)
}

/**
 * «Preparar mi vuelta» (1.5): readaptación pedida a mano, también sin historial local. Reutiliza la regla de cuatro días
 * válidos con max(1, mitad de series) y RIR 3–4 (decisión de producto, no protocolo clínico). No borra fase ni historial.
 */
export function acceptManualReturn(s: ProgramState, today: string, lastValid: string | null): ProgramState {
  return { ...s, readaptation: { lastValidBefore: lastValid ?? 'sin-registros', decision: 'accepted', on: today, sessions: PHASE_RULES.readaptationSessions, manual: true } }
}

/** Fin de la vuelta gradual: continuar con el plan base o prolongar dos días válidos más (sin afirmar recuperación). */
export function endReadaptation(s: ProgramState, choice: 'continue' | 'extend'): ProgramState {
  const ra = s.readaptation
  if (!ra || ra.decision !== 'accepted') return s
  return choice === 'extend' ? { ...s, readaptation: { ...ra, sessions: ra.sessions + 2 } } : { ...s, readaptation: { ...ra, endReviewed: true } }
}
