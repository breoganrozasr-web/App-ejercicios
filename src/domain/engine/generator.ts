import { allExercises, getExercise, hasEquipment } from '../catalog'
import { LEVEL_RANK } from '../catalog/exercises'
import { hasExternalDemo } from '../catalog/external'
import type {
  EquipmentId, Exercise, FrequencyPref, Goal, Level, Location, Pattern, Prescription, Profile, Region, RoutineDay, RoutineExercise, RoutinePlanInfo, RoutineVersion, SessionFocus,
} from '../types'
import { WEEKDAY_NAME, stableHash } from '../util'
import { dayDuration, durationText, exercisePractice, weeklyRegionVolume, type RegionVolume } from './analysis'
import { BUDGET_REGIONS, DEFAULT_TARGET_REGIONS, REGION_LABEL, contributionOf, directRegions, regionsFromMuscles } from './contribution'
import {
  AUTO_SESSION_CAP, ENGINE_VERSION, FAMILIARIZATION_SESSIONS, PRIORITY_CEILING, maxSetsPerExercise, optionalAim, weeklyBudget, type SlotRole,
} from './params'
import { applyFamiliarization, buildPrescription, describePrescription, describeRir, type PrescriptionContext } from './prescription'
import { checkScope } from './scope'

// ───────────────────────── Tipos públicos ─────────────────────────

export interface GenerateOptions {
  /** Frecuencia elegida desde una alternativa de conflicto. */
  frequencyOverride?: 1 | 2 | 3
  /** Usar este nº de sesiones (de los días disponibles). */
  sessionsOverride?: number
  /** Mantener más días de los que se proponen por nivel (con aviso). */
  acceptManyDays?: boolean
  /** Paso 2 del ajuste de tiempo: una serie menos por ejercicio (mínimo 2) y sin accesorios opcionales. */
  reduceSets?: boolean
  /** Petición explícita de más trabajo: +N series semanales por región prioritaria. Nunca se aplica sola. */
  extraSets?: Partial<Record<Region, number>>
  /** Aceptar el plan con la frecuencia real cuando la pedida no se consigue con el material o el tiempo. */
  acceptRealFrequency?: boolean
  /** Vuelta tras pausa: empezar sin las 4 sesiones de adaptación. */
  skipAdaptation?: boolean
  /**
   * La persona ya completó la fase de Aprendizaje (o está en Progresión): la propuesta empieza con la dosis base, sin otra
   * familiarización de rutina. Los ejercicios nuevos para ella conservan su propio aprendizaje.
   */
  learningDone?: boolean
}

export interface RoutineDraft {
  name: string
  kind: 'generated' | 'template'
  templateId?: string
  days: RoutineDay[]
  schedule: { weekday: number; dayId: string }[]
  /** Motor 1 (semanas). En versiones nuevas es 0: se usa `familiarization`. */
  rampWeeks: number
  familiarization: { sessions: number; reason: 'beginner' | 'returning' } | null
  plan: RoutinePlanInfo
  rationale: string[]
  warnings: string[]
  engineVersion: string
  youth: boolean
}

export interface FrequencyRow {
  region: Region
  /** Frecuencia pedida para este grupo (null = auto o no es grupo objetivo). */
  desired: number | null
  target: boolean
  directDays: number
  secondaryOnlyDays: number
  direct: number
  estimated: number
}

export interface TimeAdjustment {
  id: 'reduce_sets' | 'add_day'
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
  profileAction?: 'add_days' | 'edit_profile'
  /** Tabla real de la alternativa (calculada generándola), para no prometer lo que no consigue. */
  table?: FrequencyRow[]
  maxMinutes?: number
}

export type GenerateResult =
  | { status: 'ok'; draft: RoutineDraft; notices: string[]; timeAdjustments: TimeAdjustment[]; overBudget: boolean; frequency: FrequencyRow[] }
  | { status: 'conflict'; code: string; message: string; alternatives: ConflictAlternative[] }
  | { status: 'out_of_scope'; reasons: string[]; message: string }

// ───────────────────────── Preferencias de ejercicios ─────────────────────────

/** Orden de preferencia por patrón (de más accesible a más técnico). Se filtra por material, nivel y exclusiones. Desempate estable. */
export const PATTERN_PREFS: Record<Pattern, string[]> = {
  squat: ['prensa', 'sentadilla_banco_mancuernas', 'sentadilla_barra', 'sentadilla_mancuernas', 'sentadilla_multipower', 'prensa_sentada', 'sentadilla_banco_barra', 'sentadilla_sumo_mancuerna', 'sentadilla_banda', 'sentadilla_frontal', 'sentadilla_peso_corporal', 'sentadilla_silla'],
  hinge: ['peso_muerto_rumano_mancuernas', 'peso_muerto_rumano'],
  lunge: ['zancadas_mancuernas', 'subidas_banco', 'zancadas_caminando', 'zancadas_barra', 'zancada_atras_peso_corporal', 'zancada_apoyo', 'subida_escalon'],
  glute: ['puente_gluteo', 'patada_gluteo_polea'],
  back_ext: ['hiperextensiones', 'superman'],
  knee_flex: ['curl_femoral_tumbado', 'curl_femoral_sentado'],
  knee_ext: ['extension_cuadriceps'],
  calves: ['gemelos_maquina_pie', 'gemelos_prensa', 'gemelos_sentado_maquina', 'gemelos_banda', 'gemelos_peso_corporal'],
  push_h: ['press_pecho_maquina', 'press_banca_mancuernas', 'press_banca_barra', 'press_inclinado_mancuernas', 'press_banca_multipower', 'press_inclinado_barra', 'flexiones', 'flexiones_rodillas', 'flexiones_inclinadas', 'flexiones_pies_elevados', 'flexiones_pared'],
  push_v: ['press_hombro_mancuernas', 'press_hombro_maquina', 'press_militar_barra_sentado', 'press_hombro_unilateral', 'press_arnold'],
  pull_v: ['jalon_pecho', 'jalon_supino', 'jalon_estrecho', 'dominadas_supinas', 'dominadas'],
  pull_h: ['remo_polea_baja', 'remo_mancuerna', 'remo_barra_supino', 'remo_invertido'],
  lats_iso: ['pullover_polea', 'pullover_mancuerna'],
  chest_iso: ['contractor_pecho', 'cruce_poleas', 'aperturas_mancuernas', 'aperturas_banda'],
  shoulder_lat: ['elevaciones_laterales'],
  shoulder_rear: ['pajaros_tumbado', 'aperturas_posteriores_banda'],
  traps: ['encogimientos_mancuernas'],
  biceps: ['curl_mancuernas', 'curl_polea', 'curl_barra_z', 'curl_barra', 'curl_martillo', 'curl_inclinado', 'curl_banda', 'curl_concentrado'],
  triceps: ['extension_triceps_cuerda', 'extension_triceps_polea', 'extension_triceps_sobre_cabeza', 'press_frances', 'patada_triceps'],
  hip_abd: ['abductores_maquina'],
  hip_add: ['aductores_maquina'],
  core_flex: ['crunch_polea', 'encogimientos_abdominales', 'elevacion_cadera_rodillas', 'bicicleta_abdominal', 'elevaciones_piernas'],
  core_stab: ['plancha_frontal', 'plancha_lateral', 'rueda_abdominal_barra'],
}

interface Slot {
  pattern: Pattern
  role: SlotRole
  /** ids preferidos (plantillas). '@flexion' = flexión adecuada al nivel. */
  prefer?: string[]
  /** Patrón alternativo si no hay candidato. */
  fallback?: Pattern
  /** Series fijas (plantillas). */
  sets?: number
  /** Referencia de fuerza / pesado del día. */
  reference?: boolean
}

