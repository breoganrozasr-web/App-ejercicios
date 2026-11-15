import { useState } from 'react'
import type { AnatRegion } from '../../domain/catalog/anatomy'
import { getExercise } from '../../domain/catalog'
import type { RegionVolume } from '../../domain/engine/analysis'
import { REGION_LABEL } from '../../domain/engine/contribution'
import type { DoneRegion } from '../../domain/records'
import type { Region } from '../../domain/types'
import { WEEKDAY_NAME, formatDateShort } from '../../domain/util'
import { BodyMap } from './BodyMap'

/**
 * Mapa del PLAN o de lo REALIZADO (1.5): reutiliza el esquema corporal con otra leyenda (series, no roles anatómicos).
 * La intensidad sale de las series directas del cómputo de la rutina/sesión (mapa 1 o 2, según su versión). Los grupos
 * agregados (espalda; hombro sin región) se dibujan en todas sus zonas con el MISMO valor y se listan una sola vez:
 * no se reparten ni se suman dos veces.
 */
const TO_ANAT: Partial<Record<Region, AnatRegion[]>> = {
  chest: ['chest'], back: ['lats', 'upper_back'], delt_front: ['delt_front'], delt_side: ['delt_side'], delt_rear: ['delt_rear'], delt_unspecified: ['delt_front', 'delt_side', 'delt_rear'],
  biceps: ['biceps'], triceps: ['triceps'], quads: ['quads'], hamstrings: ['hamstrings'], glutes: ['glutes'], calves: ['calves'], core: ['abs', 'obliques'], abductors: ['abductors'],
}
const ORDER: Region[] = ['chest', 'back', 'delt_front', 'delt_side', 'delt_rear', 'delt_unspecified', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'abductors', 'calves', 'core', 'core_iso']

interface Row { region: Region; direct: number; secondary: number; blocks: number; days: number; detail: { text: string }[] }

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

export function rowsFromPlan(vol: RegionVolume[]): Row[] {
  return vol.filter((v) => v.direct + v.secondary + v.blocks > 0).map((v) => ({
    region: v.region, direct: v.direct, secondary: v.secondary, blocks: v.blocks, days: v.directDays,
    detail: v.sources.filter((s) => s.weight > 0 && s.sets + s.blocks > 0).map((s) => ({ text: `${getExercise(s.exerciseId)?.name ?? s.exerciseId} · ${s.dayName}${s.weekday !== null ? ` (${WEEKDAY_NAME[s.weekday]})` : ''}: ${s.sets} ${s.weight === 1 ? 'directas' : 'indirectas'}${s.blocks ? ` + ${s.blocks} bloque` : ''}` })),
  }))
}

export function rowsFromDone(done: DoneRegion[]): Row[] {
  return done.filter((v) => v.direct + v.secondary + v.blocks > 0).map((v) => ({
    region: v.region, direct: v.direct, secondary: v.secondary, blocks: v.blocks, days: v.days,
    detail: v.sources.filter((s) => s.sets + s.blocks > 0).map((s) => ({ text: `${s.name} · ${formatDateShort(s.date)}: ${s.sets} ${s.weight === 1 ? 'directas' : 'indirectas'}${s.blocks ? ` + ${s.blocks} bloque` : ''}` })),
  }))
}

export function VolumeMap({ rows, title, empty }: { rows: Row[]; title: string; empty: string }) {
  const [sel, setSel] = useState<Region | null>(null)
  const values: Partial<Record<AnatRegion, number>> = {}
  for (const r of rows) for (const a of TO_ANAT[r.region] ?? []) values[a] = Math.max(values[a] ?? 0, r.direct)
  const selAnat = sel ? (TO_ANAT[sel] ?? [])[0] ?? null : null
  const toRegion = (a: AnatRegion | null): Region | null => (a ? (ORDER.find((r) => (TO_ANAT[r] ?? []).includes(a) && rows.some((x) => x.region === r)) ?? null) : null)
  const sorted = ORDER.map((r) => rows.find((x) => x.region === r)).filter((x): x is Row => !!x)
  return (
    <div className="stack-sm">
      <BodyMap mode={{ kind: 'values', values, unit: 'directas' }} title={title} selected={selAnat} onSelect={(a) => setSel(toRegion(a))} showList={false} />
      {sorted.length === 0 && <p className="small muted">{empty}</p>}
      <ul className="map-list" aria-label={`${title}: por grupo`}>
        {sorted.map((r) => (
          <li key={r.region}>
            <button className="map-item" aria-pressed={sel === r.region} onClick={() => setSel(sel === r.region ? null : r.region)}>
              <span className="grow">{REGION_LABEL[r.region]}</span>
              <span className="small muted num">{r.region === 'core_iso' ? `${r.direct} series por tiempo` : `${fmt(r.direct)} dir.${r.secondary ? ` + ${fmt(r.secondary * 0.5)} ind.` : ''} · ${r.days} d`}{r.blocks ? ` · ${r.blocks} bloque${r.blocks > 1 ? 's' : ''}` : ''}</span>
            </button>
            {sel === r.region && (
              <ul className="tiny" style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
                {r.detail.map((d, i) => <li key={i}>{d.text}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <span className="tiny muted">Directas e indirectas (media serie, estimación) por separado; los bloques especiales aparte, sin «series equivalentes». Unilaterales: series por lado, sin duplicar. Comparación con tu plan, no un diagnóstico de desequilibrio ni de recuperación.</span>
    </div>
  )
}
