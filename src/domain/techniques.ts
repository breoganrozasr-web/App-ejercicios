import { directRegions } from './engine/contribution'
import { inSuperset, supersetPartner } from './sessions'
import type { BlockSegment, BlockTarget, Increments, LoadType, Prescription, RoutineTechnique, SessionExercise, SetEntry, SetMethod, SpecialBlock } from './types'
import { newId, round2 } from './util'

/**
 * Series descendentes, rest-pause y superseries (ampliación del 14/11/2026, apartados 3–7).
 * Son VALORES INICIALES Y LÍMITES DE PRODUCTO de Forja, no equivalencias de dosis científicas: los estudios (R1–R5 en
 * docs/EVIDENCIA.md) indican que pueden ahorrar tiempo con resultados parecidos, sin superioridad universal.
 */

// ───────────────────────── Textos de ayuda (literales, apartado 8) ─────────────────────────

export const HELP_TEXT = {
  drop: 'Haces un tramo, bajas el peso y continúas el mismo ejercicio. Puede ahorrar tiempo, pero no garantiza más crecimiento. Cada bajada tiene su propio peso y repeticiones. Puedes terminar el bloque cuando lo necesites.',
  rest_pause: 'Mantienes el peso y haces una pausa breve antes de continuar con unas pocas repeticiones. Registra cada tramo por separado. No necesitas usar esta técnica para seguir progresando.',
  superset: 'Alternas dos ejercicios y descansas después de completar ambos. Puede acortar la sesión. Si falta equipo o necesitas más descanso, puedes separarlos sin perder el registro.',
  phases: 'Forja adapta sus propuestas a tu práctica. La fase indica cómo organizamos tu programa; no certifica tu nivel físico. La constancia, tu rendimiento y cómo manejas los ejercicios importan más que una fecha.',
} as const

/** Etiquetas sencillas durante las series. */
export const METHOD_LABEL: Record<SetMethod | 'conventional', string> = { conventional: 'Normal', drop: 'Descendente', rest_pause: 'Rest-pause' }
export const METHOD_NAME: Record<SetMethod, string> = { drop: 'bloque descendente', rest_pause: 'bloque rest-pause' }
export const NEXT_NAME: Record<SetMethod, [string, string]> = { drop: ['bajada', 'bajadas'], rest_pause: ['miniserie', 'miniseries'] }

// ───────────────────────── Límites iniciales de Forja ─────────────────────────

/** Tramos máximos por bloque: inicial + 2 bajadas o miniseries. Nunca se encadenan bajadas infinitas. */
export const MAX_SEGMENTS = 3
/** Descendente: reducción orientativa por defecto (%), dentro de 20–25 %. */
export const DROP_DEFAULT_PCT = 20
/** Reducción que se considera razonable para sugerir una carga (fuera de esto se pide la carga a mano). */
export const DROP_REASONABLE: [number, number] = [0.1, 0.4]
/** Rest-pause: pausa breve inicial (s), ampliable. */
export const RP_PAUSE_SEC = 20
/** Cambio de carga estimado en un descendente (s), para la duración estimada. Lo real se registra. */
export const DROP_CHANGE_SEC = 15
/** Bloques especiales semanales que se proponen como máximo (entre ambos métodos). */
export const MAX_WEEKLY_BLOCKS = 2

/**
 * Aislamientos estables con carga fácil de ajustar en los que se pueden PROPONER técnicas (apartado 3).
 * Nunca en sentadilla libre, peso muerto, levantamientos técnicos ni press de banca libre pesado.
 */
export const TECHNIQUE_FRIENDLY = new Set([
  'extension_cuadriceps', 'curl_femoral_tumbado', 'curl_femoral_sentado',
  'curl_mancuernas', 'curl_martillo', 'curl_polea', 'curl_inclinado', 'curl_concentrado',
  'extension_triceps_polea', 'extension_triceps_cuerda', 'elevaciones_laterales',
])

const NUMERIC_LOADS: LoadType[] = ['barbell_total', 'dumbbell_each', 'machine', 'cable']