interface Ctx {
  level: Level
  goal: Goal
  youth: boolean
  equipment: EquipmentId[]
  excluded: Set<string>
  priority: Set<Region>
  minutes: number
}

function levelOk(ex: Exercise, ctx: Pick<Ctx, 'youth' | 'level'>): boolean {
  const lvl = ctx.youth ? 'beginner' : ctx.level
  return LEVEL_RANK[ex.minLevel] <= LEVEL_RANK[lvl]
}

/** Demostración disponible: local verificada o externa (requiere internet). */
export function hasDemo(ex: Exercise): boolean {
  return ex.demoStatus === 'verificada' || hasExternalDemo(ex.id)
}

function expandPrefer(prefer: string[] | undefined, level: Level): string[] {
  const out: string[] = []
  for (const id of prefer ?? []) {
    if (id === '@flexion') out.push(...(level === 'beginner' ? ['flexiones_rodillas', 'flexiones', 'flexiones_inclinadas', 'flexiones_pared'] : ['flexiones', 'flexiones_rodillas', 'flexiones_inclinadas']))
    else out.push(id)
  }
  return out
}

/** Candidatos ordenados para un patrón. Solo ejercicios con demostración (local o externa), salvo último recurso declarado. */
export function candidatesFor(pattern: Pattern, ctx: Pick<Ctx, 'youth' | 'level' | 'excluded' | 'equipment' | 'goal'>, prefer?: string[], allowPending = false, role: SlotRole = 'accessory'): Exercise[] {
  const ids = [...expandPrefer(prefer, ctx.level), ...PATTERN_PREFS[pattern]]
  const seen = new Set<string>()
  const list: Exercise[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const ex = getExercise(id)
    if (ex) list.push(ex)
  }
  for (const ex of [...allExercises()].sort((a, b) => a.id.localeCompare(b.id))) if (ex.pattern === pattern && !seen.has(ex.id) && !ex.custom) list.push(ex)
  const ok = list.filter((ex) => ex.pattern === pattern && !ex.archived && (allowPending || hasDemo(ex)) && !ctx.excluded.has(ex.id) && levelOk(ex, ctx) && hasEquipment(ctx.equipment, ex))
  // Fuerza o mixto: en el principal se prioriza la barra si existe (cargas altas), salvo en menores.
  if (!ctx.youth && role === 'main' && (ctx.goal === 'strength' || ctx.goal === 'mixed') && !prefer?.length) {
    return [...ok.filter((e) => e.loadType === 'barbell_total'), ...ok.filter((e) => e.loadType !== 'barbell_total')]
  }
  if (ctx.youth) return [...ok.filter((e) => e.loadType !== 'barbell_total'), ...ok.filter((e) => e.loadType === 'barbell_total')]
  return ok
}

// ───────────────────────── Reparto de días ─────────────────────────

/** Elige k días de los disponibles maximizando la separación mínima (semana circular, incluye domingo→lunes). Determinista. */
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

/** Bloques principales: rodilla (cuádriceps/glúteos), cadera (isquios/glúteos), empuje (pecho), tirón (espalda). */
export type Block = 'knee' | 'hip' | 'push' | 'pull'
const BLOCKS: Block[] = ['knee', 'push', 'pull', 'hip']
const BLOCK_REGION: Record<Block, Region> = { knee: 'quads', hip: 'hamstrings', push: 'chest', pull: 'back' }
const STANDARD_DAYS = new Set(['hip,knee,pull,push', 'pull,push', 'hip,knee', 'push', 'pull', 'knee,pull,push', 'hip,pull,push', 'hip,knee,push', 'hip,knee,pull'])

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

/**
 * Asigna cada bloque a exactamente f de las n sesiones. Puntuación: grupos repetidos en días naturales consecutivos
 * (incluye domingo→lunes), equilibrio de tamaño y combinaciones habituales. Determinista (primer mejor).
 */
export function distributeBlocks(n: number, f: number, weekdays: number[]): Block[][] {
  const subsets = combos(n, Math.min(f, n))
  let best: Block[][] | null = null
  let bestScore = Infinity
  const consecutive: [number, number][] = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && weekdays.length === n && (weekdays[i] + 1) % 7 === weekdays[j]) consecutive.push([i, j])
  const mean = (BLOCKS.length * Math.min(f, n)) / n
  for (const a of subsets) for (const b of subsets) for (const c of subsets) for (const d of subsets) {
    const days: Block[][] = Array.from({ length: n }, () => [])
    a.forEach((i) => days[i].push('knee'))
    b.forEach((i) => days[i].push('push'))
    c.forEach((i) => days[i].push('pull'))
    d.forEach((i) => days[i].push('hip'))
    if (days.some((x) => x.length === 0)) continue
    let score = 0
    for (const x of days) score += (x.length - mean) ** 2
    for (const x of days) if (!STANDARD_DAYS.has([...x].sort().join(','))) score += 0.6
    for (const [i, j] of consecutive) score += days[i].filter((x) => days[j].includes(x)).length * 3
    if (score < bestScore - 1e-9) {
      bestScore = score
      best = days.map((x) => BLOCKS.filter((bl) => x.includes(bl)))
    }
  }
  return best ?? []
}

function overlapScore(plan: Block[][], weekdays: number[]): number {
  let s = 0
  for (let i = 0; i < plan.length; i++) for (let j = 0; j < plan.length; j++) if (i !== j && (weekdays[i] + 1) % 7 === weekdays[j]) s += plan[i].filter((x) => plan[j].includes(x)).length
  return s
}

// ───────────────────────── Construcción ─────────────────────────

interface BuiltExercise extends RoutineExercise {
  role: SlotRole
  block?: Block
  region?: Region
}

interface BuiltDay {
  id: string
  weekday: number | null
  blocks: Block[]
  exercises: BuiltExercise[]
  extras: string[]
}

function mk(dayId: string, idx: number, ex: Exercise, role: SlotRole, pctx: PrescriptionContext, opts: { reference?: boolean; sets?: number; optional?: boolean; block?: Block; region?: Region } = {}): BuiltExercise {
  const prescription = buildPrescription(ex, role, pctx, { reference: opts.reference, sets: opts.sets })
  return { uid: `${dayId}-${idx}-${ex.id}`, exerciseId: ex.id, prescription, role, ...(opts.optional ? { optional: true } : {}), block: opts.block, region: opts.region }
}

function clean(re: BuiltExercise): RoutineExercise {
  const out: RoutineExercise = { uid: re.uid, exerciseId: re.exerciseId, prescription: re.prescription }
  if (re.superset) out.superset = re.superset
  if (re.optional) out.optional = true
  return out
}

function toDay(b: BuiltDay, name: string, focus: SessionFocus): RoutineDay {
  return { id: b.id, name, focus, exercises: b.exercises.map(clean) }
}

const dayMinutes = (b: BuiltDay) => dayDuration({ id: b.id, name: '', focus: 'custom', exercises: b.exercises }).minutes

function ctxFromProfile(p: Profile, youth: boolean, goalOverride?: Goal, equipmentOverride?: EquipmentId[]): Ctx {
  return {
    level: youth ? 'beginner' : p.level,
    goal: youth ? 'general' : goalOverride ?? p.goal,
    youth,
    equipment: equipmentOverride ?? p.equipment,
    excluded: new Set(p.excludedExercises),
    priority: new Set(p.priorityRegions ?? regionsFromMuscles(p.priorityMuscles)),
    minutes: p.minutesPerSession,
  }
}

