import { allExercises, getExercise, hasEquipment } from '../catalog'
import { LEVEL_RANK, MAJOR_MUSCLES, MUSCLE_LABEL } from '../catalog/exercises'
import type {
  EquipmentId, Exercise, Goal, Level, Location, MuscleId, Pattern, Prescription, Profile, RoutineDay, RoutineExercise, RoutineVersion, SessionFocus,
} from '../types'
import { WEEKDAY_NAME, stableHash } from '../util'
import { analyzeRoutine, cap, dayDuration, dayMuscleSets, weeklyVolume } from './analysis'
import { AUTO_SESSION_CAP, ENGINE_VERSION, PER_SESSION_SOFT_CAP, RAMP_WEEKS, weeklyTarget, type SlotRole } from './params'
import { buildPrescription, type PrescriptionContext } from './prescription'
import { checkScope } from './scope'

// ───────────────────────── Tipos públicos ─────────────────────────

export interface GenerateOptions {
  /** Frecuencia elegida desde una alternativa de conflicto. */
  frequencyOverride?: 1 | 2 | 3
  /** Usar este nº de sesiones (de los días disponibles). */
  sessionsOverride?: number
  /** Mantener todos los días disponibles aunque superen lo recomendado para el nivel. */
  acceptManyDays?: boolean
  trimAccessories?: boolean
  reduceSets?: boolean
  supersets?: boolean
  /** Completar el volumen orientativo aunque la sesión supere el tiempo indicado. */
  ignoreTime?: boolean
}

export interface RoutineDraft {
  name: string
  kind: 'generated' | 'template'
  templateId?: string
  days: RoutineDay[]
  schedule: { weekday: number; dayId: string }[]
  rampWeeks: number
  rationale: string[]
  warnings: string[]
  engineVersion: string
  youth: boolean
}

export interface TimeAdjustment {
  id: 'trim_accessories' | 'reduce_sets' | 'supersets' | 'add_day' | 'fill_volume'
  label: string
  explanation: string
  options: GenerateOptions
  maxMinutesAfter: number
}

export interface ConflictAlternative {
  label: string
  explanation: string
  options?: GenerateOptions
  /** Cambio que hay que hacer en el perfil (la UI lo pide explícitamente). */
  profileAction?: 'add_days'
}

export type GenerateResult =
  | { status: 'ok'; draft: RoutineDraft; notices: string[]; timeAdjustments: TimeAdjustment[]; overBudget: boolean }
  | { status: 'conflict'; code: string; message: string; alternatives: ConflictAlternative[] }
  | { status: 'out_of_scope'; reasons: string[]; message: string }

// ───────────────────────── Preferencias de ejercicios ─────────────────────────

/** Orden de preferencia por patrón (de más accesible a más técnico). Se filtra por material, nivel y exclusiones. */
export const PATTERN_PREFS: Record<Pattern, string[]> = {
  squat: ['prensa', 'sentadilla_banco_mancuernas', 'sentadilla_barra', 'sentadilla_mancuernas', 'sentadilla_multipower', 'sentadilla_banco_barra', 'sentadilla_sumo_mancuerna', 'sentadilla_banda', 'sentadilla_frontal', 'sentadilla_peso_corporal', 'sentadilla_silla'],
  hinge: ['peso_muerto_rumano_mancuernas', 'peso_muerto_rumano'],
  lunge: ['zancadas_mancuernas', 'subidas_banco', 'zancadas_caminando', 'zancadas_barra', 'zancada_apoyo', 'subida_escalon'],
  glute: ['puente_gluteo', 'patada_gluteo_polea'],
  back_ext: ['hiperextensiones', 'superman'],
  knee_flex: ['curl_femoral_tumbado', 'curl_femoral_sentado'],
  knee_ext: ['extension_cuadriceps'],
  calves: ['gemelos_maquina_pie', 'gemelos_prensa', 'gemelos_sentado_maquina', 'gemelos_banda', 'gemelos_peso_corporal'],
  push_h: ['press_pecho_maquina', 'press_banca_mancuernas', 'press_banca_barra', 'press_inclinado_mancuernas', 'press_banca_multipower', 'press_inclinado_barra', 'flexiones', 'flexiones_pies_elevados', 'flexiones_cerradas', 'fondos_asistidos', 'press_banca_cerrado', 'flexiones_pared'],
  push_v: ['press_hombro_mancuernas', 'press_hombro_maquina', 'press_militar_barra_sentado', 'press_hombro_unilateral', 'press_arnold'],
  pull_v: ['jalon_pecho', 'jalon_supino', 'jalon_estrecho', 'dominadas_supinas', 'dominadas'],
  pull_h: ['remo_polea_baja', 'remo_mancuerna', 'remo_barra_supino', 'remo_invertido'],
  lats_iso: ['pullover_polea', 'pullover_mancuerna'],
  chest_iso: ['contractor_pecho', 'cruce_poleas', 'aperturas_mancuernas', 'aperturas_banda'],
  shoulder_lat: ['elevaciones_laterales'],
  shoulder_rear: ['pajaros_tumbado', 'aperturas_posteriores_banda'],
  traps: ['encogimientos_mancuernas'],
  biceps: ['curl_mancuernas', 'curl_polea', 'curl_barra_z', 'curl_barra', 'curl_martillo', 'curl_inclinado', 'curl_banda', 'curl_concentrado'],
  triceps: ['extension_triceps_cuerda', 'extension_triceps_polea', 'extension_triceps_sobre_cabeza', 'press_frances', 'patada_triceps', 'fondos_entre_bancos', 'flexiones_cerradas'],
  hip_abd: ['abductores_maquina'],
  hip_add: ['aductores_maquina'],
  core_flex: ['crunch_polea', 'encogimientos_abdominales', 'elevacion_cadera_rodillas', 'bicicleta_abdominal', 'elevaciones_piernas'],
  core_stab: ['plancha_frontal', 'plancha_lateral', 'rueda_abdominal_barra'],
}

