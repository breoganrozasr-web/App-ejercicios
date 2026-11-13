import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, ChartLine, ChevronLeft, ChevronRight, Flame, Info, Pencil, Trash2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { deleteSession, restoreSession, retimeSession, sessionWorkSummary, updateFinishedSession } from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { MAJOR_MUSCLES, MUSCLE_LABEL } from '../../domain/catalog/exercises'
import { weeklyTarget } from '../../domain/engine/params'
import { checkScope } from '../../domain/engine/scope'
import { bodyweightOn, kcalRange, sessionMinutes } from '../../domain/energy'
import { READINESS_SCALES, readinessLevel } from '../../domain/readiness'
import { exerciseTrend, previousComparable, sessionRecords, sessionTotals, sessionsPerWeek, weeklyMuscleSets } from '../../domain/records'
import type { Session, SetEntry } from '../../domain/types'
import { WEEKDAY_SHORT, addDays, weekStart, formatDateLong, formatDateShort, formatNumber, formatTime, toLocalDate } from '../../domain/util'
import { LineChart, WeekBars } from '../components/Charts'
import { DecimalInput } from '../components/inputs'
import { useConfirm, useToast } from '../components/overlay'
import { back, go, href } from '../router'
import { BodyweightCard, MeasurementsCard, MuscleRecencyCard, PhotosCard } from './Body'