/** Prioridades por región (las antiguas por músculo se convierten). */
export function priorityRegionsOf(p: Pick<Profile, 'priorityRegions' | 'priorityMuscles'>): Region[] {
  return p.priorityRegions ?? regionsFromMuscles(p.priorityMuscles)
}

/** Grupos a los que se aplica la frecuencia pedida (3.4): por defecto pecho, espalda, cuádriceps, isquios y glúteos + prioridades + avanzados. */
export function targetRegionsFor(p: Pick<Profile, 'priorityRegions' | 'priorityMuscles' | 'frequencyExtraRegions'>): Region[] {
  const s = new Set<Region>(DEFAULT_TARGET_REGIONS)
  for (const r of p.priorityRegions ?? regionsFromMuscles(p.priorityMuscles)) if (r !== 'core_iso' && r !== 'delt_unspecified') s.add(r)
  for (const r of p.frequencyExtraRegions ?? []) s.add(r)
  return [...s]
}

/** Ejercicio para un bloque en su k-ésima aparición de la semana. */
function blockPatterns(block: Block, k: number): Pattern[] {
  switch (block) {
    case 'knee': return k % 2 === 0 ? ['squat', 'lunge', 'knee_ext'] : ['lunge', 'squat', 'knee_ext']
    case 'hip': return k % 2 === 0 ? ['hinge', 'knee_flex'] : ['knee_flex', 'hinge']
    case 'push': return ['push_h']
    case 'pull': return k % 2 === 0 ? ['pull_v', 'pull_h'] : ['pull_h', 'pull_v']
  }
}

interface PlanState {
  gaps: Set<string>
  pendingUsed: Set<string>
  choice: Map<string, string>
  notes: string[]
}

/** Elige un ejercicio estable para el patrón (mismo ejercicio en la semana para principiantes; variedad intencional moderada en el resto). */
function pickExercise(pattern: Pattern, ctx: Ctx, st: PlanState, used: Set<string>, occurrence: number, prefer?: string[], role: SlotRole = 'secondary'): Exercise | null {
  let cands = candidatesFor(pattern, ctx, prefer, false, role).filter((e) => !used.has(e.id))
  if (!cands.length) {
    cands = candidatesFor(pattern, ctx, prefer, true, role).filter((e) => !used.has(e.id))
    if (cands.length) st.pendingUsed.add(cands[0].id)
  }
  if (!cands.length) return null
  const key = `${pattern}`
  const prev = st.choice.get(key)
  let pick: Exercise
  if (prefer?.length) pick = cands[0]
  else if (ctx.level === 'beginner' || ctx.youth) pick = cands.find((c) => c.id === prev) ?? cands[0]
  else pick = cands[occurrence % Math.min(2, cands.length)]
  if (!st.choice.has(key)) st.choice.set(key, pick.id)
  return pick
}

/** Reparte S series semanales entre k días (mínimo 2 por día con trabajo). */
function splitSets(S: number, k: number, minPerDay = 2): number[] {
  if (k <= 0) return []
  const base = Math.floor(S / k)
  const rem = S - base * k
  return Array.from({ length: k }, (_, i) => Math.max(minPerDay, base + (i < rem ? 1 : 0)))
}

function blockBudget(block: Block, ctx: Ctx, extra: Partial<Record<Region, number>>): number {
  const r = BLOCK_REGION[block]
  const b = weeklyBudget(r, ctx.level, ctx.goal, ctx.priority.has(r))
  const base = b ? b.start : 4
  const add = extra[r] ?? 0
  return Math.min(ctx.priority.has(r) ? PRIORITY_CEILING : Math.max(base, b?.max ?? base), base + add)
}

/** Construye los días a partir del reparto de bloques (músculo, mixto, condición general y menores). */
function buildBlockDays(plan: Block[][], weekdays: number[], ids: string[], ctx: Ctx, pctx: PrescriptionContext, st: PlanState, opts: GenerateOptions): BuiltDay[] {
  const days: BuiltDay[] = plan.map((blocks, i) => ({ id: ids[i], weekday: weekdays[i] ?? null, blocks, exercises: [], extras: [] }))
  const maxSets = maxSetsPerExercise()
  const occ: Record<Block, number> = { knee: 0, hip: 0, push: 0, pull: 0 }
  // Series por día de cada bloque según su presupuesto semanal.
  const perDay = new Map<string, number>()
  for (const block of BLOCKS) {
    const dayIdx = days.map((d, i) => (d.blocks.includes(block) ? i : -1)).filter((i) => i >= 0)
    if (!dayIdx.length) continue
    let S = blockBudget(block, ctx, opts.extraSets ?? {})
    // Un solo día semanal: sesión equilibrada y manejable, sin amontonar la dosis de un plan de varios días (3.4).
    if (days.length === 1) S = Math.min(S, ctx.level === 'intermediate' ? 4 : 3)
    if (ctx.youth) S = dayIdx.length * 2
    const refDays = ctx.goal === 'mixed' ? dayIdx.filter((i) => mixedRefBlocks(i, days[i].blocks).includes(block)) : []
    const alloc: number[] = []
    if (refDays.length) {
      const remaining = Math.max(0, S - refDays.length * 3)
      const others = dayIdx.filter((i) => !refDays.includes(i))
      const split = splitSets(remaining, others.length)
      for (const i of dayIdx) alloc[i] = refDays.includes(i) ? 3 : split[others.indexOf(i)]
    } else {
      const split = splitSets(S, dayIdx.length)
      dayIdx.forEach((i, j) => (alloc[i] = split[j]))
    }
    for (const i of dayIdx) {
      let sets = alloc[i] ?? 2
      if (opts.reduceSets) sets = Math.max(2, sets - 1)
      if (ctx.youth) sets = 2
      perDay.set(`${i}:${block}`, sets)
    }
  }
  // Ejercicios de cada bloque (dividiendo en dos si se supera el máximo por ejercicio).
  days.forEach((d, i) => {
    const used = new Set<string>()
    d.blocks.forEach((block, bi) => {
      const sets = perDay.get(`${i}:${block}`) ?? 2
      const k = occ[block]++
      const parts = sets > maxSets ? [Math.ceil(sets / 2), Math.floor(sets / 2)] : [sets]
      const isRefBlock = ctx.goal === 'mixed' && mixedRefBlocks(i, d.blocks).includes(block)
      // Dos ejercicios del mismo bloque: el «principal» del patrón base primero (sentadilla antes que zancada).
      // Referencias del mixto: patrón base estable (sentadilla, bisagra…), sin alternar.
      const patterns = parts.length > 1 || isRefBlock ? blockPatterns(block, 0) : blockPatterns(block, k)
      const bodyweightOnly = ctx.equipment.every((e) => e === 'chair' || e === 'wall' || e === 'step')
      parts.forEach((partSets, pi) => {
        let ex: Exercise | null = null
        const role: SlotRole = (bi === 0 && pi === 0) || (isRefBlock && pi === 0) ? 'main' : 'secondary'
        for (const pattern of pi === 0 ? patterns : [patterns[1] ?? patterns[0], patterns[0]]) {
          ex = pickExercise(pattern, ctx, st, used, k + pi, block === 'push' && pattern === 'push_h' && bodyweightOnly ? ['@flexion'] : undefined, role)
          if (ex) break
        }
        if (!ex && block === 'hip') {
          // Sin bisagra ni curl femoral: el puente cubre glúteos, NO los isquios (se avisa).
          ex = pickExercise('glute', ctx, st, used, k)
          st.gaps.add('hip_hams')
        }
        if (!ex) {
          st.gaps.add(block)
          return
        }
        used.add(ex.id)
        const isRef = isRefBlock && pi === 0 && ex.category === 'compound' && ex.loadType !== 'bodyweight' && !ex.unilateral
        d.exercises.push(mk(d.id, d.exercises.length, ex, role, pctx, { reference: isRef, sets: ctx.youth ? undefined : partSets, block, region: BLOCK_REGION[block] }))
      })
    })
  })
  return days
}