/** Patrón de accesorio con el que se completa el volumen de cada grupo. */
const ACCESSORY_FOR: Partial<Record<MuscleId, Pattern[]>> = {
  chest: ['chest_iso', 'push_h'],
  back: ['pull_h', 'lats_iso', 'pull_v'],
  shoulders: ['shoulder_lat', 'shoulder_rear'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quads: ['knee_ext', 'lunge'],
  hamstrings: ['knee_flex'],
  glutes: ['glute', 'lunge'],
  calves: ['calves'],
  abs: ['core_flex', 'core_stab'],
}

type Cluster = 'push' | 'pull' | 'legs'
const CLUSTER_OF_PATTERN: Partial<Record<Pattern, Cluster>> = {
  push_h: 'push', push_v: 'push', chest_iso: 'push', shoulder_lat: 'push', triceps: 'push',
  pull_h: 'pull', pull_v: 'pull', lats_iso: 'pull', shoulder_rear: 'pull', biceps: 'pull', traps: 'pull',
  squat: 'legs', hinge: 'legs', lunge: 'legs', glute: 'legs', knee_ext: 'legs', knee_flex: 'legs', calves: 'legs', hip_abd: 'legs', hip_add: 'legs', back_ext: 'legs',
}

interface Slot {
  pattern: Pattern
  role: SlotRole
  /** ids preferidos (plantillas). */
  prefer?: string[]
  /** Patrón alternativo si no hay candidato (p. ej. dominada → remo si el nivel aún no lo permite). */
  fallback?: Pattern
}

interface Ctx {
  level: Level
  goal: Goal
  youth: boolean
  equipment: EquipmentId[]
  excluded: Set<string>
  priority: Set<MuscleId>
  minutes: number
}

function levelOk(ex: Exercise, ctx: Ctx): boolean {
  const lvl = ctx.youth ? 'beginner' : ctx.level
  return LEVEL_RANK[ex.minLevel] <= LEVEL_RANK[lvl]
}

/** Candidatos ordenados para un patrón. Solo ejercicios con demostración verificada (requisito de rutinas incluidas). */
export function candidatesFor(pattern: Pattern, role: SlotRole, ctx: Ctx, prefer?: string[], allowPending = false): Exercise[] {
  const ids = [...(prefer ?? []), ...PATTERN_PREFS[pattern]]
  const seen = new Set<string>()
  const list: Exercise[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const ex = getExercise(id)
    if (ex) list.push(ex)
  }
  for (const ex of allExercises()) if (ex.pattern === pattern && !seen.has(ex.id)) list.push(ex)
  const ok = list.filter((ex) => !ex.archived && (allowPending || ex.demoStatus === 'verificada') && !ctx.excluded.has(ex.id) && levelOk(ex, ctx) && hasEquipment(ctx.equipment, ex))
  // Fuerza o mixto: en el ejercicio principal se prioriza la barra (cargas altas, ACSM 2026); también para intermedios.
  const barbellFirst = !ctx.youth && role === 'main' && (ctx.goal === 'strength' || ctx.goal === 'mixed' || ctx.level === 'intermediate')
  if (barbellFirst && !prefer?.length) {
    return [...ok.filter((e) => e.loadType === 'barbell_total'), ...ok.filter((e) => e.loadType !== 'barbell_total')]
  }
  // Menores: evitar barra pesada en el principal.
  if (ctx.youth) return [...ok.filter((e) => e.loadType !== 'barbell_total'), ...ok.filter((e) => e.loadType === 'barbell_total')]
  return ok
}

// ───────────────────────── Reparto de sesiones ─────────────────────────

/** Elige k días de los disponibles maximizando la separación mínima (semana circular). Determinista. */
export function pickSpacedDays(days: number[], k: number): number[] {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (k >= sorted.length) return sorted
  let best: number[] = []
  let bestScore = -Infinity
  const combo: number[] = []
  const rec = (start: number) => {
    if (combo.length === k) {
      const gaps = combo.map((d, i) => (i < k - 1 ? combo[i + 1] - d : combo[0] + 7 - d))
      const score = Math.min(...gaps) * 100 - gaps.reduce((s, g) => s + (g - 7 / k) ** 2, 0)
      if (score > bestScore + 1e-9) {
        bestScore = score
        best = [...combo]
      }
      return
    }
    for (let i = start; i < sorted.length; i++) {
      combo.push(sorted[i])
      rec(i + 1)
      combo.pop()
    }
  }
  rec(0)
  return best
}

type SessionPlan = { clusters: Cluster[]; sub?: SubSplit }
type SubSplit = 'chest_tri' | 'back_bi' | 'legs_core' | 'shoulders_core' | 'quads_calves' | 'hams_glutes' | 'arms_core' | 'chest' | 'back' | 'shoulders'

const STANDARD = new Set(['push,pull', 'legs', 'legs,pull,push', 'push', 'pull'])

/**
 * Reparte los 3 bloques (empuje, tirón, pierna) f veces cada uno entre N sesiones, sin repetir bloque en una sesión.
 * Puntúa: solapamiento en días naturales consecutivos (incluye domingo→lunes), equilibrio de tamaño y combinaciones estándar.
 */
export function distributeClusters(n: number, f: number, weekdays: number[]): SessionPlan[] {
  if (f === 1 && n > 3) return bodyPartSplit(n)
  const subsets = combos(n, f)
  let best: SessionPlan[] | null = null
  let bestScore = Infinity
  for (const a of subsets) for (const b of subsets) for (const c of subsets) {
    const sessions: Cluster[][] = Array.from({ length: n }, () => [])
    a.forEach((i) => sessions[i].push('push'))
    b.forEach((i) => sessions[i].push('pull'))
    c.forEach((i) => sessions[i].push('legs'))
    if (sessions.some((s) => s.length === 0)) continue
    let score = 0
    const mean = (3 * f) / n
    for (const s of sessions) score += (s.length - mean) ** 2
    for (const s of sessions) if (!STANDARD.has([...s].sort().join(','))) score += 0.5
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        if ((weekdays[i] + 1) % 7 === weekdays[j] && weekdays.length > 1) {
          const shared = sessions[i].filter((x) => sessions[j].includes(x)).length
          score += shared * 3
        }
      }
    }
    if (score < bestScore - 1e-9) {
      bestScore = score
      // Orden dentro de la sesión: pierna primero (ejercicios más exigentes con menos fatiga), luego empuje y tirón.
      best = sessions.map((s) => ({ clusters: (['legs', 'push', 'pull'] as Cluster[]).filter((x) => s.includes(x)) }))
    }
  }
  return best ?? []
}

function combos(n: number, k: number): number[][] {
  const out: number[][] = []
  const cur: number[] = []
  const rec = (s: number) => {
    if (cur.length === k) return void out.push([...cur])
    for (let i = s; i < n; i++) {
      cur.push(i)
      rec(i + 1)
      cur.pop()
    }
  }
  rec(0)
  return out
}