/** ¿Se puede registrar este método con este tipo de carga? Descendente: carga numérica; rest-pause: cualquier ejercicio por repeticiones. */
export function canUseMethod(method: SetMethod, lt: LoadType): boolean {
  if (lt === 'time') return false
  if (method === 'drop') return NUMERIC_LOADS.includes(lt)
  return true
}

// ───────────────────────── Filas de serie ─────────────────────────

export function isBlock(s: Pick<SetEntry, 'method' | 'block'>): boolean {
  return !!s.method && !!s.block
}
export function methodOf(s: Pick<SetEntry, 'method' | 'block'>): SetMethod | 'conventional' {
  return isBlock(s) ? (s.method as SetMethod) : 'conventional'
}
/** Series de trabajo convencionales: las únicas que usan la doble progresión, los récords y el 1RM estimado. */
export function conventionalWork<T extends SetEntry>(sets: T[]): T[] {
  return sets.filter((s) => s.kind === 'work' && !isBlock(s))
}
export function blocksOf<T extends SetEntry>(sets: T[]): T[] {
  return sets.filter((s) => s.kind === 'work' && isBlock(s))
}

export function blockTargetFor(method: SetMethod): BlockTarget {
  return method === 'drop'
    ? { firstRepMin: 8, firstRepMax: 12, nextRepMin: 6, nextRepMax: 12, rirMin: 1, rirMax: 2, dropPct: DROP_DEFAULT_PCT }
    : { firstRepMin: 10, firstRepMax: 15, nextRepMin: 3, nextRepMax: 5, rirMin: 1, rirMax: 2, pauseSec: RP_PAUSE_SEC }
}

/** Fila de trabajo con un bloque vacío (sin tramos). */
export function makeBlockSet(method: SetMethod, origin: SpecialBlock['origin'], extra: 1 | 2 = 1, side: SetEntry['side'] = 'both', replaces = origin === 'reorganize' ? 2 : 1): SetEntry {
  return {
    id: newId('set'), kind: 'work', weightKg: null, reps: null, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side, completed: false, completedAt: null,
    method,
    block: { plannedSegments: 1 + extra, segments: [], nextStartedAt: null, ended: null, target: blockTargetFor(method), origin, replaces },
  }
}

/** Serie convencional vacía (para volver de un bloque sin empezar a series normales). */
export function plainWorkSet(side: SetEntry['side'] = 'both'): SetEntry {
  return { id: newId('set'), kind: 'work', weightKg: null, reps: null, rir: null, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side, completed: false, completedAt: null }
}

/** Filas de trabajo previstas a partir de la prescripción y la técnica de la rutina. */
export function plannedWorkRows(p: Prescription, tech: RoutineTechnique | undefined, lt: LoadType): { conventional: number; block: { method: SetMethod; extra: 1 | 2; origin: 'routine'; replaces: number } | null } {
  if (!tech || !canUseMethod(tech.method, lt) || p.sets < 1) return { conventional: p.sets, block: null }
  const conventional = tech.mode === 'reorganize' ? Math.max(0, p.sets - 2) : Math.max(0, p.sets - 1)
  return { conventional, block: { method: tech.method, extra: tech.extra, origin: 'routine', replaces: p.sets - conventional } }
}

/** Texto antes/después de una técnica sobre una prescripción (sin prometer equivalencias). */
export function techniqueBeforeAfter(p: Prescription, tech: RoutineTechnique): { before: string; after: string; note: string } {
  const rows = plannedWorkRows(p, tech, 'machine')
  const name = METHOD_NAME[tech.method]
  const [one, many] = NEXT_NAME[tech.method]
  const extra = `${tech.extra} ${tech.extra === 1 ? one : many}`
  const conv = rows.conventional
  return {
    before: `${p.sets} ${p.sets === 1 ? 'serie normal' : 'series normales'}`,
    after: `${conv ? `${conv} ${conv === 1 ? 'serie normal' : 'series normales'} + ` : ''}1 ${name} (inicial + ${extra})`,
    note: tech.mode === 'reorganize'
      ? 'Sustituye dos series normales por un bloque. Puede ahorrar tiempo; no se garantiza el mismo estímulo.'
      : 'Prolonga la última serie: es trabajo añadido, no un ahorro de tiempo.',
  }
}

