import { getExercise } from '../catalog'
import { blockModified, blockText, blocksOf, contextKey, conventionalWork, segmentLoad } from '../techniques'
import type { Exercise, Increments, LoadType, Prescription, Session, SessionExercise, SetEntry } from '../types'
import { daysBetween, formatNumber, round2 } from '../util'
import { INCREMENT_REVIEW_FRACTION, RETURN_AFTER_DAYS, STALL_EXPOSURES } from './params'
import { isTimePrescription } from './prescription'

/**
 * Doble progresión (motor 2, docs/EVIDENCIA.md · R10 y 5.1–5.3 de la especificación):
 *  - Solo series de TRABAJO comparables del mismo ejercicio y esquema (el calentamiento no cuenta).
 *  - Todas las series previstas completadas y todas en el límite superior del rango.
 *  - Si hay RIR en todas, todas ≥ límite inferior del objetivo actual. Sin RIR suficiente: «podrías subir si te quedó margen».
 *  - Siguiente incremento REAL disponible; si supera el 10 % de la carga actual no se preselecciona (umbral de revisión).
 *  - Familiarización: sin subidas automáticas. Isométricos: tiempo dentro del rango y luego variante; sin RIR.
 *  - Nunca modifica datos históricos ni marca series: solo devuelve una recomendación.
 *  - Solo series CONVENCIONALES: las bajadas y miniseries de los bloques no se suman para cumplir la regla, y los bloques
 *    no activan subidas automáticas. Cambiar de contexto (bloque especial, superserie) inicia una referencia nueva.
 */

export type SuggestionKind =
  | 'first_time'
  | 'increase'
  | 'increase_optional'
  | 'increment_review'
  | 'repeat'
  | 'harder_variant'
  | 'reduce_assistance'
  | 'more_time'
  | 'return_after_break'
  | 'stalled'
  | 'familiarization'
  | 'scheme_changed'
  | 'context_changed'
  | 'paused_pain'
  | 'paused_scope'

export interface Suggestion {
  kind: SuggestionKind
  title: string
  detail: string
  targetWeightKg?: number
  /** Salto alternativo cuando el siguiente incremento supera el umbral de revisión (se elige a mano). */
  altWeightKg?: number
  incrementPct?: number
  targetAssistKg?: number
  targetAddedKg?: number
  targetReps?: [number, number]
  targetTimeSec?: number
  harderExerciseId?: string
  /** Opciones de ayuda (estancamiento). */
  options?: string[]
  basedOnDate?: string
}

export interface HistoryItem {
  date: string
  session: Session
  ex: SessionExercise
}

/** Ejercicios comparables previos: MISMO id de ejercicio (las variantes y máquinas distintas no se mezclan). */
export function historyFor(exerciseId: string, sessions: Session[], beforeDate?: string, excludeSessionId?: string): HistoryItem[] {
  const out: HistoryItem[] = []
  for (const s of sessions) {
    if (s.status !== 'completed' && s.status !== 'partial') continue
    if (excludeSessionId && s.id === excludeSessionId) continue
    if (beforeDate && s.date > beforeDate) continue
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      if (!ex.sets.some((x) => x.kind === 'work' && x.completed)) continue
      out.push({ date: s.date, session: s, ex })
    }
  }
  return out.sort((a, b) => (a.date === b.date ? b.session.startedAt - a.session.startedAt : a.date < b.date ? 1 : -1))
}

export function defaultIncrement(loadType: LoadType, inc: Increments): number {
  switch (loadType) {
    case 'barbell_total': return inc.barbellKg
    case 'dumbbell_each': return inc.dumbbellKg
    case 'machine': return inc.machineKg
    case 'cable': return inc.cableKg
    case 'assisted': return inc.machineKg
    case 'bodyweight': return inc.dumbbellKg
    default: return 0
  }
}