/** Mixto: uno o dos ejercicios de referencia por sesión, rotando pierna+empuje / cadera+tirón para no acumular volumen. */
function mixedRefBlocks(dayIndex: number, blocks: Block[]): Block[] {
  const rot: Block[][] = [['knee', 'push'], ['hip', 'pull']]
  const pref = rot[dayIndex % 2].filter((b) => blocks.includes(b))
  if (pref.length) return pref.slice(0, 2)
  return blocks.slice(0, blocks.length >= 3 ? 2 : 1)
}

/** Añade accesorios opcionales solo si caben en el tiempo indicado (prioridades primero; luego tronco/gemelos; brazos y hombro según nivel). */
function addOptional(days: BuiltDay[], ctx: Ctx, pctx: PrescriptionContext, opts: GenerateOptions): void {
  if (opts.reduceSets) return
  const budget = ctx.minutes
  const fits = (d: BuiltDay) => dayMinutes(d) <= budget
  const tryAdd = (d: BuiltDay, pattern: Pattern, sets: number, region: Region, prefer?: string[]): boolean => {
    const used = new Set(d.exercises.map((e) => e.exerciseId))
    const cands = candidatesFor(pattern, ctx, prefer).filter((e) => !used.has(e.id) && directRegions(e.id).includes(region))
    const ex = cands[0]
    if (!ex) return false
    const re = mk(d.id, d.exercises.length, ex, 'accessory', pctx, { sets: ctx.youth ? undefined : sets, optional: true, region })
    d.exercises.push(re)
    if (!fits(d)) {
      d.exercises.pop()
      return false
    }
    d.extras.push(ex.id)
    return true
  }
  const regionPatterns: Partial<Record<Region, Pattern[]>> = {
    delt_side: ['shoulder_lat'], delt_rear: ['shoulder_rear'], biceps: ['biceps'], triceps: ['triceps'], calves: ['calves'], core: ['core_flex'], core_iso: ['core_stab'], delt_front: ['push_v'],
  }
  const relatedBlocks: Partial<Record<Region, Block[]>> = { delt_side: ['push'], triceps: ['push'], delt_front: ['push'], delt_rear: ['pull'], biceps: ['pull'], calves: ['knee', 'hip'] }
  const orderDays = (r: Region) => {
    const rel = relatedBlocks[r]
    return [...days].sort((a, b) => {
      const ra = rel ? (a.blocks.some((x) => rel.includes(x)) ? 0 : 1) : 0
      const rb = rel ? (b.blocks.some((x) => rel.includes(x)) ? 0 : 1) : 0
      return ra - rb || dayMinutes(a) - dayMinutes(b) || a.id.localeCompare(b.id)
    })
  }
  const addRegion = (r: Region, aim: number) => {
    let done = 0
    for (const d of orderDays(r)) {
      if (done >= aim) break
      if (d.exercises.some((e) => directRegions(e.exerciseId).includes(r) && e.optional)) continue
      const pats = regionPatterns[r] ?? []
      for (const pat of pats) if (tryAdd(d, pat, Math.min(2, aim - done), r)) { done += 2; break }
    }
  }
  // 1) Prioridades sin presupuesto propio (hombro lateral/posterior, brazos, gemelos, tronco).
  for (const r of [...ctx.priority].filter((x) => !BUDGET_REGIONS.includes(x) && x !== 'glutes').sort()) addRegion(r, optionalAim(r, true, ctx.goal))
  // 2) Tronco y gemelos (2–4 si encajan): rotación de un elemento por día — plancha, plancha lateral, gemelos.
  const rotation: { pattern: Pattern; prefer: string[]; sets: number; region: Region }[] = [
    { pattern: 'core_stab', prefer: ['plancha_frontal'], sets: 2, region: 'core_iso' },
    { pattern: 'core_stab', prefer: ['plancha_lateral'], sets: 1, region: 'core_iso' },
    { pattern: 'calves', prefer: [], sets: 2, region: 'calves' },
  ]
  const n = days.length
  const items = n >= 3 ? rotation : n === 2 ? [rotation[0], rotation[2]] : [rotation[0]]
  items.forEach((it, j) => {
    const d = days[j % n]
    if (it.region === 'calves' && !ctx.priority.has('calves')) {
      // gemelos en un día con pierna si es posible
      const legDay = [...days].reverse().find((x) => x.blocks.some((b) => b === 'knee' || b === 'hip') && !x.extras.length) ?? d
      if (!legDay.exercises.some((e) => directRegions(e.exerciseId).includes('calves'))) tryAdd(legDay, it.pattern, it.sets, it.region, it.prefer)
      return
    }
    if (it.region === 'calves') return
    if (!d.exercises.some((e) => e.exerciseId === it.prefer[0])) tryAdd(d, it.pattern, it.sets, it.region, it.prefer)
  })
  // 3) Músculo/mixto con experiencia: brazos y hombro (2 series) solo si sobra tiempo; nunca para principiantes.
  if (!ctx.youth && ctx.level !== 'beginner' && (ctx.goal === 'hypertrophy' || ctx.goal === 'mixed')) {
    for (const r of ['delt_side', 'triceps', 'biceps', 'delt_rear'] as Region[]) {
      if (ctx.priority.has(r)) continue
      const aim = optionalAim(r, false, ctx.goal)
      if (aim > 0) addRegion(r, aim)
    }
  }
}

function dayName(b: BuiltDay, letter: string): { name: string; focus: SessionFocus } {
  const regions = new Set(b.exercises.flatMap((e) => directRegions(e.exerciseId)))
  const leg = regions.has('quads') || regions.has('hamstrings') || (regions.has('glutes') && !regions.has('chest'))
  const push = regions.has('chest')
  const pull = regions.has('back')
  const trunk = regions.has('core') || regions.has('core_iso')
  let label: string
  let focus: SessionFocus = 'custom'
  if (leg && push && pull) {
    label = 'Cuerpo completo'
    focus = 'full'
  } else if (push && pull && !leg) {
    label = 'Torso'
    focus = 'upper'
  } else if (leg && !push && !pull) {
    label = 'Pierna'
    focus = 'legs'
  } else {
    const parts = [leg ? 'pierna' : '', push ? 'empuje' : '', pull ? 'tirón' : '', trunk ? 'tronco' : ''].filter(Boolean)
    label = cap(parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0] ?? 'Sesión')
    focus = push && !pull && !leg ? 'push' : pull && !push && !leg ? 'pull' : 'custom'
  }
  return { name: `Día ${letter} · ${label}`, focus }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ───────────────────────── Fuerza: referencias primero ─────────────────────────

/** Referencias por defecto si la persona no ha elegido (se marcan como provisionales). */
function defaultReferences(ctx: Ctx): string[] {
  const out: string[] = []
  for (const pattern of ['squat', 'push_h', 'hinge'] as Pattern[]) {
    const c = candidatesFor(pattern, ctx, undefined, false, 'main').find((e) => e.category === 'compound' && e.loadType !== 'bodyweight')
    if (c) out.push(c.id)
  }
  return out
}

