import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, CircleHelp, Copy, Ellipsis, HeartPulse, Lightbulb, Link2, Pause, Play, Plus, Repeat, SkipForward, StickyNote, Trash2, TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { deleteSession, finishSession, makeSessionExercise, newSet, restoreSession, saveSession, sessionWorkSummary } from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { LOAD_LABEL } from '../../domain/catalog/exercises'
import { prescriptionFor } from '../../domain/engine/generator'
import { describePrescription, describeRir } from '../../domain/engine/prescription'
import { historyFor, suggestNext, type Suggestion } from '../../domain/engine/progression'
import { progressionAllowed } from '../../domain/engine/scope'
import { DEFAULT_INCREMENTS } from '../../domain/profile'
import type { LoadType, Session, SessionExercise, SetEntry } from '../../domain/types'
import { formatDateShort, formatDuration, formatNumber, newId, toLocalDate } from '../../domain/util'
import { DemoPlayer } from '../components/DemoPlayer'
import { DecimalInput } from '../components/inputs'
import { Sheet, useConfirm, useToast } from '../components/overlay'
import { ExercisePicker } from '../components/RoutineParts'
import { useNow } from '../hooks'
import { go } from '../router'
import { restDoneAlert, unlockAudio } from '../sound'

type Upd = (f: (s: Session) => Session, undoLabel?: string) => void

export function WorkoutScreen({ sessionId }: { sessionId?: string }) {
  const loaded = useLiveQuery(async () => (sessionId ? ((await db().sessions.get(sessionId)) ?? undefined) : undefined), [sessionId], null as Session | undefined | null)
  if (loaded === null) return <div className="page" aria-busy="true" />
  if (!loaded) {
    return (
      <main className="page">
        <p>No se encontró la sesión.</p>
        <button className="btn" onClick={() => go('hoy', true)}>Ir a Hoy</button>
      </main>
    )
  }
  if (loaded.status !== 'active') {
    go(`progreso/sesion/${loaded.id}`, true)
    return null
  }
  return <ActiveWorkout key={loaded.id} initial={loaded} />
}