function bodyPartSplit(n: number): SessionPlan[] {
  const map: Record<number, SubSplit[]> = {
    4: ['chest_tri', 'back_bi', 'legs_core', 'shoulders_core'],
    5: ['chest_tri', 'back_bi', 'quads_calves', 'shoulders_core', 'hams_glutes'],
    6: ['chest', 'back', 'quads_calves', 'shoulders', 'hams_glutes', 'arms_core'],
  }
  return (map[Math.min(6, n)] ?? map[6]).map((sub) => ({ clusters: [], sub }))
}

function subSplitSlots(sub: SubSplit): Slot[] {
  const S = (pattern: Pattern, role: SlotRole): Slot => ({ pattern, role })
  switch (sub) {
    case 'chest_tri': return [S('push_h', 'main'), S('push_h', 'secondary'), S('chest_iso', 'accessory'), S('triceps', 'accessory')]
    case 'back_bi': return [S('pull_v', 'main'), S('pull_h', 'secondary'), S('shoulder_rear', 'accessory'), S('biceps', 'accessory')]
    case 'legs_core': return [S('squat', 'main'), S('hinge', 'secondary'), S('lunge', 'secondary'), S('knee_flex', 'accessory'), S('calves', 'accessory')]
    case 'shoulders_core': return [S('push_v', 'main'), S('shoulder_lat', 'accessory'), S('shoulder_rear', 'accessory'), S('core_flex', 'accessory')]
    case 'quads_calves': return [S('squat', 'main'), S('lunge', 'secondary'), S('knee_ext', 'accessory'), S('calves', 'accessory')]
    case 'hams_glutes': return [S('hinge', 'main'), S('knee_flex', 'accessory'), S('glute', 'accessory'), S('core_stab', 'accessory')]
    case 'chest': return [S('push_h', 'main'), S('push_h', 'secondary'), S('chest_iso', 'accessory')]
    case 'back': return [S('pull_v', 'main'), S('pull_h', 'secondary'), S('lats_iso', 'accessory')]
    case 'shoulders': return [S('push_v', 'main'), S('shoulder_lat', 'accessory'), S('shoulder_rear', 'accessory')]
    case 'arms_core': return [S('biceps', 'accessory'), S('triceps', 'accessory'), S('biceps', 'accessory'), S('triceps', 'accessory'), S('core_flex', 'accessory')]
  }
}

function clusterSlots(cluster: Cluster, size: number, k: number): Slot[] {
  const S = (pattern: Pattern, role: SlotRole): Slot => ({ pattern, role })
  const even = k % 2 === 0
  if (cluster === 'push') {
    if (size >= 3) return even ? [S('push_h', 'main')] : [S('push_v', 'main')]
    if (size === 2) return [S('push_h', 'main'), S('push_v', 'secondary')]
    return [S('push_h', 'main'), S('push_v', 'secondary'), S('push_h', 'secondary'), S('shoulder_lat', 'accessory'), S('triceps', 'accessory')]
  }
  if (cluster === 'pull') {
    if (size >= 3) return even ? [S('pull_v', 'main')] : [S('pull_h', 'main')]
    if (size === 2) return even ? [S('pull_v', 'main'), S('pull_h', 'secondary')] : [S('pull_h', 'main'), S('pull_v', 'secondary')]
    return [S('pull_v', 'main'), S('pull_h', 'secondary'), S('shoulder_rear', 'accessory'), S('biceps', 'accessory')]
  }
  if (size >= 3) return even ? [S('squat', 'main')] : [S('hinge', 'main'), S('lunge', 'secondary')]
  if (size === 2) return even ? [S('squat', 'main'), S('hinge', 'secondary')] : [S('hinge', 'main'), S('lunge', 'secondary')]
  return [S('squat', 'main'), S('hinge', 'secondary'), S('lunge', 'secondary'), S('knee_flex', 'accessory'), S('calves', 'accessory')]
}

function focusOf(plan: SessionPlan): SessionFocus {
  if (plan.sub) return plan.sub === 'legs_core' || plan.sub === 'quads_calves' || plan.sub === 'hams_glutes' ? 'legs' : plan.sub === 'arms_core' || plan.sub === 'shoulders_core' || plan.sub === 'shoulders' ? 'arms_shoulders' : plan.sub === 'chest' || plan.sub === 'chest_tri' ? 'push' : 'pull'
  const c = [...plan.clusters].sort().join(',')
  if (c === 'legs,pull,push') return 'full'
  if (c === 'pull,push') return 'upper'
  if (c === 'legs') return 'legs'
  if (c === 'push') return 'push'
  if (c === 'pull') return 'pull'
  return 'custom'
}

const FOCUS_NAME: Record<SessionFocus, string> = {
  full: 'Cuerpo completo', upper: 'Torso', lower: 'Pierna', push: 'Empuje', pull: 'Tirón', legs: 'Pierna', arms_shoulders: 'Hombro y brazo', custom: 'Mixto',
}
const SUB_NAME: Record<SubSplit, string> = {
  chest_tri: 'Pecho y tríceps', back_bi: 'Espalda y bíceps', legs_core: 'Pierna y core', shoulders_core: 'Hombro y core', quads_calves: 'Cuádriceps y gemelos', hams_glutes: 'Femoral y glúteo', arms_core: 'Brazos y core', chest: 'Pecho', back: 'Espalda', shoulders: 'Hombro',
}
function planName(plan: SessionPlan): string {
  if (plan.sub) return SUB_NAME[plan.sub]
  const c = [...plan.clusters].sort().join(',')
  if (c === 'legs,push') return 'Empuje + pierna'
  if (c === 'legs,pull') return 'Tirón + pierna'
  return FOCUS_NAME[focusOf(plan)]
}

// ───────────────────────── Construcción ─────────────────────────

interface BuiltDay {
  day: RoutineDay
  weekday: number | null
  clusters: Cluster[]
}

function makeExercise(dayId: string, idx: number, ex: Exercise, role: SlotRole, pctx: PrescriptionContext): RoutineExercise {
  return { uid: `${dayId}-${idx}-${ex.id}`, exerciseId: ex.id, prescription: buildPrescription(ex, role, pctx), ...({ role } as object) } as RoutineExercise
}

function roleOf(re: RoutineExercise): SlotRole {
  return ((re as unknown as { role?: SlotRole }).role ?? 'accessory') as SlotRole
}

/** Elimina metadatos internos antes de devolver. */
function clean(re: RoutineExercise): RoutineExercise {
  const { uid, exerciseId, prescription, superset } = re
  return superset ? { uid, exerciseId, prescription, superset } : { uid, exerciseId, prescription }
}