export function referenceCandidates(p: Profile): Exercise[] {
  const ctx = ctxFromProfile(p, false)
  const ids = ['sentadilla_barra', 'prensa', 'sentadilla_mancuernas', 'press_banca_barra', 'press_banca_mancuernas', 'press_pecho_maquina', 'peso_muerto_rumano', 'peso_muerto_rumano_mancuernas', 'press_militar_barra_sentado', 'press_hombro_mancuernas', 'dominadas', 'jalon_pecho', 'remo_barra_supino', 'flexiones']
  return ids.map((id) => getExercise(id)).filter((e): e is Exercise => !!e && hasEquipment(ctx.equipment, e) && !ctx.excluded.has(e.id))
}

function buildStrengthDays(n: number, weekdays: number[], ids: string[], ctx: Ctx, pctx: PrescriptionContext, refs: string[], st: PlanState, opts: GenerateOptions): BuiltDay[] {
  const days: BuiltDay[] = Array.from({ length: n }, (_, i) => ({ id: ids[i], weekday: weekdays[i] ?? null, blocks: [], exercises: [], extras: [] }))
  const perDay = Math.min(2, refs.length)
  const seq: string[] = []
  while (seq.length < n * perDay) seq.push(...refs)
  let cursor = 0
  for (const d of days) {
    const today: string[] = []
    let guard = 0
    while (today.length < perDay && guard++ < refs.length * 3) {
      const id = seq[cursor++ % seq.length]
      if (!today.includes(id)) today.push(id)
    }
    // La referencia prioritaria del día, primero (orden de la lista de referencias).
    today.sort((a, b) => refs.indexOf(a) - refs.indexOf(b))
    for (const id of today) {
      const ex = getExercise(id)
      if (!ex) continue
      const sets = opts.reduceSets ? 2 : undefined
      d.exercises.push(mk(d.id, d.exercises.length, ex, 'main', pctx, { reference: true, sets }))
    }
  }
  // Accesorios para cubrir bloques sin referencia (equilibrio básico), solo si caben. No se rellenan dianas de hipertrofia.
  const covered = new Set(refs.flatMap((id) => directRegions(id)))
  const missing = BLOCKS.filter((b) => !covered.has(BLOCK_REGION[b]))
  const occ: Record<Block, number> = { knee: 0, hip: 0, push: 0, pull: 0 }
  for (const d of days) {
    const used = new Set(d.exercises.map((e) => e.exerciseId))
    for (const block of missing) {
      const k = occ[block]++
      let ex: Exercise | null = null
      for (const pattern of blockPatterns(block, k)) {
        ex = pickExercise(pattern, ctx, st, used, k)
        if (ex) break
      }
      if (!ex) {
        st.gaps.add(block)
        continue
      }
      const re = mk(d.id, d.exercises.length, ex, 'accessory', pctx, { sets: 2, optional: true, block, region: BLOCK_REGION[block] })
      d.exercises.push(re)
      if (dayMinutes(d) > ctx.minutes) d.exercises.pop()
      else used.add(ex.id)
    }
    d.blocks = BLOCKS.filter((b) => d.exercises.some((e) => directRegions(e.exerciseId).includes(BLOCK_REGION[b])))
  }
  return days
}

// ───────────────────────── API principal ─────────────────────────

const GOAL_TEXT: Record<Goal, string> = { hypertrophy: 'ganar músculo', strength: 'ganar fuerza', mixed: 'fuerza y músculo', general: 'condición física general' }
const LEVEL_TEXT: Record<Level, string> = { beginner: 'empiezas desde cero', returning: 'vuelves tras una pausa', intermediate: 'tienes nivel intermedio' }

function frequencyTable(days: RoutineDay[], schedule: { weekday: number; dayId: string }[], targets: Region[], desired: FrequencyPref): FrequencyRow[] {
  const vol = new Map(weeklyRegionVolume({ days, schedule }).map((v) => [v.region, v]))
  const rows: FrequencyRow[] = []
  const order: Region[] = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'delt_front', 'delt_side', 'delt_rear', 'biceps', 'triceps', 'calves', 'core', 'core_iso']
  for (const r of order) {
    const v = vol.get(r) as RegionVolume | undefined
    const target = targets.includes(r)
    rows.push({ region: r, desired: target && desired !== 'auto' ? desired : null, target, directDays: v?.directDays ?? 0, secondaryOnlyDays: v?.secondaryOnlyDays ?? 0, direct: v?.direct ?? 0, estimated: v?.estimated ?? 0 })
  }
  return rows
}

function maxMinutesOf(days: RoutineDay[]): number {
  return Math.max(0, ...days.map((d) => dayDuration(d).minutes))
}

