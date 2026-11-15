import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, Check, ChevronRight, Clock, Dumbbell, HardDriveDownload, Info, Play, Repeat, Settings, SkipForward, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { familiarizationStatus, getMeta, getRoutineBundle, localDateTime, nextRoutineDay, plannedForWeek, resumeSession, sessionWorkSummary, setMeta, setPartialAction, startFreeSession, startSessionFromDay } from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { BUDGET_REGIONS, REGION_LABEL, directRegions } from '../../domain/engine/contribution'
import { familiarizationPreview } from '../../domain/engine/generator'
import { lastTrainedByRegion } from '../../domain/records'
import { durationText } from '../../domain/engine/analysis'
import type { ScheduleOverride, Session } from '../../domain/types'
import type { Region, RoutineExercise } from '../../domain/types'
import { WEEKDAY_NAME, WEEKDAY_SHORT, addDays, daysBetween, formatDateLong, formatDateShort, toLocalDate, weekStart, weekdayMon0 } from '../../domain/util'
import { DecimalInput } from '../components/inputs'
import { Sheet, useToast } from '../components/overlay'
import { useNow } from '../hooks'
import { requestPersistence } from '../pwa'
import { go, href } from '../router'
import { TodayProgramCards, useProgram } from './Phase'
import { useAdoptionPending } from './Adoption'
import { applyFamiliarization } from '../../domain/engine/prescription'