function fillSlots(days: { id: string; slots: Slot[] }[], ctx: Ctx, pctx: PrescriptionContext, gaps: Set<string>, pendingUsed: Set<string>): RoutineExercise[][] {
  const occurrence = new Map<string, number>()
  const mainChoice = new Map<Pattern, string>()
  return days.map((d) => {
    const used = new Set<string>()
    const out: RoutineExercise[] = []
    d.slots.forEach((slot) => {
      let cands = candidatesFor(slot.pattern, slot.role, ctx, slot.prefer).filter((e) => !used.has(e.id))
      if (!cands.length && slot.fallback) cands = candidatesFor(slot.fallback, slot.role, ctx).filter((e) => !used.has(e.id))
      if (!cands.length) {
        // Último recurso: ejercicio sin demostración verificada, avisando claramente.
        cands = candidatesFor(slot.pattern, slot.role, ctx, slot.prefer, true).filter((e) => !used.has(e.id))
        if (!cands.length) {
          gaps.add(slot.pattern)
          return
        }
      }
      const key = `${slot.pattern}:${slot.role}`
      const k = occurrence.get(key) ?? 0
      occurrence.set(key, k + 1)
      let pick: Exercise
      if (slot.prefer?.length) pick = cands[0]
      else if (slot.role === 'main' && (ctx.level === 'beginner' || ctx.youth)) {
        // Principiantes: el mismo ejercicio principal toda la semana (práctica técnica y progreso medible).
        const prev = mainChoice.get(slot.pattern)
        pick = cands.find((c) => c.id === prev) ?? cands[0]
        mainChoice.set(slot.pattern, pick.id)
      } else pick = cands[k % Math.min(2, cands.length)]
      used.add(pick.id)
      if (pick.demoStatus !== 'verificada') pendingUsed.add(pick.id)
      out.push(makeExercise(d.id, out.length, pick, slot.role, pctx))
    })
    return out
  })
}

function maxSetsPerExercise(level: Level, youth: boolean): number {
  if (youth) return 2
  return level === 'intermediate' ? 4 : 3
}

function weightedByMuscle(days: RoutineDay[], schedule: { weekday: number; dayId: string }[]): Map<MuscleId, number> {
  return new Map(weeklyVolume({ days, schedule }).map((v) => [v.muscle, v.weighted]))
}

/** Completa el volumen de los grupos por debajo del objetivo y recorta los que se pasan (reglas R3, R4).
 *  Respeta el tiempo por sesión salvo que se pida lo contrario (ignoreTime). */
function balanceVolume(built: BuiltDay[], ctx: Ctx, pctx: PrescriptionContext, notes: string[], ignoreTime: boolean, shortByTime: Set<MuscleId>): void {
  const days = () => built.map((b) => b.day)
  const schedule = built.filter((b) => b.weekday !== null).map((b) => ({ weekday: b.weekday as number, dayId: b.day.id }))
  const maxSets = maxSetsPerExercise(ctx.level, ctx.youth)
  const budget = ctx.minutes * 1.05
  const fits = (day: RoutineDay) => ignoreTime || dayDuration(day).minutes <= budget
  const blocked = new Set<MuscleId>()
  for (let guard = 0; guard < 60; guard++) {
    const w = weightedByMuscle(days(), schedule)
    const deficits = MAJOR_MUSCLES.filter((m) => !blocked.has(m))
      .map((m) => ({ m, have: w.get(m) ?? 0, target: weeklyTarget(ctx.level, m, ctx.goal, ctx.priority.has(m)) }))
      .filter((x) => x.have < x.target[0])
      .sort((a, b) => a.have - a.target[0] - (b.have - b.target[0]))
    if (!deficits.length) break
    const { m } = deficits[0]
    let progressed = false
    let timeLimited = false
    // 1) Añadir un accesorio en una sesión adecuada que aún no tenga ese patrón.
    const patterns = ACCESSORY_FOR[m] ?? []
    for (const pattern of patterns) {
      const cluster = CLUSTER_OF_PATTERN[pattern]
      const options = built
        .filter((b) => (cluster ? b.clusters.includes(cluster) || b.clusters.length === 0 : true))
        .filter((b) => !b.day.exercises.some((re) => getExercise(re.exerciseId)?.pattern === pattern))
        .filter((b) => b.day.exercises.length < 8)
        .sort((a, b) => dayDuration(a.day).minutes - dayDuration(b.day).minutes)
      for (const b of options) {
        const used = new Set(b.day.exercises.map((e) => e.exerciseId))
        const cand = candidatesFor(pattern, 'accessory', ctx).find((e) => !used.has(e.id) && e.primary.includes(m))
        if (!cand) continue
        const re = makeExercise(b.day.id, b.day.exercises.length, cand, 'accessory', pctx)
        b.day.exercises.push(re)
        if (!fits(b.day)) {
          b.day.exercises.pop()
          timeLimited = true
          continue
        }
        notes.push(`Se añade ${cand.name.toLowerCase()} para que ${MUSCLE_LABEL[m].toLowerCase()} llegue a su volumen orientativo.`)
        progressed = true
        break
      }
      if (progressed) break
    }
    if (progressed) continue
    // 2) Subir una serie a un ejercicio que ya lo trabaja directamente.
    for (const b of [...built].sort((a, c) => dayDuration(a.day).minutes - dayDuration(c.day).minutes)) {
      const re = b.day.exercises.find((x) => getExercise(x.exerciseId)?.primary.includes(m) && x.prescription.sets < maxSets)
      if (!re) continue
      const before = re.prescription
      re.prescription = { ...before, sets: before.sets + 1 }
      if (!fits(b.day)) {
        re.prescription = before
        timeLimited = true
        continue
      }
      progressed = true
      break
    }
    if (!progressed) {
      blocked.add(m)
      if (timeLimited) shortByTime.add(m)
    }
  }
  // Recorte de excesos: accesorios primero, nunca por debajo de 2 series (1 en menores).
  const minSets = ctx.youth ? 1 : 2
  for (let guard = 0; guard < 40; guard++) {
    const w = weightedByMuscle(days(), schedule)
    const excess = MAJOR_MUSCLES.map((m) => ({ m, have: w.get(m) ?? 0, max: weeklyTarget(ctx.level, m, ctx.goal, ctx.priority.has(m))[1] }))
      .filter((x) => x.have > x.max + 1)
      .sort((a, b) => b.have - b.max - (a.have - a.max))
    if (!excess.length) break
    const { m } = excess[0]
    const order: SlotRole[] = ['accessory', 'secondary', 'main']
    let reduced = false
    for (const role of order) {
      for (const b of built) {
        const re = b.day.exercises.find((x) => roleOf(x) === role && getExercise(x.exerciseId)?.primary.includes(m) && x.prescription.sets > minSets)
        if (re) {
          re.prescription = { ...re.prescription, sets: re.prescription.sets - 1 }
          reduced = true
          break
        }
      }
      if (reduced) break
    }
    if (!reduced) break
  }
}