// ───────────────────────── Cambios en la sesión (nunca sobre series ya hechas) ─────────────────────────

/** Series convencionales de trabajo aún no hechas. */
export function pendingConventional(ex: Pick<SessionExercise, 'sets'>): SetEntry[] {
  return conventionalWork(ex.sets).filter((s) => !s.completed)
}

/**
 * «Reorganizar trabajo pendiente»: sustituye las DOS ÚLTIMAS series normales aún no hechas por un bloque (inicial +
 * bajada o miniserie). Las series hechas no se tocan. null si no hay dos pendientes.
 */
export function reorganizePending<T extends Pick<SessionExercise, 'sets'>>(ex: T, method: SetMethod, extra: 1 | 2 = 1): T | null {
  const pend = pendingConventional(ex)
  if (pend.length < 2) return null
  const drop = new Set(pend.slice(-2).map((s) => s.id))
  const firstIdx = ex.sets.findIndex((s) => drop.has(s.id))
  const block = makeBlockSet(method, 'reorganize', extra, pend[pend.length - 1].side, 2)
  const sets = ex.sets.filter((s) => !drop.has(s.id))
  sets.splice(Math.min(firstIdx, sets.length), 0, block)
  return { ...ex, sets }
}

/** «Prolongar esta serie»: una serie normal aún NO hecha pasa a ser un bloque (añade trabajo). null si ya está hecha. */
export function extendSet<T extends Pick<SessionExercise, 'sets'>>(ex: T, setId: string, method: SetMethod, extra: 1 | 2 = 1): T | null {
  const i = ex.sets.findIndex((s) => s.id === setId)
  const set = ex.sets[i]
  if (!set || set.completed || set.kind !== 'work' || isBlock(set)) return null
  const sets = [...ex.sets]
  sets[i] = makeBlockSet(method, 'extend', extra, set.side, 1)
  return { ...ex, sets }
}

/** Volver a series normales desde un bloque SIN tramos registrados (las que sustituía). null si ya tiene tramos. */
export function revertBlock<T extends Pick<SessionExercise, 'sets'>>(ex: T, setId: string): T | null {
  const i = ex.sets.findIndex((s) => s.id === setId)
  const set = ex.sets[i]
  if (!set?.block || set.block.segments.length) return null
  const n = Math.max(1, set.block.replaces ?? (set.block.origin === 'reorganize' ? 2 : 1))
  const sets = [...ex.sets]
  sets.splice(i, 1, ...Array.from({ length: n }, () => plainWorkSet(set.side)))
  return { ...ex, sets }
}

// ───────────────────────── Superseries: A1 → transición → A2 → descanso de la ronda ─────────────────────────

/** Segundos de transición entre A1 y A2 (cambio de puesto). Orientativo y sin aviso sonoro. */
export const SUPERSET_TRANSITION_SEC = 15

/**
 * Qué toca tras completar una serie de trabajo en superserie: si la serie de la misma ronda del otro ejercicio está
 * pendiente, transición hacia él; si no, descanso de la ronda = el mayor de los dos descansos prescritos.
 * null si el ejercicio no está en superserie.
 */
export function supersetStep(list: Pick<SessionExercise, 'uid' | 'superset' | 'sets' | 'nameSnapshot' | 'prescription'>[], uid: string, setId: string, restOf: (i: number) => number): { kind: 'transition'; partner: number; durationSec: number } | { kind: 'round'; durationSec: number } | null {
  const i = list.findIndex((e) => e.uid === uid)
  const p = supersetPartner(list, uid)
  if (i < 0 || p < 0) return null
  const own = list[i].sets.filter((s) => s.kind === 'work')
  const round = own.findIndex((s) => s.id === setId)
  if (round < 0) return null
  const other = list[p].sets.filter((s) => s.kind === 'work')[round]
  if (other && !other.completed) return { kind: 'transition', partner: p, durationSec: SUPERSET_TRANSITION_SEC }
  return { kind: 'round', durationSec: Math.max(restOf(i), restOf(p)) }
}

// ───────────────────────── Carga sugerida en un descendente ─────────────────────────

