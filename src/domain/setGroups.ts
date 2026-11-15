import type { Prescription, SetEntry, SetGroup } from './types'

/**
 * Objetivos por serie (1.5, apartado 5 del encargo 4). Son series CONVENCIONALES con descanso normal agrupadas por
 * objetivo; no son drop sets ni imponen una reducción de carga. Cada grupo tiene un id estable y se evalúa por separado.
 */

export const GROUP_LABEL: Record<NonNullable<SetGroup['label']>, string> = { principal: 'Principal', complementaria: 'Complementaria' }

/** Aplica los grupos a la prescripción: `sets` = suma; campos principales del primer grupo (compatibilidad). */
export function withGroups(p: Prescription, groups: SetGroup[] | undefined): Prescription {
  if (!groups || !groups.length) {
    const { setGroups: _drop, ...rest } = p
    void _drop
    return rest
  }
  const g0 = groups[0]
  return { ...p, setGroups: groups, sets: groups.reduce((a, g) => a + Math.max(1, g.count), 0), repMin: g0.repMin, repMax: g0.repMax, rirMin: g0.rirMin, rirMax: g0.rirMax, restSec: g0.restSec }
}

/** Grupo inicial a partir de la prescripción actual (para empezar a personalizar sin cambiar nada). */
export function groupFromPrescription(p: Prescription, id: string): SetGroup {
  return { id, label: null, count: p.sets, repMin: p.repMin, repMax: p.repMax, rirMin: p.rirMin, rirMax: p.rirMax, restSec: p.restSec }
}

/** Grupo de la n-ésima serie convencional (0-based) según el orden de los grupos. */
export function groupForIndex(p: Prescription | null | undefined, i: number): SetGroup | null {
  const gs = p?.setGroups
  if (!gs?.length) return null
  let acc = 0
  for (const g of gs) {
    acc += Math.max(1, g.count)
    if (i < acc) return g
  }
  return gs[gs.length - 1]
}

/** Prescripción equivalente de un grupo (para describir, estimar tiempo o evaluar la progresión de ese grupo). */
export function groupPrescription(p: Prescription, g: SetGroup): Prescription {
  const { setGroups: _drop, ...rest } = p
  void _drop
  return { ...rest, sets: g.count, repMin: g.repMin, repMax: g.repMax, rirMin: g.rirMin, rirMax: g.rirMax, restSec: g.restSec }
}

/** Texto compacto: «1×4–6 + 2×6–8». */
export function groupsText(p: Prescription): string | null {
  if (!p.setGroups?.length) return null
  return p.setGroups.map((g) => `${g.count}×${g.repMin === g.repMax ? g.repMin : `${g.repMin}–${g.repMax}`}${g.label ? ` ${GROUP_LABEL[g.label].toLowerCase()}` : ''}`).join(' + ')
}

/** Series de trabajo de un grupo dentro de una exposición del historial (las omitidas y los calentamientos no cuentan). */
export function setsOfGroup(sets: SetEntry[], groupId: string): SetEntry[] {
  return sets.filter((s) => s.kind === 'work' && !s.method && s.groupId === groupId)
}