/** Siguiente carga REALMENTE disponible en la rejilla del material. */
export function nextLoad(current: number, step: number, loadType: LoadType, _inc?: Increments): number {
  if (step <= 0) return current
  if (loadType === 'barbell_total') return round2(current + step)
  const k = current / step
  if (Math.abs(k - Math.round(k)) < 1e-6) return round2((Math.round(k) + 1) * step)
  return round2(Math.ceil(k) * step > current ? Math.ceil(k) * step : current + step)
}

/** Carga para volver tras una pausa: ~15 % menos, redondeado hacia abajo a la rejilla. Heurística. */
export function returnLoad(current: number, step: number, loadType: LoadType, inc: Increments): number {
  const target = current * 0.85
  if (step <= 0) return round2(target)
  if (loadType === 'barbell_total' && current >= inc.barKg) {
    const k = Math.floor((target - inc.barKg) / step)
    return round2(Math.max(inc.barKg, inc.barKg + k * step))
  }
  return round2(Math.max(0, Math.floor(target / step) * step))
}

/** Compatibilidad: estimación de repeticiones (Epley). Ya no decide subidas (motor 2 usa el umbral del 10 %). */
export function predictReps(fromLoad: number, repsPlusRir: number, toLoad: number): number {
  if (fromLoad <= 0 || toLoad <= 0) return repsPlusRir
  const e1rm = fromLoad * (1 + repsPlusRir / 30)
  return 30 * (e1rm / toLoad - 1)
}

function workPlanned(ex: SessionExercise): SetEntry[] {
  return conventionalWork(ex.sets)
}
function workDone(ex: SessionExercise): SetEntry[] {
  return conventionalWork(ex.sets).filter((s) => s.completed)
}

/** Contexto de comparación de una exposición del historial (bloques especiales y superserie). */
export function historyContext(h: HistoryItem): string {
  return contextKey(h.ex, h.session.exercises)
}

/** «con series normales», «con un bloque descendente», «en superserie»… */
export function describeContext(key: string): string {
  const [blocks, group] = key.split('|')
  const parts: string[] = []
  if (blocks === 'convencional') parts.push('con series normales')
  else {
    const n = blocks.split(',').length
    const kinds = new Set(blocks.split(',').map((b) => (b.startsWith('drop') ? 'descendente' : 'rest-pause')))
    parts.push(`con ${n === 1 ? 'un bloque' : `${n} bloques`} ${[...kinds].join(' y ')}`)
  }
  parts.push(group === 'superserie' ? 'en superserie' : 'por separado')
  return parts.join(', ')
}

function loadOf(s: SetEntry, lt: LoadType): number | null {
  if (lt === 'assisted') return s.assistKg ?? s.weightKg
  if (lt === 'bodyweight') return s.addedKg ?? 0
  return s.weightKg
}

/** Rendimiento comparable de una exposición (para detectar mejora). */
function performance(ex: SessionExercise, lt: LoadType, time: boolean): [number, number] {
  const sets = workDone(ex)
  if (time) return [0, sets.reduce((a, s) => a + (s.durationSec ?? 0), 0)]
  const reps = sets.reduce((a, s) => a + (s.reps ?? 0), 0)
  if (lt === 'band') return [0, reps]
  const loads = sets.map((s) => loadOf(s, lt)).filter((x): x is number => x !== null)
  const load = loads.length ? Math.min(...loads) : 0
  return lt === 'assisted' ? [-load, reps] : [load, reps]
}
const better = (a: [number, number], b: [number, number]) => a[0] > b[0] + 1e-9 || (Math.abs(a[0] - b[0]) < 1e-9 && a[1] > b[1])

export function sameScheme(a: Prescription | null, b: Prescription, time: boolean): boolean {
  if (!a) return true
  if (time) return (a.timeMinSec ?? 0) === (b.timeMinSec ?? 0) && (a.timeMaxSec ?? 0) === (b.timeMaxSec ?? 0)
  return a.repMin === b.repMin && a.repMax === b.repMax
}