/**
 * Genera una propuesta (motor 2). No guarda nada: la persona la acepta o no.
 * Mismo perfil + misma versión de reglas = mismo resultado (sin azar; desempates por id).
 */
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
        : `Usamos ${n} de tus ${available.length} días disponibles: como ${youth ? 'menor de edad' : LEVEL_TEXT[ctx.level]}, ${n} sesiones bastan para empezar. Puedes cambiarlo.`,
    )
  }

  // 2) Frecuencia pedida y grupos a los que se aplica
  const targets = youth ? DEFAULT_TARGET_REGIONS : targetRegionsFor(profile)
  const requested: 1 | 2 | 3 | null = options.frequencyOverride ?? (profile.frequency === 'auto' ? null : profile.frequency)
  const desired: FrequencyPref = requested ?? 'auto'
  if (requested !== null && requested > n && ctx.goal !== 'strength') {
    return frequencyConflict(profile, options, requested, n, available.length, targets)
  }

  const weekdays = pickSpacedDays(available, n)
  const ids = Array.from({ length: n }, (_, i) => `d${i + 1}`)
  const pctx: PrescriptionContext = { level: ctx.level, goal: ctx.goal, youth }
  const st: PlanState = { gaps: new Set(), pendingUsed: new Set(), choice: new Map(), notes: [] }

  let built: BuiltDay[]
  let refs: string[] = []
  let refsProvisional = false
  let f: number
  if (ctx.goal === 'strength' && !youth) {
    refs = (profile.strengthRefs ?? []).filter((id) => {
      const e = getExercise(id)
      return e && hasEquipment(ctx.equipment, e) && !ctx.excluded.has(id)
    }).slice(0, 3)
    if (!refs.length) {
      refs = defaultReferences(ctx)
      refsProvisional = true
    }
    built = buildStrengthDays(n, weekdays, ids, ctx, pctx, refs, st, options)
    f = 0
  } else {
    // Auto: cuerpo completo con 1–3 días; torso/pierna con 4; 5 días → frecuencia 3; 6 días → 2.
    const autoF = n <= 3 ? n : n === 4 ? 2 : n === 5 ? 3 : 2
    f = requested ?? autoF
    let plan = distributeBlocks(n, f, weekdays)
    if (requested === null && n >= 2 && overlapScore(plan, weekdays) > 0 && f > 1) {
      // Días seguidos: probar a repartir grupos con una frecuencia menor y quedarse con la que menos repite.
      const alt = distributeBlocks(n, f - 1, weekdays)
      if (alt.length && overlapScore(alt, weekdays) < overlapScore(plan, weekdays)) {
        plan = alt
        f = f - 1
        notices.push('Tus días disponibles incluyen días seguidos: el reparto evita repetir los mismos grupos en días consecutivos.')
      }
    }
    built = buildBlockDays(plan, weekdays, ids, ctx, pctx, st, options)
    if (ctx.goal === 'mixed') refs = built.flatMap((d) => d.exercises.filter((e) => e.prescription.reference).map((e) => e.exerciseId)).filter((v, i, a) => a.indexOf(v) === i)
  }
  if (!youth) addOptional(built, ctx, pctx, options)
  else addYouthCore(built, ctx, pctx)

  // Orden dentro del día: referencias/principales → secundarios → accesorios; tronco al final.
  for (const d of built) {
    const rank = (e: BuiltExercise) => (e.prescription.reference ? 0 : e.role === 'main' ? 1 : e.role === 'secondary' ? 2 : directRegions(e.exerciseId).some((r) => r === 'core' || r === 'core_iso') ? 4 : 3)
    d.exercises = d.exercises.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i).map((x) => x.e)
    d.exercises.forEach((e, i) => (e.uid = `${d.id}-${i}-${e.exerciseId}`))
  }

  const homeBodyweight = !st.gaps.has('pull') ? false : ctx.equipment.every((e) => e === 'chair' || e === 'wall' || e === 'step')
  const letters = 'ABCDEF'
  const days: RoutineDay[] = built.map((b, i) => {
    const { name, focus } = dayName(b, letters[i])
    return toDay(b, name, focus)
  })
  const schedule = built.filter((b) => b.weekday !== null).map((b) => ({ weekday: b.weekday as number, dayId: b.id }))
  const table = frequencyTable(days, schedule, targets, desired)

  // 3) Frecuencia pedida no conseguida (material o tiempo): conflicto con la tabla real, salvo que se acepte.
  if (requested !== null && ctx.goal !== 'strength' && !youth && !options.acceptRealFrequency) {
    const short = table.filter((r) => r.target && r.directDays < requested)
    if (short.length) {
      const realAlt: ConflictAlternative = {
        label: 'Usar este plan con la frecuencia real',
        explanation: `No se consigue ${requested} días por semana en: ${short.map((r) => `${REGION_LABEL[r.region].toLowerCase()} (${r.directDays})`).join(', ')}. La tabla muestra lo que de verdad incluye.`,
        options: { ...options, acceptRealFrequency: true },
        table,
        maxMinutes: maxMinutesOf(days),
      }
      const alts: ConflictAlternative[] = [realAlt]
      if (requested > 1) alts.push(previewAlternative(profile, { ...options, frequencyOverride: (requested - 1) as 1 | 2 | 3 }, requested - 1, targets))
      alts.push({ label: 'Revisar material o días en el perfil', explanation: 'Por ejemplo, marcar material que sí tienes (banda con anclaje apto, barra de parque) o más días.', profileAction: 'edit_profile' })
      return {
        status: 'conflict',
        code: 'frequency_not_met',
        message: `Has pedido frecuencia ${requested} para ${targets.map((r) => REGION_LABEL[r].toLowerCase()).join(', ')}, pero con tu material y tiempo hay grupos que no llegan. No cambiamos tu elección sin preguntarte.`,
        alternatives: alts,
      }
    }
  }

  // 4) Familiarización (desde cero) o adaptación (vuelta tras pausa)
  // Menores: su itinerario ya es de aprendizaje (1–2 series, RIR 3–4); no se le aplican reglas adultas de familiarización.
  const famReason: 'beginner' | 'returning' | null = youth || options.learningDone ? null : ctx.level === 'beginner' ? 'beginner' : ctx.level === 'returning' && !options.skipAdaptation && profile.returningAdaptation !== false ? 'returning' : null
  const familiarization = famReason ? { sessions: FAMILIARIZATION_SESSIONS, reason: famReason } : null
  if (options.learningDone && !youth && (ctx.level === 'beginner' || ctx.level === 'returning')) st.notes.push('Ya completaste la fase de Aprendizaje: esta propuesta empieza con la dosis base, sin otra familiarización. Los ejercicios nuevos para ti conservan su propio aprendizaje (primera vez: carga cómoda y margen).')

  const plan: RoutinePlanInfo = { engineVersion: ENGINE_VERSION, goal: ctx.goal, level: ctx.level, desiredFrequency: desired, targetRegions: targets, references: refs, minutes: ctx.minutes }
  const draft = finalizeDraft({ days, schedule, ctx, youth, n, f, desired, table, st, refs, refsProvisional, familiarization, plan, homeBodyweight, location: profile.locations })

  const maxMin = maxMinutesOf(days)
  const overBudget = maxMin > ctx.minutes * 1.05
  const timeAdjustments: TimeAdjustment[] = overBudget ? computeTimeAdjustments(profile, options, available.length > n) : []
  if (overBudget) {
    const longest = days.reduce((a, b) => (dayDuration(b).minutes > dayDuration(a).minutes ? b : a))
    notices.push(`La sesión más larga se estima en ${durationText(longest)} y has indicado ${ctx.minutes} min. Abajo tienes opciones (primero menos series, después otro reparto); no aplicamos ninguna sin tu permiso y no acortamos descansos.`)
  }
  return { status: 'ok', draft, notices: dedupe(notices), timeAdjustments, overBudget, frequency: table }
}

function addYouthCore(days: BuiltDay[], ctx: Ctx, pctx: PrescriptionContext): void {
  const d = days[0]
  if (!d) return
  const ex = candidatesFor('core_stab', ctx, ['plancha_frontal'])[0]
  if (ex) {
    d.exercises.push(mk(d.id, d.exercises.length, ex, 'accessory', pctx, { optional: true, region: 'core_iso' }))
    if (dayMinutes(d) > ctx.minutes) d.exercises.pop()
  }
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)]
}

function previewAlternative(profile: Profile, options: GenerateOptions, f: number, targets: Region[]): ConflictAlternative {
  const r = generateRoutine(profile, { ...options, acceptRealFrequency: true })
  if (r.status !== 'ok') return { label: `Frecuencia ${f}`, explanation: 'No se pudo calcular esta alternativa.', options }
  const short = r.frequency.filter((x) => x.target && x.directDays < f)
  const achieved = short.length === 0
  return {
    label: achieved ? `Frecuencia ${f} (conseguida en todos los grupos objetivo)` : `Probar frecuencia ${f} (real en la tabla)`,
    explanation: achieved
      ? `Cada grupo objetivo (${targets.map((t) => REGION_LABEL[t].toLowerCase()).join(', ')}) tiene trabajo directo ${f} días por semana.`
      : `Aun así quedan por debajo: ${short.map((x) => `${REGION_LABEL[x.region].toLowerCase()} (${x.directDays})`).join(', ')}.`,
    options: { ...options, acceptRealFrequency: !achieved || options.acceptRealFrequency },
    table: r.frequency,
    maxMinutes: maxMinutesOf(r.draft.days),
  }
}

function frequencyConflict(profile: Profile, options: GenerateOptions, f: number, n: number, availableCount: number, targets: Region[]): GenerateResult {
  const alts: ConflictAlternative[] = []
  if (availableCount >= f && n < f) {
    const r = generateRoutine(profile, { ...options, sessionsOverride: f })
    alts.push({
      label: `Usar ${f} de tus días disponibles`,
      explanation: `Tienes ${availableCount} días marcados: con ${f} sesiones puede haber trabajo directo ${f} días por semana.`,
      options: { ...options, sessionsOverride: f },
      ...(r.status === 'ok' ? { table: r.frequency, maxMinutes: maxMinutesOf(r.draft.days) } : {}),
    })
  }
  if (n >= 1) alts.push(previewAlternative(profile, { ...options, frequencyOverride: Math.min(3, n) as 1 | 2 | 3 }, Math.min(3, n), targets))
  if (availableCount < f) alts.push({ label: 'Añadir días a mi disponibilidad', explanation: `Hacen falta al menos ${f} sesiones por semana para trabajar cada grupo ${f} veces.`, profileAction: 'add_days' })
  return {
    status: 'conflict',
    code: 'frequency_exceeds_sessions',
    message: `Has pedido frecuencia ${f}, pero solo hay ${n} ${n === 1 ? 'sesión' : 'sesiones'}: con ${n} ${n === 1 ? 'sesión' : 'sesiones'} es imposible por definición. No cambiamos tu elección sin preguntarte.`,
    alternatives: alts,
  }
}

