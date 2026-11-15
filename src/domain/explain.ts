import { getExercise } from './catalog'
import { dayDuration, weeklyRegionVolume, workRowsOf, type VersionLike } from './engine/analysis'
import { REGION_LABEL, contributionOf, muscleMapFor } from './engine/contribution'
import { RECIPE_BY_ID } from './engine/recipes'
import type { Region, RoutineExercise } from './types'

/**
 * «Por qué estas series» (apartado 3.4): explicación CALCULADA a partir de la rutina, sin inventar razones fisiológicas
 * individuales. Si el motivo es la receta base, se dice; si es un cambio guardado, una adaptación o el reparto del
 * generador, también.
 */
export interface WhySets {
  sets: number
  region: Region | null
  regionLabel: string
  weeklyDirect: number
  weeklyIndirect: number
  reason: string
  text: string
  /** Vista previa de añadir una serie a este ejercicio (no se aplica sola). */
  plusOne: { weeklyDirect: number; dayMinutesBefore: number; dayMinutesAfter: number } | null
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

export function whySets(re: RoutineExercise, dayId: string, version: VersionLike, opts: { adaptationToday?: number | null } = {}): WhySets {
  const map = muscleMapFor(version)
  const c = contributionOf(re.exerciseId, map)
  const main = c.items.find((i) => i.weight === 1)?.region ?? null
  const vol = main ? weeklyRegionVolume(version).find((v) => v.region === main) : undefined
  const rows = workRowsOf(re)
  const sets = rows.conventional
  const base = re.origin?.base
  let reason: string
  if (base) {
    const r = RECIPE_BY_ID[base.templateId]
    const name = r ? `${r.code} «${r.name}»` : 'de origen'
    reason = base.sets === re.prescription.sets
      ? `Es la dosis base de la plantilla ${name} (versión editorial ${base.templateVersion}).`
      : `La plantilla ${name} propone ${base.sets}; tu rutina guarda ${re.prescription.sets} por un cambio que aceptaste.`
  } else if (version.plan?.template) {
    reason = 'Dosis guardada en tu rutina.'
  } else if (version.plan && !re.origin) {
    reason = 'Reparto del presupuesto semanal del generador entre los días de tu calendario (o un cambio que guardaste después).'
  } else {
    reason = 'Dosis guardada en tu rutina; no consta una receta de origen (rutina manual o de una versión anterior).'
  }
  const adapt = (re.origin?.adaptations ?? []).map((a) => a.text)
  if (adapt.length) reason += ` ${adapt.join(' ')}`
  if (opts.adaptationToday != null && opts.adaptationToday !== sets) reason += ` Hoy es adaptación: ${opts.adaptationToday} en lugar de ${sets}.`
  if (rows.blocks) reason += ' Además lleva un bloque especial, que se cuenta aparte.'
  const regionLabel = main ? REGION_LABEL[main].toLowerCase() : 'ningún grupo contabilizado'
  const weeklyDirect = vol?.direct ?? 0
  const weeklyIndirect = (vol?.secondary ?? 0) * 0.5
  let plusOne: WhySets['plusOne'] = null
  const day = version.days.find((d) => d.id === dayId)
  if (day && main) {
    const timesPerWeek = version.schedule.length ? version.schedule.filter((s) => s.dayId === dayId).length : 1
    const bumped = { ...day, exercises: day.exercises.map((e) => (e.uid === re.uid ? { ...e, prescription: { ...e.prescription, sets: e.prescription.sets + 1 } } : e)) }
    plusOne = { weeklyDirect: weeklyDirect + timesPerWeek, dayMinutesBefore: dayDuration(day).minutes, dayMinutesAfter: dayDuration(bumped).minutes }
  }
  const unil = getExercise(re.exerciseId)?.unilateral ? ' (por lado: no cuentan el doble)' : ''
  const text = `Este ejercicio aporta ${sets} ${sets === 1 ? 'serie' : 'series'}${unil} esta sesión. En tu calendario hay ${fmt(weeklyDirect)} directas semanales para ${regionLabel}, más ${fmt(weeklyIndirect)} indirectas estimadas. ${reason}`
  return { sets, region: main, regionLabel, weeklyDirect, weeklyIndirect, reason, text, plusOne }
}