/** 5.2 · Tres exposiciones comparables (mismo esquema y mismo contexto) sin mejora (disparador de ayuda, no diagnóstico). */
export function isStalled(history: HistoryItem[], p: Prescription, lt: LoadType, time: boolean, context?: string): boolean {
  const comparable = history.filter((h) => sameScheme(h.ex.prescription, p, time) && (!context || historyContext(h) === context) && workDone(h.ex).length > 0).slice(0, STALL_EXPOSURES).reverse()
  if (comparable.length < STALL_EXPOSURES) return false
  const first = performance(comparable[0].ex, lt, time)
  // Sin mejora: ninguna de las exposiciones siguientes supera a la primera de las tres.
  return comparable.slice(1).every((h) => !better(performance(h.ex, lt, time), first))
}

export interface SuggestInput {
  exerciseId: string
  prescription: Prescription
  history: HistoryItem[]
  increments: Increments
  incrementOverride?: number
  today: string
  progressionAllowed: boolean
  /** Sesión actual dentro de la familiarización (motor 2): sin subidas automáticas. */
  familiarization?: { index: number; total: number; reason?: 'readaptation' | 'extended' } | null
  /** ¿Se puede ofrecer esta variante? (material marcado y no excluida). Sin función: se asume que sí. */
  available?: (exerciseId: string) => boolean
  /** Contexto del ejercicio en la sesión actual (bloques y superserie). Si cambia respecto a la última vez, no se compara. */
  context?: string
}