function computeTimeAdjustments(profile: Profile, base: GenerateOptions, canAddDay: boolean): TimeAdjustment[] {
  const out: TimeAdjustment[] = []
  if (!base.reduceSets) {
    const r = generateRoutine(profile, { ...base, reduceSets: true, acceptRealFrequency: base.acceptRealFrequency })
    if (r.status === 'ok') out.push({ id: 'reduce_sets', label: 'Una serie menos por ejercicio', explanation: 'Se quita una serie (mínimo 2 por ejercicio) y no se añaden accesorios opcionales. Baja el volumen semanal; los descansos no se tocan.', options: { ...base, reduceSets: true }, maxMinutesAfter: maxMinutesOf(r.draft.days) })
  }
  if (canAddDay && !base.acceptManyDays) {
    const r = generateRoutine(profile, { ...base, acceptManyDays: true })
    if (r.status === 'ok') out.push({ id: 'add_day', label: 'Otro reparto: más días', explanation: `Usa más de tus días disponibles (${r.draft.days.length} sesiones) para que cada una sea más corta.`, options: { ...base, acceptManyDays: true }, maxMinutesAfter: maxMinutesOf(r.draft.days) })
  }
  return out
}

interface FinalizeInput {
  days: RoutineDay[]
  schedule: { weekday: number; dayId: string }[]
  ctx: Ctx
  youth: boolean
  n: number
  f: number
  desired: FrequencyPref
  table: FrequencyRow[]
  st: PlanState
  refs: string[]
  refsProvisional: boolean
  familiarization: RoutineDraft['familiarization']
  plan: RoutinePlanInfo
  homeBodyweight: boolean
  location: Location[]
}

function finalizeDraft(i: FinalizeInput): RoutineDraft {
  const { days, schedule, ctx, youth, n, table, st, refs } = i
  const rationale: string[] = []
  const warnings: string[] = []
  const splitDesc = describeSplit(days, i.homeBodyweight, ctx.goal === 'strength' && !youth)
  rationale.push(`${n} ${n === 1 ? 'sesión' : 'sesiones'} por semana (${schedule.map((s) => WEEKDAY_NAME[s.weekday]).join(', ')}): ${splitDesc.toLowerCase()}. Objetivo: ${GOAL_TEXT[ctx.goal]}${youth ? ' (programa para menores)' : `; ${LEVEL_TEXT[ctx.level]}`}.`)
  // Frecuencia: SIEMPRE calculada de la propuesta final (A02).
  const targetRows = table.filter((r) => r.target)
  const freqTxt = targetRows.map((r) => `${REGION_LABEL[r.region].toLowerCase()} ${r.directDays}`).join(', ')
  if (ctx.goal === 'strength' && !youth) {
    const practice = exercisePractice({ days, schedule })
    rationale.push(`Fuerza: se practican primero tus ejercicios de referencia: ${refs.map((id) => `${getExercise(id)?.name ?? id} (${practice.get(id) ?? 0} ${practice.get(id) === 1 ? 'día' : 'días'}/semana)`).join(', ')}. No se alargan las sesiones para completar barras de hipertrofia.`)
    if (i.refsProvisional) warnings.push('Referencias provisionales: las hemos elegido por tu material. Ser intermedio no implica dominar cualquier levantamiento: cámbialas en tu perfil (hasta 3) si no las conoces o prefieres otras.')
  }
  rationale.push(`Frecuencia directa conseguida (días con al menos una serie de trabajo directa): ${freqTxt}. ${i.desired === 'auto' ? 'Elegida automáticamente según tus días.' : `Pedida: ${i.desired} en ${targetRows.map((r) => REGION_LABEL[r.region].toLowerCase()).join(', ')}.`} Los días con solo trabajo indirecto se muestran aparte y no se suman.`)
  if (ctx.goal !== 'strength' && !youth) {
    const budgetTxt = BUDGET_REGIONS.map((r) => {
      const b = weeklyBudget(r, ctx.level, ctx.goal, ctx.priority.has(r))
      const row = table.find((x) => x.region === r)
      return b ? `${REGION_LABEL[r].toLowerCase()} ${row?.direct ?? 0} (orientativo ${b.min}–${b.max})` : ''
    }).filter(Boolean).join(', ')
    rationale.push(`Volumen: series directas semanales ${budgetTxt}. Es un presupuesto inicial, no un mínimo; los glúteos se cuentan con los patrones que ya los trabajan. El trabajo indirecto cuenta como media serie (estimación aproximada).`)
  }
  rationale.push(youth ? 'Repeticiones de 8–15 dejando 3–4 en reserva: técnica primero, sin fallo y sin máximos.' : 'Repeticiones, esfuerzo y descansos: valores iniciales de Forja (editables). Margen moderado (RIR), sin ir al fallo por defecto. Isométricos por tiempo, sin RIR.')
  rationale.push('Progresión: doble progresión. Cuando completes todas las series en el máximo del rango con el margen objetivo, la app te propondrá el siguiente incremento disponible. Tú decides.')
  if (i.familiarization) {
    rationale.push(i.familiarization.reason === 'beginner'
      ? `Aprendizaje: tus primeros ${i.familiarization.sessions} días válidos (al menos el 70 % de las series; como máximo uno por fecha) llevan max(1, mitad de series), rangos de aprendizaje y RIR 3–4, sin subidas automáticas. Se ve la dosis de hoy y la del plan base.`
      : `Adaptación tras la pausa: ${i.familiarization.sessions} días válidos con max(1, mitad de series) y RIR 3–4. No te reclasifica como «desde cero»; puedes quitarla si prefieres empezar directamente.`)
  }
  if (st.notes.length) rationale.push(...st.notes)
  if (youth) warnings.push('Programa para menores: debe hacerse con supervisión de un adulto cualificado. Sin fallo, sin máximos y priorizando la técnica.')
  if (st.gaps.has('pull')) {
    warnings.push(i.homeBodyweight
      ? 'Falta tirón de espalda con resistencia progresable: sin material no hay remo ni dominada. El superman no lo sustituye. Si dispones de una banda con anclaje apto o de una barra de parque, márcalo en tu perfil; no hace falta comprar nada para empezar.'
      : 'Con tu material no hay ningún ejercicio de tirón (remo o dominada). Los ejercicios sin resistencia no lo sustituyen. Si dispones de una banda con anclaje apto o una barra, márcalo en tu perfil.')
  }
  if (st.gaps.has('hip_hams') || (st.gaps.has('hip') && !st.gaps.has('hip_hams'))) warnings.push('Hay límites para entrenar los isquiosurales de forma completa: sin bisagra con carga ni curl femoral, el puente trabaja glúteos pero no cubre la flexión de rodilla.')
  if (st.gaps.has('push')) warnings.push('Sin ejercicio de empuje horizontal disponible con tu material o nivel. Revisa el material marcado.')
  if (st.gaps.has('knee')) warnings.push('Sin ejercicio de sentadilla o zancada disponible con tu material o nivel. Revisa el material marcado.')
  // Demostración local pendiente (con o sin referencia externa): se dice siempre, sin afirmar que esté disponible sin conexión.
  for (const id of new Set([...st.pendingUsed, ...days.flatMap((d) => d.exercises.map((e) => e.exerciseId)).filter((x) => getExercise(x)?.demoStatus !== 'verificada')])) warnings.push(pendingWarning(id))
  const name = youth ? 'Programa supervisado para menores' : i.homeBodyweight ? 'Casa sin material' : `${splitDesc} · ${n} ${n === 1 ? 'día' : 'días'}`
  const id = stableHash(JSON.stringify(days.map((d) => d.exercises.map((e) => e.exerciseId))))
  return {
    name,
    kind: 'generated',
    templateId: `gen-${id}`,
    days,
    schedule,
    rampWeeks: 0,
    familiarization: i.familiarization,
    plan: i.plan,
    rationale: dedupe(rationale),
    warnings: dedupe(warnings),
    engineVersion: ENGINE_VERSION,
    youth,
  }
}

