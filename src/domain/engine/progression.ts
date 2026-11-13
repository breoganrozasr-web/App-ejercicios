import { getExercise } from '../catalog'
import type { Exercise, Increments, LoadType, Prescription, Session, SessionExercise, SetEntry } from '../types'
import { daysBetween, formatNumber, round2 } from '../util'
import { MIN_RIR_FOR_INCREASE, RETURN_AFTER_DAYS } from './params'

/**
 * Doble progresión explicable (regla R10, docs/EVIDENCIA.md):
 *  - Si TODAS las series de trabajo requeridas llegan al máximo del rango con la misma carga y con margen
 *    (RIR anotado ≥ 1), se propone el menor incremento disponible y volver al mínimo del rango.
 *  - 12/10/8 en 3×8–12 NO completa el rango: se mantiene la carga y se intenta sumar repeticiones.
 *  - Sin RIR anotado no se inventa: se ofrece la subida como opcional y decides tú.
 *  - Molestia/dolor, perfil fuera de alcance, cambio de ejercicio o datos insuficientes → conservador.
 *  - Nunca modifica sesiones pasadas ni marca series como hechas: solo devuelve una recomendación.
 */

export type SuggestionKind =
  | 'first_time'
  | 'increase'
  | 'increase_optional'
  | 'repeat'
  | 'increment_too_large'
  | 'harder_variant'
  | 'reduce_assistance'
  | 'more_time'
  | 'return_after_break'
  | 'review'
  | 'paused_pain'
  | 'paused_scope'