/** En días naturales consecutivos con grupos compartidos: una serie menos (mín. 2) y +1 RIR en el segundo día. */
function applyConsecutiveDayDose(built: BuiltDay[], notes: string[], youth: boolean): void {
  const byWd = new Map(built.filter((b) => b.weekday !== null).map((b) => [b.weekday as number, b]))
  for (const b of built) {
    if (b.weekday === null) continue
    const prev = byWd.get((b.weekday + 6) % 7)
    if (!prev || prev === b) continue
    const m1 = dayMuscleSets(prev.day)
    const shared = MAJOR_MUSCLES.filter((m) => (m1.get(m)?.direct ?? 0) > 0)
    let touched = false
    b.day.exercises = b.day.exercises.map((re) => {
      const ex = getExercise(re.exerciseId)
      if (!ex || !ex.primary.some((m) => shared.includes(m))) return re
      touched = true
      const p = re.prescription
      return { ...re, prescription: { ...p, sets: Math.max(youth ? 1 : 2, p.sets - 1), rirMin: Math.min(4, p.rirMin + 1), rirMax: Math.min(5, p.rirMax + 1), note: 'Dosis reducida: ayer se entrenaron estos músculos.' } }
    })
    if (touched) notes.push(`${cap(WEEKDAY_NAME[b.weekday])} va justo después de ${WEEKDAY_NAME[(b.weekday + 6) % 7]} y repite grupos: se reduce una serie y se deja más margen (RIR) en esos ejercicios.`)
  }
}

// ───────────────────────── Ajustes de tiempo ─────────────────────────

function trimAccessories(built: BuiltDay[], budget: number): void {
  for (const b of built) {
    while (dayDuration(b.day).minutes > budget) {
      const idx = [...b.day.exercises].map((re, i) => ({ re, i })).reverse().find((x) => roleOf(x.re) === 'accessory')
      if (!idx) break
      b.day.exercises.splice(idx.i, 1)
    }
  }
}

function reduceSets(built: BuiltDay[], budget: number, youth: boolean): void {
  const minSets = youth ? 1 : 2
  for (const b of built) {
    for (const role of ['accessory', 'secondary'] as SlotRole[]) {
      for (const re of b.day.exercises) {
        if (dayDuration(b.day).minutes <= budget) break
        if (roleOf(re) === role && re.prescription.sets > minSets) re.prescription = { ...re.prescription, sets: re.prescription.sets - 1 }
      }
    }
  }
}

const ANTAGONIST: [Pattern, Pattern][] = [['biceps', 'triceps'], ['chest_iso', 'shoulder_rear'], ['knee_ext', 'knee_flex'], ['shoulder_lat', 'core_flex'], ['calves', 'core_flex'], ['calves', 'core_stab']]

function applySupersets(built: BuiltDay[]): void {
  for (const b of built) {
    const acc = b.day.exercises.filter((re) => roleOf(re) === 'accessory' && !re.superset)
    let n = 0
    const taken = new Set<string>()
    const pat = (re: RoutineExercise) => getExercise(re.exerciseId)?.pattern
    for (const [p1, p2] of ANTAGONIST) {
      const a = acc.find((re) => pat(re) === p1 && !taken.has(re.uid))
      const c = acc.find((re) => pat(re) === p2 && !taken.has(re.uid))
      if (a && c) {
        const tag = `ss${++n}`
        a.superset = tag
        c.superset = tag
        taken.add(a.uid)
        taken.add(c.uid)
      }
    }
    const rest = acc.filter((re) => !taken.has(re.uid))
    for (let i = 0; i + 1 < rest.length; i += 2) {
      const tag = `ss${++n}`
      rest[i].superset = tag
      rest[i + 1].superset = tag
    }
    // Los ejercicios de una superserie van seguidos.
    const order = [...b.day.exercises]
    b.day.exercises = []
    for (const re of order) {
      if (b.day.exercises.includes(re)) continue
      b.day.exercises.push(re)
      if (re.superset) for (const o of order) if (o !== re && o.superset === re.superset && !b.day.exercises.includes(o)) b.day.exercises.push(o)
    }
  }
}

// ───────────────────────── API principal ─────────────────────────

function ctxFromProfile(p: Profile, youth: boolean, goalOverride?: Goal, equipmentOverride?: EquipmentId[]): Ctx {
  return {
    level: youth ? 'beginner' : p.level,
    goal: youth ? 'general' : goalOverride ?? p.goal,
    youth,
    equipment: equipmentOverride ?? p.equipment,
    excluded: new Set(p.excludedExercises),
    priority: new Set(p.priorityMuscles),
    minutes: p.minutesPerSession,
  }
}

const GOAL_TEXT: Record<Goal, string> = {
  hypertrophy: 'ganar músculo', strength: 'ganar fuerza', mixed: 'fuerza y músculo', general: 'condición física general',
}
const LEVEL_TEXT: Record<Level, string> = { beginner: 'empiezas desde cero', returning: 'vuelves tras una pausa', intermediate: 'tienes nivel intermedio' }