export function ProgressScreen() {
  const { profile } = useApp()
  const today = toLocalDate()
  const sessions = useLiveQuery(() => db().sessions.toArray(), [], [] as Session[])
  const finished = sessions.filter((s) => s.status === 'completed' || s.status === 'partial').sort((a, b) => b.startedAt - a.startedAt)
  const perWeek = sessionsPerWeek(finished, 12, today)
  const muscleWeeks = weeklyMuscleSets(finished, 2, today)
  const thisWeek = muscleWeeks[muscleWeeks.length - 1]?.perMuscle ?? {}
  const lastWeek = muscleWeeks[0]?.perMuscle ?? {}
  const exIds = useMemo(() => {
    const count = new Map<string, number>()
    for (const s of finished) for (const e of s.exercises) if (e.sets.some((x) => x.kind === 'work' && x.completed)) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [finished])
  const [exSel, setExSel] = useState<string | null>(null)
  const sel = exSel ?? exIds[0] ?? null
  const allowE1rm = !profile || checkScope(profile).kind === 'adult'
  const trend = sel ? exerciseTrend(finished, sel, allowE1rm) : []
  const selEx = sel ? getExercise(sel) : undefined
  const hasDemo = finished.some((s) => s.isDemo)

  return (
    <>
      <header className="topbar"><h1 className="grow" style={{ fontSize: '1.6rem' }}>Progreso</h1></header>
      <main className="page">
        {finished.length === 0 ? (
          <div className="card empty">
            <ChartLine aria-hidden />
            <p>Cuando registres sesiones verás aquí tu constancia, tus series por músculo y la evolución de cada ejercicio.</p>
            <a className="btn soft" href={href('ajustes/demo')}>Ver con datos de ejemplo</a>
          </div>
        ) : (
          <>
            {hasDemo && <div className="note warn"><span className="badge demo">Ejemplo</span><span className="small">Incluye datos de ejemplo. Bórralos en Ajustes → Datos de ejemplo.</span></div>}
            <section className="card stack">
              <div className="row between"><h3>Constancia</h3><span className="small muted">{finished.length} {finished.length === 1 ? 'sesión' : 'sesiones'} en total</span></div>
              <WeekBars data={perWeek.map((w) => ({ week: w.week, value: w.count }))} label="Sesiones por semana" unit="sesiones" />
              <p className="tiny muted">Sesiones por semana en las últimas 12 semanas. Sin rachas: perder un día no borra nada.</p>
            </section>

            <section className="card stack">
              <h3>Series de trabajo por músculo</h3>
              <p className="tiny muted">Esta semana (lunes a domingo) contando series completadas: directas + media serie por trabajo indirecto (estimación). Entre paréntesis, la semana pasada. Marca: rango orientativo de tu nivel.</p>
              <div className="stack-sm">
                {MAJOR_MUSCLES.map((m) => {
                  const v = Math.round((thisWeek[m] ?? 0) * 10) / 10
                  const [lo, hi] = profile ? weeklyTarget(profile.level, m, profile.goal, profile.priorityMuscles.includes(m)) : [6, 10]
                  const scale = Math.max(16, hi + 2, v)
                  return (
                    <div key={m} className="vol-row">
                      <span>{MUSCLE_LABEL[m]}</span>
                      <div className="vol-track" role="img" aria-label={`${MUSCLE_LABEL[m]}: ${v} series esta semana; orientativo ${lo}–${hi}`}>
                        <div className="vol-fill" style={{ width: `${(v / scale) * 100}%` }} />
                        <div className="vol-target" style={{ left: `${(lo / scale) * 100}%`, width: `${((hi - lo) / scale) * 100}%` }} />
                      </div>
                      <span className="small num" style={{ textAlign: 'right' }}>{formatNumber(v)} <span className="muted">({formatNumber(Math.round((lastWeek[m] ?? 0) * 10) / 10)})</span></span>
                    </div>
                  )
                })}
              </div>
            </section>

            <MuscleRecencyCard sessions={finished} />

            {sel && (
              <section className="card stack">
                <div className="field">
                  <label htmlFor="exsel">Evolución de un ejercicio</label>
                  <select id="exsel" className="input" value={sel} onChange={(e) => setExSel(e.target.value)}>
                    {exIds.map((id) => <option key={id} value={id}>{getExercise(id)?.name ?? id}</option>)}
                  </select>
                </div>
                {trend.length >= 2 ? (
                  <LineChart
                    points={trend.map((t) => ({ x: t.date, y: selEx?.loadType === 'time' ? t.sec : selEx?.loadType === 'bodyweight' || selEx?.loadType === 'band' ? t.reps : t.topKg }))}
                    second={allowE1rm && trend.some((t) => t.e1rm) ? trend.map((t) => ({ x: t.date, y: t.e1rm })) : undefined}
                    yLabel={selEx?.loadType === 'time' ? 's' : selEx?.loadType === 'bodyweight' || selEx?.loadType === 'band' ? 'rep.' : 'kg'}
                    label={`Evolución de ${selEx?.name ?? ''}`}
                  />
                ) : (
                  <p className="small muted">Hace falta al menos 2 sesiones con este ejercicio para ver una tendencia.</p>
                )}
                <a className="btn soft small" style={{ alignSelf: 'flex-start' }} href={href(`ejercicios/${sel}`)}>Récords e historial del ejercicio</a>
                <p className="tiny muted">Solo se compara el mismo ejercicio y variante: los kilos de máquinas distintas o mancuernas frente a barra no se mezclan.</p>
              </section>
            )}

            <MonthCalendar sessions={finished} />
            <section className="stack-sm">
              <h2 className="section-title">Historial</h2>
              <div className="card flat list" style={{ padding: '0 12px' }}>
                {finished.slice(0, 60).map((s) => {
                  const sum = sessionWorkSummary(s)
                  return (
                    <a key={s.id} className="list-item" href={href(`progreso/sesion/${s.id}`)}>
                      <span className="grow stack-sm" style={{ gap: 2 }}>
                        <span style={{ fontWeight: 650 }}>{s.title}</span>
                        <span className="small muted">{formatDateShort(s.date)} · {sum.done} series{s.status === 'partial' ? ` de ${sum.planned}` : ''}</span>
                      </span>
                      {s.status === 'partial' && <span className="badge warn">Parcial</span>}
                      {s.isDemo && <span className="badge demo">Ejemplo</span>}
                      <ChevronRight size={18} aria-hidden />
                    </a>
                  )
                })}
              </div>
            </section>
          </>
        )}

        <h2 className="section-title">Cuerpo</h2>
        <BodyweightCard />
        <MeasurementsCard />
        <PhotosCard />
        <div className="note info"><Info aria-hidden /><span className="small">Ninguna app puede medir el músculo que ganas ni tu “recuperación” con estos datos. Aquí ves lo que sí se registra (cargas, series, medidas, fotos y días desde el último entrenamiento) y, en cada sesión, un <strong>rango aproximado</strong> de calorías.</span></div>
      </main>
    </>
  )
}

export function SessionDetailScreen({ sessionId }: { sessionId: string }) {
  const s = useLiveQuery(() => db().sessions.get(sessionId), [sessionId], null)
  const logs = useLiveQuery(() => db().changelog.where('entityId').equals(sessionId).toArray(), [sessionId], [])
  const all = useLiveQuery(() => db().sessions.toArray(), [], [] as Session[])
  const bw = useLiveQuery(() => db().bodyweight.toArray(), [], [])
  const [edit, setEdit] = useState<Session | null>(null)
  const [when, setWhen] = useState<{ date: string; hhmm: string; dur: number | null } | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  if (s === null) return null
  if (!s) return <main className="page"><p>Sesión no encontrada.</p><a className="btn" href={href('progreso')}>Volver</a></main>
  if (s.status === 'active') {
    go(`entreno/${s.id}`, true)
    return null
  }
  const view = edit ?? s
  const sum = sessionWorkSummary(view)
  const durMin = Math.max(1, Math.round(sessionMinutes(s)))
  const startEdit = () => {
    setEdit(structuredClone(s))
    const d = new Date(s.startedAt)
    setWhen({ date: s.date, hhmm: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, dur: durMin })
  }
  const saveEdit = async () => {
    if (!edit) return
    let next: Session = { ...edit, status: sessionWorkSummary(edit).done < sessionWorkSummary(edit).planned ? 'partial' : 'completed' }
    const changes: string[] = ['Sesión editada a mano']
    if (when && /^\d{4}-\d{2}-\d{2}$/.test(when.date)) {
      const d0 = new Date(s.startedAt)
      const hh0 = `${String(d0.getHours()).padStart(2, '0')}:${String(d0.getMinutes()).padStart(2, '0')}`
      const durChanged = when.dur !== null && when.dur !== durMin && when.dur > 0
      if (when.date !== s.date || when.hhmm !== hh0 || durChanged) {
        next = retimeSession(next, when.date, { hhmm: when.hhmm, durationMin: durChanged ? (when.dur as number) : undefined })
        if (when.date !== s.date) changes.push(`fecha cambiada de ${formatDateShort(s.date)} a ${formatDateShort(when.date)}`)
        if (when.hhmm !== hh0) changes.push(`hora de inicio ${when.hhmm}`)
        if (durChanged) changes.push(`duración ${when.dur} min`)
      }
    }
    await updateFinishedSession(next, changes.join('; '))
    setEdit(null)
    setWhen(null)
    toast('Cambios guardados')
  }
  const setVal = (ei: number, si: number, patch: Partial<SetEntry>) => setEdit((x) => { if (!x) return x; const c = structuredClone(x); c.exercises[ei].sets[si] = { ...c.exercises[ei].sets[si], ...patch }; return c })
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('progreso')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">Sesión</span>
        {!edit && (
          <button className="icon-btn" aria-label="Editar sesión" onClick={async () => { if (await confirm({ title: 'Editar sesión ya guardada', body: 'Puedes cambiar series, notas, fecha, hora y duración. Los cambios quedarán anotados en el registro de cambios de esta sesión.', confirm: 'Editar' })) startEdit() }}><Pencil /></button>
        )}
      </header>
      <main className="page">
        <div className="stack-sm">
          <div className="row wrap">
            {s.status === 'partial' && <span className="badge warn">Parcial</span>}
            {s.isDemo && <span className="badge demo">Ejemplo</span>}
            {s.rampApplied && <span className="badge suggest">Familiarización</span>}
            {s.backdated && <span className="badge">Registrada después</span>}
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>{s.title}</h1>
          <span className="small muted">{formatDateLong(s.date)} · {formatTime(s.startedAt)} · {durMin} min · {sum.done}/{sum.planned} series de trabajo</span>
        </div>
        {edit && when && (
          <section className="card stack-sm">
            <h3>Fecha, hora y duración</h3>
            <div className="row wrap">
              <label className="stack-sm grow" style={{ gap: 2 }}><span className="small">Fecha</span><input type="date" className="input" value={when.date} max={toLocalDate()} onChange={(ev) => setWhen({ ...when, date: ev.target.value })} /></label>
              <label className="stack-sm" style={{ gap: 2, width: 140 }}><span className="small">Hora de inicio</span><input type="time" className="input" value={when.hhmm} onChange={(ev) => setWhen({ ...when, hhmm: ev.target.value })} /></label>
              <label className="stack-sm" style={{ gap: 2, width: 110 }}><span className="small">Duración (min)</span><DecimalInput className="input" integer label="Duración en minutos" value={when.dur} onChange={(v) => setWhen({ ...when, dur: v })} max={600} /></label>
            </div>
          </section>
        )}
        {!edit && <SessionSummary s={s} all={all} bodyKg={bodyweightOn(bw, s.date)} minutes={durMin} />}
        {view.exercises.map((e, ei) => {
          let n = 0
          return (
            <section key={e.uid} className="card stack-sm">
              <div className="row between">
                <a href={href(`ejercicios/${e.exerciseId}`)} style={{ fontWeight: 700, color: 'inherit' }}>{e.nameSnapshot}</a>
                {e.painFlag && <span className="badge danger">Molestia</span>}
              </div>
              <div className="stack-sm">
                {e.sets.map((x, si) => {
                  if (x.kind === 'work') n++
                  const tag = x.kind === 'warmup' ? 'Calentamiento' : `Serie ${n}`
                  if (edit) {
                    return (
                      <div key={x.id} className="row" style={{ gap: 6 }}>
                        <span className="small" style={{ width: 92 }}>{tag}</span>
                        <DecimalInput label={`Peso ${tag}`} className="num-input" value={x.weightKg} onChange={(v) => setVal(ei, si, { weightKg: v })} placeholder="kg" />
                        <DecimalInput label={`Repeticiones ${tag}`} className="num-input" integer value={x.reps} onChange={(v) => setVal(ei, si, { reps: v })} placeholder="rep" />
                        <input type="checkbox" className="check" aria-label={`${tag} hecha`} checked={x.completed} onChange={(ev) => setVal(ei, si, { completed: ev.target.checked, completedAt: ev.target.checked ? x.completedAt ?? Date.now() : null })} />
                      </div>
                    )
                  }
                  return (
                    <div key={x.id} className={`row small ${x.completed ? '' : 'faint'}`}>
                      <span style={{ width: 110 }} className={x.kind === 'warmup' ? 'muted' : ''}>{tag}</span>
                      <span className="grow num">{setText(x, e.loadTypeSnapshot)}{x.rir !== null ? ` · RIR ${x.rir}` : ''}</span>
                      {!x.completed && <span className="badge">No hecha</span>}
                    </div>
                  )
                })}
              </div>
              {e.notes && <p className="small muted">“{e.notes}”</p>}
              {e.replacedFrom && <p className="tiny muted">Sustituyó a {getExercise(e.replacedFrom)?.name ?? e.replacedFrom}.</p>}
            </section>
          )
        })}
        {edit ? (
          <div className="stack-sm">
            <textarea className="input" aria-label="Notas de la sesión" value={edit.notes} onChange={(ev) => setEdit({ ...edit, notes: ev.target.value })} />
            <button className="btn primary big block" onClick={() => void saveEdit()}>Guardar cambios</button>
            <button className="btn ghost block" onClick={() => { setEdit(null); setWhen(null) }}>Cancelar</button>
          </div>
        ) : (
          <>
            {s.notes && <section className="card"><p className="small">{s.notes}</p></section>}
            {logs.length > 0 && (
              <details className="more card flat">
                <summary>Registro de cambios ({logs.length})</summary>
                <ul className="small" style={{ paddingLeft: 18 }}>{logs.sort((a, b) => b.at - a.at).map((l) => <li key={l.id}>{new Date(l.at).toLocaleString('es-ES')}: {l.summary}</li>)}</ul>
              </details>
            )}
            <button className="btn ghost danger block" onClick={async () => { if (!(await confirm({ title: '¿Borrar esta sesión?', body: 'Se eliminará del historial.', confirm: 'Borrar', danger: true }))) return; const removed = await deleteSession(s.id); go('progreso', true); if (removed) toast('Sesión borrada', { label: 'Deshacer', run: () => void restoreSession(removed) }, 8000) }}><Trash2 size={18} /> Borrar sesión</button>
          </>
        )}
      </main>
    </>
  )
}