export function loadStep(lt: LoadType, inc: Increments, override?: number): number {
  if (override && override > 0) return override
  switch (lt) {
    case 'barbell_total': return inc.barbellKg
    case 'dumbbell_each': return inc.dumbbellKg
    case 'machine': return inc.machineKg
    case 'cable': return inc.cableKg
    default: return 0
  }
}

export interface DropSuggestion {
  kg: number
  /** Reducción respecto al tramo anterior (%). */
  pct: number
}

/**
 * Carga sugerida para la siguiente bajada: ESTRICTAMENTE menor que la del tramo anterior y disponible en la rejilla del
 * material (barra: barra + múltiplos del salto; resto: múltiplos del salto). Se busca la más cercana al 20 % de reducción;
 * en empate, la carga menor. Si ninguna queda entre el 10 % y el 40 % de reducción, no se sugiere nada (carga a mano).
 * No usa el aviso de «subida > 10 %»: es otra operación.
 */
export function dropSuggestion(prev: number | null | undefined, lt: LoadType, inc: Increments, stepOverride?: number, targetPct = DROP_DEFAULT_PCT): DropSuggestion | null {
  if (prev === null || prev === undefined || !(prev > 0) || !NUMERIC_LOADS.includes(lt)) return null
  const step = loadStep(lt, inc, stepOverride)
  if (!(step > 0)) return null
  const base = lt === 'barbell_total' ? inc.barKg : 0
  const minLoad = lt === 'barbell_total' ? inc.barKg : step
  const target = targetPct / 100
  let best: { kg: number; red: number; dist: number } | null = null
  for (let k = Math.ceil((prev - base) / step); k >= 0; k--) {
    const kg = round2(base + k * step)
    if (kg >= prev - 1e-9) continue
    if (kg < minLoad - 1e-9) break
    const red = (prev - kg) / prev
    if (red < DROP_REASONABLE[0] - 1e-9) continue
    if (red > DROP_REASONABLE[1] + 1e-9) break
    const dist = Math.abs(red - target)
    // Empate: preferir la carga menor (se recorre de mayor a menor, así que gana la última con la misma distancia).
    if (!best || dist < best.dist - 1e-9 || Math.abs(dist - best.dist) <= 1e-9) best = { kg, red, dist }
  }
  return best ? { kg: best.kg, pct: Math.round(best.red * 100) } : null
}

// ───────────────────────── Tramos ─────────────────────────

export interface SegmentInput {
  weightKg: number | null
  reps: number | null
  rir: number | null
  assistKg?: number | null
  addedKg?: number | null
  suggestedKg?: number | null
}

/** ¿Hay un tramo pendiente que se puede registrar ahora? (inicial, o siguiente tras «Continuar bajada»/«Empezar miniserie»). */
export function canRegister(set: SetEntry): boolean {
  const b = set.block
  if (!b || b.ended) return false
  if (b.segments.length >= b.plannedSegments) return false
  return b.segments.length === 0 || b.nextStartedAt !== null
}

/**
 * Registra el tramo actual (se guarda en el momento). La pausa real es el tiempo entre el final del tramo anterior y el
 * inicio de este («Continuar bajada» o fin de la pausa breve). Con todos los tramos previstos, el bloque termina.
 */
export function registerSegment(set: SetEntry, v: SegmentInput, now: number): SetEntry {
  const b = set.block
  if (!b || !canRegister(set)) return set
  const prev = b.segments[b.segments.length - 1]
  const pauseSec = prev && b.nextStartedAt !== null ? Math.max(0, Math.round((b.nextStartedAt - prev.completedAt) / 1000)) : null
  const seg: BlockSegment = {
    id: newId('seg'),
    weightKg: v.weightKg,
    reps: v.reps,
    rir: v.rir,
    pauseSec,
    completedAt: now,
    ...(v.assistKg !== undefined ? { assistKg: v.assistKg } : {}),
    ...(v.addedKg !== undefined ? { addedKg: v.addedKg } : {}),
    ...(v.suggestedKg !== undefined && v.suggestedKg !== null ? { suggestedKg: v.suggestedKg } : {}),
  }
  const segments = [...b.segments, seg]
  const done = segments.length >= b.plannedSegments
  const next: SpecialBlock = { ...b, segments, nextStartedAt: null, ended: done ? 'complete' : null }
  delete next.draft
  return { ...set, completed: done, completedAt: done ? now : null, block: next }
}