export interface Suggestion {
  kind: SuggestionKind
  title: string
  detail: string
  targetWeightKg?: number
  targetAssistKg?: number
  targetAddedKg?: number
  targetReps?: [number, number]
  targetTimeSec?: number
  harderExerciseId?: string
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

/** Siguiente carga disponible. Si la carga actual encaja en la rejilla del material, se respeta la rejilla. */
export function nextLoad(current: number, step: number, loadType: LoadType, inc: Increments): number {
  if (step <= 0) return current
  if (loadType === 'barbell_total') {
    const k = (current - inc.barKg) / step
    if (current >= inc.barKg && Math.abs(k - Math.round(k)) < 1e-6) return round2(current + step)
    return round2(current + step)
  }
  const k = current / step
  if (Math.abs(k - Math.round(k)) < 1e-6) return round2((Math.round(k) + 1) * step)
  return round2(Math.ceil(k) * step > current ? Math.ceil(k) * step : current + step)
}

/** Carga para volver tras una pausa: ~15 % menos, redondeado hacia abajo a la rejilla. Heurística (EVIDENCIA L1–L4). */
export function returnLoad(current: number, step: number, loadType: LoadType, inc: Increments): number {
  const target = current * 0.85
  if (step <= 0) return round2(target)
  if (loadType === 'barbell_total' && current >= inc.barKg) {
    const k = Math.floor((target - inc.barKg) / step)
    return round2(Math.max(inc.barKg, inc.barKg + k * step))
  }
  return round2(Math.max(0, Math.floor(target / step) * step))
}

/** Repeticiones estimadas con una carga a partir de otra (Epley). Solo para decidir si un salto es razonable. */
export function predictReps(fromLoad: number, repsPlusRir: number, toLoad: number): number {
  if (fromLoad <= 0 || toLoad <= 0) return repsPlusRir
  const e1rm = fromLoad * (1 + repsPlusRir / 30)
  return 30 * (e1rm / toLoad - 1)
}

function workSets(ex: SessionExercise): SetEntry[] {
  return ex.sets.filter((s) => s.kind === 'work' && s.completed)
}

function loadOf(s: SetEntry, lt: LoadType): number | null {
  if (lt === 'assisted') return s.assistKg ?? s.weightKg
  if (lt === 'bodyweight') return s.addedKg ?? 0
  return s.weightKg
}

export interface SuggestInput {
  exerciseId: string
  prescription: Prescription
  history: HistoryItem[]
  increments: Increments
  incrementOverride?: number
  today: string
  progressionAllowed: boolean
}

export function suggestNext(input: SuggestInput): Suggestion {
  const ex = getExercise(input.exerciseId)
  const p = input.prescription
  if (!input.progressionAllowed) {
    return { kind: 'paused_scope', title: 'Sugerencias de progresión en pausa', detail: 'Tu perfil indica una circunstancia (dolor, lesión, condición médica o embarazo) que queda fuera de lo que puede valorar un generador general. Registra con normalidad y consulta con un profesional antes de subir cargas.' }
  }
  const last = input.history[0]
  if (!last || !ex) return firstTime(ex, p)
  const lt = last.ex.loadTypeSnapshot
  const basedOnDate = last.date
  if (last.ex.painFlag) {
    return { kind: 'paused_pain', title: 'Sin subida: marcaste molestia', detail: 'La última vez marcaste molestia o dolor en este ejercicio. No sugerimos subir carga. Prueba una carga menor, un rango cómodo o una alternativa; si el dolor persiste o empeora, consulta a un profesional sanitario.', basedOnDate }
  }
  const sets = workSets(last.ex)
  const step = input.incrementOverride ?? defaultIncrement(lt, input.increments)
  const gap = daysBetween(last.date, input.today)
  const loads = sets.map((s) => loadOf(s, lt)).filter((x): x is number => x !== null)
  const refLoad = loads.length ? Math.min(...loads) : null

  if (gap > RETURN_AFTER_DAYS) {
    const target = refLoad !== null && (lt === 'barbell_total' || lt === 'dumbbell_each' || lt === 'machine' || lt === 'cable') ? returnLoad(refLoad, step, lt, input.increments) : undefined
    return {
      kind: 'return_after_break',
      title: `Vuelta gradual (${gap} días sin hacerlo)`,
      detail: `Tras una pausa, empieza con menos: ${target !== undefined ? `unos ${formatNumber(target)} kg (≈15 % menos)` : 'una variante o carga algo más fácil'}, una serie menos y dejando 3–4 repeticiones en reserva. Lo perdido suele recuperarse rápido; ajusta según cómo te sientas.`,
      targetWeightKg: target,
      targetReps: [p.repMin, p.repMax],
      basedOnDate,
    }
  }

  const required = Math.max(1, last.ex.prescription?.sets ?? p.sets)
  if (sets.length < required) {
    return {
      kind: 'repeat',
      title: 'Repite la carga',
      detail: `La última vez completaste ${sets.length} de ${required} series de trabajo. Mantén la carga y completa todas antes de subir.`,
      targetWeightKg: lt === 'assisted' ? undefined : refLoad ?? undefined,
      targetAssistKg: lt === 'assisted' ? refLoad ?? undefined : undefined,
      targetReps: [p.repMin, p.repMax],
      basedOnDate,
    }
  }
  const considered = sets.slice(0, required)
  const lastRx = last.ex.prescription ?? p

  // Ejercicios por tiempo
  if (lt === 'time') {
    const maxT = lastRx.timeMaxSec ?? p.timeMaxSec ?? 40
    const all = considered.every((s) => (s.durationSec ?? 0) >= maxT)
    if (all) return { kind: 'more_time', title: 'Puedes alargar', detail: `Mantuviste ${maxT} s en todas las series. Prueba 5–10 s más${ex.harder ? ` o pasa a ${getExercise(ex.harder)?.name.toLowerCase()}` : ''}.`, targetTimeSec: maxT + 5, basedOnDate }
    return { kind: 'repeat', title: 'Repite el tiempo', detail: `Intenta llegar a ${maxT} s en todas las series con buena postura.`, targetTimeSec: maxT, basedOnDate }
  }

  const repMax = lastRx.repMax
  const repMin = lastRx.repMin
  const sameLoad = loads.length === considered.length && loads.every((l) => Math.abs(l - (refLoad ?? 0)) < 1e-6)
  const topReached = considered.every((s) => (s.reps ?? 0) >= repMax)
  const rirs = considered.map((s) => s.rir)
  const rirKnown = rirs.every((r) => r !== null && r !== undefined)
  const minRir = rirKnown ? Math.min(...(rirs as number[])) : null
  const effortOk = rirKnown && (minRir as number) >= MIN_RIR_FOR_INCREASE
  const repsTxt = considered.map((s) => s.reps ?? 0).join('/')

  if (!topReached) {
    // ¿Dificultades repetidas? (dos sesiones seguidas por debajo del mínimo con la misma carga)
    const prev = input.history[1]
    const below = (h: HistoryItem) => workSets(h.ex).some((s) => (s.reps ?? 0) < repMin)
    if (prev && below(last) && below(prev)) {
      const prevLoads = workSets(prev.ex).map((s) => loadOf(s, lt)).filter((x): x is number => x !== null)
      if (prevLoads.length && refLoad !== null && Math.min(...prevLoads) === refLoad) {
        return { kind: 'review', title: 'Revisa la carga o la recuperación', detail: `Dos sesiones seguidas por debajo de ${repMin} repeticiones con la misma carga. No es motivo de alarma: revisa si la carga es alta, si descansas lo suficiente entre series y entre días, o baja un 5–10 %. Una sesión floja aislada no requiere cambios.`, targetReps: [repMin, repMax], basedOnDate }
      }
    }
    return {
      kind: 'repeat',
      title: 'Mantén la carga y suma repeticiones',
      detail: `La última vez: ${repsTxt}. El objetivo es llegar a ${repMax} en todas las series${lt === 'assisted' ? ' con la misma asistencia' : ' con la misma carga'} antes de subir.${!sameLoad && loads.length ? ' Usaste cargas distintas entre series: tomamos la más baja como referencia.' : ''}`,
      targetWeightKg: lt === 'assisted' || lt === 'bodyweight' || lt === 'band' ? undefined : refLoad ?? undefined,
      targetAssistKg: lt === 'assisted' ? refLoad ?? undefined : undefined,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }

  // Rango completado
  if (rirKnown && !effortOk) {
    return { kind: 'repeat', title: 'Rango completo, pero sin margen', detail: `Llegaste a ${repMax} pero al fallo (RIR 0). Repite la carga hasta completar el rango dejando al menos ${MIN_RIR_FOR_INCREASE} repetición en reserva.`, targetWeightKg: lt === 'assisted' ? undefined : refLoad ?? undefined, targetReps: [repMin, repMax], basedOnDate }
  }
  if (lt === 'bodyweight') {
    const harder = ex.harder ? getExercise(ex.harder) : undefined
    return {
      kind: 'harder_variant',
      title: 'Rango completado',
      detail: `${repsTxt} en todas las series. ${harder ? `Puedes pasar a «${harder.name}» (empieza en el mínimo del rango) o ` : 'Puedes '}añadir lastre si tienes cómo${!rirKnown ? '. No anotaste RIR: decide tú si te sobraba margen' : ''}.`,
      harderExerciseId: harder?.id,
      targetAddedKg: refLoad !== null && refLoad > 0 ? round2(refLoad + step) : undefined,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }
  if (lt === 'assisted') {
    const cur = refLoad ?? 0
    const next = Math.max(0, round2(cur - step))
    return { kind: 'reduce_assistance', title: 'Reduce la asistencia', detail: `Completaste el rango con ${formatNumber(cur)} kg de asistencia. Menos asistencia = más difícil: prueba ${formatNumber(next)} kg y vuelve a ${repMin} repeticiones.${!rirKnown ? ' Sin RIR anotado: decide tú.' : ''}`, targetAssistKg: next, targetReps: [repMin, repMax], basedOnDate }
  }
  if (lt === 'band') {
    return { kind: 'harder_variant', title: 'Rango completado', detail: 'Prueba una banda más dura (o acorta la banda) y vuelve al mínimo del rango.', targetReps: [repMin, repMax], basedOnDate }
  }
  if (refLoad === null) return firstTime(ex, p)
  const target = nextLoad(refLoad, step, lt, input.increments)
  const predicted = predictReps(refLoad, repMax + (minRir ?? 0), target)
  const pct = refLoad > 0 ? Math.round(((target - refLoad) / refLoad) * 100) : 0
  if (refLoad > 0 && predicted < repMin - 1) {
    return {
      kind: 'increment_too_large',
      title: 'El siguiente salto es grande',
      detail: `Pasar de ${formatNumber(refLoad)} a ${formatNumber(target)} kg es un +${pct} % y probablemente no llegarías a ${repMin} repeticiones. Opciones: sumar 1–2 repeticiones por encima del rango antes de subir, añadir una serie, o usar un incremento menor si tu material lo permite (configurable en Ajustes).`,
      targetWeightKg: refLoad,
      targetReps: [repMax, repMax + 2],
      basedOnDate,
    }
  }
  if (!rirKnown) {
    return {
      kind: 'increase_optional',
      title: 'Puedes subir (decide tú)',
      detail: `${repsTxt} con ${formatNumber(refLoad)} kg: rango completado. No anotaste RIR, así que no sabemos el margen: si te quedaban al menos 1–2 repeticiones con buena técnica, sube a ${formatNumber(target)} kg y vuelve a ${repMin}; si no, repite la carga.`,
      targetWeightKg: target,
      targetReps: [repMin, repMax],
      basedOnDate,
    }
  }
  return {
    kind: 'increase',
    title: `Sube a ${formatNumber(target)} kg`,
    detail: `${repsTxt} con ${formatNumber(refLoad)} kg y margen (RIR ≥ ${minRir}). Siguiente paso: ${formatNumber(target)} kg (+${pct} %) y vuelve a ${repMin} repeticiones.`,
    targetWeightKg: target,
    targetReps: [repMin, repMax],
    basedOnDate,
  }
}

function firstTime(ex: Exercise | undefined, p: Prescription): Suggestion {
  if (ex?.loadType === 'bodyweight' || ex?.loadType === 'time') {
    return { kind: 'first_time', title: 'Primera vez', detail: 'Haz una serie de prueba con buena técnica para ver cuántas repeticiones (o segundos) te salen dejando margen. Si superas el máximo del rango con facilidad, usa una variante más difícil.' }
  }
  if (ex?.loadType === 'assisted') {
    return { kind: 'first_time', title: 'Primera vez', detail: 'Empieza con bastante asistencia y quítala poco a poco hasta que llegar al rango te deje 2–3 repeticiones en reserva. No es una prueba de máximo.' }
  }
  return {
    kind: 'first_time',
    title: 'Primera vez: busca una carga cómoda',
    detail: `Sin prueba de máximo: sube poco a poco en las aproximaciones y elige una carga con la que harías ${p.repMax} dejando 2–4 en reserva. Si sobran muchas, sube; si no llegas a ${p.repMin}, baja.`,
    targetReps: [p.repMin, p.repMax],
  }
}
