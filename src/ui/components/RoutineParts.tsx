import { ChevronRight, Clock, Info, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { allExercises, getExercise, hasEquipment } from '../../domain/catalog'
import { MUSCLE_LABEL, PATTERN_LABEL } from '../../domain/catalog/exercises'
import { hasExternalDemo } from '../../domain/catalog/external'
import { mediaForExercise, assetUrl } from '../../domain/catalog/media'
import { durationText, recoveryOverlaps, weeklyRegionVolume, type VersionLike } from '../../domain/engine/analysis'
import { whySets } from '../../domain/explain'
import { DEFAULT_TARGET_REGIONS, REGION_LABEL } from '../../domain/engine/contribution'
import { familiarizationPreview, type FrequencyRow } from '../../domain/engine/generator'
import { weeklyBudget } from '../../domain/engine/params'
import { describePrescription, describeRir } from '../../domain/engine/prescription'
import { alternativesFor } from '../../domain/engine/substitution'
import type { EquipmentId, Exercise, Level, Profile, Region, RoutineDay, RoutineExercise, RoutineVersion } from '../../domain/types'
import { WEEKDAY_NAME, formatDuration } from '../../domain/util'
import { techniqueBeforeAfter } from '../../domain/techniques'
import { Sheet } from './overlay'

export function Thumb({ exerciseId }: { exerciseId: string }) {
  const m = mediaForExercise(exerciseId)
  return (
    <div className="demo-thumb" aria-hidden>
      {m?.frames ? <img src={assetUrl(m.frames[m.frames.length > 2 ? Math.floor(m.frames.length / 2) : m.frames.length > 1 ? 1 : 0])} alt="" loading="lazy" style={m.colored ? { filter: 'none' } : undefined} /> : <span className="tiny faint">—</span>}
    </div>
  )
}

/** Estado de la demostración: local verificada, solo externa (requiere internet) o pendiente. */
export function DemoBadge({ exerciseId }: { exerciseId: string }) {
  const ex = getExercise(exerciseId)
  if (!ex || ex.custom || ex.demoStatus === 'verificada') return null
  return hasExternalDemo(exerciseId)
    ? <span className="badge" style={{ alignSelf: 'flex-start' }}>Vídeo o página externa · requiere conexión</span>
    : <span className="badge warn" style={{ alignSelf: 'flex-start' }}>Demostración pendiente</span>
}

export function DayView({ day, weekdays, onOpenExercise, familiarization, version }: { day: RoutineDay; weekdays?: number[]; onOpenExercise?: (id: string) => void; familiarization?: { sessions: number } | null; version?: VersionLike }) {
  return (
    <section className="card stack-sm" aria-label={day.name}>
      <div className="row between">
        <h3>{day.name}</h3>
        <span className="badge"><Clock size={13} aria-hidden /> {durationText(day)}</span>
      </div>
      {weekdays && weekdays.length > 0 && <span className="small muted">{weekdays.map((w) => WEEKDAY_NAME[w]).join(', ')}</span>}
      {day.exercises.length === 0 && <p className="small muted">Sin ejercicios todavía.</p>}
      <div className="list">
        {day.exercises.map((re) => {
          const ex = getExercise(re.exerciseId)
          const fam = familiarization ? familiarizationPreview(re) : null
          return (
            <div key={re.uid} className="stack-sm" style={{ gap: 0 }}>
            <button className="list-item" onClick={() => onOpenExercise?.(re.exerciseId)} disabled={!onOpenExercise}>
              <Thumb exerciseId={re.exerciseId} />
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span style={{ fontWeight: 650 }}>
                  {ex?.name ?? re.exerciseId}
                  {re.superset && day.exercises.filter((x) => x.superset === re.superset).length === 2 && <span className="badge accent" style={{ marginLeft: 6 }}>Superserie</span>}
                  {re.technique && <span className="badge suggest" style={{ marginLeft: 6 }}>{re.technique.method === 'drop' ? 'Descendente' : 'Rest-pause'}</span>}
                  {re.prescription.reference && <span className="badge accent" style={{ marginLeft: 6 }}>Referencia</span>}
                  {re.optional && <span className="badge" style={{ marginLeft: 6 }}>Opcional</span>}
                </span>
                {fam ? (
                  <span className="small">
                    <span className="muted">Hoy (adaptación):</span> {fam.today}
                    <br />
                    <span className="muted">Plan base después:</span> {fam.after} · desc. {formatDuration(re.prescription.restSec)}
                  </span>
                ) : (
                  <span className="small muted">
                    {describePrescription(re.prescription, ex)} · {describeRir(re.prescription, ex)} · desc. {formatDuration(re.prescription.restSec)}
                    {re.prescription.warmupSets > 0 && ` · ${re.prescription.warmupSets} aprox.`}
                  </span>
                )}
                {re.technique && (() => { const t = techniqueBeforeAfter(re.prescription, re.technique); return <span className="tiny">{t.after} · {re.technique.mode === 'reorganize' ? 'reorganiza 2 series normales' : 'trabajo añadido'}{fam ? ' · no se aplica durante la familiarización' : ''}</span> })()}
                {re.prescription.note && <span className="tiny muted">{re.prescription.note}</span>}
                <DemoBadge exerciseId={re.exerciseId} />
              </span>
              {onOpenExercise && <ChevronRight size={18} className="faint" aria-hidden />}
            </button>
            {version && <WhySetsDetails re={re} dayId={day.id} version={version} adaptationToday={familiarization ? Math.max(1, Math.ceil(re.prescription.sets / 2)) : null} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function RoutineDaysView({ version, onOpenExercise }: { version: VersionLike & { familiarization?: RoutineVersion['familiarization'] }; onOpenExercise?: (id: string) => void }) {
  return (
    <div className="stack">
      {version.familiarization && (
        <div className="note info">
          <Info aria-hidden />
          <span className="small">
            {version.familiarization.reason === 'returning' ? 'Adaptación tras la pausa' : 'Aprendizaje'}: los primeros {version.familiarization.sessions} días válidos (al menos el 70 % de las series; como máximo uno por fecha) llevan max(1, mitad de series), rangos de aprendizaje y RIR 3–4, sin subidas automáticas. Debajo ves la dosis de hoy y la del plan base.
          </span>
        </div>
      )}
      {version.days.map((d) => (
        <DayView key={d.id} day={d} weekdays={version.schedule.filter((s) => s.dayId === d.id).map((s) => s.weekday)} onOpenExercise={onOpenExercise} familiarization={version.familiarization} version={version} />
      ))}
    </div>
  )
}

const ROLE_TXT: Record<string, string> = { principal: 'directa (1)', secundario: 'indirecta (0,5)', estabilizador: 'estabilizador (0, no se cuenta)' }

/**
 * Volumen y frecuencia REALES de la propuesta: directas + indirectas estimadas por separado, con el origen de cada cifra.
 * No mezcla unidades (el tronco por tiempo va aparte) ni dibuja objetivos dentro de la barra.
 */
export function VolumePanel({ version, level, goal, priority = [], targets }: { version: Pick<RoutineVersion, 'days' | 'schedule'>; level: Level; goal: Profile['goal']; priority?: Region[]; targets?: Region[] }) {
  const vol = useMemo(() => weeklyRegionVolume(version), [version])
  const rec = useMemo(() => recoveryOverlaps(version, targets ?? DEFAULT_TARGET_REGIONS), [version, targets])
  const [open, setOpen] = useState<Region | null>(null)
  const maxScale = Math.max(8, ...vol.filter((v) => v.region !== 'core_iso').map((v) => v.estimated))
  const tgt = targets ?? DEFAULT_TARGET_REGIONS
  return (
    <section className="card stack" aria-label="Volumen y frecuencia semanal">
      <div className="stack-sm">
        <h3>Series semanales por grupo</h3>
        <p className="small muted">Barra oscura: series <strong>directas</strong>. Parte clara: <strong>indirectas estimadas</strong> (media serie cada una). Estimación: el trabajo indirecto no equivale exactamente al directo. «Días» = días con trabajo directo; entre paréntesis, días solo con trabajo indirecto (no se suman). Toca un grupo para ver de dónde sale cada cifra.</p>
      </div>
      <div className="stack-sm">
        {vol.map((v) => {
          const time = v.region === 'core_iso'
          const b = weeklyBudget(v.region, level, goal, priority.includes(v.region))
          const isTarget = tgt.includes(v.region)
          const legacy = v.sources.some((s) => s.legacy && s.weight > 0)
          return (
            <div key={v.region} className="stack-sm" style={{ gap: 4 }}>
              <button className="vol-row" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }} aria-expanded={open === v.region} onClick={() => setOpen(open === v.region ? null : v.region)}>
                <span>{REGION_LABEL[v.region]}{isTarget && <span className="tiny muted"> ·obj.</span>}</span>
                {time ? (
                  <span className="small muted">{v.direct} {v.direct === 1 ? 'serie' : 'series'} por tiempo</span>
                ) : (
                  <span className="vol-track" role="img" aria-label={`${REGION_LABEL[v.region]}: ${fmt(v.direct)} directas + ${fmt(v.secondary * 0.5)} indirectas estimadas; ${v.directDays} días directos`}>
                    <span className="vol-fill ind" style={{ width: `${(v.estimated / maxScale) * 100}%` }} />
                    <span className="vol-fill" style={{ width: `${(v.direct / maxScale) * 100}%` }} />
                  </span>
                )}
                <span className="small num" style={{ textAlign: 'right' }}>{time ? '' : `${fmt(v.direct)} + ${fmt(v.secondary * 0.5)}`}<br /><span className="tiny muted">{v.directDays} d{v.secondaryOnlyDays ? ` (+${v.secondaryOnlyDays})` : ''}</span></span>
              </button>
              {v.blocks > 0 && <span className="tiny" style={{ paddingLeft: 2 }}>Además: {v.blocks} {v.blocks === 1 ? 'bloque especial' : 'bloques especiales'} por semana, aparte (no equivalen a un número de series).</span>}
              {(b || legacy) && <span className="tiny muted" style={{ paddingLeft: 2 }}>{b ? `Presupuesto inicial de directas: ${b.min}–${b.max} (no es un mínimo)` : ''}{b && legacy ? ' · ' : ''}{legacy ? 'incluye clasificación heredada' : ''}</span>}
              {open === v.region && (
                <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }}>
                  {v.sources.length === 0 && <li className="muted">Ningún ejercicio de la propuesta lo trabaja.</li>}
                  {v.sources.map((s, i) => (
                    <li key={i}>
                      {getExercise(s.exerciseId)?.name ?? s.exerciseId} · {s.dayName}{s.weekday !== null ? ` (${WEEKDAY_NAME[s.weekday]})` : ''}: {s.sets} {s.sets === 1 ? 'serie' : 'series'}{s.blocks ? ` + ${s.blocks} bloque ${s.blockMethod === 'drop' ? 'descendente' : 'rest-pause'}` : ''} · {ROLE_TXT[s.role]}{s.legacy ? ' · clasificación heredada' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      <p className="tiny muted">«·obj.» = grupo al que se aplica la frecuencia pedida. Las dos series por pierna de un ejercicio unilateral cuentan como 2 series para cada pierna, no 4. Contabilidad conservadora, no porcentajes de crecimiento: «no lo contamos» no significa «no recibe estímulo».</p>
      {rec.length > 0 && (
        <div className="note warn">
          <TriangleAlert aria-hidden />
          <div className="stack-sm small">
            {rec.map((o) => <span key={`${o.a}-${o.b}`}>{WEEKDAY_NAME[o.a]} y {WEEKDAY_NAME[o.b]} son días seguidos y ambos trabajan directamente {o.regions.map((r) => REGION_LABEL[r].toLowerCase()).join(', ')}. No es peligroso en sí; si llegas cargado, reparte grupos o deja un día entre medias.</span>)}
          </div>
        </div>
      )}
    </section>
  )
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

/** Selector de ejercicio: búsqueda o alternativas a uno dado. */
export function ExercisePicker({ open, onClose, onPick, replacing, equipment, level, title }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void; replacing?: string; equipment?: EquipmentId[]; level: Level; title?: string }) {
  const [q, setQ] = useState('')
  const [onlyMine, setOnlyMine] = useState(!!equipment)
  const list = useMemo(() => {
    if (replacing && !q) return alternativesFor(replacing, onlyMine ? equipment ?? null : null, level).map((a) => ({ ex: a.exercise, why: a.reasons.join(' · ') }))
    const nq = q.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return allExercises()
      .filter((e) => !onlyMine || !equipment || hasEquipment(equipment, e))
      .filter((e) => !nq || [e.name, ...e.synonyms, PATTERN_LABEL[e.pattern], ...e.primary.map((m) => MUSCLE_LABEL[m])].some((s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(nq)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((ex) => ({ ex, why: `${PATTERN_LABEL[ex.pattern]} · ${ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}` }))
  }, [q, replacing, onlyMine, equipment, level])
  return (
    <Sheet open={open} onClose={onClose} title={title ?? (replacing ? `Sustituir ${getExercise(replacing)?.name ?? ''}` : 'Añadir ejercicio')}>
      <div className="stack">
        <label className="row" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12 }} aria-hidden />
          <input className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Buscar por nombre, músculo o patrón" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" />
        </label>
        {equipment && (
          <label className="row small">
            <input type="checkbox" className="check" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Solo con mi material
          </label>
        )}
        {replacing && !q && <p className="small muted">Primero, las de la misma función con tu material; después, las que cambian el plan (lo indican). «Mismo músculo» no basta para prometer equivalencia. Los kilos NO se copian: cada ejercicio tiene su propio historial.</p>}
        <div className="list">
          {list.slice(0, 80).map(({ ex, why }) => (
            <button key={ex.id} className="list-item" onClick={() => onPick(ex)}>
              <Thumb exerciseId={ex.id} />
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span style={{ fontWeight: 650 }}>{ex.name}</span>
                <span className="tiny muted">{why}</span>
                <DemoBadge exerciseId={ex.id} />
                {ex.custom && <span className="badge" style={{ alignSelf: 'flex-start' }}>Propio</span>}
              </span>
            </button>
          ))}
          {!list.length && <p className="muted small">Nada coincide.</p>}
        </div>
      </div>
    </Sheet>
  )
}

/** Tabla real de frecuencia (días con trabajo directo; aparte, días solo indirectos). */
export function FrequencyTable({ rows, compact = false }: { rows: FrequencyRow[]; compact?: boolean }) {
  const shown = compact ? rows.filter((r) => r.target) : rows.filter((r) => r.target || r.direct > 0 || r.secondaryOnlyDays > 0)
  return (
    <table className="freq-table small">
      <thead>
        <tr><th scope="col">Grupo</th><th scope="col">Pedida</th><th scope="col" title="Días con trabajo directo">Días dir.</th><th scope="col" title="Días solo con trabajo indirecto (no se suman)">Solo ind.</th></tr>
      </thead>
      <tbody>
        {shown.map((r) => (
          <tr key={r.region} className={r.desired !== null && r.directDays < r.desired ? 'short' : ''}>
            <th scope="row">{REGION_LABEL[r.region]}</th>
            <td className="num">{r.desired ?? (r.target ? 'auto' : '—')}</td>
            <td className="num">{r.directDays}</td>
            <td className="num">{r.secondaryOnlyDays || '—'}</td>
          </tr>
        ))}
      </tbody>
      <caption className="tiny muted" style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 4 }}>«Pedida» vacía: grupo sin objetivo de frecuencia (se muestra el resultado real). Las columnas no se suman.</caption>
    </table>
  )
}

/** Asigna días de la semana a cada día de la rutina (se puede empezar cualquier día). */
export function ScheduleEditor({ days, schedule, onChange }: { days: RoutineDay[]; schedule: { weekday: number; dayId: string }[]; onChange: (s: { weekday: number; dayId: string }[]) => void }) {
  return (
    <section className="card stack-sm">
      <h3>Días de la semana</h3>
      <p className="small muted">Elige qué día de la semana va cada sesión. Puedes empezar cualquier día: la app te propone la siguiente sesión en orden.</p>
      {days.map((d) => (
        <label key={d.id} className="row between" style={{ minHeight: 48 }}>
          <span className="grow">{d.name}</span>
          <select
            className="input"
            style={{ width: 150 }}
            value={schedule.find((s) => s.dayId === d.id)?.weekday ?? ''}
            onChange={(e) => {
              const v = e.target.value
              const rest = schedule.filter((s) => s.dayId !== d.id)
              onChange(v === '' ? rest : [...rest.filter((s) => s.weekday !== Number(v)), { weekday: Number(v), dayId: d.id }].sort((a, b) => a.weekday - b.weekday))
            }}
          >
            <option value="">Sin día fijo</option>
            {WEEKDAY_NAME.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
        </label>
      ))}
    </section>
  )
}


/** «Por qué estas series»: explicación calculada y vista previa de añadir una serie (no se aplica sola). */
export function WhySetsDetails({ re, dayId, version, adaptationToday }: { re: RoutineExercise; dayId: string; version: VersionLike; adaptationToday?: number | null }) {
  const [open, setOpen] = useState(false)
  const [cmp, setCmp] = useState(false)
  const w = useMemo(() => (open ? whySets(re, dayId, version, { adaptationToday }) : null), [open, re, dayId, version, adaptationToday])
  if (getExercise(re.exerciseId)?.loadType === 'time' && !re.prescription.sets) return null
  return (
    <div className="stack-sm" style={{ gap: 4, paddingBottom: 8 }}>
      <button className="btn ghost small" style={{ alignSelf: 'flex-start', minHeight: 44, padding: '0 6px' }} aria-expanded={open} onClick={() => setOpen(!open)}>Por qué estas series</button>
      {w && (
        <div className="note info small stack-sm" style={{ display: 'block' }}>
          <p style={{ margin: 0 }}>{w.text}</p>
          {w.plusOne && (
            <>
              <button className="btn soft small" style={{ marginTop: 6 }} aria-expanded={cmp} onClick={() => setCmp(!cmp)}>Comparar añadir una serie</button>
              {cmp && <p className="small" style={{ margin: '6px 0 0' }}>Con una serie más: {w.plusOne.weeklyDirect} directas semanales para {w.regionLabel} (ahora {String(w.weeklyDirect).replace('.', ',')}); esta sesión ≈{w.plusOne.dayMinutesBefore} → ≈{w.plusOne.dayMinutesAfter} min. Es solo una comparación: para aplicarla, edita la rutina. Más series no son mejores por sí mismas.</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