/** Resumen al terminar: duración, series, repeticiones, calorías (rango), récords y comparación con la vez anterior. */
function SessionSummary({ s, all, bodyKg, minutes }: { s: Session; all: Session[]; bodyKg: number | null; minutes: number }) {
  const t = sessionTotals(s)
  const kcal = bodyKg && minutes >= 5 ? kcalRange(minutes, bodyKg) : null
  const recs = sessionRecords(s, all, formatNumber)
  const prev = previousComparable(s, all)
  const pt = prev ? sessionTotals(prev) : null
  const delta = (a: number, b: number) => (a === b ? 'igual' : `${a > b ? '+' : '−'}${Math.abs(a - b)}`)
  const lvl = readinessLevel(s.readiness)
  return (
    <section className="card stack" aria-label="Resumen de la sesión">
      <div className="summary-grid">
        <div><span className="tiny muted">Duración</span><strong className="num">{minutes} min</strong></div>
        <div><span className="tiny muted">Series</span><strong className="num">{t.sets}</strong></div>
        <div><span className="tiny muted">Repetic.</span><strong className="num">{t.reps}</strong></div>
        <div><span className="tiny muted">Ejercicios</span><strong className="num">{t.exercises}</strong></div>
      </div>
      <div className="row small" style={{ alignItems: 'flex-start' }}>
        <Flame size={18} className="faint" aria-hidden />
        {kcal ? (
          <span className="grow">Gasto estimado: <strong className="num">{formatNumber(kcal.lo)}–{formatNumber(kcal.hi)} kcal</strong> <span className="muted">(aprox., con {formatNumber(bodyKg)} kg y {minutes} min; incluye lo que gastarías en reposo)</span></span>
        ) : (
          <span className="grow muted">{bodyKg ? 'Sesión demasiado corta para estimar calorías.' : 'Anota tu peso corporal en Progreso para ver un rango aproximado de calorías.'}</span>
        )}
      </div>
      {recs.length > 0 && (
        <div className="stack-sm">
          <span className="label"><Trophy size={16} aria-hidden /> Récords en esta sesión</span>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {recs.map((r) => <li key={r.exerciseId}><strong>{r.name}</strong>: <span className="num">{r.rec.value}</span>, {r.rec.detail}</li>)}
          </ul>
        </div>
      )}
      {prev && pt && (
        <p className="small muted">Respecto a la vez anterior ({formatDateShort(prev.date)}): series {delta(t.sets, pt.sets)}, repeticiones {delta(t.reps, pt.reps)}.</p>
      )}
      {s.readiness && (
        <p className="small muted">Cómo llegabas: {READINESS_SCALES.sleep.label.toLowerCase()} {s.readiness.sleep}/5 · {READINESS_SCALES.energy.label.toLowerCase()} {s.readiness.energy}/5 · {READINESS_SCALES.soreness.label.toLowerCase()} {s.readiness.soreness}/5{lvl === 'low' ? ' (con menos margen)' : ''}.</p>
      )}
    </section>
  )
}