export function generateRoutine(profile: Profile, options: GenerateOptions = {}): GenerateResult {
  const scope = checkScope(profile)
  if (scope.kind === 'out') return { status: 'out_of_scope', reasons: scope.reasons, message: scope.message }
  const youth = scope.kind === 'youth'
  const ctx = ctxFromProfile(profile, youth)
  const notices: string[] = []
  const available = [...new Set(profile.days)].sort((a, b) => a - b)
  if (!available.length) {
    return { status: 'conflict', code: 'no_days', message: 'No has marcado ningún día disponible.', alternatives: [{ label: 'Elegir días', explanation: 'Marca al menos un día de la semana en tu perfil.', profileAction: 'add_days' }] }
  }

  // 1) Número de sesiones
  const levelCap = youth ? 3 : AUTO_SESSION_CAP[ctx.level]
  const hardCap = Math.min(6, available.length)
  let n: number
  if (options.sessionsOverride) n = Math.min(hardCap, Math.max(1, options.sessionsOverride))
  else if (options.acceptManyDays) n = Math.min(hardCap, youth ? 3 : ctx.level === 'beginner' ? 4 : 6)
  else n = Math.min(hardCap, levelCap)
  if (available.length > n && !options.sessionsOverride) {
    notices.push(
      available.length === 7
        ? `Usamos ${n} de tus 7 días: siempre conviene al menos un día sin entrenamiento de fuerza.`
        : `Usamos ${n} de tus ${available.length} días disponibles: como ${youth ? 'menor de edad' : LEVEL_TEXT[ctx.level]}, ${n} sesiones bastan para progresar. Los demás días puedes descansar o hacer otra actividad. Puedes cambiarlo.`,
    )
  }
  if (options.acceptManyDays && ctx.level === 'beginner' && available.length > n) {
    notices.push('Para empezar desde cero limitamos a 4 sesiones. La rutina de 6 días (empuje/tirón/pierna) está en Plantillas para cuando tengas experiencia.')
  }

  // 2) Frecuencia por músculo
  const requested = options.frequencyOverride ?? (profile.frequency === 'auto' ? null : profile.frequency)
  let f: number
  if (requested !== null) {
    f = requested
    if (youth && f > 3) f = 3
    if (f > n) {
      const alts: ConflictAlternative[] = [
        { label: `Frecuencia ${n} con ${n} ${n === 1 ? 'sesión' : 'sesiones'}`, explanation: `Cada grupo muscular se entrena ${n} ${n === 1 ? 'vez' : 'veces'} por semana. Con el volumen semanal igualado, la frecuencia apenas cambia la hipertrofia.`, options: { ...options, frequencyOverride: n as 1 | 2 | 3 } },
      ]
      if (available.length >= f && n < f) {
        alts.unshift({ label: `Usar ${f} de tus días disponibles`, explanation: `Tienes ${available.length} días marcados: entrenar ${f} permite frecuencia ${f}.`, options: { ...options, sessionsOverride: f } })
      } else {
        alts.push({ label: 'Añadir días a mi disponibilidad', explanation: `Necesitas al menos ${f} sesiones por semana para entrenar cada músculo ${f} veces.`, profileAction: 'add_days' })
      }
      return {
        status: 'conflict',
        code: 'frequency_exceeds_sessions',
        message: `Has pedido que cada músculo se entrene ${f} veces por semana, pero solo hay ${n} ${n === 1 ? 'sesión' : 'sesiones'}. Un músculo no puede trabajarse más veces que sesiones haya: no cambiamos tu elección sin preguntarte.`,
        alternatives: alts,
      }
    }
  } else {
    f = n <= 3 ? n : 2
  }

  const weekdays = pickSpacedDays(available, n)
  const plans = distributeClusters(n, f, weekdays)
  const pctx: PrescriptionContext = { level: ctx.level, goal: ctx.goal, youth }
  const gaps = new Set<string>()
  const ids = plans.map((_, i) => `d${i + 1}`)

  // 3) Huecos de cada sesión
  const occ: Record<Cluster, number> = { push: 0, pull: 0, legs: 0 }
  const daysSlots = plans.map((plan, i) => {
    let slots: Slot[] = []
    if (plan.sub) slots = subSplitSlots(plan.sub)
    else for (const c of plan.clusters) slots.push(...clusterSlots(c, plan.clusters.length, occ[c]++))
    // Ordenar: principales → secundarios → accesorios (los más exigentes primero, ACSM 2026).
    const rank: Record<SlotRole, number> = { main: 0, secondary: 1, accessory: 2 }
    slots = slots.map((s, j) => ({ s, j })).sort((a, b) => rank[a.s.role] - rank[b.s.role] || a.j - b.j).map((x) => x.s)
    return { id: ids[i], slots }
  })
  const pendingUsed = new Set<string>()
  const exercises = fillSlots(daysSlots, ctx, pctx, gaps, pendingUsed)
  const letters = 'ABCDEF'
  const built: BuiltDay[] = plans.map((plan, i) => ({
    day: { id: ids[i], name: `Día ${letters[i]} · ${planName(plan)}`, focus: focusOf(plan), exercises: exercises[i] },
    weekday: weekdays[i] ?? null,
    clusters: plan.clusters.length ? plan.clusters : plan.sub ? subClusters(plan.sub) : [],
  }))

  const volNotes: string[] = []
  const shortByTime = new Set<MuscleId>()
  balanceVolume(built, ctx, pctx, volNotes, !!options.ignoreTime, shortByTime)
  // Si no hay ningún tirón posible, se añade extensión de espalda dejando claro que NO lo sustituye.
  if (gaps.has('pull_v') && gaps.has('pull_h')) {
    const legsDay = built.find((b) => b.clusters.includes('legs')) ?? built[0]
    const sup = candidatesFor('back_ext', 'accessory', ctx).find((e) => !legsDay.day.exercises.some((x) => x.exerciseId === e.id))
    if (sup) legsDay.day.exercises.push(makeExercise(legsDay.day.id, legsDay.day.exercises.length, sup, 'accessory', pctx))
  }
  const doseNotes: string[] = []
  applyConsecutiveDayDose(built, doseNotes, youth)

  // 4) Ajustes de tiempo pedidos explícitamente
  if (options.reduceSets) reduceSets(built, ctx.minutes, youth)
  if (options.supersets) applySupersets(built)
  if (options.trimAccessories) trimAccessories(built, ctx.minutes)

  const draft = finalizeDraft(built, ctx, youth, f, n, gaps, volNotes, doseNotes)
  for (const id of pendingUsed) draft.warnings.push(pendingWarning(id))
  const maxMin = Math.max(...draft.days.map((d) => dayDuration(d).minutes))
  const overBudget = maxMin > ctx.minutes * 1.05
  const timeAdjustments = overBudget ? computeTimeAdjustments(profile, options, available.length > n) : []
  if (overBudget) notices.push(`La sesión más larga se estima en ${maxMin} min y has indicado ${ctx.minutes} min. Abajo tienes ajustes; no aplicamos ninguno sin tu permiso.`)
  if (shortByTime.size && !options.ignoreTime) {
    const w = new Map(weeklyVolume(draft).map((v) => [v.muscle, v.weighted]))
    const list = [...shortByTime].map((m) => `${MUSCLE_LABEL[m].toLowerCase()} (${w.get(m) ?? 0} series; orientativo ${weeklyTarget(ctx.level, m, ctx.goal, ctx.priority.has(m)).join('–')})`)
    notices.push(`Por el tiempo disponible, algunos grupos quedan por debajo del volumen orientativo: ${list.join(', ')}. No es un mínimo: también se progresa con menos. Si quieres completarlo, puedes alargar las sesiones o añadir días.`)
    const r = generateRoutine(profile, { ...options, ignoreTime: true })
    if (r.status === 'ok') {
      const max = Math.max(...r.draft.days.map((d) => dayDuration(d).minutes))
      timeAdjustments.push({ id: 'fill_volume', label: 'Completar el volumen orientativo', explanation: `Añade las series que faltan aunque las sesiones duren más (hasta ~${max} min).`, options: { ...options, ignoreTime: true }, maxMinutesAfter: max })
    }
  }
  return { status: 'ok', draft, notices, timeAdjustments, overBudget }
}