function ActiveWorkout({ initial }: { initial: Session }) {
  const { profile } = useApp()
  const [s, setS] = useState<Session>(initial)
  const sRef = useRef(s)
  sRef.current = s
  const toast = useToast()
  const confirm = useConfirm()
  const now = useNow(1000)
  const finished = useLiveQuery(() => db().sessions.where('status').anyOf('completed', 'partial').toArray(), [], [] as Session[])
  const settings = useLiveQuery(() => db().exerciseSettings.toArray(), [], [])
  const [demoFor, setDemoFor] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ replaceUid?: string } | null>(null)
  const [rirFor, setRirFor] = useState<{ exUid: string; setId: string } | null>(null)
  const [setMenu, setSetMenu] = useState<{ exUid: string; setId: string } | null>(null)
  const [exMenu, setExMenu] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(0)
  const alerted = useRef<string | null>(null)

  /** Toda modificación pasa por aquí: estado local + guardado inmediato en IndexedDB (serializado). */
  const update = useCallback<Upd>((f, undoLabel) => {
    const prev = sRef.current
    const next = f(structuredClone(prev))
    sRef.current = next
    setS(next)
    void saveSession(next).catch(() => toast('No se pudo guardar. Comprueba el espacio del dispositivo.'))
    if (undoLabel) {
      toast(undoLabel, {
        label: 'Deshacer',
        run: () => {
          sRef.current = prev
          setS(prev)
          void saveSession(prev)
        },
      })
    }
  }, [toast])

  // Guardado de seguridad al ocultar/cerrar la app.
  useEffect(() => {
    const flush = () => void saveSession(sRef.current)
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  const increments = profile?.increments ?? DEFAULT_INCREMENTS
  const allowProg = profile ? progressionAllowed(profile) : true
  const today = toLocalDate()
  const elapsedMs = now - s.startedAt - s.pausedTotalMs - (s.pausedAt ? now - s.pausedAt : 0)
  const currentUid = s.exercises.find((e) => e.sets.some((x) => x.kind === 'work' && !x.completed))?.uid

  // Descanso: calculado con marcas temporales (sobrevive a bloqueos y recargas).
  const restRemaining = s.rest ? Math.round((s.rest.startedAt + s.rest.durationSec * 1000 - now) / 1000) : null
  useEffect(() => {
    if (s.rest && restRemaining !== null && restRemaining <= 0 && alerted.current !== `${s.rest.startedAt}`) {
      alerted.current = `${s.rest.startedAt}`
      if (document.visibilityState === 'visible') restDoneAlert()
    }
  }, [restRemaining, s.rest])

  const updEx = (uid: string, f: (e: SessionExercise) => SessionExercise, undo?: string) => update((x) => ({ ...x, exercises: x.exercises.map((e) => (e.uid === uid ? f(e) : e)) }), undo)
  const updSet = (exUid: string, setId: string, patch: Partial<SetEntry>) => updEx(exUid, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) }))

  const toggleDone = (e: SessionExercise, set: SetEntry, placeholder: Partial<SetEntry>) => {
    unlockAudio()
    if (set.completed) {
      updSet(e.uid, set.id, { completed: false, completedAt: null })
      return
    }
    const fill: Partial<SetEntry> = {}
    let filled = false
    for (const k of ['weightKg', 'reps', 'durationSec', 'assistKg'] as const) {
      if (set[k] === null && placeholder[k] !== undefined && placeholder[k] !== null) {
        fill[k] = placeholder[k] as number
        filled = true
      }
    }
    const restSec = settings.find((x) => x.exerciseId === e.exerciseId)?.restSec ?? (set.kind === 'warmup' ? 60 : e.prescription?.restSec ?? 90)
    update((x) => ({
      ...x,
      exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, sets: ee.sets.map((ss) => (ss.id === set.id ? { ...ss, ...fill, completed: true, completedAt: Date.now() } : ss)) } : ee)),
      rest: { startedAt: Date.now(), durationSec: restSec, setId: set.id },
    }), filled ? 'Serie completada con los valores propuestos: revísalos si no coinciden' : undefined)
  }

  const addSet = (e: SessionExercise, kind: 'work' | 'warmup' = 'work') => {
    const t = Date.now()
    if (t - lock.current < 350) return // evita duplicados por doble toque
    lock.current = t
    const last = [...e.sets].reverse().find((x) => x.kind === kind) ?? e.sets[e.sets.length - 1]
    updEx(e.uid, (ee) => ({ ...ee, sets: kind === 'warmup' ? [newSet('warmup', last), ...ee.sets] : [...ee.sets, newSet(kind, last)] }))
  }

  const finish = async () => {
    if (busy) return
    const { planned, done } = sessionWorkSummary(sRef.current)
    let status: 'completed' | 'partial' = 'completed'
    if (done === 0) {
      const r = await confirm({ title: 'No hay series completadas', body: 'Puedes descartar la sesión o seguir entrenando.', confirm: 'Descartar sesión', danger: true, cancel: 'Seguir entrenando' })
      if (r) await discard(true)
      return
    }
    if (done < planned) {
      const r = await confirm({
        title: 'Faltan series por completar',
        body: `Has completado ${done} de ${planned} series de trabajo. Se guardará como sesión parcial: lo hecho queda registrado y las series vacías se marcan como no hechas.`,
        confirm: 'Guardar como parcial',
        cancel: 'Seguir entrenando',
      })
      if (!r) return
      status = 'partial'
    } else {
      const r = await confirm({ title: 'Terminar entrenamiento', body: `${done} series de trabajo completadas.`, confirm: 'Terminar y guardar', cancel: 'Seguir' })
      if (!r) return
    }
    setBusy(true)
    try {
      const saved = await finishSession(sRef.current, status)
      toast(status === 'partial' ? 'Sesión guardada como parcial' : 'Sesión guardada')
      go(`progreso/sesion/${saved.id}`, true)
    } finally {
      setBusy(false)
    }
  }

  const discard = async (skipConfirm = false) => {
    if (!skipConfirm && !(await confirm({ title: '¿Descartar la sesión?', body: 'Se borrará este entrenamiento y lo que hayas anotado en él.', confirm: 'Descartar', danger: true }))) return
    const removed = await deleteSession(sRef.current.id)
    go('hoy', true)
    if (removed) toast('Sesión descartada', { label: 'Deshacer', run: () => void restoreSession(removed).then(() => go(`entreno/${removed.id}`)) }, 8000)
  }

  const togglePause = () => update((x) => (x.pausedAt ? { ...x, pausedTotalMs: x.pausedTotalMs + (Date.now() - x.pausedAt), pausedAt: null } : { ...x, pausedAt: Date.now() }))

  const replaceExercise = (uid: string, newExId: string) => {
    if (!profile) return
    update((x) => {
      const idx = x.exercises.findIndex((e) => e.uid === uid)
      if (idx < 0) return x
      const old = x.exercises[idx]
      const role = (old.prescription?.warmupSets ?? 0) >= 2 ? 'main' : getExercise(newExId)?.category === 'compound' ? 'secondary' : 'accessory'
      const p = prescriptionFor(newExId, role, profile)
      const fresh = makeSessionExercise(newExId, p ? { ...p, sets: old.prescription?.sets ?? p.sets } : null, old.superset)
      fresh.replacedFrom = old.exerciseId
      const hasDone = old.sets.some((st) => st.completed)
      const list = [...x.exercises]
      if (hasDone) {
        // Lo hecho se conserva con el ejercicio original; el sustituto continúa con las series restantes.
        list[idx] = { ...old, sets: old.sets.filter((st) => st.completed) }
        fresh.sets = fresh.sets.filter((st) => st.kind === 'work').slice(0, Math.max(1, old.sets.filter((st) => st.kind === 'work' && !st.completed).length))
        list.splice(idx + 1, 0, fresh)
      } else list[idx] = fresh
      return { ...x, exercises: list }
    }, `Sustituido por ${getExercise(newExId)?.name ?? newExId}`)
  }

  return (
    <>
      <header className="wk-head">
        <div className="row" style={{ maxWidth: 600, margin: '0 auto' }}>
          <button className="icon-btn" onClick={() => go('hoy')} aria-label="Volver a Hoy (la sesión sigue abierta)"><ArrowLeft /></button>
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 720, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
            <div className="small muted num" aria-live="off">
              {formatDuration(elapsedMs / 1000)} {s.pausedAt ? '· en pausa' : ''} {s.rampApplied ? '· familiarización' : ''}
            </div>
          </div>
          <button className="icon-btn soft" onClick={togglePause} aria-label={s.pausedAt ? 'Reanudar' : 'Pausar'}>{s.pausedAt ? <Play /> : <Pause />}</button>
          <button className="btn primary small" disabled={busy} onClick={() => void finish()}>Terminar</button>
        </div>
      </header>
      <main className="page full" style={{ paddingTop: 12 }}>
        {s.pausedAt && (
          <div className="note info"><Pause aria-hidden /><span className="small">Sesión en pausa. Tus datos están guardados; puedes cerrar la app y volver.</span></div>
        )}
        {s.exercises.length === 0 && (
          <div className="card empty">
            <p>Sesión libre: añade el primer ejercicio.</p>
          </div>
        )}
        {s.exercises.map((e, i) => (
          <ExerciseBlock
            key={e.uid}
            e={e}
            index={i}
            current={e.uid === currentUid}
            history={historyFor(e.exerciseId, finished, undefined, s.id)}
            suggestion={e.prescription ? suggestNext({ exerciseId: e.exerciseId, prescription: e.prescription, history: historyFor(e.exerciseId, finished, undefined, s.id), increments, incrementOverride: settings.find((x) => x.exerciseId === e.exerciseId)?.incrementKg, today, progressionAllowed: allowProg }) : null}
            onDemo={() => setDemoFor(e.exerciseId)}
            onMenu={() => setExMenu(e.uid)}
            onToggle={toggleDone}
            onSet={(setId, patch) => updSet(e.uid, setId, patch)}
            onAddSet={() => addSet(e)}
            onRir={(setId) => setRirFor({ exUid: e.uid, setId })}
            onSetMenu={(setId) => setSetMenu({ exUid: e.uid, setId })}
            onFill={(fill) => updEx(e.uid, (ee) => ({ ...ee, sets: ee.sets.map((st) => (st.kind === 'work' && !st.completed ? { ...st, ...fill(st, ee.sets.filter((z) => z.kind === 'work').indexOf(st)) } : st)) }), 'Valores rellenados (sin marcar como hechas)')}
            onNotes={(notes) => updEx(e.uid, (ee) => ({ ...ee, notes }))}
          />
        ))}
        <button className="btn soft block" onClick={() => setPicker({})}><Plus size={18} /> Añadir ejercicio</button>
        <div className="field">
          <label htmlFor="snotes">Notas de la sesión</label>
          <textarea id="snotes" className="input" maxLength={2000} value={s.notes} onChange={(ev) => update((x) => ({ ...x, notes: ev.target.value }))} placeholder="Cómo te has sentido, sueño, molestias…" />
        </div>
        <button className="btn ghost danger block" onClick={() => void discard()}><Trash2 size={18} /> Descartar sesión</button>
      </main>

      {s.rest && restRemaining !== null && restRemaining > -600 && (
        <div className={`restbar ${restRemaining <= 0 ? 'over' : ''}`} role="timer" aria-label="Descanso">
          <progress max={s.rest.durationSec} value={Math.max(0, s.rest.durationSec - Math.max(0, restRemaining))} aria-hidden />
          <div className="inner">
            <div className="stack-sm" style={{ gap: 0 }}>
              <span className="tiny" style={{ opacity: 0.8 }}>{restRemaining > 0 ? 'Descanso' : 'Listo: siguiente serie'}</span>
              <span className="time" aria-live={restRemaining <= 0 ? 'assertive' : 'off'}>{restRemaining > 0 ? formatDuration(restRemaining) : `+${formatDuration(-restRemaining)}`}</span>
            </div>
            <span className="grow" />
            <button className="btn" onClick={() => update((x) => (x.rest ? { ...x, rest: { ...x.rest, durationSec: Math.max(10, x.rest.durationSec - 15) } } : x))} aria-label="Quitar 15 segundos">−15</button>
            <button className="btn" onClick={() => update((x) => (x.rest ? { ...x, rest: { ...x.rest, durationSec: x.rest.durationSec + 15 } } : x))} aria-label="Añadir 15 segundos">+15</button>
            <button className="btn" onClick={() => update((x) => ({ ...x, rest: null }))} aria-label="Saltar descanso"><SkipForward size={18} /></button>
          </div>
        </div>
      )}

      <Sheet open={!!demoFor} onClose={() => setDemoFor(null)} title={demoFor ? getExercise(demoFor)?.name : ''}>
        {demoFor && <DemoSheetBody exerciseId={demoFor} onReference={(id) => setDemoFor(id)} />}
      </Sheet>

      <Sheet open={!!rirFor} onClose={() => setRirFor(null)} title="Repeticiones en reserva (RIR)">
        <div className="stack">
          <p className="small">¿Cuántas repeticiones más podrías haber hecho <strong>con buena técnica</strong>? Ej.: si hiciste 10 y podías hacer 12, RIR 2. Es opcional: si no lo sabes, no lo anotes.</p>
          <div className="row wrap">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="chip" style={{ minWidth: 56, justifyContent: 'center' }} onClick={() => { if (rirFor) updSet(rirFor.exUid, rirFor.setId, { rir: n }); setRirFor(null) }}>
                {n === 5 ? '5+' : n}
              </button>
            ))}
          </div>
          <button className="btn soft" onClick={() => { if (rirFor) updSet(rirFor.exUid, rirFor.setId, { rir: null }); setRirFor(null) }}>No anotar</button>
          <p className="tiny muted">0 = no podías hacer ni una más (fallo). No hace falta llegar al fallo: casi siempre basta con dejar 1–3.</p>
        </div>
      </Sheet>

      <SetMenu target={setMenu} session={s} onClose={() => setSetMenu(null)} update={update} />
      <ExerciseMenu uid={exMenu} session={s} onClose={() => setExMenu(null)} update={update} onReplace={(uid) => { setExMenu(null); setPicker({ replaceUid: uid }) }} onDemo={(id) => { setExMenu(null); setDemoFor(id) }} />

      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        replacing={picker?.replaceUid ? s.exercises.find((e) => e.uid === picker.replaceUid)?.exerciseId : undefined}
        equipment={profile?.equipment}
        level={profile?.level ?? 'beginner'}
        onPick={(ex) => {
          if (picker?.replaceUid) replaceExercise(picker.replaceUid, ex.id)
          else {
            const p = profile ? prescriptionFor(ex.id, ex.category === 'compound' ? 'secondary' : 'accessory', profile) : null
            update((x) => ({ ...x, exercises: [...x.exercises, makeSessionExercise(ex.id, p)] }))
          }
          setPicker(null)
        }}
      />
    </>
  )
}