/** Guarda lo que se está escribiendo del tramo actual (no registra nada). */
export function setDraft(set: SetEntry, patch: Partial<NonNullable<SpecialBlock['draft']>>): SetEntry {
  const b = set.block
  if (!b) return set
  const cur = b.draft ?? { weightKg: null, reps: null, rir: null }
  return { ...set, block: { ...b, draft: { ...cur, ...patch } } }
}

/** «Continuar bajada» / «Empezar miniserie»: marca el inicio del tramo siguiente. Idempotente. */
export function startNextSegment(set: SetEntry, now: number): SetEntry {
  const b = set.block
  if (!b || b.ended || !b.segments.length || b.segments.length >= b.plannedSegments || b.nextStartedAt !== null) return set
  return { ...set, block: { ...b, nextStartedAt: now } }
}

/**
 * Otra bajada/miniserie SOLO si se elige expresamente (máximo 3 tramos). Si el bloque ya había terminado completo, se
 * reabre y el siguiente tramo empieza ya.
 */
export function addExtraSegment(set: SetEntry, now: number): SetEntry {
  const b = set.block
  if (!b || b.plannedSegments >= MAX_SEGMENTS || b.ended === 'early') return set
  if (b.ended === 'complete') {
    return { ...set, completed: false, completedAt: null, block: { ...b, plannedSegments: b.plannedSegments + 1, ended: null, nextStartedAt: now } }
  }
  return { ...set, block: { ...b, plannedSegments: b.plannedSegments + 1 } }
}

/** Terminar el bloque (antes de tiempo si faltan tramos). No inventa el tramo pendiente. Sin tramos no hay nada que terminar. */
export function endBlock(set: SetEntry, now: number): SetEntry {
  const b = set.block
  if (!b || b.ended || !b.segments.length) return set
  const how = b.segments.length >= b.plannedSegments ? 'complete' : 'early'
  return { ...set, completed: true, completedAt: now, block: { ...b, ended: how, nextStartedAt: null } }
}

/** Deshacer el último tramo: los anteriores se conservan y el bloque vuelve a estar abierto. */
export function undoSegment(set: SetEntry): SetEntry {
  const b = set.block
  if (!b || !b.segments.length) return set
  return { ...set, completed: false, completedAt: null, block: { ...b, segments: b.segments.slice(0, -1), ended: null, nextStartedAt: null } }
}

/** Carga comparable de un tramo según el tipo de carga. */
export function segmentLoad(seg: Pick<BlockSegment, 'weightKg' | 'assistKg' | 'addedKg'>, lt: LoadType): number | null {
  if (lt === 'assisted') return seg.assistKg ?? seg.weightKg
  if (lt === 'bodyweight') return seg.addedKg ?? 0
  return seg.weightKg
}

/**
 * Bloque «modificado»: rest-pause con cambio de carga entre tramos, o descendente con una bajada que no baja.
 * Se conserva tal cual, pero queda fuera de las comparaciones automáticas.
 */
export function blockModified(set: SetEntry, lt: LoadType): boolean {
  const b = set.block
  if (!b || b.segments.length < 2) return false
  const loads = b.segments.map((s) => segmentLoad(s, lt))
  if (set.method === 'rest_pause') return loads.some((l) => (l ?? 0) !== (loads[0] ?? 0))
  for (let i = 1; i < loads.length; i++) {
    const a = loads[i - 1]
    const c = loads[i]
    if (a === null || c === null) continue
    if (lt === 'assisted' ? c <= a : c >= a) return true
  }
  return false
}

function loadText(seg: BlockSegment, lt: LoadType, fmt: (n: number) => string): string {
  if (lt === 'assisted') return `asist. ${fmt(seg.assistKg ?? seg.weightKg ?? 0)} kg × ${seg.reps ?? '—'}`
  if (lt === 'bodyweight') return `${seg.reps ?? '—'}${seg.addedKg ? ` (+${fmt(seg.addedKg)} kg)` : ''}`
  if (lt === 'band') return `${seg.reps ?? '—'}`
  return `${seg.weightKg === null ? '—' : fmt(seg.weightKg)} kg${lt === 'dumbbell_each' ? ' c/u' : ''} × ${seg.reps ?? '—'}`
}