function subClusters(sub: SubSplit): Cluster[] {
  if (['chest_tri', 'chest', 'shoulders', 'shoulders_core'].includes(sub)) return ['push']
  if (['back_bi', 'back'].includes(sub)) return ['pull']
  if (sub === 'arms_core') return ['push', 'pull']
  return ['legs']
}

function computeTimeAdjustments(profile: Profile, base: GenerateOptions, canAddDay: boolean): TimeAdjustment[] {
  const out: TimeAdjustment[] = []
  const tryOpt = (id: TimeAdjustment['id'], label: string, explanation: string, options: GenerateOptions) => {
    const r = generateRoutine(profile, options)
    if (r.status !== 'ok') return
    const max = Math.max(...r.draft.days.map((d) => dayDuration(d).minutes))
    out.push({ id, label, explanation, options, maxMinutesAfter: max })
  }
  if (!base.supersets) tryOpt('supersets', 'Accesorios en superserie', 'Alternas dos accesorios (p. ej. bíceps y tríceps) descansando tras la pareja. Mismo volumen, menos tiempo; algo más de fatiga local.', { ...base, supersets: true })
  if (!base.reduceSets) tryOpt('reduce_sets', 'Una serie menos en accesorios y secundarios', 'Se quita una serie (mínimo 2) en los días que no caben. Baja algo el volumen semanal; los ejercicios principales no cambian.', { ...base, reduceSets: true })
  if (!base.trimAccessories) tryOpt('trim_accessories', 'Quitar accesorios', 'Se eliminan los últimos accesorios de los días largos. Es lo que más tiempo ahorra y lo que más volumen de brazos, gemelos o abdomen quita.', { ...base, trimAccessories: true })
  if (canAddDay) {
    const r = generateRoutine(profile, { ...base, sessionsOverride: undefined, acceptManyDays: true })
    if (r.status === 'ok') {
      const max = Math.max(...r.draft.days.map((d) => dayDuration(d).minutes))
      out.push({ id: 'add_day', label: 'Repartir en más días', explanation: `Usa más de tus días disponibles (${r.draft.days.length} sesiones) para que cada una sea más corta.`, options: { ...base, acceptManyDays: true }, maxMinutesAfter: max })
    }
  }
  return out.sort((a, b) => a.maxMinutesAfter - b.maxMinutesAfter)
}

function finalizeDraft(built: BuiltDay[], ctx: Ctx, youth: boolean, f: number, n: number, gaps: Set<string>, volNotes: string[], doseNotes: string[]): RoutineDraft {
  const days = built.map((b) => ({ ...b.day, exercises: b.day.exercises.map(clean) }))
  const schedule = built.filter((b) => b.weekday !== null).map((b) => ({ weekday: b.weekday as number, dayId: b.day.id }))
  const analysis = analyzeRoutine({ days, schedule })
  const rationale: string[] = []
  const warnings: string[] = []
  const splitDesc = describeSplit(days)
  rationale.push(
    `${n} ${n === 1 ? 'sesión' : 'sesiones'} por semana (${schedule.map((s) => WEEKDAY_NAME[s.weekday]).join(', ')}) con estructura «${splitDesc}». Objetivo: ${GOAL_TEXT[ctx.goal]}${youth ? ' (programa para menores)' : `; ${LEVEL_TEXT[ctx.level]}`}.`,
  )
  rationale.push(
    `Frecuencia: cada grupo principal se entrena unas ${f} ${f === 1 ? 'vez' : 'veces'} por semana. Es una forma de repartir el volumen: con el volumen igualado, entrenar un músculo 1, 2 o 3 veces da resultados de hipertrofia parecidos; más frecuencia ayuda a practicar la técnica.`,
  )
  rationale.push(
    'Volumen: las series semanales por músculo son un punto de partida moderado (no un mínimo ni un máximo científico). Las series de ejercicios que trabajan un músculo de forma secundaria cuentan como media serie (estimación).',
  )
  rationale.push(
    youth
      ? 'Repeticiones de 8–15 dejando 3–4 en reserva: se aprende la técnica sin llegar al fallo. Nada de pruebas de máximos.'
      : 'Rangos de repeticiones: hay muchos rangos útiles para ganar músculo; los ejercicios más pesados usan menos repeticiones y los accesorios, más. Se deja margen (RIR) en lugar de ir al fallo.',
  )
  rationale.push('Descansos orientativos de 2–3 min en ejercicios exigentes y 1–2 min en accesorios: descansar lo necesario para mantener la calidad de las series.')
  rationale.push('Progresión: doble progresión. Cuando completes todas las series en el máximo del rango con margen suficiente, la app te propondrá el menor incremento disponible. Tú decides si lo aceptas.')
  const ramp = youth ? 2 : RAMP_WEEKS[ctx.level]
  if (ramp > 0) rationale.push(`Las primeras ${ramp} ${ramp === 1 ? 'semana' : 'semanas'} son de familiarización: una serie menos y más margen (RIR 3–4) para aprender los movimientos y elegir cargas.`)
  rationale.push(...volNotes.slice(0, 6))
  if (doseNotes.length) rationale.push(...doseNotes)
  if (youth) {
    warnings.push('Programa para menores: debe hacerse con supervisión de un adulto cualificado. Sin fallo, sin máximos y priorizando la técnica. La fuerza es una parte de la actividad física diaria, no un sustituto del juego o del deporte.')
  }
  if (gaps.has('pull_v') && gaps.has('pull_h')) {
    warnings.push('Con tu material no hay ningún ejercicio de tirón con carga (remo o dominada). Los ejercicios sin resistencia no lo sustituyen. Alternativas: una banda elástica, una barra de dominadas, entrenar el tirón en un parque (remo invertido, dominadas) o en un gimnasio.')
  } else if (gaps.size) {
    const names: Record<string, string> = { squat: 'sentadilla', hinge: 'bisagra de cadera (peso muerto rumano)', lunge: 'zancada', pull_v: 'tirón vertical', pull_h: 'tirón horizontal', push_v: 'empuje vertical', push_h: 'empuje horizontal' }
    const list = [...gaps].filter((g) => names[g]).map((g) => names[g])
    if (list.length) warnings.push(`Sin ejercicio disponible con tu material o nivel para: ${list.join(', ')}. Revisa el material marcado o añade un ejercicio propio.`)
  }
  for (const g of analysis.coverageGaps) warnings.push(g)
  for (const d of days) {
    const per = dayMuscleSets(d)
    for (const [m, v] of per) {
      if (MAJOR_MUSCLES.includes(m) && v.direct + 0.5 * v.indirect > PER_SESSION_SOFT_CAP) warnings.push(`${d.name}: ${MUSCLE_LABEL[m].toLowerCase()} acumula muchas series en una sesión; si notas que la calidad cae, repártelas.`)
    }
  }
  const id = stableHash(JSON.stringify(days.map((d) => d.exercises.map((e) => e.exerciseId))))
  return {
    name: youth ? 'Programa supervisado para menores' : `${splitDesc} · ${n} ${n === 1 ? 'día' : 'días'}`,
    kind: 'generated',
    templateId: `gen-${id}`,
    days,
    schedule,
    rampWeeks: ramp,
    rationale,
    warnings,
    engineVersion: ENGINE_VERSION,
    youth,
  }
}

