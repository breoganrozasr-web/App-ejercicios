import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight, Clock, Dumbbell, HardDriveDownload, Play, Settings, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { getMeta, getRoutineBundle, nextRoutineDay, plannedForWeek, setMeta, startFreeSession, startSessionFromDay } from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { dayDuration } from '../../domain/engine/analysis'
import type { ScheduleOverride, Session } from '../../domain/types'
import { WEEKDAY_NAME, WEEKDAY_SHORT, addDays, daysBetween, formatDateLong, toLocalDate, weekStart, weekdayMon0 } from '../../domain/util'
import { Sheet, useToast } from '../components/overlay'
import { useNow } from '../hooks'
import { requestPersistence } from '../pwa'
import { go, href } from '../router'

export function TodayScreen() {
  const { currentRoutineId, activeSession } = useApp()
  const today = toLocalDate()
  const bundle = useLiveQuery(async () => (currentRoutineId ? await getRoutineBundle(currentRoutineId) : null), [currentRoutineId])
  const sessions = useLiveQuery(() => db().sessions.toArray(), [], [] as Session[])
  const overrides = useLiveQuery(async () => (currentRoutineId ? await db().overrides.where('routineId').equals(currentRoutineId).toArray() : []), [currentRoutineId], [] as ScheduleOverride[])
  const backupInfo = useLiveQuery(async () => ({ last: await getMeta<number | null>('lastBackupAt', null), since: await getMeta<number>('sessionsSinceBackup', 0) }), [])
  const [busy, setBusy] = useState(false)
  const [pickDay, setPickDay] = useState(false)
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
        {activeSession ? (
          <section className="card accent stack">
            <span className="small muted">Entrenamiento en curso</span>
            <div className="hero-day">{activeSession.title}</div>
            <span className="small muted"><Clock size={14} aria-hidden /> Empezado hace {Math.max(1, Math.round((now - activeSession.startedAt - activeSession.pausedTotalMs) / 60000))} min{activeSession.pausedAt ? ' · en pausa' : ''}</span>
            <a className="btn big block" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', border: 0 }} href={href(`entreno/${activeSession.id}`)}>
              <Play size={20} /> Continuar
            </a>
          </section>
        ) : bundle && next ? (
          <section className="card stack">
            <span className="small muted">{isFirst ? 'Primera sesión de la rutina' : todayPlanned ? 'Hoy está planificado' : 'Siguiente sesión'}</span>
            <div className="hero-day">{next.name}</div>
            <a className="small" href={href(`rutinas/${bundle.routine.id}`)} style={{ alignSelf: 'flex-start' }}>{bundle.routine.name}</a>
            <span className="small muted">
              {next.exercises.length} ejercicios · ≈{dayDuration(next).minutes} min
              {!todayPlanned && nextPlannedDate ? ` · planificada el ${WEEKDAY_NAME[weekdayMon0(nextPlannedDate)]}, pero puedes hacerla hoy` : ''}
            </span>
            {inRamp && <span className="badge suggest" style={{ alignSelf: 'flex-start' }}>Semana de familiarización: una serie menos y más margen</span>}
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
              {next.exercises.slice(0, 6).map((e) => <li key={e.uid}>{nameOf(e.exerciseId)}</li>)}
              {next.exercises.length > 6 && <li>y {next.exercises.length - 6} más</li>}
            </ul>
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
      <Sheet open={pickDay} onClose={() => setPickDay(false)} title="Elegir día de la rutina">
        <div className="list">
          {bundle?.version.days.map((d) => (
            <button key={d.id} className="list-item" onClick={() => { setPickDay(false); void start(d.id) }}>
              <span className="grow"><strong>{d.name}</strong><br /><span className="small muted">{d.exercises.length} ejercicios · ≈{dayDuration(d).minutes} min</span></span>
              <Play size={18} aria-hidden />
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}

function nameOf(id: string): string {
  return getExercise(id)?.name ?? id
}