function setText(x: SetEntry, lt: Session['exercises'][number]['loadTypeSnapshot']): string {
  if (lt === 'time') return `${x.durationSec ?? '—'} s`
  const reps = x.reps ?? '—'
  if (lt === 'assisted') return `${reps} rep · asistencia ${formatNumber(x.assistKg ?? x.weightKg)} kg`
  if (lt === 'bodyweight') return `${reps} rep${x.addedKg ? ` · +${formatNumber(x.addedKg)} kg lastre` : ''}${x.assistKg ? ` · asistencia ${formatNumber(x.assistKg)} kg` : ''}`
  if (lt === 'band') return `${reps} rep${x.bandLabel ? ` · banda ${x.bandLabel}` : ''}`
  const unit = lt === 'dumbbell_each' ? ' kg c/u' : ' kg'
  return `${x.weightKg === null ? '—' : formatNumber(x.weightKg)}${unit} × ${reps}${x.side !== 'both' ? (x.side === 'left' ? ' (izq.)' : ' (dcho.)') : ''}`
}

/** Calendario mensual (semana de lunes a domingo) con las sesiones registradas. */
function MonthCalendar({ sessions }: { sessions: Session[] }) {
  const today = toLocalDate()
  const [month, setMonth] = useState(today.slice(0, 7))
  const first = `${month}-01`
  const start = weekStart(first)
  const [y, m] = month.split('-').map(Number)
  const label = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
  const byDate = new Map<string, Session[]>()
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s])
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i)).filter((d, i) => i < 35 || d.slice(0, 7) === month)
  const shift = (n: number) => { const d = new Date(y, m - 1 + n, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`) }
  return (
    <section className="card stack-sm" aria-label="Calendario de sesiones">
      <div className="row">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mes anterior"><ChevronLeft /></button>
        <h3 className="grow center" style={{ textTransform: 'capitalize' }}>{label}</h3>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Mes siguiente"><ChevronRight /></button>
      </div>
      <div className="week" style={{ gap: 4 }}>
        {WEEKDAY_SHORT.map((d) => <span key={d} className="tiny muted center">{d}</span>)}
        {cells.map((d) => {
          const list = byDate.get(d) ?? []
          const inMonth = d.slice(0, 7) === month
          const status = list.some((s) => s.status === 'completed') ? 'done' : list.length ? 'partial' : 'none'
          const content = (
            <>
              <span className="tiny">{Number(d.slice(8))}</span>
              <span className={`dot ${status}`} style={{ width: 14, height: 14 }} />
            </>
          )
          const style = { minHeight: 48, padding: '4px 0', opacity: inMonth ? 1 : 0.4, gap: 2 } as const
          return list.length ? (
            <a key={d} className={`d ${d === today ? 'today' : ''}`} style={{ ...style, textDecoration: 'none' }} href={href(`progreso/sesion/${list[0].id}`)} aria-label={`${d}: ${list.length} sesión${list.length > 1 ? 'es' : ''}`}>{content}</a>
          ) : (
            <div key={d} className={`d ${d === today ? 'today' : ''}`} style={style} aria-hidden>{content}</div>
          )
        })}
      </div>
    </section>
  )
}
