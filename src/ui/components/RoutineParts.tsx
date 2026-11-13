import { ChevronRight, Clock, Search, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { allExercises, getExercise, hasEquipment } from '../../domain/catalog'
import { MAJOR_MUSCLES, MUSCLE_LABEL, PATTERN_LABEL } from '../../domain/catalog/exercises'
import { mediaForExercise, assetUrl } from '../../domain/catalog/media'
import { analyzeRoutine, dayDuration } from '../../domain/engine/analysis'
import { weeklyTarget } from '../../domain/engine/params'
import { describePrescription, describeRir } from '../../domain/engine/prescription'
import { alternativesFor } from '../../domain/engine/substitution'
import type { EquipmentId, Exercise, Level, Profile, RoutineDay, RoutineVersion } from '../../domain/types'
import { WEEKDAY_NAME, formatDuration } from '../../domain/util'
import { Sheet } from './overlay'

export function Thumb({ exerciseId }: { exerciseId: string }) {
  const m = mediaForExercise(exerciseId)
  return (
    <div className="demo-thumb" aria-hidden>
      {m?.frames ? <img src={assetUrl(m.frames[m.frames.length > 2 ? Math.floor(m.frames.length / 2) : m.frames.length > 1 ? 1 : 0])} alt="" loading="lazy" style={m.colored ? { filter: 'none' } : undefined} /> : <span className="tiny faint">—</span>}
    </div>
  )
}

export function DayView({ day, weekdays, onOpenExercise }: { day: RoutineDay; weekdays?: number[]; onOpenExercise?: (id: string) => void }) {
  const dur = dayDuration(day)
  return (
    <section className="card stack-sm" aria-label={day.name}>
      <div className="row between">
        <h3>{day.name}</h3>
        <span className="badge"><Clock size={13} aria-hidden /> ≈{dur.minutes} min</span>
      </div>
      {weekdays && weekdays.length > 0 && <span className="small muted">{weekdays.map((w) => WEEKDAY_NAME[w]).join(', ')}</span>}
      {day.exercises.length === 0 && <p className="small muted">Sin ejercicios todavía.</p>}
      <div className="list">
        {day.exercises.map((re) => {
          const ex = getExercise(re.exerciseId)
          return (
            <button key={re.uid} className="list-item" onClick={() => onOpenExercise?.(re.exerciseId)} disabled={!onOpenExercise}>
              <Thumb exerciseId={re.exerciseId} />
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span style={{ fontWeight: 650 }}>
                  {ex?.name ?? re.exerciseId}
                  {re.superset && <span className="badge accent" style={{ marginLeft: 6 }}>Superserie</span>}
                </span>
                <span className="small muted">
                  {describePrescription(re.prescription, ex)} · {describeRir(re.prescription)} · desc. {formatDuration(re.prescription.restSec)}
                  {re.prescription.warmupSets > 0 && ` · ${re.prescription.warmupSets} aprox.`}
                </span>
                {re.prescription.note && <span className="tiny muted">{re.prescription.note}</span>}
                {ex?.demoStatus === 'pendiente' && <span className="badge warn" style={{ alignSelf: 'flex-start' }}>Demostración pendiente</span>}
              </span>
              {onOpenExercise && <ChevronRight size={18} className="faint" aria-hidden />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function RoutineDaysView({ version, onOpenExercise }: { version: Pick<RoutineVersion, 'days' | 'schedule'>; onOpenExercise?: (id: string) => void }) {
  return (
    <div className="stack">
      {version.days.map((d) => (
        <DayView key={d.id} day={d} weekdays={version.schedule.filter((s) => s.dayId === d.id).map((s) => s.weekday)} onOpenExercise={onOpenExercise} />
      ))}
    </div>
  )
}

/** Volumen y frecuencia REALES calculados del calendario final (no del nombre del split). */
export function VolumePanel({ version, level, goal, priority = [] }: { version: Pick<RoutineVersion, 'days' | 'schedule'>; level: Level; goal: Profile['goal']; priority?: string[] }) {
  const a = useMemo(() => analyzeRoutine(version), [version])
  const byMuscle = new Map(a.volume.map((v) => [v.muscle, v]))
  const maxScale = Math.max(16, ...a.volume.map((v) => v.weighted))
  return (
    <section className="card stack" aria-label="Volumen y frecuencia semanal">
      <div className="stack-sm">
        <h3>Series semanales por músculo</h3>
        <p className="small muted">Barra oscura: series directas. Clara: series indirectas contadas como media serie (estimación). Marcas: rango orientativo para tu nivel. “f” = días por semana con trabajo directo.</p>
      </div>
      <div className="stack-sm">
        {MAJOR_MUSCLES.map((m) => {
          const v = byMuscle.get(m)
          const direct = v?.directSets ?? 0
          const weighted = v?.weighted ?? 0
          const [lo, hi] = weeklyTarget(level, m, goal, priority.includes(m))
          return (
            <div key={m} className="vol-row">
              <span>{MUSCLE_LABEL[m]}</span>
              <div className="vol-track" role="img" aria-label={`${MUSCLE_LABEL[m]}: ${weighted} series (directas ${direct}); orientativo ${lo}–${hi}; frecuencia ${v?.frequencyDirect ?? 0}`}>
                <div className="vol-fill ind" style={{ width: `${(weighted / maxScale) * 100}%` }} />
                <div className="vol-fill" style={{ width: `${(direct / maxScale) * 100}%` }} />
                <div className="vol-target" style={{ left: `${(lo / maxScale) * 100}%`, width: `${((hi - lo) / maxScale) * 100}%` }} />
              </div>
              <span className="small num" style={{ textAlign: 'right' }}>
                {String(weighted).replace('.', ',')} · f{v?.frequencyDirect ?? 0}
              </span>
            </div>
          )
        })}
      </div>
      {a.recoveryWarnings.length > 0 && (
        <div className="note warn">
          <TriangleAlert aria-hidden />
          <div className="stack-sm small">
            {a.recoveryWarnings.map((w) => <span key={w}>{w}</span>)}
          </div>
        </div>
      )}
    </section>
  )
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
        {replacing && !q && <p className="small muted">Ordenadas por parecido: mismo patrón y músculo, tu material y nivel. Los kilos NO se copian: cada ejercicio tiene su propio historial.</p>}
        <div className="list">
          {list.slice(0, 80).map(({ ex, why }) => (
            <button key={ex.id} className="list-item" onClick={() => onPick(ex)}>
              <Thumb exerciseId={ex.id} />
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span style={{ fontWeight: 650 }}>{ex.name}</span>
                <span className="tiny muted">{why}</span>
                {ex.demoStatus === 'pendiente' && <span className="badge warn" style={{ alignSelf: 'flex-start' }}>Demostración pendiente</span>}
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