function DemoSheetBody({ exerciseId, onReference }: { exerciseId: string; onReference: (id: string) => void }) {
  const ex = getExercise(exerciseId)
  if (!ex) return null
  return (
    <div className="stack">
      <DemoPlayer exerciseId={exerciseId} onOpenReference={onReference} />
      {ex.variantNote && <p className="small muted">{ex.variantNote}</p>}
      <div className="stack-sm">
        <h3>Cómo se hace</h3>
        <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>{ex.instructions.map((t) => <li key={t}>{t}</li>)}</ol>
      </div>
      <div className="stack-sm">
        <h3>Errores habituales</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>{ex.errors.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      <p className="tiny muted">Tus datos de la sesión siguen guardados mientras ves esto.</p>
    </div>
  )
}

function placeholderFor(lt: LoadType, sug: Suggestion | null, last: SetEntry | undefined, prevInSession: SetEntry | undefined, repMin?: number): Partial<SetEntry> {
  const p: Partial<SetEntry> = {}
  const w = sug?.targetWeightKg ?? prevInSession?.weightKg ?? last?.weightKg ?? undefined
  if (lt === 'assisted') p.assistKg = sug?.targetAssistKg ?? prevInSession?.assistKg ?? last?.assistKg ?? undefined
  else if (lt !== 'bodyweight' && lt !== 'band' && lt !== 'time') p.weightKg = w ?? undefined
  if (lt === 'time') p.durationSec = sug?.targetTimeSec ?? last?.durationSec ?? undefined
  else p.reps = sug?.targetReps?.[0] ?? repMin ?? last?.reps ?? undefined
  return p
}

function ExerciseBlock(props: {
  e: SessionExercise
  index: number
  current: boolean
  history: ReturnType<typeof historyFor>
  suggestion: Suggestion | null
  onDemo: () => void
  onMenu: () => void
  onToggle: (e: SessionExercise, set: SetEntry, placeholder: Partial<SetEntry>) => void
  onSet: (setId: string, patch: Partial<SetEntry>) => void
  onAddSet: () => void
  onRir: (setId: string) => void
  onSetMenu: (setId: string) => void
  onFill: (f: (st: SetEntry, workIdx: number) => Partial<SetEntry>) => void
  onNotes: (n: string) => void
}) {
  const { e, suggestion: sug, history } = props
  const ex = getExercise(e.exerciseId)
  const lt = e.loadTypeSnapshot
  const p = e.prescription
  const lastH = history[0]
  const lastWork = lastH?.ex.sets.filter((x) => x.kind === 'work' && x.completed) ?? []
  const allDone = e.sets.filter((x) => x.kind === 'work').every((x) => x.completed)
  const showNotes = useState(!!e.notes)
  const isBw = lt === 'bodyweight'
  const useAssist = isBw && e.bwMode === 'assist'
  const cols = lt === 'time' ? 'three' : ''
  const kgLabel = lt === 'assisted' ? 'Asist.' : lt === 'band' ? 'Banda' : isBw ? (useAssist ? 'Asist.' : 'Lastre') : 'kg'
  const lastSummary = lastWork.map((x) => describeSet(x, lt)).join(' · ')
  let workN = 0
  return (
    <section className={`card wk-ex ${props.current ? 'current' : ''} ${allDone ? 'done' : ''}`} aria-label={`${props.index + 1}. ${e.nameSnapshot}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow stack-sm" style={{ gap: 2 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            {e.superset && <span className="badge accent"><Link2 size={12} aria-hidden /> Superserie</span>}
            {e.unilateralSnapshot && <span className="badge">Por lado</span>}
            {e.painFlag && <span className="badge danger"><HeartPulse size={12} aria-hidden /> Molestia</span>}
            {e.replacedFrom && <span className="badge">Sustituto</span>}
          </div>
          <h3>{props.index + 1}. {e.nameSnapshot}</h3>
          {p && (
            <span className="small muted">
              {describePrescription(p, ex)} · {describeRir(p)} · descanso {formatDuration(p.restSec)}
            </span>
          )}
        </div>
        <button className="icon-btn soft" onClick={props.onMenu} aria-label={`Opciones de ${e.nameSnapshot}`}><Ellipsis /></button>
      </div>
      <button className="btn soft small" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={props.onDemo}>
        <CircleHelp size={16} /> Ver cómo se hace
      </button>

      <div className="stack-sm" style={{ marginTop: 10 }}>
        {lastH ? (
          <div className="small">
            <span className="muted">Última vez ({formatDateShort(lastH.date)}): </span>
            <strong className="num">{lastSummary || '—'}</strong>
          </div>
        ) : (
          <div className="small muted">Sin registros anteriores de este ejercicio.</div>
        )}
        {sug && (
          <div className="suggestion stack-sm">
            <span className="label"><Lightbulb aria-hidden /> Sugerencia · {sug.title}</span>
            <span className="small">{sug.detail}</span>
            {(sug.targetWeightKg !== undefined || sug.targetAssistKg !== undefined) && (
              <button
                className="btn small soft"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => props.onFill(() => (lt === 'assisted' ? { assistKg: sug.targetAssistKg ?? null } : { weightKg: sug.targetWeightKg ?? null }))}
              >
                Usar {formatNumber(lt === 'assisted' ? sug.targetAssistKg : sug.targetWeightKg)} kg en las series pendientes
              </button>
            )}
          </div>
        )}
        {lastWork.length > 0 && (
          <button
            className="btn ghost small"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => props.onFill((_, i) => {
              const src = lastWork[Math.min(i, lastWork.length - 1)]
              return { weightKg: src.weightKg, reps: src.reps, assistKg: src.assistKg, addedKg: src.addedKg, bandLabel: src.bandLabel, durationSec: src.durationSec }
            })}
          >
            <Copy size={16} /> Copiar lo de la última vez (sin marcar)
          </button>
        )}
      </div>

      <div className={`set-grid ${cols}`} style={{ marginTop: 10 }}>
        <span className="hdr">Serie</span>
        {lt !== 'time' && <span className="hdr" title={LOAD_LABEL[lt].help}>{kgLabel}</span>}
        <span className="hdr">{lt === 'time' ? 'Seg.' : e.unilateralSnapshot ? 'Rep./lado' : 'Rep.'}</span>
        {lt !== 'time' && <span className="hdr">RIR</span>}
        <span className="hdr">Hecha</span>
        {e.sets.map((set, si) => {
          if (set.kind === 'work') workN++
          const prevInSession = e.sets.slice(0, si).reverse().find((x) => x.completed)
          const ph = placeholderFor(lt, sug && sug.kind !== 'paused_pain' && sug.kind !== 'paused_scope' ? sug : null, lastWork[Math.max(0, workN - 1)], prevInSession, p?.repMin)
          const tag = set.kind === 'warmup' ? 'C' : String(workN)
          return (
            <SetRow
              key={set.id}
              set={set}
              lt={lt}
              tag={tag}
              ph={ph}
              useAssist={useAssist}
              onSet={(patch) => props.onSet(set.id, patch)}
              onToggle={() => props.onToggle(e, set, ph)}
              onRir={() => props.onRir(set.id)}
              onMenu={() => props.onSetMenu(set.id)}
            />
          )
        })}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn ghost small" onClick={props.onAddSet}><Plus size={16} /> Serie</button>
        <span className="grow" />
        <button className="btn ghost small" onClick={() => showNotes[1](!showNotes[0])}><StickyNote size={16} /> Nota</button>
      </div>
      {(showNotes[0] || e.notes) && (
        <textarea className="input" aria-label={`Notas de ${e.nameSnapshot}`} maxLength={1000} value={e.notes} onChange={(ev) => props.onNotes(ev.target.value)} placeholder="Notas de este ejercicio (agarre, máquina, sensaciones…)" />
      )}
      <p className="tiny muted" style={{ marginTop: 6 }}>{LOAD_LABEL[lt].help}</p>
    </section>
  )
}

function describeSet(x: SetEntry, lt: LoadType): string {
  const reps = x.reps ?? '?'
  if (lt === 'time') return `${x.durationSec ?? '?'} s`
  if (lt === 'assisted') return `${reps} (asist. ${formatNumber(x.assistKg ?? x.weightKg)} kg)`
  if (lt === 'bodyweight') return x.assistKg ? `${reps} (asist. ${formatNumber(x.assistKg)})` : x.addedKg ? `${reps} (+${formatNumber(x.addedKg)} kg)` : `${reps}`
  if (lt === 'band') return `${reps}${x.bandLabel ? ` (${x.bandLabel})` : ''}`
  return `${formatNumber(x.weightKg)}×${reps}`
}

function SetRow({ set, lt, tag, ph, useAssist, onSet, onToggle, onRir, onMenu }: { set: SetEntry; lt: LoadType; tag: string; ph: Partial<SetEntry>; useAssist: boolean; onSet: (p: Partial<SetEntry>) => void; onToggle: () => void; onRir: () => void; onMenu: () => void }) {
  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '' : formatNumber(n))
  const sideTxt = set.side === 'left' ? ' I' : set.side === 'right' ? ' D' : ''
  return (
    <>
      <button className={`set-tag ${set.kind === 'warmup' ? 'warm' : ''}`} onClick={onMenu} aria-label={`Serie ${set.kind === 'warmup' ? 'de calentamiento' : tag}: opciones`}>{tag}{sideTxt}</button>
      {lt === 'time' ? (
        <DecimalInput label="Segundos" integer value={set.durationSec} onChange={(v) => onSet({ durationSec: v })} placeholder={fmt(ph.durationSec)} max={3600} />
      ) : (
        <>
          {lt === 'band' ? (
            <input className="num-input" style={{ fontSize: '0.95rem' }} aria-label="Banda (color o nivel)" maxLength={20} value={set.bandLabel ?? ''} onChange={(e) => onSet({ bandLabel: e.target.value || null })} placeholder="color" />
          ) : lt === 'assisted' || (lt === 'bodyweight' && useAssist) ? (
            <DecimalInput label="Asistencia en kg" value={set.assistKg} onChange={(v) => onSet({ assistKg: v })} placeholder={fmt(ph.assistKg)} />
          ) : lt === 'bodyweight' ? (
            <DecimalInput label="Lastre en kg (opcional)" value={set.addedKg} onChange={(v) => onSet({ addedKg: v })} placeholder="0" />
          ) : (
            <DecimalInput label={LOAD_LABEL[lt].field} value={set.weightKg} onChange={(v) => onSet({ weightKg: v })} placeholder={fmt(ph.weightKg)} />
          )}
          <DecimalInput label="Repeticiones" integer value={set.reps} onChange={(v) => onSet({ reps: v })} placeholder={fmt(ph.reps)} max={500} />
          <button className={`rir-btn ${set.rir !== null ? 'set' : ''}`} onClick={onRir} aria-label={`RIR ${set.rir ?? 'sin anotar'}`}>{set.rir === null ? '—' : set.rir >= 5 ? '5+' : set.rir}</button>
        </>
      )}
      <button className="set-done" aria-pressed={set.completed} onClick={onToggle} aria-label={set.completed ? 'Marcar como no hecha' : 'Marcar serie como hecha'}>
        <Check aria-hidden />
      </button>
    </>
  )
}

function SetMenu({ target, session, onClose, update }: { target: { exUid: string; setId: string } | null; session: Session; onClose: () => void; update: Upd }) {
  const e = session.exercises.find((x) => x.uid === target?.exUid)
  const set = e?.sets.find((x) => x.id === target?.setId)
  const upd = (patch: Partial<SetEntry>) => target && update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === target.exUid ? { ...ee, sets: ee.sets.map((st) => (st.id === target.setId ? { ...st, ...patch } : st)) } : ee)) }))
  return (
    <Sheet open={!!target && !!set} onClose={onClose} title="Serie">
      {e && set && (
        <div className="stack">
          <span className="label">Tipo de serie</span>
          <div className="seg">
            <button aria-pressed={set.kind === 'warmup'} onClick={() => upd({ kind: 'warmup' })}>Calentamiento</button>
            <button aria-pressed={set.kind === 'work'} onClick={() => upd({ kind: 'work' })}>Trabajo</button>
          </div>
          <p className="tiny muted">Las series de calentamiento (aproximación) no cuentan para volumen, récords ni progresión.</p>
          {e.unilateralSnapshot && (
            <>
              <span className="label">Lado</span>
              <div className="seg">
                <button aria-pressed={set.side === 'both'} onClick={() => upd({ side: 'both' })}>Ambos / alterno</button>
                <button aria-pressed={set.side === 'left'} onClick={() => upd({ side: 'left' })}>Izquierdo</button>
                <button aria-pressed={set.side === 'right'} onClick={() => upd({ side: 'right' })}>Derecho</button>
              </div>
            </>
          )}
          <details className="more">
            <summary>Más campos (tiempo, distancia)</summary>
            <div className="row" style={{ paddingTop: 8 }}>
              <label className="stack-sm grow"><span className="tiny muted">Tiempo (s)</span><DecimalInput label="Tiempo en segundos" integer value={set.durationSec} onChange={(v) => upd({ durationSec: v })} max={36000} /></label>
              <label className="stack-sm grow"><span className="tiny muted">Distancia (m)</span><DecimalInput label="Distancia en metros" value={set.distanceM} onChange={(v) => upd({ distanceM: v })} max={100000} /></label>
            </div>
          </details>
          <div className="row">
            <button className="btn soft grow" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => { if (ee.uid !== e.uid) return ee; const i = ee.sets.findIndex((st) => st.id === set.id); const copy = { ...set, id: newId('set'), completed: false, completedAt: null }; const sets = [...ee.sets]; sets.splice(i + 1, 0, copy); return { ...ee, sets } }) })); onClose() }}><Copy size={16} /> Duplicar</button>
            <button className="btn soft danger grow" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, sets: ee.sets.filter((st) => st.id !== set.id) } : ee)) }), 'Serie eliminada'); onClose() }}><Trash2 size={16} /> Eliminar</button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function ExerciseMenu({ uid, session, onClose, update, onReplace, onDemo }: { uid: string | null; session: Session; onClose: () => void; update: Upd; onReplace: (uid: string) => void; onDemo: (id: string) => void }) {
  const idx = session.exercises.findIndex((x) => x.uid === uid)
  const e = session.exercises[idx]
  const isBw = e?.loadTypeSnapshot === 'bodyweight'
  const move = (d: number) => update((x) => { const l = [...x.exercises]; const [it] = l.splice(idx, 1); l.splice(idx + d, 0, it); return { ...x, exercises: l } })
  const usingAssist = e?.bwMode === 'assist'
  return (
    <Sheet open={!!e} onClose={onClose} title={e?.nameSnapshot}>
      {e && (
        <div className="list">
          <button className="list-item" onClick={() => onDemo(e.exerciseId)}><CircleHelp size={20} /> Ver cómo se hace</button>
          <button className="list-item" onClick={() => onReplace(e.uid)}><Repeat size={20} /> Sustituir ejercicio</button>
          <button className="list-item" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, painFlag: !ee.painFlag } : ee)) })); onClose() }}>
            <HeartPulse size={20} /> {e.painFlag ? 'Quitar marca de molestia' : 'Marcar molestia o dolor'}
          </button>
          {e.painFlag && <div className="note warn small"><TriangleAlert aria-hidden /><span>Con molestia no se sugiere subir carga. Si duele, para ese ejercicio, prueba una alternativa o menos carga y, si persiste, consulta a un profesional.</span></div>}
          {isBw && (
            <button className="list-item" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, bwMode: usingAssist ? 'added' : 'assist', sets: ee.sets.map((st) => (st.completed ? st : usingAssist ? { ...st, assistKg: null } : { ...st, addedKg: null })) } : ee)) })); onClose() }}>
              <ArrowDown size={20} /> {usingAssist ? 'Registrar lastre (no asistencia)' : 'Registrar asistencia (banda/máquina)'}
            </button>
          )}
          <button className="list-item" disabled={idx === 0} onClick={() => { move(-1); onClose() }}><ArrowUp size={20} /> Subir</button>
          <button className="list-item" disabled={idx === session.exercises.length - 1} onClick={() => { move(1); onClose() }}><ArrowDown size={20} /> Bajar</button>
          {idx < session.exercises.length - 1 && (
            <button className="list-item" onClick={() => { update((x) => { const l = [...x.exercises]; const a = l[idx]; const b = l[idx + 1]; const tag = a.superset && a.superset === b.superset ? undefined : `ss-${newId().slice(0, 6)}`; l[idx] = { ...a, superset: tag }; l[idx + 1] = { ...b, superset: tag }; return { ...x, exercises: l } }); onClose() }}>
              <Link2 size={20} /> {e.superset && e.superset === session.exercises[idx + 1]?.superset ? 'Quitar superserie' : 'Superserie con el siguiente (avanzado)'}
            </button>
          )}
          <button className="list-item" style={{ color: 'var(--danger)' }} onClick={() => { update((x) => ({ ...x, exercises: x.exercises.filter((ee) => ee.uid !== e.uid) }), 'Ejercicio eliminado de la sesión'); onClose() }}><Trash2 size={20} /> Quitar de la sesión</button>
        </div>
      )}
    </Sheet>
  )
}