export function suggestNext(input: SuggestInput): Suggestion {
  const ex = getExercise(input.exerciseId)
  const p = input.prescription
  if (!input.progressionAllowed) {
    return { kind: 'paused_scope', title: 'Sugerencias de progresión en pausa', detail: 'Tu perfil indica una circunstancia (dolor, lesión, condición médica o embarazo) que queda fuera de lo que puede valorar un generador general. Registra con normalidad y consulta con un profesional antes de subir cargas.' }
  }
  const time = isTimePrescription(p, ex)
  const anyLast = input.history[0]
  if (!anyLast || !ex) return firstTime(ex, p, time)
  // Contexto de prescripción (2.2): con dos rangos del mismo ejercicio en la semana (banca 4–6 y banca 8–10), cada uno se
  // compara con su última exposición del MISMO rango. Sin exposiciones de ese rango, se usa la última (cambio de rango).
  const last = input.history.find((h) => h.ex.prescription && sameScheme(h.ex.prescription, p, time)) ?? anyLast
  const lt = last.ex.loadTypeSnapshot
  const basedOnDate = last.date
  if (anyLast.ex.painFlag) {
    return { kind: 'paused_pain', title: 'Sin subida: marcaste molestia', detail: 'La última vez marcaste molestia o dolor en este ejercicio. No sugerimos subir carga. Prueba una carga menor, un rango cómodo o una alternativa; si el dolor persiste o empeora, consulta a un profesional sanitario.', basedOnDate }
  }
  const done = workDone(last.ex)
  const planned = workPlanned(last.ex)
  const step = input.incrementOverride ?? defaultIncrement(lt, input.increments)
  const gap = daysBetween(anyLast.date, input.today)
  const loads = done.map((s) => loadOf(s, lt)).filter((x): x is number => x !== null)
  const refLoad = loads.length ? Math.min(...loads) : null
  const keepWeight = lt === 'assisted' || lt === 'bodyweight' || lt === 'band' || time ? undefined : refLoad ?? undefined
  const keepAssist = lt === 'assisted' ? refLoad ?? undefined : undefined

  if (gap > RETURN_AFTER_DAYS || input.familiarization?.reason === 'readaptation') {
    // 1.5: tras una pausa no se precarga la carga anterior ni se calcula una «carga segura» con un porcentaje arbitrario.
    // Se muestra la última con su fecha y la persona elige una carga actual con margen.
    const lastTxt = refLoad !== null && (lt === 'barbell_total' || lt === 'dumbbell_each' || lt === 'machine' || lt === 'cable') ? `${formatNumber(refLoad)} kg el ${anyLast.date.split('-').reverse().join('/')}` : null
    return {
      kind: 'return_after_break',
      title: gap > RETURN_AFTER_DAYS ? `Vuelta gradual (${gap} días sin hacerlo)` : 'Vuelta gradual',
      detail: `${lastTxt ? `La última vez: ${lastTxt}. ` : ''}Elige hoy una carga actual con la que te sobren 3–4 repeticiones. No calculamos un porcentaje «seguro»: la referencia anterior es solo un dato con fecha. Ajusta según cómo te sientas.`,
      targetReps: time ? undefined : [p.repMin, p.repMax],
      basedOnDate,
    }
  }

  if (input.familiarization) {
    return {
      kind: 'familiarization',
      title: `Familiarización · sesión ${input.familiarization.index} de ${input.familiarization.total}`,
      detail: time
        ? 'Mantén la postura con control y termina antes de perderla. Esta fase es para aprender: no proponemos alargar ni cambiar de variante todavía.'
        : `Repite o ajusta la carga para que te queden 3–4 repeticiones en reserva. Esta fase es para aprender los movimientos: no proponemos subidas automáticas todavía.`,
      targetWeightKg: keepWeight,
      targetAssistKg: keepAssist,
      basedOnDate,
    }
  }

  if (input.context) {
    const prevCtx = historyContext(last)
    if (prevCtx !== input.context) {
      return {
        kind: 'context_changed',
        title: 'Nueva referencia: estructura distinta',
        detail: `La última vez lo hiciste ${describeContext(prevCtx)}; hoy, ${describeContext(input.context)}. No se compara de forma automática ni se interpreta como un retroceso: esta sesión será la referencia para las siguientes.`,
        targetWeightKg: keepWeight,
        targetAssistKg: keepAssist,
        targetReps: time ? undefined : [p.repMin, p.repMax],
        basedOnDate,
      }
    }
  }

  const lastRx = last.ex.prescription
  if (lastRx && !sameScheme(lastRx, p, time)) {
    return {
      kind: 'scheme_changed',
      title: 'Rango distinto al de la última vez',
      detail: time
        ? `La última vez el objetivo era ${lastRx.timeMinSec ?? '?'}–${lastRx.timeMaxSec ?? '?'} s y ahora es ${p.timeMinSec}–${p.timeMaxSec} s: no se compara de forma automática. Ajusta con control.`
        : `La última vez el rango era ${lastRx.repMin}–${lastRx.repMax} y ahora es ${p.repMin}–${p.repMax}: no se compara de forma automática. Usa una carga con la que llegues a ${p.repMin} dejando margen.`,
      targetWeightKg: keepWeight,
      targetAssistKg: keepAssist,
      basedOnDate,
    }
  }

  // Un ejercicio con series pendientes no cumple la regla (aunque la sesión fuese parcial por otros ejercicios).
  if (planned.length === 0) {
    return {
      kind: 'repeat',
      title: 'La última vez solo hubo bloques especiales',
      detail: 'Los bloques (descendentes o rest-pause) no se usan para proponer subidas de carga. Ajusta la carga de las series normales a tu criterio.',
      targetWeightKg: keepWeight,
      targetAssistKg: keepAssist,
      basedOnDate,
    }
  }
  if (done.length < planned.length || done.length === 0) {
    return {
      kind: 'repeat',
      title: 'Completa las series antes de subir',
      detail: `La última vez completaste ${done.length} de ${planned.length} series de trabajo de este ejercicio. Mantén la carga y completa todas antes de subir.`,
      targetWeightKg: keepWeight,
      targetAssistKg: keepAssist,
      targetReps: time ? undefined : [p.repMin, p.repMax],
      basedOnDate,
    }
  }

  // Isométricos (5.3): tiempo dentro del rango y después variante más exigente; no se alarga indefinidamente.
  if (time) {
    const maxT = p.timeMaxSec ?? 30
    const all = done.every((s) => (s.durationSec ?? 0) >= maxT)
    if (all) {
      const harder = ex.harder && (input.available?.(ex.harder) ?? true) ? getExercise(ex.harder) : undefined
      return {
        kind: 'harder_variant',
        title: 'Máximo del rango con control',
        detail: harder ? `Llegaste a ${maxT} s en todas las series. En vez de alargar más, puedes pasar a «${harder.name}» (con tu confirmación) o mantenerlo.` : `Llegaste a ${maxT} s en todas las series. En vez de alargar indefinidamente, mantén el tiempo o prueba una variante más exigente si la tienes.`,
        harderExerciseId: harder?.id,
        targetTimeSec: maxT,
        basedOnDate,
      }
    }
    if (isStalled(input.history, p, lt, true, input.context)) return stalled(basedOnDate)
    const best = Math.max(...done.map((s) => s.durationSec ?? 0))
    return { kind: 'more_time', title: 'Suma tiempo dentro del rango', detail: `La última vez: ${done.map((s) => `${s.durationSec ?? 0} s`).join(' / ')}. Intenta acercarte a ${maxT} s en todas las series terminando antes de perder la postura.`, targetTimeSec: Math.min(maxT, Math.max(p.timeMinSec ?? 15, best)), basedOnDate }
  }

  const repMax = p.repMax
  const repMin = p.repMin
  const repsTxt = done.map((s) => s.reps ?? 0).join('/')
  const topReached = done.every((s) => (s.reps ?? 0) >= repMax)
  const rirs = done.map((s) => s.rir)
  const rirKnown = rirs.every((r) => r !== null && r !== undefined)
  const minRir = rirKnown ? Math.min(...(rirs as number[])) : null

  if (!topReached) {
    if (isStalled(input.history, p, lt, false, input.context)) return stalled(basedOnDate)
    const sameLoad = loads.length === done.length && loads.every((l) => Math.abs(l - (refLoad ?? 0)) < 1e-6)
    return {
      kind: 'repeat',
      title: 'Mantén la carga y suma repeticiones',
      detail: `La última vez: ${repsTxt}. El objetivo es llegar a ${repMax} en todas las series${lt === 'assisted' ? ' con la misma asistencia' : lt === 'band' ? ' con la misma banda' : ' con la misma carga'} antes de subir. Sumar repeticiones también es progresar.${!sameLoad && loads.length ? ' Usaste cargas distintas entre series: tomamos la más baja como referencia.' : ''}`,
      targetWeightKg: keepWeight,
      targetAssistKg: keepAssist,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }

  // Rango completado. ¿Con el margen objetivo?
  if (rirKnown && (minRir as number) < p.rirMin) {
    return {
      kind: 'repeat',
      title: 'Rango completo, pero con menos margen del objetivo',
      detail: `${repsTxt} con RIR ${rirs.join('/')}; el objetivo es RIR ${p.rirMin}–${p.rirMax}. Repite la carga hasta completar el rango dejando al menos ${p.rirMin} en reserva.`,
      targetWeightKg: keepWeight,
      targetAssistKg: keepAssist,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }
  if (lt === 'bodyweight') {
    const harder = ex.harder && (input.available?.(ex.harder) ?? true) ? getExercise(ex.harder) : undefined
    return {
      kind: 'harder_variant',
      title: rirKnown ? 'Rango completado' : 'Rango completado: podrías avanzar si te quedó margen',
      detail: `${repsTxt} en todas las series. ${harder ? `Puedes pasar a «${harder.name}» (con tu confirmación; empieza en el mínimo del rango) o ` : 'Puedes '}añadir lastre si tienes cómo.${!rirKnown ? ' No anotaste RIR en todas: decide tú si te sobraba margen.' : ''}`,
      harderExerciseId: harder?.id,
      targetAddedKg: refLoad !== null && refLoad > 0 ? round2(refLoad + step) : undefined,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }
  if (lt === 'assisted') {
    const cur = refLoad ?? 0
    const next = Math.max(0, round2(cur - step))
    return { kind: 'reduce_assistance', title: rirKnown ? 'Reduce la asistencia' : 'Podrías reducir la asistencia si te quedó margen', detail: `Completaste el rango con ${formatNumber(cur)} kg de asistencia. Menos asistencia = más difícil: prueba ${formatNumber(next)} kg y vuelve a ${repMin} repeticiones.`, targetAssistKg: next, targetReps: [repMin, repMax], basedOnDate }
  }
  if (lt === 'band') {
    return { kind: 'harder_variant', title: 'Rango completado', detail: 'Prueba una banda más dura (o cambia la configuración) y vuelve al mínimo del rango. Anota la banda y la configuración: las bandas no tienen kilos equivalentes.', targetReps: [repMin, repMax], basedOnDate }
  }
  if (refLoad === null) return firstTime(ex, p, false)
  const target = nextLoad(refLoad, step, lt, input.increments)
  const pct = refLoad > 0 ? Math.round(((target - refLoad) / refLoad) * 100) : 0
  if (refLoad > 0 && (target - refLoad) / refLoad > INCREMENT_REVIEW_FRACTION + 1e-9) {
    return {
      kind: 'increment_review',
      title: 'El siguiente salto es grande: elige tú',
      detail: `${repsTxt} con ${formatNumber(refLoad)} kg${rirKnown ? '' : ' (sin RIR en todas las series)'}. El siguiente incremento disponible es ${formatNumber(target)} kg (+${pct} %). Puedes mantener ${formatNumber(refLoad)} kg y sumar repeticiones, o elegir el salto. El 10 % es solo un aviso de revisión, no un límite de seguridad.`,
      targetWeightKg: refLoad,
      altWeightKg: target,
      incrementPct: pct,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }
  if (!rirKnown) {
    return {
      kind: 'increase_optional',
      title: 'Podrías subir si te quedó margen',
      detail: `${repsTxt} con ${formatNumber(refLoad)} kg: rango completado. Sin RIR en todas las series no sabemos el margen: si te quedaban al menos ${p.rirMin} repeticiones con buena técnica, sube a ${formatNumber(target)} kg y vuelve a ${repMin}; si no, repite la carga.`,
      targetWeightKg: target,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }
  return {
    kind: 'increase',
    title: `Propuesta: ${formatNumber(target)} kg`,
    detail: `${repsTxt} con ${formatNumber(refLoad)} kg y RIR ${rirs.join('/')} (objetivo ${p.rirMin}–${p.rirMax}). Siguiente incremento disponible: ${formatNumber(target)} kg (+${pct} %), volviendo a ${repMin} repeticiones.`,
    targetWeightKg: target,
    incrementPct: pct,
    targetReps: [repMin, repMax],
    basedOnDate,
  }
}

function stalled(basedOnDate: string): Suggestion {
  return {
    kind: 'stalled',
    title: 'Llevas varias sesiones parecido',
    detail: 'Tres sesiones comparables sin mejora. No es un diagnóstico ni hace falta cambiarlo todo. Opciones:',
    options: ['Mantener la carga y seguir sumando repeticiones', 'Revisar el descanso entre series (puedes añadir +30 o +60 s)', 'Revisar el ajuste de la carga (un poco menos y volver a subir)', 'Cambiar a otra variante (sin trasladar los kilos)'],
    basedOnDate,
  }
}

function firstTime(ex: Exercise | undefined, p: Prescription, time: boolean): Suggestion {
  if (time) {
    return { kind: 'first_time', title: 'Primera vez', detail: `Mantén la postura con control y termina antes de perderla o de dejar de respirar con normalidad. Objetivo: ${p.timeMinSec ?? 15}–${p.timeMaxSec ?? 30} s. Puedes anotar el esfuerzo percibido (0–10).` }
  }
  if (ex?.loadType === 'bodyweight') {
    return { kind: 'first_time', title: 'Primera vez', detail: 'Haz una serie con buena técnica para ver cuántas repeticiones te salen dejando margen. Si es demasiado fácil o difícil, cambia de variante (con tu confirmación).', targetReps: [p.repMin, p.repMax] }
  }
  if (ex?.loadType === 'assisted') {
    return { kind: 'first_time', title: 'Primera vez', detail: 'Empieza con bastante asistencia y quítala poco a poco hasta que llegar al rango te deje 2–3 repeticiones en reserva. No es una prueba de máximo.' }
  }
  return {
    kind: 'first_time',
    title: 'Primera vez: busca una carga cómoda',
    detail: `Empieza ligero y haz una aproximación. Elige una carga con la que puedas completar ${p.repMin} repeticiones dejando margen y manteniendo el control. Si no llegas, reduce; si resulta muy fácil, ajusta poco a poco. No necesitas probar tu máximo.`,
    targetReps: [p.repMin, p.repMax],
  }
}

// ───────────────────────── Bloques especiales ─────────────────────────

export interface BlockAdvice {
  /** Carga orientativa para el tramo inicial: la del último bloque comparable (los bloques no suben carga solos). */
  firstLoad: number | null
  last: { date: string; text: string } | null
  previous: { date: string; text: string } | null
  /** Diferencias entre los dos últimos bloques comparables (solo si la estructura y las cargas coinciden). */
  diff: string | null
  comparable: number
}

/**
 * Evolución de un bloque: solo se compara con bloques del MISMO ejercicio, método, número de tramos y pausa objetivo, sin
 * cambios de carga indebidos. No propone subidas de kg automáticamente; la persona puede ajustarlas.
 */
export function blockAdvice(set: SetEntry, lt: LoadType, history: HistoryItem[], fmt: (n: number) => string): BlockAdvice {
  const found: { date: string; set: SetEntry }[] = []
  for (const h of history) {
    const b = blocksOf(h.ex.sets).find((x) => x.method === set.method && x.block?.plannedSegments === set.block?.plannedSegments && (x.block?.target.pauseSec ?? null) === (set.block?.target.pauseSec ?? null) && (x.block?.segments.length ?? 0) > 0 && !blockModified(x, lt))
    if (b) found.push({ date: h.date, set: b })
  }
  const last = found[0] ?? null
  const prev = found[1] ?? null
  let diff: string | null = null
  if (last && prev) {
    const a = last.set.block?.segments ?? []
    const b = prev.set.block?.segments ?? []
    const sameLoads = a.length === b.length && a.every((s, i) => segmentLoad(s, lt) === segmentLoad(b[i], lt))
    if (sameLoads) {
      const d = a.map((s, i) => (s.reps ?? 0) - (b[i].reps ?? 0))
      diff = `Con las mismas cargas: ${d.map((x) => (x > 0 ? `+${x}` : `${x}`)).join(' / ')} repeticiones por tramo respecto a la vez anterior.`
    } else diff = 'Cargas distintas a la vez anterior: compáralo a tu criterio.'
  }
  return {
    firstLoad: last ? segmentLoad(last.set.block?.segments[0] ?? { weightKg: null }, lt) : null,
    last: last ? { date: last.date, text: blockText(last.set, lt, fmt) } : null,
    previous: prev ? { date: prev.date, text: blockText(prev.set, lt, fmt) } : null,
    diff,
    comparable: found.length,
  }
}

export type { SessionExercise }