/** «40 kg × 10 → 30 kg × 8» (descendente) o «20 kg × 12 · pausa 20 s · 20 kg × 4» (rest-pause). */
export function blockText(set: SetEntry, lt: LoadType, fmt: (n: number) => string): string {
  const b = set.block
  if (!b) return ''
  if (!b.segments.length) return 'sin tramos registrados'
  const parts = b.segments.map((s, i) => {
    const t = loadText(s, lt, fmt) + (s.rir !== null ? ` (RIR ${s.rir})` : '')
    if (i === 0) return t
    const pause = s.pauseSec !== null ? (set.method === 'rest_pause' ? `pausa ${s.pauseSec} s · ` : `cambio ${s.pauseSec} s · `) : ''
    return `${set.method === 'drop' ? '→ ' : '· '}${pause}${t}`
  })
  return parts.join(' ') + (b.ended === 'early' ? ' · terminado antes de tiempo' : '')
}

// ───────────────────────── Contexto de comparación ─────────────────────────

/**
 * Contexto de una exposición: bloques especiales previstos (método y tramos) y si se hizo en superserie.
 * Solo se compara automáticamente dentro del mismo contexto (cambiar a superserie o convertir series en un bloque
 * inicia una referencia nueva).
 */
export function contextKey(ex: Pick<SessionExercise, 'uid' | 'sets'>, list: Pick<SessionExercise, 'uid' | 'superset'>[]): string {
  const blocks = blocksOf(ex.sets).map((s) => `${s.method}${s.block?.plannedSegments ?? 0}`).sort().join(',')
  return `${blocks || 'convencional'}|${inSuperset(list, ex.uid) ? 'superserie' : 'individual'}`
}

/** Tipo de pareja: grupos distintos (p. ej. bíceps + tríceps) o el mismo músculo (solo por elección manual). */
export function pairKind(a: string, b: string): 'distinct' | 'same' {
  const ra = directRegions(a)
  const rb = directRegions(b)
  return ra.some((r) => rb.includes(r)) ? 'same' : 'distinct'
}

// ───────────────────────── Tonelaje ─────────────────────────

/**
 * Tonelaje anotado: carga × repeticiones de cada serie de trabajo hecha y de cada tramo, con la convención de Forja
 * (mancuernas: el peso anotado de una; unilateral: lo anotado por lado), sin duplicar. Solo cargas externas numéricas.
 * NO es una medida de crecimiento muscular.
 */
export function exerciseTonnage(ex: Pick<SessionExercise, 'sets' | 'loadTypeSnapshot'>): { conventional: number; blocks: number } {
  const out = { conventional: 0, blocks: 0 }
  if (!NUMERIC_LOADS.includes(ex.loadTypeSnapshot)) return out
  for (const s of ex.sets) {
    if (s.kind !== 'work') continue
    if (isBlock(s)) {
      for (const seg of s.block?.segments ?? []) out.blocks += (seg.weightKg ?? 0) * (seg.reps ?? 0)
    } else if (s.completed) out.conventional += (s.weightKg ?? 0) * (s.reps ?? 0)
  }
  return { conventional: round2(out.conventional), blocks: round2(out.blocks) }
}

// ───────────────────────── Estimación de duración de un bloque ─────────────────────────

/** Segundos de un bloque (ejecución + cambios de carga o pausas breves), con 3 s por repetición. */
export function blockExecSec(method: SetMethod, extra: number, secPerRep: number, sides: number): number {
  const t = blockTargetFor(method)
  const first = ((t.firstRepMin + t.firstRepMax) / 2) * secPerRep
  const next = ((t.nextRepMin + t.nextRepMax) / 2) * secPerRep
  const between = method === 'drop' ? DROP_CHANGE_SEC : t.pauseSec ?? RP_PAUSE_SEC
  return (first + next * extra) * sides + between * extra
}