export function TodayScreen() {
  const { currentRoutineId, activeSession } = useApp()
  const today = toLocalDate()
  const bundle = useLiveQuery(async () => (currentRoutineId ? await getRoutineBundle(currentRoutineId) : null), [currentRoutineId])
  const sessions = useLiveQuery(() => db().sessions.toArray(), [], [] as Session[])
  const overrides = useLiveQuery(async () => (currentRoutineId ? await db().overrides.where('routineId').equals(currentRoutineId).toArray() : []), [currentRoutineId], [] as ScheduleOverride[])
  const backupInfo = useLiveQuery(async () => ({ last: await getMeta<number | null>('lastBackupAt', null), since: await getMeta<number>('sessionsSinceBackup', 0) }), [])
  const [busy, setBusy] = useState(false)
  const [pickDay, setPickDay] = useState(false)
  const [past, setPast] = useState<{ date: string; hhmm: string; dur: number | null; what: string } | null>(null)
  const toast = useToast()
  const now = useNow(30000)

  useEffect(() => {
    // Pedir almacenamiento persistente una vez (no garantiza que nunca se borre).
    void (async () => {
      if (await getMeta('persistRequested', false)) return
      await setMeta('persistRequested', true)
      await requestPersistence()
    })()
  }, [])

  const done = sessions.filter((s) => s.status === 'completed' || s.status === 'partial')
  const next = bundle ? nextRoutineDay(bundle.version, done, bundle.routine.id, today) : null
  const wk = weekStart(today)
  const planned = bundle ? plannedForWeek(bundle.version, wk, overrides) : []
  const todayPlanned = planned.find((p) => p.date === today)
  const nextPlannedDate = planned.find((p) => p.date > today)?.date
  const inRamp = bundle && bundle.version.rampWeeks > 0 && Math.floor(daysBetween(bundle.routine.startedOn, today) / 7) < bundle.version.rampWeeks
  const hasDemo = sessions.some((s) => s.isDemo)
  const isFirst = !!bundle && !done.some((s) => s.routineId === bundle.routine.id)

  const start = async (dayId: string) => {
    if (!bundle || busy) return
    setBusy(true)
    try {
      const s = await startSessionFromDay(bundle.routine.id, dayId, today)
      go(`entreno/${s.id}`)
    } catch (e) {
      toast(`No se pudo empezar: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const startPast = async () => {
    if (!past || busy || !past.date || past.date > today) return
    setBusy(true)
    try {
      const dur = Math.max(5, Math.min(600, past.dur ?? 60))
      const opts = { startedAt: localDateTime(past.date, past.hhmm), durationMin: dur }
      const s = past.what === 'free' || !bundle ? await startFreeSession(past.date, opts) : await startSessionFromDay(bundle.routine.id, past.what, past.date, opts)
      setPast(null)
      go(`entreno/${s.id}`)
    } catch (e) {
      toast(`No se pudo crear: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }
  const last = lastTrainedByRegion(done)
  const nextRegions = next ? [...new Set(next.exercises.flatMap((e) => directRegions(e.exerciseId)))].filter((m): m is Region => BUDGET_REGIONS.includes(m) || m === 'glutes') : []
  // Sesión parcial más reciente de la rutina actual sin decisión tomada: se muestra PRIMERO (5.4).
  const lastFinished = done.filter((s) => !s.isDemo).sort((a, b) => b.startedAt - a.startedAt)[0]
  const openPartial = !activeSession && lastFinished?.status === 'partial' && !lastFinished.partialAction ? lastFinished : null
  const fam = bundle ? familiarizationStatus(bundle.version, sessions, bundle.routine.id) : null
  const { view: program, state: programState } = useProgram()
  const adoptPending = useAdoptionPending(bundle?.routine, bundle?.version)
  const inProgression = !!programState.progressionSince
  const famShown = inProgression ? null : fam
  const extended = !famShown && !inProgression && !!programState.extendLearning && !!bundle?.version.familiarization
  const readapt = !famShown && !extended ? program?.readaptation.active ?? null : null

  const showBackup = backupInfo && done.filter((s) => !s.isDemo).length > 0 && (backupInfo.since >= 4 || (backupInfo.last !== null && now - backupInfo.last > 14 * 86400000 && backupInfo.since > 0) || (backupInfo.last === null && backupInfo.since >= 2))

  return (
    <>
      <header className="topbar">
        <div className="grow">
          <div className="small muted">{formatDateLong(today)}</div>
          <h1 style={{ fontSize: '1.7rem' }}>Hoy</h1>
        </div>
        <a className="icon-btn" href={href('ajustes')} aria-label="Ajustes"><Settings /></a>
      </header>
      <main className="page">
        <TodayProgramCards hasActive={!!activeSession} />
        {!activeSession && toughStreak(done) && bundle && (
          <section className="note info" aria-label="Sesiones muy duras">
            <Info aria-hidden />
            <span className="small">Tus últimos entrenamientos los marcaste como muy duros o con molestias que limitaban. Si quieres, revisa el descanso, la carga o la dosis de tu rutina (<a href={href(`rutinas/${bundle.routine.id}/editar`)}>editar</a>). Forja no añade series ni programa descargas por su cuenta; si una molestia persiste, consulta a un profesional.</span>
          </section>
        )}
        {openPartial && (
          <section className="card stack" aria-label="Sesión parcial">
            <span className="small muted">Sesión parcial · {formatDateShort(openPartial.date)}</span>
            <div className="hero-day" style={{ fontSize: '1.3rem' }}>{openPartial.title}</div>
            <span className="small">Hiciste {sessionWorkSummary(openPartial).done} de {sessionWorkSummary(openPartial).planned} series de trabajo. Todo lo hecho está guardado. ¿Qué prefieres?</span>
            <button className="btn primary block" disabled={busy} onClick={async () => { try { const s = await resumeSession(openPartial.id); go(`entreno/${s.id}`) } catch (e) { toast((e as Error).message) } }}><Play size={18} /> Retomar lo pendiente</button>
            <div className="row">
              <button className="btn soft small grow" onClick={() => void setPartialAction(openPartial.id, 'next')}><SkipForward size={16} /> Cerrar y pasar a la siguiente</button>
              <button className="btn soft small grow" onClick={() => void setPartialAction(openPartial.id, 'repeat')}><Repeat size={16} /> Repetir esta sesión otro día</button>
            </div>
            <span className="tiny muted">Retomar continúa la misma sesión (no duplica series ni récords). Repetir propondrá este mismo día como siguiente sesión, que será nueva.</span>
          </section>
        )}
        {activeSession ? (
          <section className="card accent stack">
            <span className="small muted">Entrenamiento en curso</span>
            <div className="hero-day">{activeSession.title}</div>
            <span className="small muted"><Clock size={14} aria-hidden /> {activeSession.backdated ? `Registro a posteriori del ${formatDateShort(activeSession.date)}` : `Empezado hace ${Math.max(1, Math.round((now - activeSession.startedAt - activeSession.pausedTotalMs) / 60000))} min${activeSession.pausedAt ? ' · en pausa' : ''}`}</span>
            <a className="btn big block" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0 }} href={href(`entreno/${activeSession.id}`)}>
              <Play size={20} /> Continuar
            </a>
          </section>
        ) : bundle && next ? (
          <section className="card stack">
            <span className="small muted">{isFirst ? 'Primera sesión de la rutina' : todayPlanned ? 'Hoy está planificado' : 'Siguiente sesión'}</span>
            <div className="hero-day">{next.name}</div>
            <a className="small" href={href(`rutinas/${bundle.routine.id}`)} style={{ alignSelf: 'flex-start' }}>{bundle.routine.name}</a>
            {adoptPending && <a className="tiny" href={href(`rutinas/${bundle.routine.id}`)} style={{ alignSelf: 'flex-start' }}>Hay nuevas opciones para revisar tu rutina</a>}
            <span className="small muted">
              {next.exercises.length} ejercicios · {famShown || extended || readapt ? `hoy ${durationText({ ...next, exercises: next.exercises.map((e) => ({ ...e, technique: undefined, prescription: applyFamiliarization(e.prescription, getExercise(e.exerciseId)) })) })} (adaptación) · plan base ${durationText(next)}` : durationText(next)}
              {!todayPlanned && nextPlannedDate ? ` · planificada el ${WEEKDAY_NAME[weekdayMon0(nextPlannedDate)]}, pero puedes hacerla hoy` : ''}
            </span>
            {famShown ? (
              <span className="stack-sm" style={{ gap: 2 }}>
                <span className="badge suggest" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>{bundle.version.familiarization?.reason === 'returning' ? 'Adaptación tras la pausa' : 'Aprendizaje'}: día válido {famShown.index} de {famShown.total}</span>
                <span className="small" data-testid="adaptation-line">Hoy: adaptación · {seriesText(next.exercises, true)}. Plan base después: {seriesText(next.exercises, false)}. {famShown.total - famShown.completed === 1 ? 'Te queda 1 día válido' : `Te quedan ${famShown.total - famShown.completed} días válidos`}: tu avance depende de días válidos, no de que pase una semana.</span>
              </span>
            ) : extended ? (
              <span className="badge suggest" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>Aprendizaje prolongado: mitad de series y RIR 3–4</span>
            ) : readapt ? (
              <span className="badge suggest" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>Readaptación: sesión {readapt.index} de {readapt.total} · mitad de series y RIR 3–4</span>
            ) : !bundle.version.familiarization && inRamp && !inProgression && <span className="badge suggest" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>Semana de familiarización: una serie menos y más margen</span>}
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
              {next.exercises.slice(0, 6).map((e) => <li key={e.uid}>{nameOf(e.exerciseId)}{famShown || extended || readapt ? ` · hoy ${familiarizationPreview(e).today.split(' · ')[0]}` : e.technique ? ` · con bloque ${e.technique.method === 'drop' ? 'descendente' : 'rest-pause'}` : ''}</li>)}
              {next.exercises.length > 6 && <li>y {next.exercises.length - 6} más</li>}
            </ul>
            {done.length > 0 && nextRegions.length > 0 && (
              <span className="tiny muted">Última vez: {nextRegions.map((m) => `${REGION_LABEL[m].toLowerCase()} ${last[m] ? agoShort(daysBetween(last[m] as string, today)) : '(nunca)'}`).join(' · ')}</span>
            )}
            <button className="btn primary big block" disabled={busy || next.exercises.length === 0} onClick={() => void start(next.id)}>
              <Play size={20} /> Empezar
            </button>
            {next.exercises.length === 0 && <span className="small muted">Este día no tiene ejercicios. Edita la rutina para añadirlos.</span>}
            <div className="row">
              <button className="btn ghost small grow" onClick={() => setPickDay(true)}>Otro día de la rutina</button>
              <button className="btn ghost small grow" disabled={busy} onClick={async () => { const s = await startFreeSession(); go(`entreno/${s.id}`) }}>Sesión libre</button>
            </div>
          </section>
        ) : (
          <section className="card stack">
            <Dumbbell className="faint" aria-hidden />
            <h2>Elige cómo empezar</h2>
            <p className="muted small">Te proponemos una rutina según tu perfil, o eliges una plantilla. También puedes registrar una sesión libre.</p>
            <a className="btn primary big block" href={href('rutinas/generar')}><Wand2 size={20} /> Ver mi propuesta</a>
            <div className="row">
              <a className="btn soft grow" href={href('rutinas/plantillas')}>Plantillas</a>
              <button className="btn soft grow" onClick={async () => { const s = await startFreeSession(); go(`entreno/${s.id}`) }}>Sesión libre</button>
            </div>
          </section>
        )}

        <section className="stack-sm" aria-label="Semana">
          <h2 className="section-title">Esta semana</h2>
          <div className="week">
            {WEEKDAY_SHORT.map((d, i) => {
              const date = addDays(wk, i)
              const doneHere = done.filter((s) => s.date === date)
              const isPlanned = planned.some((p) => p.date === date)
              const status = doneHere.some((s) => s.status === 'completed') ? 'done' : doneHere.length ? 'partial' : isPlanned ? 'planned' : 'none'
              const label = `${WEEKDAY_NAME[i]}: ${status === 'done' ? 'entrenado' : status === 'partial' ? 'sesión parcial' : status === 'planned' ? 'planificado' : 'libre'}`
              return (
                <div key={d} className={`d ${date === today ? 'today' : ''}`} aria-label={label} role="img">
                  <span>{d}</span>
                  <span className={`dot ${status}`}>{status === 'done' && <Check aria-hidden />}</span>
                </div>
              )
            })}
          </div>
          <span className="tiny muted">Círculo naranja: planificado · verde: hecho · amarillo: parcial. Sin rachas: lo que cuenta es la constancia a medio plazo.</span>
        </section>

        {!activeSession && (
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => setPast({ date: addDays(today, -1), hhmm: '18:00', dur: 60, what: next?.id ?? 'free' })}>
            <CalendarPlus size={16} /> Registrar una sesión pasada
          </button>
        )}

        {showBackup && (
          <a className="card tight row" href={href('ajustes/copias')} style={{ textDecoration: 'none', color: 'inherit' }}>
            <HardDriveDownload className="faint" aria-hidden />
            <span className="grow small"><strong>Haz una copia de tus datos.</strong> Están solo en este dispositivo{backupInfo?.since ? ` y llevas ${backupInfo.since} sesiones sin copia` : ''}.</span>
            <ChevronRight size={18} aria-hidden />
          </a>
        )}
        {hasDemo && (
          <a className="card tight row" href={href('ajustes/demo')} style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="badge demo">Ejemplo</span>
            <span className="grow small">Hay datos de ejemplo cargados. Se pueden borrar sin tocar los tuyos.</span>
            <ChevronRight size={18} aria-hidden />
          </a>
        )}
      </main>
      <Sheet open={!!past} onClose={() => setPast(null)} title="Registrar una sesión pasada">
        {past && (
          <div className="stack">
            <p className="small muted">Para anotar un entrenamiento que hiciste sin la app. No hay cronómetro: indica cuándo fue y cuánto duró.</p>
            <div className="row wrap">
              <label className="stack-sm grow" style={{ gap: 2 }}><span className="small">Fecha</span><input type="date" className="input" value={past.date} max={today} onChange={(ev) => setPast({ ...past, date: ev.target.value })} /></label>
              <label className="stack-sm" style={{ gap: 2, width: 140 }}><span className="small">Hora de inicio</span><input type="time" className="input" value={past.hhmm} onChange={(ev) => setPast({ ...past, hhmm: ev.target.value })} /></label>
              <label className="stack-sm" style={{ gap: 2, width: 110 }}><span className="small">Duración (min)</span><DecimalInput className="input" integer label="Duración en minutos" value={past.dur} onChange={(v) => setPast({ ...past, dur: v })} max={600} /></label>
            </div>
            <div className="field">
              <label htmlFor="pastwhat">Qué hiciste</label>
              <select id="pastwhat" className="input" value={past.what} onChange={(ev) => setPast({ ...past, what: ev.target.value })}>
                {bundle?.version.days.map((d) => <option key={d.id} value={d.id}>{d.name} ({bundle.routine.name})</option>)}
                <option value="free">Sesión libre (eliges los ejercicios)</option>
              </select>
            </div>
            {past.date > today && <p className="small" role="alert">La fecha no puede ser futura.</p>}
            <button className="btn primary big block" disabled={busy || !past.date || past.date > today} onClick={() => void startPast()}>Empezar a anotar</button>
          </div>
        )}
      </Sheet>
      <Sheet open={pickDay} onClose={() => setPickDay(false)} title="Elegir día de la rutina">
        <div className="list">
          {bundle?.version.days.map((d) => (
            <button key={d.id} className="list-item" onClick={() => { setPickDay(false); void start(d.id) }}>
              <span className="grow"><strong>{d.name}</strong><br /><span className="small muted">{d.exercises.length} ejercicios · {durationText(d)}</span></span>
              <Play size={18} aria-hidden />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function agoShort(d: number): string {
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} d`
}

function nameOf(id: string): string {
  return getExercise(id)?.name ?? id
}

/** Total de series de trabajo de la sesión: con la dosis de adaptación (max(1, mitad)) o con el plan base. */
function seriesText(exs: RoutineExercise[], adapted: boolean): string {
  const n = exs.reduce((a, e) => a + (adapted ? Math.max(1, Math.ceil(e.prescription.sets / 2)) : e.prescription.sets), 0)
  return `${n} ${n === 1 ? 'serie' : 'series'} de trabajo`
}

/** Dos de las tres últimas sesiones marcadas como muy duras o con molestia limitante (dato declarado, no diagnóstico). */
function toughStreak(done: Session[]): boolean {
  const last = [...done].filter((s) => !s.isDemo).sort((a, b) => b.startedAt - a.startedAt).slice(0, 3)
  return last.filter((s) => s.tolerance?.difficulty === 'very_hard' || s.tolerance?.limitingDiscomfort === true).length >= 2
}