function describeSplit(days: RoutineDay[]): string {
  const f = days.map((d) => d.focus)
  if (f.every((x) => x === 'full')) return 'Cuerpo completo'
  if (f.every((x) => x === 'upper' || x === 'legs')) return 'Torso / pierna'
  if (f.every((x) => x === 'push' || x === 'pull' || x === 'legs') && f.length % 3 === 0) return 'Empuje / tirón / pierna'
  if (f.includes('arms_shoulders')) return 'Rutina dividida por grupos'
  return 'Rutina combinada'
}

// ───────────────────────── Plantillas (reutilizan la misma maquinaria) ─────────────────────────

export interface TemplateSessionSpec {
  name: string
  focus: SessionFocus
  slots: Slot[]
}

export interface TemplateDef {
  id: string
  name: string
  description: string
  location: Location
  equipment: EquipmentId[]
  goal?: Goal
  minLevel: Level
  weekdays: number[]
  sessions: TemplateSessionSpec[]
  notes: string[]
}

export function buildFromTemplate(t: TemplateDef, profile: Profile): { draft: RoutineDraft; warnings: string[] } {
  const scope = checkScope(profile)
  const youth = scope.kind === 'youth'
  const ctx = ctxFromProfile(profile, youth, t.goal, t.equipment)
  const pctx: PrescriptionContext = { level: ctx.level, goal: ctx.goal, youth }
  const gaps = new Set<string>()
  const ids = t.sessions.map((_, i) => `d${i + 1}`)
  // En plantillas se permite el nivel de la plantilla para elegir ejercicios (p. ej. dominadas en parque).
  const tctx: Ctx = { ...ctx, level: LEVEL_RANK[ctx.level] >= LEVEL_RANK[t.minLevel] ? ctx.level : t.minLevel }
  const pendingUsed = new Set<string>()
  const exs = fillSlots(t.sessions.map((s, i) => ({ id: ids[i], slots: s.slots })), tctx, pctx, gaps, pendingUsed)
  const built: BuiltDay[] = t.sessions.map((s, i) => ({
    day: { id: ids[i], name: s.name, focus: s.focus, exercises: exs[i] },
    weekday: t.weekdays[i] ?? null,
    clusters: [],
  }))
  const doseNotes: string[] = []
  applyConsecutiveDayDose(built, doseNotes, youth)
  const days = built.map((b) => ({ ...b.day, exercises: b.day.exercises.map(clean) }))
  const schedule = built.filter((b) => b.weekday !== null).map((b) => ({ weekday: b.weekday as number, dayId: b.day.id }))
  const analysis = analyzeRoutine({ days, schedule })
  const warnings: string[] = [...t.notes.filter((n) => n.startsWith('⚠')).map((n) => n.slice(1).trim())]
  for (const id of pendingUsed) warnings.push(pendingWarning(id))
  if (!youth && LEVEL_RANK[profile.level] < LEVEL_RANK[t.minLevel]) {
    warnings.push(`Esta plantilla está pensada para nivel ${t.minLevel === 'intermediate' ? 'intermedio' : 'de vuelta tras pausa'} y tu perfil indica ${LEVEL_TEXT[profile.level]}. Puedes usarla, pero no es la recomendación inicial.`)
  }
  if (youth) warnings.push('Programa para menores: debe hacerse con supervisión de un adulto cualificado, sin fallo y sin pruebas de máximos.')
  for (const g of analysis.coverageGaps) warnings.push(g)
  const ramp = youth ? 2 : RAMP_WEEKS[ctx.level]
  const rationale = [t.description, ...t.notes.filter((n) => !n.startsWith('⚠')), ...doseNotes]
  if (ramp) rationale.push(`Las primeras ${ramp} ${ramp === 1 ? 'semana' : 'semanas'} son de familiarización: una serie menos y RIR 3–4.`)
  return {
    draft: { name: t.name, kind: 'template', templateId: t.id, days, schedule, rampWeeks: ramp, rationale, warnings, engineVersion: ENGINE_VERSION, youth },
    warnings,
  }
}

/** Convierte un borrador en una versión de rutina almacenable. */
export function draftToVersion(draft: RoutineDraft, routineId: string, versionId: string, version: number, changeNote: string): RoutineVersion {
  return {
    id: versionId,
    routineId,
    version,
    createdAt: Date.now(),
    engineVersion: draft.engineVersion,
    days: draft.days,
    schedule: draft.schedule,
    rampWeeks: draft.rampWeeks,
    rationale: draft.rationale,
    warnings: draft.warnings,
    changeNote,
  }
}

export type { Slot }

export function pendingWarning(id: string): string {
  const ex = getExercise(id)
  return `${ex?.name ?? id}: demostración pendiente. No hay una ilustración con licencia verificada de esta variante; sigue las instrucciones escritas. Está registrado como pendiente en la documentación.`
}
export function prescriptionFor(exId: string, role: SlotRole, profile: Profile): Prescription | null {
  const ex = getExercise(exId)
  if (!ex) return null
  const youth = checkScope(profile).kind === 'youth'
  return buildPrescription(ex, role, { level: profile.level, goal: profile.goal, youth })
}