function describeSplit(days: RoutineDay[], home: boolean, strength = false): string {
  if (home) return 'Casa sin material'
  if (strength) return 'Fuerza con referencias'
  const f = days.map((d) => d.focus)
  if (f.every((x) => x === 'full')) return 'Cuerpo completo'
  if (f.every((x) => x === 'upper' || x === 'legs')) return 'Torso / pierna'
  if (f.every((x) => x === 'push' || x === 'pull' || x === 'legs')) return 'Empuje / tirón / pierna'
  return 'Rutina combinada'
}

// ───────────────────────── Plantillas (misma maquinaria) ─────────────────────────

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

export function buildFromTemplate(t: TemplateDef, profile: Profile, opts: { learningDone?: boolean } = {}): { draft: RoutineDraft; warnings: string[] } {
  const scope = checkScope(profile)
  const youth = scope.kind === 'youth'
  const ctx = ctxFromProfile(profile, youth, t.goal, t.equipment)
  const pctx: PrescriptionContext = { level: ctx.level, goal: ctx.goal, youth }
  const tctx: Ctx = { ...ctx, level: LEVEL_RANK[ctx.level] >= LEVEL_RANK[t.minLevel] ? ctx.level : t.minLevel }
  const st: PlanState = { gaps: new Set(), pendingUsed: new Set(), choice: new Map(), notes: [] }
  const occurrence = new Map<string, number>()
  const days: RoutineDay[] = t.sessions.map((s, i) => {
    const id = `d${i + 1}`
    const used = new Set<string>()
    const exercises: RoutineExercise[] = []
    s.slots.forEach((slot) => {
      const k = occurrence.get(slot.pattern) ?? 0
      occurrence.set(slot.pattern, k + 1)
      let ex = pickExercise(slot.pattern, tctx, st, used, k, slot.prefer, slot.role)
      if (!ex && slot.fallback) ex = pickExercise(slot.fallback, tctx, st, used, k, undefined, slot.role)
      if (!ex) {
        st.gaps.add(slot.pattern)
        return
      }
      used.add(ex.id)
      const reference = !!slot.reference && (ctx.goal === 'strength' || ctx.goal === 'mixed') && !youth
      exercises.push(clean(mk(id, exercises.length, ex, slot.role, pctx, { reference, sets: youth ? undefined : slot.sets })))
    })
    return { id, name: s.name, focus: s.focus, exercises }
  })
  const schedule = t.weekdays.slice(0, days.length).map((w, i) => ({ weekday: w, dayId: days[i].id }))
  const targets = targetRegionsFor(profile)
  const table = frequencyTable(days, schedule, targets, 'auto')
  const warnings: string[] = [...t.notes.filter((x) => x.startsWith('⚠')).map((x) => x.slice(1).trim())]
  for (const id of new Set([...st.pendingUsed, ...days.flatMap((d) => d.exercises.map((e) => e.exerciseId)).filter((x) => getExercise(x)?.demoStatus !== 'verificada')])) warnings.push(pendingWarning(id))
  if (!youth && LEVEL_RANK[profile.level] < LEVEL_RANK[t.minLevel]) warnings.push(`Esta plantilla está pensada para nivel ${t.minLevel === 'intermediate' ? 'intermedio' : 'de vuelta tras pausa'} y tu perfil indica que ${LEVEL_TEXT[profile.level]}. Puedes usarla, pero no es la recomendación inicial.`)
  if (youth) warnings.push('Programa para menores: debe hacerse con supervisión de un adulto cualificado, sin fallo y sin pruebas de máximos.')
  const gaps = table.filter((r) => r.target && r.direct === 0)
  const noteText = t.notes.join(' ').toLowerCase()
  const explained = (r: Region) => (r === 'back' && /tirón|espalda/.test(noteText)) || (r === 'hamstrings' && /isquio/.test(noteText))
  for (const g of gaps) if (!explained(g.region)) warnings.push(`${REGION_LABEL[g.region]}: sin series directas en esta plantilla.`)
  const famReason: 'beginner' | 'returning' | null = youth || opts.learningDone ? null : ctx.level === 'beginner' ? 'beginner' : ctx.level === 'returning' && profile.returningAdaptation !== false ? 'returning' : null
  const familiarization = famReason ? { sessions: FAMILIARIZATION_SESSIONS, reason: famReason } : null
  const freq = table.filter((r) => r.target).map((r) => `${REGION_LABEL[r.region].toLowerCase()} ${r.directDays}`).join(', ')
  const rationale = dedupe([t.description, ...t.notes.filter((x) => !x.startsWith('⚠')), `Frecuencia directa con el calendario de la plantilla: ${freq}.`])
  if (familiarization) rationale.push(`Aprendizaje: los primeros ${familiarization.sessions} días válidos llevan max(1, mitad de series) y RIR 3–4.`)
  const plan: RoutinePlanInfo = { engineVersion: ENGINE_VERSION, goal: ctx.goal, level: ctx.level, desiredFrequency: 'auto', targetRegions: targets, references: [], minutes: ctx.minutes }
  return {
    draft: { name: t.name, kind: 'template', templateId: t.id, days, schedule, rampWeeks: 0, familiarization, plan, rationale, warnings: dedupe(warnings), engineVersion: ENGINE_VERSION, youth },
    warnings: dedupe(warnings),
  }
}

/** Convierte un borrador en una versión de rutina almacenable. */
export function draftToVersion(draft: RoutineDraft, routineId: string, versionId: string, version: number, changeNote: string): RoutineVersion {
  return {
    id: versionId, routineId, version, createdAt: Date.now(), engineVersion: draft.engineVersion, days: draft.days, schedule: draft.schedule, rampWeeks: draft.rampWeeks,
    familiarization: draft.familiarization, plan: draft.plan, rationale: draft.rationale, warnings: draft.warnings, changeNote,
  }
}

export type { Slot }

export function pendingWarning(id: string): string {
  const ex = getExercise(id)
  if (hasExternalDemo(id)) return `${ex?.name ?? id}: demostración local pendiente; tiene una demostración externa (requiere internet) y las instrucciones escritas.`
  return `${ex?.name ?? id}: demostración pendiente. No hay una ilustración con licencia verificada de esta variante; sigue las instrucciones escritas.`
}

export function prescriptionFor(exId: string, role: SlotRole, profile: Profile): Prescription | null {
  const ex = getExercise(exId)
  if (!ex) return null
  const youth = checkScope(profile).kind === 'youth'
  return buildPrescription(ex, role, { level: profile.level, goal: profile.goal, youth })
}

/** Dosis de familiarización frente a la dosis posterior (para mostrarlas antes de empezar). */
export function familiarizationPreview(re: RoutineExercise): { today: string; after: string } {
  const ex = getExercise(re.exerciseId)
  const fam = applyFamiliarization(re.prescription, ex)
  return { today: `${describePrescription(fam, ex)} · ${describeRir(fam, ex)}`, after: `${describePrescription(re.prescription, ex)} · ${describeRir(re.prescription, ex)}` }
}

/** Contribución de un ejercicio, re-exportada para la interfaz. */
export { contributionOf }
