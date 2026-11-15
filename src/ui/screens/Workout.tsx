import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, CircleHelp, Copy, Disc3, Ellipsis, Flame, HeartPulse, Lightbulb, Link2, Pause, Pin, Play, Plus, Repeat, SkipForward, StickyNote, Trash2, TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { closeOpenBlocks, deleteSession, finishSession, makeSessionExercise, newSet, restoreSession, saveSession, sessionWorkSummary } from '../../data/repo'
import { getExercise, hasEquipment } from '../../domain/catalog'
import { LOAD_LABEL } from '../../domain/catalog/exercises'
import { prescriptionFor } from '../../domain/engine/generator'
import { functionText } from '../../domain/content/functions'
import { describePrescription, describeRir, isTimePrescription } from '../../domain/engine/prescription'
import { blockAdvice, historyFor, sameScheme, suggestNext, type BlockAdvice, type Suggestion } from '../../domain/engine/progression'
import { progressionAllowed } from '../../domain/engine/scope'
import { DEFAULT_PLATES, describePlates, platesFor, warmupPlan, type WarmupStep } from '../../domain/plates'
import { DEFAULT_INCREMENTS } from '../../domain/profile'
import { READINESS_SCALES, readinessLevel, readinessReasons } from '../../domain/readiness'
import { priorSets, setRecord } from '../../domain/records'
import { supersetPartner } from '../../domain/sessions'
import {
  HELP_TEXT, MAX_SEGMENTS, METHOD_LABEL, NEXT_NAME, RP_PAUSE_SEC, addExtraSegment, blockModified, blockText, blocksOf, canRegister, canUseMethod, contextKey, conventionalWork, dropSuggestion, endBlock, extendSet,
  isBlock, pairKind, pendingConventional, registerSegment, reorganizePending, revertBlock, segmentLoad, setDraft, startNextSegment, supersetStep, undoSegment,
} from '../../domain/techniques'
import type { Increments, LoadType, Prescription, Readiness, Session, SessionExercise, SetEntry, SetMethod } from '../../domain/types'
import { formatDateShort, formatDuration, formatNumber, newId, toLocalDate } from '../../domain/util'
import { DemoPlayer } from '../components/DemoPlayer'
import { DecimalInput } from '../components/inputs'
import { Sheet, useConfirm, useToast } from '../components/overlay'
import { ExercisePicker } from '../components/RoutineParts'
import { useNow } from '../hooks'
import { getMeta } from '../../data/repo'
import { go } from '../router'
import { getKeepAwake, restDoneAlert, unlockAudio } from '../sound'
import { useWakeLock } from '../wakelock'

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
  const [rirFor, setRirFor] = useState<{ exUid: string; setId: string; block?: boolean } | null>(null)
  const [help, setHelp] = useState<'drop' | 'rest_pause' | 'superset' | null>(null)
  const [blockMenu, setBlockMenu] = useState<{ exUid: string; setId: string } | null>(null)
  const [reorg, setReorg] = useState<string | null>(null)
  const [setMenu, setSetMenu] = useState<{ exUid: string; setId: string } | null>(null)
  const [exMenu, setExMenu] = useState<string | null>(null)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [effortFor, setEffortFor] = useState<{ exUid: string; setId: string } | null>(null)
  const [view, setView] = useState<'list' | 'focus'>(() => { try { return localStorage.getItem('forja-workout-view') === 'focus' ? 'focus' : 'list' } catch { return 'list' } })
  const [focusUid, setFocusUid] = useState<string | null>(null)
  const setViewPref = (v: 'list' | 'focus') => { setView(v); try { localStorage.setItem('forja-workout-view', v) } catch { /* nada */ } }
  const [platesFor_, setPlatesFor] = useState<{ exUid: string; kg: number | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(0)
  const alerted = useRef<string | null>(null)
  const plates = useLiveQuery(() => getMeta<number[]>('plates', DEFAULT_PLATES), [], DEFAULT_PLATES)
  const backdated = !!s.backdated
  useWakeLock(getKeepAwake() && !backdated && !s.pausedAt)

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

  // Cualquier toque durante el entrenamiento deja el audio listo (iOS solo lo permite tras un gesto), p. ej. tras recargar a mitad de un descanso.
  useEffect(() => {
    if (backdated) return
    const onTouch = () => unlockAudio()
    window.addEventListener('pointerdown', onTouch, { passive: true })
    return () => window.removeEventListener('pointerdown', onTouch)
  }, [backdated])

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
  const focusIdx = Math.max(0, s.exercises.findIndex((e) => e.uid === (focusUid ?? currentUid ?? s.exercises[0]?.uid)))

  // Descanso: calculado con marcas temporales (sobrevive a bloqueos y recargas).
  const restRemaining = s.rest ? Math.round((s.rest.startedAt + s.rest.durationSec * 1000 - now) / 1000) : null
  useEffect(() => {
    if (s.rest && restRemaining !== null && restRemaining <= 0 && alerted.current !== `${s.rest.startedAt}`) {
      alerted.current = `${s.rest.startedAt}`
      // La transición de superserie no pita: solo avisa el descanso (normal, de la ronda o la pausa breve).
      if (document.visibilityState === 'visible' && s.rest.kind !== 'transition') restDoneAlert()
    }
  }, [restRemaining, s.rest])

  const updEx = (uid: string, f: (e: SessionExercise) => SessionExercise, undo?: string) => update((x) => ({ ...x, exercises: x.exercises.map((e) => (e.uid === uid ? f(e) : e)) }), undo)
  const updSet = (exUid: string, setId: string, patch: Partial<SetEntry>) => updEx(exUid, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) }))

  const lastToggle = useRef(new Map<string, number>())
  const toggleDone = (eStale: SessionExercise, setStale: SetEntry, placeholder: Partial<SetEntry>) => {
    if (!backdated) unlockAudio()
    // Idempotente: un doble toque sobre la misma serie no la marca y desmarca (ni duplica nada).
    const nowT = Date.now()
    if (nowT - (lastToggle.current.get(setStale.id) ?? 0) < 600) return
    lastToggle.current.set(setStale.id, nowT)
    // Valores FRESCOS (lo recién escrito puede no haberse pintado todavía): evita pisarlo con los propuestos.
    const e = sRef.current.exercises.find((x) => x.uid === eStale.uid) ?? eStale
    const set = e.sets.find((x) => x.id === setStale.id) ?? setStale
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
    // Superserie: A1 → transición → A2 → descanso de la ronda (el mayor de los dos descansos prescritos).
    const list = sRef.current.exercises
    const step = set.kind === 'work' ? supersetStep(list, e.uid, set.id, (i) => restFor(list[i])) : null
    const nowT2 = Date.now()
    const nextRest: Session['rest'] = backdated ? null
      : step?.kind === 'transition' ? { startedAt: nowT2, durationSec: step.durationSec, setId: set.id, kind: 'transition', label: `Ahora: ${list[step.partner].nameSnapshot}` }
      : step?.kind === 'round' ? { startedAt: nowT2, durationSec: step.durationSec, setId: set.id, kind: 'round', label: 'Descanso de la ronda' }
      : { startedAt: nowT2, durationSec: restSec, setId: set.id }
    // Récord en directo: se compara con las sesiones anteriores (y con lo ya hecho hoy, para no repetir el aviso).
    const merged: SetEntry = { ...set, ...fill, completed: true }
    const prior = priorSets(finished, e.exerciseId, sRef.current)
    const today_ = sRef.current.exercises.filter((ee) => ee.exerciseId === e.exerciseId).flatMap((ee) => ee.sets).filter((x) => x.id !== set.id && x.kind === 'work' && x.completed)
    const rec = prior.length ? setRecord(merged, e.loadTypeSnapshot, [...prior, ...today_], formatNumber) : null
    const recTxt = rec ? `Récord: ${rec.value}, ${rec.detail}` : ''
    update((x) => ({
      ...x,
      exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, sets: ee.sets.map((ss) => (ss.id === set.id ? { ...ss, ...fill, completed: true, completedAt: Date.now() } : ss)) } : ee)),
      rest: nextRest,
    }), filled ? `${recTxt ? `${recTxt}. ` : ''}Serie completada con los valores propuestos: revísalos si no coinciden` : undefined)
    if (rec && !filled) toast(recTxt, undefined, 6000)
  }

  const restFor = (e: SessionExercise) => settings.find((x) => x.exerciseId === e.exerciseId)?.restSec ?? e.prescription?.restSec ?? 90

  // ───── Bloques especiales: cada acción se guarda en el momento; los dobles toques no duplican nada ─────
  // Un toque por bloque cada 0,7 s: tras registrar un tramo aparecen otros botones en el mismo sitio («Continuar bajada»,
  // «Deshacer último tramo»…) y un doble toque no debe activarlos.
  const blockLock = useRef(new Map<string, number>())
  const once = (setId: string) => {
    const t = Date.now()
    if (t - (blockLock.current.get(setId) ?? 0) < 700) return false
    blockLock.current.set(setId, t)
    return true
  }
  const freshSet = (exUid: string, setId: string) => sRef.current.exercises.find((x) => x.uid === exUid)?.sets.find((x) => x.id === setId)
  const withSet = (x: Session, exUid: string, setId: string, next: SetEntry): Session => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === exUid ? { ...ee, sets: ee.sets.map((st) => (st.id === setId ? next : st)) } : ee)) })
  const blockDraft = (e: SessionExercise, setId: string, patch: Parameters<typeof setDraft>[1]) => {
    const cur = freshSet(e.uid, setId)
    if (cur) update((x) => withSet(x, e.uid, setId, setDraft(cur, patch)))
  }
  const blockRegister = (e: SessionExercise, setId: string, suggestedKg: number | null) => {
    const cur = freshSet(e.uid, setId)
    if (!cur?.block || !canRegister(cur) || !once(setId)) return
    if (!backdated) unlockAudio()
    const d = cur.block.draft ?? { weightKg: null, reps: null, rir: null }
    if (d.reps === null) return
    const lt = e.loadTypeSnapshot
    const usedSuggested = d.weightKg === null && suggestedKg !== null && lt !== 'band'
    const load = d.weightKg ?? (lt === 'band' ? null : suggestedKg)
    const values = { weightKg: lt === 'assisted' || lt === 'bodyweight' || lt === 'band' ? null : load, reps: d.reps, rir: d.rir, ...(lt === 'assisted' ? { assistKg: load } : {}), ...(lt === 'bodyweight' ? { addedKg: load } : {}), suggestedKg }
    const now = Date.now()
    const after = registerSegment(cur, values, now)
    if (after === cur) return
    const shortPause = !after.block?.ended && cur.method === 'rest_pause'
    update((x) => ({
      ...withSet(x, e.uid, setId, after),
      // El descanso habitual empieza al terminar el bloque; entre bajadas no hay descanso deliberado; en rest-pause, pausa breve.
      rest: backdated ? null
        : after.block?.ended ? { startedAt: now, durationSec: restFor(e), setId }
        : shortPause ? { startedAt: now, durationSec: cur.block?.target.pauseSec ?? RP_PAUSE_SEC, setId, kind: 'short', label: 'Pausa breve (rest-pause)' }
        : null,
    }), usedSuggested ? 'Tramo registrado con la carga sugerida: revísala si no coincide' : undefined)
  }
  const blockContinue = (e: SessionExercise, setId: string) => {
    const cur = freshSet(e.uid, setId)
    if (!cur?.block || !once(setId)) return
    const after = startNextSegment(cur, Date.now())
    if (after !== cur) update((x) => ({ ...withSet(x, e.uid, setId, after), rest: x.rest?.kind === 'short' ? null : x.rest }))
  }
  const blockEnd = (e: SessionExercise, setId: string) => {
    const cur = freshSet(e.uid, setId)
    if (!cur || !once(setId)) return
    const now = Date.now()
    const after = endBlock(cur, now)
    if (after !== cur) update((x) => ({ ...withSet(x, e.uid, setId, after), rest: backdated ? null : { startedAt: now, durationSec: restFor(e), setId } }), after.block?.ended === 'early' ? 'Bloque terminado antes de tiempo: se guarda lo hecho' : undefined)
  }
  const blockExtra = (e: SessionExercise, setId: string) => {
    const cur = freshSet(e.uid, setId)
    if (!cur || !once(setId)) return
    const after = addExtraSegment(cur, Date.now())
    if (after !== cur) update((x) => ({ ...withSet(x, e.uid, setId, after), rest: null }))
  }
  const blockUndo = (e: SessionExercise, setId: string) => {
    const cur = freshSet(e.uid, setId)
    if (!cur || !once(setId)) return
    const after = undoSegment(cur)
    if (after !== cur) update((x) => ({ ...withSet(x, e.uid, setId, after), rest: null }), 'Último tramo deshecho (los anteriores se conservan)')
  }

  const removeOnePending = () => update((x) => ({
    ...x,
    exercises: x.exercises.map((ee) => {
      const pending = ee.sets.filter((st) => st.kind === 'work' && !st.completed && !(st.block?.segments.length))
      if (pending.length < 2) return ee
      const drop = pending[pending.length - 1].id
      return { ...ee, sets: ee.sets.filter((st) => st.id !== drop) }
    }),
  }), 'Quitada una serie pendiente por ejercicio')
  const canRemovePending = s.exercises.some((ee) => ee.sets.filter((st) => st.kind === 'work' && !st.completed && !(st.block?.segments.length)).length >= 2)
  const level = readinessLevel(s.readiness)
  const anyDone = s.exercises.some((ee) => ee.sets.some((st) => st.completed))

  const addSet = (e: SessionExercise, kind: 'work' | 'warmup' = 'work') => {
    const t = Date.now()
    if (t - lock.current < 350) return // evita duplicados por doble toque
    lock.current = t
    const last = [...e.sets].reverse().find((x) => x.kind === kind) ?? e.sets[e.sets.length - 1]
    updEx(e.uid, (ee) => ({ ...ee, sets: kind === 'warmup' ? [newSet('warmup', last), ...ee.sets] : [...ee.sets, newSet(kind, last)] }))
  }

  const finish = async () => {
    if (busy) return
    // Un bloque empezado y sin cerrar cuenta con lo hecho (se cierra «antes de tiempo»; no se inventa nada).
    const { planned, done } = sessionWorkSummary(closeOpenBlocks(sRef.current))
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

  /** Variantes ofrecibles: con el material marcado y no excluidas (A05). */
  const variantAvailable = (id: string) => {
    const v = getExercise(id)
    return !!v && (!profile || (hasEquipment(profile.equipment, v) && !profile.excludedExercises.includes(id)))
  }

  /** Cambiar a una variante más fácil o difícil (con confirmación). Lo hecho se conserva; los kilos no se trasladan. */
  const switchVariant = async (uid: string, newExId: string) => {
    const cur = sRef.current.exercises.find((x) => x.uid === uid)
    const target = getExercise(newExId)
    if (!cur || !target) return
    const ok = await confirm({ title: `Cambiar a «${target.name}»`, body: 'Las series ya hechas se conservan con el ejercicio actual; las pendientes pasan a la variante nueva, sin trasladar cargas. Puedes deshacerlo.', confirm: 'Cambiar' })
    if (ok) replaceExercise(uid, newExId)
  }

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
              {backdated
                ? `Registro a posteriori · ${formatDateShort(s.date)} · ${s.manualDurationMin ?? 60} min`
                : <>{formatDuration(elapsedMs / 1000)} {s.pausedAt ? '· en pausa' : ''} {s.familiarization ? (s.familiarization.reason === 'readaptation' ? `· readaptación ${s.familiarization.index}/${s.familiarization.total}` : s.familiarization.reason === 'extended' ? '· aprendizaje prolongado' : `· aprendizaje ${s.familiarization.index}/${s.familiarization.total}`) : s.rampApplied ? '· aprendizaje' : ''}</>}
            </div>
          </div>
          {!backdated && <button className="icon-btn soft" onClick={togglePause} aria-label={s.pausedAt ? 'Reanudar' : 'Pausar'}>{s.pausedAt ? <Play /> : <Pause />}</button>}
          <button className="btn primary small" disabled={busy} onClick={() => void finish()}>Terminar</button>
        </div>
      </header>
      <main className="page full" style={{ paddingTop: 12 }}>
        {s.pausedAt && (
          <div className="note info"><Pause aria-hidden /><span className="small">Sesión en pausa. Tus datos están guardados; puedes cerrar la app y volver.</span></div>
        )}
        {backdated && (
          <div className="note info"><Pin aria-hidden /><span className="small">Estás registrando una sesión pasada: anota lo que hiciste y marca las series. No hay cronómetro ni descansos.</span></div>
        )}
        {!backdated && s.readiness === undefined && !anyDone && s.exercises.length > 0 && (
          <ReadinessCard onAnswer={(r) => update((x) => ({ ...x, readiness: r }))} onSkip={() => update((x) => ({ ...x, readiness: null }))} />
        )}
        {level === 'low' && s.readiness && (
          <div className="note warn stack-sm" role="status">
            <span className="small"><strong>Hoy vas con menos margen</strong> ({readinessReasons(s.readiness).join(', ')}). Entrenar igualmente suele estar bien: deja 1 repetición más en reserva, no busques récords y, si quieres, haz una serie menos.</span>
            {canRemovePending && <button className="btn soft small" style={{ alignSelf: 'flex-start' }} onClick={removeOnePending}>Quitar una serie pendiente de cada ejercicio</button>}
          </div>
        )}
        {s.exercises.length === 0 && (
          <div className="card empty">
            <p>{backdated ? 'Añade los ejercicios que hiciste.' : 'Sesión libre: añade el primer ejercicio.'}</p>
          </div>
        )}
        {s.exercises.length > 1 && (
          <div className="seg" role="group" aria-label="Vista del entrenamiento">
            <button aria-pressed={view === 'list'} onClick={() => setViewPref('list')}>Lista completa</button>
            <button aria-pressed={view === 'focus'} onClick={() => setViewPref('focus')}>Ejercicio actual</button>
          </div>
        )}
        {view === 'focus' && focusIdx >= 0 && (
          <div className="row between small">
            <button className="btn ghost small" disabled={focusIdx === 0} onClick={() => setFocusUid(s.exercises[focusIdx - 1]?.uid ?? null)}>‹ Anterior</button>
            <span className="muted">Ejercicio {focusIdx + 1} de {s.exercises.length}</span>
            <button className="btn ghost small" disabled={focusIdx >= s.exercises.length - 1} onClick={() => setFocusUid(s.exercises[focusIdx + 1]?.uid ?? null)}>Siguiente ›</button>
          </div>
        )}
        {s.exercises.map((e, i) => (view === 'focus' && i !== focusIdx ? null :
          <ExerciseBlock
            focus={view === 'focus'}
            roleLabel={s.familiarization || s.rampApplied ? 'Adaptación' : e.prescription?.reference ? 'Fuerza' : s.exercises.some((x) => x.prescription?.reference) ? 'Trabajo complementario' : undefined}
            key={e.uid}
            e={e}
            index={i}
            current={e.uid === currentUid}
            history={historyFor(e.exerciseId, finished, undefined, s.id)}
            increments={increments}
            pinned={settings.find((x) => x.exerciseId === e.exerciseId)?.note}
            lowReadiness={level === 'low'}
            onPlates={(kg) => setPlatesFor({ exUid: e.uid, kg })}
            onFillWarmup={(plan) => updEx(e.uid, (ee) => { let i = 0; return { ...ee, sets: ee.sets.map((st) => (st.kind === 'warmup' && !st.completed && plan[i] ? { ...st, weightKg: plan[i].kg, reps: plan[i++].reps } : st)) } }, 'Calentamiento rellenado (sin marcar)')}
            suggestion={e.prescription ? suggestNext({ exerciseId: e.exerciseId, prescription: e.prescription, history: historyFor(e.exerciseId, finished, undefined, s.id), increments, incrementOverride: settings.find((x) => x.exerciseId === e.exerciseId)?.incrementKg, today, progressionAllowed: allowProg, familiarization: s.familiarization ?? null, available: variantAvailable, context: contextKey(e, s.exercises) }) : null}
            pair={(() => { const p = supersetPartner(s.exercises, e.uid); return p < 0 ? null : { first: p > i, partnerName: s.exercises[p].nameSnapshot, kind: pairKind(e.exerciseId, s.exercises[p].exerciseId) } })()}
            stepOverride={settings.find((x) => x.exerciseId === e.exerciseId)?.incrementKg}
            onHelp={setHelp}
            block={{
              draft: (setId, patch) => blockDraft(e, setId, patch),
              register: (setId, suggestedKg) => blockRegister(e, setId, suggestedKg),
              next: (setId) => blockContinue(e, setId),
              end: (setId) => blockEnd(e, setId),
              extra: (setId) => blockExtra(e, setId),
              undo: (setId) => blockUndo(e, setId),
              menu: (setId) => setBlockMenu({ exUid: e.uid, setId }),
              rir: (setId) => setRirFor({ exUid: e.uid, setId, block: true }),
            }}
            onEffort={(setId) => setEffortFor({ exUid: e.uid, setId })}
            onSwitchVariant={(id) => void switchVariant(e.uid, id)}
            onDemo={() => setDemoFor(e.exerciseId)}
            onMenu={() => setExMenu(e.uid)}
            onToggle={toggleDone}
            onSet={(setId, patch) => updSet(e.uid, setId, patch)}
            onAddSet={() => addSet(e)}
            onRir={(setId) => setRirFor({ exUid: e.uid, setId })}
            onSetMenu={(setId) => setSetMenu({ exUid: e.uid, setId })}
            onFill={(fill) => updEx(e.uid, (ee) => ({ ...ee, sets: ee.sets.map((st) => (st.kind === 'work' && !st.completed && !isBlock(st) ? { ...st, ...fill(st, conventionalWork(ee.sets).indexOf(st)) } : st)) }), 'Valores rellenados (sin marcar como hechas)')}
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

      {s.rest && restRemaining !== null && restRemaining > -600 && (() => {
        const kind = s.rest.kind ?? 'rest'
        const title = kind === 'transition' ? (restRemaining > 0 ? 'Transición' : 'Cuando estés listo') : kind === 'short' ? (restRemaining > 0 ? 'Pausa breve' : 'Listo: siguiente miniserie') : kind === 'round' ? (restRemaining > 0 ? 'Descanso de la ronda' : 'Listo: siguiente ronda') : restRemaining > 0 ? 'Descanso' : 'Listo: siguiente serie'
        const steps = kind === 'short' ? [10, 30] : [30, 60]
        const help = kind === 'transition' ? `${s.rest.label ?? 'Pasa al otro ejercicio de la superserie'}. El descanso llega después de completar ambos.` : kind === 'short' ? 'Pausa breve con la misma carga: amplíala si la necesitas. Puedes terminar el bloque cuando quieras.' : kind === 'round' ? 'Descanso tras completar los dos ejercicios. Descansa más si lo necesitas.' : 'Descansa más si aún no puedes repetir con control. El cronómetro orienta; no te obliga a empezar.'
        return (
          <div className={`restbar ${restRemaining <= 0 ? 'over' : ''} ${kind}`} role="timer" aria-label={kind === 'transition' ? 'Transición de superserie' : kind === 'short' ? 'Pausa breve' : kind === 'round' ? 'Descanso de la ronda' : 'Descanso'}>
            <progress max={s.rest.durationSec} value={Math.max(0, s.rest.durationSec - Math.max(0, restRemaining))} aria-hidden />
            <div className="inner">
              <div className="stack-sm" style={{ gap: 0 }}>
                <span className="tiny" style={{ opacity: 0.8 }}>{title}</span>
                <span className="time" aria-live={restRemaining <= 0 && kind !== 'transition' ? 'assertive' : 'off'}>{restRemaining > 0 ? formatDuration(restRemaining) : `+${formatDuration(-restRemaining)}`}</span>
              </div>
              <span className="grow" />
              {steps.map((n) => <button key={n} className="btn" onClick={() => update((x) => (x.rest ? { ...x, rest: { ...x.rest, durationSec: x.rest.durationSec + n } } : x))} aria-label={`Añadir ${n} segundos`}>+{n}</button>)}
              <button className="btn" onClick={() => update((x) => ({ ...x, rest: null }))} aria-label={kind === 'transition' ? 'Cerrar transición' : 'Saltar descanso'}><SkipForward size={18} /></button>
            </div>
            <div className="tiny" style={{ textAlign: 'center', opacity: 0.85, paddingBottom: 2 }}>{help}</div>
          </div>
        )
      })()}

      <Sheet open={!!demoFor} onClose={() => setDemoFor(null)} title={demoFor ? getExercise(demoFor)?.name : ''}>
        {demoFor && <DemoSheetBody exerciseId={demoFor} onReference={(id) => setDemoFor(id)} />}
      </Sheet>

      <Sheet open={!!rirFor} onClose={() => setRirFor(null)} title="Repeticiones en reserva (RIR)">
        <div className="stack">
          <p className="small">¿Cuántas repeticiones más podrías haber hecho <strong>con buena técnica</strong>? Ej.: si hiciste 10 y podías hacer 12, RIR 2. Es opcional: si no lo sabes, no lo anotes.</p>
          <div className="row wrap">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="chip" style={{ minWidth: 56, justifyContent: 'center' }} onClick={() => { if (rirFor?.block) { const e = s.exercises.find((x) => x.uid === rirFor.exUid); if (e) blockDraft(e, rirFor.setId, { rir: n }) } else if (rirFor) updSet(rirFor.exUid, rirFor.setId, { rir: n }); setRirFor(null) }}>
                {n === 5 ? '5+' : n}
              </button>
            ))}
          </div>
          <button className="btn soft" onClick={() => { if (rirFor?.block) { const e = s.exercises.find((x) => x.uid === rirFor.exUid); if (e) blockDraft(e, rirFor.setId, { rir: null }) } else if (rirFor) updSet(rirFor.exUid, rirFor.setId, { rir: null }); setRirFor(null) }}>No anotar</button>
          <p className="tiny muted">0 = no podías hacer ni una más (fallo). No hace falta llegar al fallo: casi siempre basta con dejar 1–3.</p>
        </div>
      </Sheet>

      <Sheet open={!!effortFor} onClose={() => setEffortFor(null)} title="Esfuerzo percibido (0–10)">
        <div className="stack">
          <p className="small">Para ejercicios por tiempo (planchas): ¿cuánto te ha costado mantener la postura? 0 = nada, 10 = máximo. Es opcional y <strong>no es RIR</strong>: no se convierte en repeticiones en reserva ni decide la progresión.</p>
          <div className="row wrap">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} className="chip" style={{ minWidth: 48, justifyContent: 'center' }} onClick={() => { if (effortFor) updSet(effortFor.exUid, effortFor.setId, { effort: n }); setEffortFor(null) }}>{n}</button>
            ))}
          </div>
          <button className="btn soft" onClick={() => { if (effortFor) updSet(effortFor.exUid, effortFor.setId, { effort: null }); setEffortFor(null) }}>No anotar</button>
          <p className="tiny muted">Termina antes de perder la postura o la respiración normal.</p>
        </div>
      </Sheet>

      <SetMenu target={setMenu} session={s} onClose={() => setSetMenu(null)} update={update} onHelp={setHelp} />
      <ExerciseMenu uid={exMenu} session={s} onClose={() => setExMenu(null)} update={update} onReplace={(uid) => { setExMenu(null); setPicker({ replaceUid: uid }) }} onDemo={(id) => { setExMenu(null); setDemoFor(id) }} onNote={(id) => { setExMenu(null); setNoteFor(id) }} onVariant={(uid, id) => { setExMenu(null); void switchVariant(uid, id) }} available={variantAvailable} onReorganize={(uid) => { setExMenu(null); setReorg(uid) }} onHelp={setHelp} />
      <BlockMenu target={blockMenu} session={s} onClose={() => setBlockMenu(null)} update={update} onHelp={setHelp} onExtra={(exUid, setId) => { const e = s.exercises.find((x) => x.uid === exUid); if (e) blockExtra(e, setId) }} />
      <ReorganizeSheet uid={reorg} session={s} onClose={() => setReorg(null)} update={update} />
      <Sheet open={!!help} onClose={() => setHelp(null)} title={help === 'drop' ? 'Serie descendente' : help === 'rest_pause' ? 'Rest-pause' : 'Superserie'}>
        {help && (
          <div className="stack">
            <p>{HELP_TEXT[help]}</p>
            {help !== 'superset' && <p className="small muted">Las técnicas avanzadas no son un requisito para ganar fuerza o músculo. Forja usa una variante conservadora (sin llegar al fallo por defecto); no reproduce exactamente los protocolos estudiados.</p>}
            <a className="btn ghost small" style={{ alignSelf: 'flex-start' }} href={`#/aprender/${help === 'drop' ? 'descendentes' : help === 'rest_pause' ? 'rest-pause' : 'superseries'}`}>Más en Aprender</a>
          </div>
        )}
      </Sheet>
      <PinnedNoteSheet exerciseId={noteFor} onClose={() => setNoteFor(null)} />
      <Sheet open={!!platesFor_} onClose={() => setPlatesFor(null)} title="Discos y calentamiento">
        {platesFor_ && (() => {
          const ex = s.exercises.find((x) => x.uid === platesFor_.exUid)
          return ex ? <PlatesBody e={ex} initialKg={platesFor_.kg} increments={increments} plates={plates} /> : null
        })()}
      </Sheet>

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
      {ex.keys && <ol className="keys small" aria-label="Tres claves">{ex.keys.map((k) => <li key={k}>{k}</li>)}</ol>}
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
  increments: Increments
  pinned?: string
  lowReadiness: boolean
  onPlates: (kg: number | null) => void
  onFillWarmup: (plan: WarmupStep[]) => void
  onDemo: () => void
  onMenu: () => void
  onToggle: (e: SessionExercise, set: SetEntry, placeholder: Partial<SetEntry>) => void
  onSet: (setId: string, patch: Partial<SetEntry>) => void
  onAddSet: () => void
  onRir: (setId: string) => void
  onSetMenu: (setId: string) => void
  onFill: (f: (st: SetEntry, workIdx: number) => Partial<SetEntry>) => void
  onNotes: (n: string) => void
  onEffort: (setId: string) => void
  onSwitchVariant: (exerciseId: string) => void
  focus?: boolean
  /** «Fuerza», «Trabajo complementario» o «Adaptación». */
  roleLabel?: string
  pair: { first: boolean; partnerName: string; kind: 'distinct' | 'same' } | null
  stepOverride?: number
  onHelp: (k: 'drop' | 'rest_pause' | 'superset') => void
  block: BlockHandlers
}) {
  const { e, suggestion: sug, history } = props
  const ex = getExercise(e.exerciseId)
  const lt = e.loadTypeSnapshot
  const p = e.prescription
  // Última vez COMPARABLE: mismo rango prescrito (banca 4–6 no se compara con banca 8–10).
  const lastH = (p ? history.find((h) => h.ex.prescription && sameScheme(h.ex.prescription, p, isTimePrescription(p, ex))) : null) ?? history[0]
  const otherH = p ? history.find((h) => h !== lastH && h.ex.prescription && !sameScheme(h.ex.prescription, p, isTimePrescription(p, ex))) : undefined
  const lastWork = lastH ? conventionalWork(lastH.ex.sets).filter((x) => x.completed) : []
  const lastBlocks = lastH ? blocksOf(lastH.ex.sets).filter((x) => x.completed) : []
  const hasBlocks = blocksOf(e.sets).length > 0
  const allDone = e.sets.filter((x) => x.kind === 'work').every((x) => x.completed)
  const showNotes = useState(!!e.notes)
  const isBw = lt === 'bodyweight'
  const useAssist = isBw && e.bwMode === 'assist'
  const cols = lt === 'time' ? 'three' : ''
  const kgLabel = lt === 'assisted' ? 'Asist.' : lt === 'band' ? 'Banda' : isBw ? (useAssist ? 'Asist.' : 'Lastre') : 'kg'
  const lastSummary = [...lastWork.map((x) => describeSet(x, lt)), ...lastBlocks.map((x) => `${METHOD_LABEL[x.method as SetMethod].toLowerCase()}: ${blockText(x, lt, formatNumber)}`)].join(' · ')
  const convDone = conventionalWork(e.sets).filter((x) => x.completed)
  const blockStartLoad = convDone[convDone.length - 1]?.weightKg ?? sug?.targetWeightKg ?? null
  const weighted = lt === 'barbell_total' || lt === 'dumbbell_each' || lt === 'machine' || lt === 'cable'
  const lastMax = lastWork.reduce<number | null>((m, x) => (x.weightKg !== null && (m === null || x.weightKg > m) ? x.weightKg : m), null)
  const workTarget = weighted ? e.sets.find((x) => x.kind === 'work' && x.weightKg !== null)?.weightKg ?? sug?.targetWeightKg ?? lastMax : null
  const pendingWarm = e.sets.filter((x) => x.kind === 'warmup' && !x.completed).length
  const warmPlan = workTarget && pendingWarm && !e.sets.some((x) => x.kind === 'warmup' && x.completed) ? warmupPlan(workTarget, pendingWarm, lt, props.increments) : []
  const showIncreaseNote = props.lowReadiness && sug && (sug.kind === 'increase' || sug.kind === 'increase_optional')
  let workN = 0
  return (
    <section className={`card wk-ex ${props.current ? 'current' : ''} ${allDone ? 'done' : ''}`} aria-label={`${props.index + 1}. ${e.nameSnapshot}`}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow stack-sm" style={{ gap: 2 }}>
          <div className="row wrap" style={{ gap: 6 }}>
            {props.pair && (
              <button className="badge accent" style={{ border: 0, cursor: 'pointer' }} onClick={() => props.onHelp('superset')} aria-label={`Superserie ${props.pair.first ? 'A1' : 'A2'} con ${props.pair.partnerName}: ${props.pair.kind === 'same' ? 'mismo músculo' : 'grupos distintos'}. Qué es`}>
                <Link2 size={12} aria-hidden /> Superserie {props.pair.first ? 'A1' : 'A2'} · {props.pair.kind === 'same' ? 'mismo músculo (elegida a mano)' : 'grupos distintos'}
              </button>
            )}
            {hasBlocks && <span className="badge">Normal + {[...new Set(blocksOf(e.sets).map((x) => METHOD_LABEL[x.method as SetMethod]))].join(' + ')}</span>}
            {e.unilateralSnapshot && <span className="badge">Por lado</span>}
            {e.painFlag && <span className="badge danger"><HeartPulse size={12} aria-hidden /> Molestia</span>}
            {e.replacedFrom && <span className="badge">Sustituto</span>}
            {props.roleLabel && <span className={`badge ${props.roleLabel === 'Fuerza' ? 'accent' : props.roleLabel === 'Adaptación' ? 'suggest' : ''}`}>{props.roleLabel}</span>}
          </div>
          <h3>{props.index + 1}. {e.nameSnapshot}</h3>
          {props.pinned && <span className="small pinned"><Pin size={14} aria-hidden /> {props.pinned}</span>}
          {p && (
            <span className="small muted">
              {describePrescription(p, ex)} · {describeRir(p, ex)} · descanso {formatDuration(p.restSec)}
            </span>
          )}
        </div>
        <button className="icon-btn soft" onClick={props.onMenu} aria-label={`Opciones de ${e.nameSnapshot}`}><Ellipsis /></button>
      </div>
      {props.focus && <div style={{ marginTop: 8 }}><DemoPlayer exerciseId={e.exerciseId} /></div>}
      {ex?.keys && (
        <ol className="keys small" aria-label="Tres claves">
          {ex.keys.map((k) => <li key={k}>{k}</li>)}
        </ol>
      )}
      {ex && functionText(ex) && (
        <details className="tiny muted">
          <summary>Qué aporta</summary>
          {functionText(ex)}
        </details>
      )}
      <div className="row wrap" style={{ marginTop: 8, gap: 6 }}>
        <button className="btn soft small" onClick={props.onDemo}>
          <CircleHelp size={16} /> Ver cómo se hace
        </button>
        {lt === 'barbell_total' && (
          <button className="btn soft small" onClick={() => props.onPlates(workTarget ?? null)}>
            <Disc3 size={16} /> Discos
          </button>
        )}
      </div>

      <div className="stack-sm" style={{ marginTop: 10 }}>
        {lastH ? (
          <div className="small">
            <span className="muted">Última vez{lastH.ex.prescription && p && sameScheme(lastH.ex.prescription, p, isTimePrescription(p, ex)) && otherH ? ` con ${rangeText(p)}` : ''} ({formatDateShort(lastH.date)}): </span>
            <strong className="num">{lastSummary || '—'}</strong>
            {otherH && otherH.ex.prescription && (
              <details className="tiny muted">
                <summary>Ver también {rangeText(otherH.ex.prescription)} ({formatDateShort(otherH.date)})</summary>
                {conventionalWork(otherH.ex.sets).filter((x) => x.completed).map((x) => describeSet(x, lt)).join(' · ') || '—'} · otro contexto de prescripción: no se compara de forma automática.
              </details>
            )}
          </div>
        ) : (
          <div className="small muted">Sin registros anteriores de este ejercicio.</div>
        )}
        {sug && (
          <div className="suggestion stack-sm">
            <span className="label"><Lightbulb aria-hidden /> Sugerencia · {sug.title}</span>
            <span className="small">{sug.detail}</span>
            {sug.options && <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{sug.options.map((o) => <li key={o}>{o}</li>)}</ul>}
            {showIncreaseNote && <span className="small"><strong>Hoy vas con menos margen:</strong> mantener la carga de la última vez también vale.</span>}
            {sug.kind === 'increment_review' && sug.targetWeightKg !== undefined && sug.altWeightKg !== undefined ? (
              <div className="row wrap">
                <button className="btn small soft" onClick={() => props.onFill(() => ({ weightKg: sug.targetWeightKg ?? null }))}>Mantener {formatNumber(sug.targetWeightKg)} kg</button>
                <button className="btn small soft" onClick={() => props.onFill(() => ({ weightKg: sug.altWeightKg ?? null }))}>Usar {formatNumber(sug.altWeightKg)} kg (+{sug.incrementPct} %)</button>
              </div>
            ) : (sug.targetWeightKg !== undefined || sug.targetAssistKg !== undefined) && (
              <button
                className="btn small soft"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => props.onFill(() => (lt === 'assisted' ? { assistKg: sug.targetAssistKg ?? null } : { weightKg: sug.targetWeightKg ?? null }))}
              >
                Usar {formatNumber(lt === 'assisted' ? sug.targetAssistKg : sug.targetWeightKg)} kg en las series pendientes
              </button>
            )}
            {sug.harderExerciseId && (
              <button className="btn small soft" style={{ alignSelf: 'flex-start' }} onClick={() => props.onSwitchVariant(sug.harderExerciseId as string)}>Cambiar a {getExercise(sug.harderExerciseId)?.name.toLowerCase()}…</button>
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
        {warmPlan.length > 0 && (
          <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={() => props.onFillWarmup(warmPlan)}>
            <Flame size={16} /> Calentamiento: {warmPlan.map((w) => `${formatNumber(w.kg)}×${w.reps}`).join(' · ')}
          </button>
        )}
      </div>

      <div className={`set-grid ${cols}`} style={{ marginTop: 10 }}>
        <span className="hdr">Serie</span>
        {lt !== 'time' && <span className="hdr" title={LOAD_LABEL[lt].help}>{kgLabel}</span>}
        <span className="hdr">{lt === 'time' ? 'Seg.' : e.unilateralSnapshot ? 'Rep./lado' : 'Rep.'}</span>
        {lt !== 'time' ? <span className="hdr">RIR</span> : <span className="hdr" title="Esfuerzo percibido 0–10 (opcional)">Esf.</span>}
        <span className="hdr">Hecha</span>
        {e.sets.map((set, si) => {
          if (set.kind === 'work') workN++
          if (isBlock(set)) {
            return (
              <BlockRow
                key={set.id}
                set={set}
                n={workN}
                lt={lt}
                exName={e.nameSnapshot}
                advice={blockAdvice(set, lt, history, formatNumber)}
                startLoad={blockStartLoad}
                increments={props.increments}
                stepOverride={props.stepOverride}
                h={props.block}
                onHelp={() => props.onHelp(set.method as SetMethod)}
              />
            )
          }
          const prevInSession = e.sets.slice(0, si).reverse().find((x) => x.completed && !isBlock(x))
          const ph = placeholderFor(lt, sug && sug.kind !== 'paused_pain' && sug.kind !== 'paused_scope' ? sug : null, lastWork[Math.max(0, workN - 1)], prevInSession, p?.repMin)
          const tag = set.kind === 'warmup' ? 'C' : String(workN)
          const warmN = e.sets.slice(0, si + 1).filter((x) => x.kind === 'warmup').length
          const setName = set.kind === 'warmup' ? `calentamiento ${warmN}` : `serie ${workN}`
          return (
            <SetRow
              key={set.id}
              setName={setName}
              set={set}
              lt={lt}
              tag={tag}
              ph={ph}
              useAssist={useAssist}
              onSet={(patch) => props.onSet(set.id, patch)}
              onToggle={() => props.onToggle(e, set, ph)}
              onRir={() => props.onRir(set.id)}
              onEffort={() => props.onEffort(set.id)}
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

interface BlockHandlers {
  draft: (setId: string, patch: { weightKg?: number | null; reps?: number | null; rir?: number | null }) => void
  register: (setId: string, suggestedKg: number | null) => void
  next: (setId: string) => void
  end: (setId: string) => void
  extra: (setId: string) => void
  undo: (setId: string) => void
  menu: (setId: string) => void
  rir: (setId: string) => void
}

/**
 * Bloque especial tramo a tramo: tramo actual, carga SUGERIDA para el siguiente, repeticiones reales y RIR opcional.
 * «Registrar tramo» guarda en el momento; «Continuar bajada»/«Empezar miniserie» marca el inicio del siguiente (la pausa
 * real se calcula con esas marcas); «Terminar bloque» cierra sin inventar lo pendiente. El descanso habitual llega al final.
 */
function BlockRow({ set, n, lt, exName, advice, startLoad, increments, stepOverride, h, onHelp }: { set: SetEntry; n: number; lt: LoadType; exName: string; advice: BlockAdvice; startLoad: number | null; increments: Increments; stepOverride?: number; h: BlockHandlers; onHelp: () => void }) {
  const b = set.block
  if (!b || !set.method) return null
  const method = set.method
  const segs = b.segments
  const [one] = NEXT_NAME[method]
  const label = (i: number) => (i === 0 ? 'Tramo inicial' : `${method === 'drop' ? 'Bajada' : 'Miniserie'} ${i}`)
  const prev = segs[segs.length - 1]
  const prevLoad = prev ? segmentLoad(prev, lt) : null
  const drop = method === 'drop' && prev ? dropSuggestion(prevLoad, lt, increments, stepOverride, b.target.dropPct) : null
  const suggested = lt === 'band' ? null : segs.length === 0 ? advice.firstLoad ?? startLoad : method === 'drop' ? drop?.kg ?? null : prevLoad
  const range = segs.length === 0 ? [b.target.firstRepMin, b.target.firstRepMax] : [b.target.nextRepMin, b.target.nextRepMax]
  const draft = b.draft ?? { weightKg: null, reps: null, rir: null }
  const registering = canRegister(set)
  const waiting = !b.ended && segs.length > 0 && segs.length < b.plannedSegments && b.nextStartedAt === null
  const modified = blockModified(set, lt)
  const typedLoad = draft.weightKg ?? suggested
  const notLower = method === 'drop' && segs.length > 0 && prevLoad !== null && typedLoad !== null && (lt === 'assisted' ? typedLoad <= prevLoad : typedLoad >= prevLoad)
  const loadField = lt === 'assisted' ? 'Asistencia en kg' : lt === 'bodyweight' ? 'Lastre en kg (opcional)' : LOAD_LABEL[lt].field
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '' : formatNumber(v))
  const segText = (i: number) => {
    const sg = segs[i]
    const load = segmentLoad(sg, lt)
    const loadTxt = lt === 'band' ? '' : lt === 'bodyweight' ? (load ? `+${formatNumber(load)} kg · ` : '') : lt === 'assisted' ? `asist. ${formatNumber(load)} kg · ` : `${formatNumber(load)} kg${lt === 'dumbbell_each' ? ' c/u' : ''} × `
    return `${loadTxt}${sg.reps ?? '—'}${lt === 'band' || lt === 'bodyweight' || lt === 'assisted' ? ' rep' : ''}${sg.rir !== null ? ` · RIR ${sg.rir}` : ''}${sg.pauseSec !== null ? ` · ${method === 'drop' ? 'cambio' : 'pausa'} ${sg.pauseSec} s` : ''}`
  }
  return (
    <div className="block-row stack-sm" role="group" aria-label={`${METHOD_LABEL[method]}, bloque ${n} de ${exName}`}>
      <div className="row" style={{ gap: 8 }}>
        <button className="set-tag block" onClick={() => h.menu(set.id)} aria-label={`Opciones del bloque ${n}`}>{method === 'drop' ? 'D' : 'RP'}</button>
        <strong className="grow small">{METHOD_LABEL[method]} · {b.plannedSegments} tramos{b.ended === 'early' ? ' · terminado antes' : b.ended ? ' · hecho' : ''}</strong>
        <button className="icon-btn" onClick={onHelp} aria-label={`Qué es: ${METHOD_LABEL[method]}`}><CircleHelp size={18} /></button>
      </div>
      {advice.last && segs.length === 0 && (
        <span className="tiny muted">Última vez ({formatDateShort(advice.last.date)}): {advice.last.text}.{advice.diff ? ` ${advice.diff}` : ''} Los bloques no suben la carga solos: ajústala tú si quieres.</span>
      )}
      {segs.length > 0 && (
        <ol className="segs small" aria-label="Tramos registrados">
          {segs.map((sg, i) => <li key={sg.id}><span className="muted">{label(i)}:</span> <span className="num">{segText(i)}</span></li>)}
        </ol>
      )}
      {registering && (
        <div className="stack-sm">
          <span className="small">
            <strong>{label(segs.length)}</strong> · {range[0]}–{range[1]} rep, RIR {b.target.rirMin}–{b.target.rirMax} opcional (se admite 0)
            {method === 'drop' && segs.length > 0 && (drop ? ` · carga sugerida ${formatNumber(drop.kg)} kg (−${drop.pct} %)` : ' · sin una bajada razonable con tu material: escribe la carga')}
            {method === 'rest_pause' && segs.length > 0 && ' · misma carga'}
          </span>
          <div className="row" style={{ gap: 6 }}>
            {lt !== 'band' && <DecimalInput label={`${loadField}, ${label(segs.length).toLowerCase()} del bloque ${n}`} value={draft.weightKg} onChange={(v) => h.draft(set.id, { weightKg: v })} placeholder={fmt(suggested)} />}
            <DecimalInput label={`Repeticiones, ${label(segs.length).toLowerCase()} del bloque ${n}`} integer value={draft.reps} onChange={(v) => h.draft(set.id, { reps: v })} placeholder={`${range[0]}–${range[1]}`} max={200} />
            <button className={`rir-btn ${draft.rir !== null ? 'set' : ''}`} style={{ width: 64, flex: 'none' }} onClick={() => h.rir(set.id)} aria-label={`RIR, ${label(segs.length).toLowerCase()} del bloque ${n}: ${draft.rir ?? 'sin anotar'}`}>{draft.rir === null ? 'RIR' : draft.rir >= 5 ? '5+' : draft.rir}</button>
          </div>
          {notLower && <span className="tiny" style={{ color: 'var(--warn)' }}>Esa carga no es menor que la del tramo anterior: se guardará como bloque modificado y no se comparará de forma automática.</span>}
          <div className="row" style={{ gap: 6 }}>
            <button className="btn primary small grow" disabled={draft.reps === null} onClick={() => h.register(set.id, suggested)}>Registrar tramo</button>
            {segs.length > 0 && <button className="btn soft small" onClick={() => h.end(set.id)}>Terminar bloque</button>}
          </div>
        </div>
      )}
      {waiting && (
        <div className="stack-sm">
          <span className="small">{method === 'drop' ? (drop ? `Siguiente: baja a ${formatNumber(drop.kg)} kg (−${drop.pct} %). Cámbialo sin prisa y continúa.` : 'Siguiente: ajusta la carga (escríbela tú) y continúa.') : `Pausa breve (${b.target.pauseSec ?? RP_PAUSE_SEC} s, ampliable) y sigue con la misma carga.`}</span>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn primary small grow" onClick={() => h.next(set.id)}>{method === 'drop' ? 'Continuar bajada' : 'Empezar miniserie'}</button>
            <button className="btn soft small grow" onClick={() => h.end(set.id)}>Terminar bloque</button>
          </div>
        </div>
      )}
      {b.ended && (
        <span className="small">{b.ended === 'complete' ? 'Bloque completo.' : 'Bloque terminado antes de tiempo: se guarda lo hecho, sin inventar lo pendiente.'}{modified ? ' Bloque modificado: queda fuera de las comparaciones automáticas.' : ''}</span>
      )}
      {(segs.length > 0 || (b.ended === 'complete' && b.plannedSegments < MAX_SEGMENTS)) && (
        <div className="row wrap" style={{ gap: 6 }}>
          {segs.length > 0 && <button className="btn ghost small" onClick={() => h.undo(set.id)}>Deshacer último tramo</button>}
          {b.ended === 'complete' && b.plannedSegments < MAX_SEGMENTS && <button className="btn ghost small" onClick={() => h.extra(set.id)}>Otra {one} (opcional)</button>}
        </div>
      )}
    </div>
  )
}

/** Opciones de un bloque: ayuda, volver a series normales (si no ha empezado), otra bajada/miniserie, lado, quitar. */
function BlockMenu({ target, session, onClose, update, onHelp, onExtra }: { target: { exUid: string; setId: string } | null; session: Session; onClose: () => void; update: Upd; onHelp: (k: SetMethod) => void; onExtra: (exUid: string, setId: string) => void }) {
  const e = session.exercises.find((x) => x.uid === target?.exUid)
  const set = e?.sets.find((x) => x.id === target?.setId)
  const b = set?.block
  const open = !!target && !!b && !!set?.method
  return (
    <Sheet open={open} onClose={onClose} title={set?.method ? `Bloque ${METHOD_LABEL[set.method].toLowerCase()}` : 'Bloque'}>
      {e && set && b && set.method && (
        <div className="list">
          <button className="list-item" onClick={() => { onClose(); onHelp(set.method as SetMethod) }}><CircleHelp size={20} /> Qué es y cómo se registra</button>
          {!b.segments.length && (
            <button className="list-item" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? revertBlock(ee, set.id) ?? ee : ee)) }), 'Vuelta a series normales'); onClose() }}>
              <Repeat size={20} /> Hacer series normales ({b.replaces ?? 1} {(b.replaces ?? 1) === 1 ? 'serie' : 'series'})
            </button>
          )}
          {!b.ended && b.plannedSegments < MAX_SEGMENTS && (
            <button className="list-item" onClick={() => { onExtra(e.uid, set.id); onClose() }}><Plus size={20} /> Añadir otra {NEXT_NAME[set.method][0]} (máximo {MAX_SEGMENTS} tramos)</button>
          )}
          {e.unilateralSnapshot && (
            <div className="seg" style={{ margin: '8px 0' }}>
              {(['both', 'left', 'right'] as const).map((sd) => (
                <button key={sd} aria-pressed={set.side === sd} onClick={() => update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, sets: ee.sets.map((st) => (st.id === set.id ? { ...st, side: sd } : st)) } : ee)) }))}>{sd === 'both' ? 'Ambos' : sd === 'left' ? 'Izquierdo' : 'Derecho'}</button>
              ))}
            </div>
          )}
          {!b.segments.length && (
            <button className="list-item" style={{ color: 'var(--danger)' }} onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? { ...ee, sets: ee.sets.filter((st) => st.id !== set.id) } : ee)) }), 'Bloque quitado'); onClose() }}><Trash2 size={20} /> Quitar este bloque</button>
          )}
          {b.segments.length > 0 && <p className="tiny muted" style={{ padding: '8px 4px' }}>Un bloque con tramos registrados no se puede convertir ni borrar desde aquí: usa «Deshacer último tramo» si te equivocaste.</p>}
        </div>
      )}
    </Sheet>
  )
}

/** «Reorganizar trabajo pendiente»: dos series normales aún no hechas pasan a ser un bloque. Antes/después y sin prometer equivalencias. */
function ReorganizeSheet({ uid, session, onClose, update }: { uid: string | null; session: Session; onClose: () => void; update: Upd }) {
  const e = session.exercises.find((x) => x.uid === uid)
  const [method, setMethod] = useState<SetMethod>('drop')
  if (!e) return <Sheet open={false} onClose={onClose} title="" >{null}</Sheet>
  const pend = pendingConventional(e)
  const methods = (['drop', 'rest_pause'] as SetMethod[]).filter((m) => canUseMethod(m, e.loadTypeSnapshot))
  const m = methods.includes(method) ? method : methods[0]
  const inPair = supersetPartner(session.exercises, e.uid) >= 0
  const reason = inPair ? 'En una superserie no se añaden bloques: sepárala primero.' : !methods.length ? 'Este ejercicio no admite bloques (se registra por tiempo).' : pend.length < 2 ? 'Hacen falta dos series normales pendientes.' : null
  return (
    <Sheet open={!!uid} onClose={onClose} title="Reorganizar trabajo pendiente">
      <div className="stack">
        <p className="small">{e.nameSnapshot}: sustituye <strong>dos series normales aún no hechas</strong> por un bloque (inicial + {m === 'drop' ? 'bajada' : 'miniserie'}). Lo ya hecho no se toca.</p>
        {methods.length > 1 && (
          <div className="seg" role="group" aria-label="Método">
            {methods.map((x) => <button key={x} aria-pressed={m === x} onClick={() => setMethod(x)}>{METHOD_LABEL[x]}</button>)}
          </div>
        )}
        <div className="card flat tight small" style={{ background: 'var(--surface-2)' }}>
          <div>Antes: {pend.length} {pend.length === 1 ? 'serie normal pendiente' : 'series normales pendientes'}.</div>
          <div>Después: {Math.max(0, pend.length - 2) ? `${pend.length - 2} ${pend.length - 2 === 1 ? 'serie normal' : 'series normales'} + ` : ''}1 bloque {m ? METHOD_LABEL[m].toLowerCase() : ''}.</div>
        </div>
        <p className="tiny muted">Puede ahorrar tiempo, pero no se garantiza que el estímulo sea equivalente. Las series normales siguen siendo una alternativa: puedes volver a ellas mientras el bloque no haya empezado.</p>
        {reason ? <p className="small" role="alert">{reason}</p> : (
          <button className="btn primary" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? reorganizePending(ee, m) ?? ee : ee)) }), 'Dos series pendientes reorganizadas en un bloque'); onClose() }}>Reorganizar en un bloque {METHOD_LABEL[m].toLowerCase()}</button>
        )}
      </div>
    </Sheet>
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

function SetRow({ set, setName, lt, tag, ph, useAssist, onSet, onToggle, onRir, onEffort, onMenu }: { set: SetEntry; setName: string; lt: LoadType; tag: string; ph: Partial<SetEntry>; useAssist: boolean; onSet: (p: Partial<SetEntry>) => void; onToggle: () => void; onRir: () => void; onEffort: () => void; onMenu: () => void }) {
  const fmt = (n: number | null | undefined) => (n === null || n === undefined ? '' : formatNumber(n))
  const sideTxt = set.side === 'left' ? ' I' : set.side === 'right' ? ' D' : ''
  return (
    <>
      <button className={`set-tag ${set.kind === 'warmup' ? 'warm' : ''}`} onClick={onMenu} aria-label={`Opciones de ${setName}`}>{tag}{sideTxt}</button>
      {lt === 'time' ? (
        <>
          <DecimalInput label={`Segundos, ${setName}`} integer value={set.durationSec} onChange={(v) => onSet({ durationSec: v })} placeholder={fmt(ph.durationSec)} max={3600} />
          <button className={`rir-btn ${set.effort !== null && set.effort !== undefined ? 'set' : ''}`} onClick={onEffort} aria-label={`Esfuerzo percibido ${setName}: ${set.effort ?? 'sin anotar'}`}>{set.effort === null || set.effort === undefined ? '—' : set.effort}</button>
        </>
      ) : (
        <>
          {lt === 'band' ? (
            <input className="num-input" style={{ fontSize: '0.95rem' }} aria-label={`Banda (color o nivel), ${setName}`} maxLength={20} value={set.bandLabel ?? ''} onChange={(e) => onSet({ bandLabel: e.target.value || null })} placeholder="color" />
          ) : lt === 'assisted' || (lt === 'bodyweight' && useAssist) ? (
            <DecimalInput label={`Asistencia en kg, ${setName}`} value={set.assistKg} onChange={(v) => onSet({ assistKg: v })} placeholder={fmt(ph.assistKg)} />
          ) : lt === 'bodyweight' ? (
            <DecimalInput label={`Lastre en kg (opcional), ${setName}`} value={set.addedKg} onChange={(v) => onSet({ addedKg: v })} placeholder="0" />
          ) : (
            <DecimalInput label={`${LOAD_LABEL[lt].field}, ${setName}`} value={set.weightKg} onChange={(v) => onSet({ weightKg: v })} placeholder={fmt(ph.weightKg)} />
          )}
          <DecimalInput label={`Repeticiones, ${setName}`} integer value={set.reps} onChange={(v) => onSet({ reps: v })} placeholder={fmt(ph.reps)} max={500} />
          <button className={`rir-btn ${set.rir !== null ? 'set' : ''}`} onClick={onRir} aria-label={`RIR ${setName}: ${set.rir ?? 'sin anotar'}`}>{set.rir === null ? '—' : set.rir >= 5 ? '5+' : set.rir}</button>
        </>
      )}
      <button className="set-done" aria-pressed={set.completed} onClick={onToggle} aria-label={set.completed ? `Desmarcar ${setName}` : `Marcar ${setName} como hecha`}>
        <Check aria-hidden />
      </button>
    </>
  )
}

function SetMenu({ target, session, onClose, update, onHelp }: { target: { exUid: string; setId: string } | null; session: Session; onClose: () => void; update: Upd; onHelp: (k: SetMethod) => void }) {
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
          {set.kind === 'work' && !set.completed && (() => {
            const inPair = supersetPartner(session.exercises, e.uid) >= 0
            const methods = (['drop', 'rest_pause'] as SetMethod[]).filter((m) => canUseMethod(m, e.loadTypeSnapshot))
            if (!methods.length) return null
            return (
              <div className="stack-sm">
                <span className="label">Prolongar esta serie (técnica opcional)</span>
                {inPair ? <p className="tiny muted">En una superserie no se añaden bloques: sepárala primero desde las opciones del ejercicio.</p> : methods.map((m) => (
                  <button key={m} className="btn soft small" style={{ justifyContent: 'flex-start' }} onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee) => (ee.uid === e.uid ? extendSet(ee, set.id, m) ?? ee : ee)) }), `Serie convertida en bloque ${METHOD_LABEL[m].toLowerCase()}`); onClose() }}>
                    {m === 'drop' ? 'Como bloque descendente: añade una bajada' : 'Como bloque rest-pause: añade una miniserie'}
                  </button>
                ))}
                <p className="tiny muted">Es <strong>trabajo añadido</strong>, no un ahorro de tiempo. <button className="link" style={{ padding: 0, border: 0, background: 'none', color: 'var(--accent-strong)', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { onClose(); onHelp(methods[0]) }}>¿Qué es?</button></p>
              </div>
            )
          })()}
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

function ExerciseMenu({ uid, session, onClose, update, onReplace, onDemo, onNote, onVariant, available, onReorganize, onHelp }: { uid: string | null; session: Session; onClose: () => void; update: Upd; onReplace: (uid: string) => void; onDemo: (id: string) => void; onNote: (exerciseId: string) => void; onVariant: (uid: string, exerciseId: string) => void; available: (id: string) => boolean; onReorganize: (uid: string) => void; onHelp: (k: 'drop' | 'rest_pause' | 'superset') => void }) {
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
          {(() => {
            const def = getExercise(e.exerciseId)
            const easier = def?.easier && available(def.easier) ? getExercise(def.easier) : undefined
            const harder = def?.harder && available(def.harder) ? getExercise(def.harder) : undefined
            return (
              <>
                {easier && <button className="list-item" onClick={() => onVariant(e.uid, easier.id)}><ArrowDown size={20} /> Variante más fácil: {easier.name}</button>}
                {harder && <button className="list-item" onClick={() => onVariant(e.uid, harder.id)}><ArrowUp size={20} /> Variante más difícil: {harder.name}</button>}
              </>
            )
          })()}
          <button className="list-item" onClick={() => onNote(e.exerciseId)}><Pin size={20} /> Nota fija (asiento, agarre, máquina…)</button>
          {e.loadTypeSnapshot !== 'time' && pendingConventional(e).length >= 2 && supersetPartner(session.exercises, e.uid) < 0 && (
            <button className="list-item" onClick={() => onReorganize(e.uid)}><Repeat size={20} /> Reorganizar 2 series pendientes en un bloque…</button>
          )}
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
          {(() => {
            const p = supersetPartner(session.exercises, e.uid)
            if (p >= 0) {
              return (
                <button className="list-item" onClick={() => { update((x) => ({ ...x, exercises: x.exercises.map((ee, i) => (i === idx || i === p ? { ...ee, superset: undefined } : ee)) }), 'Superserie separada: lo registrado se conserva'); onClose() }}>
                  <Link2 size={20} /> Separar la superserie (equipo ocupado o más descanso)
                </button>
              )
            }
            const next = session.exercises[idx + 1]
            if (!next || supersetPartner(session.exercises, next.uid) >= 0) return null
            const hasBlocks = blocksOf(e.sets).length > 0 || blocksOf(next.sets).length > 0
            return (
              <>
                <button className="list-item" disabled={hasBlocks} onClick={() => { update((x) => { const l = [...x.exercises]; const tag = `ss-${newId().slice(0, 6)}`; l[idx] = { ...l[idx], superset: tag }; l[idx + 1] = { ...l[idx + 1], superset: tag }; return { ...x, exercises: l } }); onClose() }}>
                  <Link2 size={20} /> Superserie con el siguiente{pairKind(e.exerciseId, next.exerciseId) === 'same' ? ' (mismo músculo: elección manual)' : ''}
                </button>
                {hasBlocks && <p className="tiny muted" style={{ padding: '0 4px' }}>No se combinan superseries y bloques especiales.</p>}
              </>
            )
          })()}
          <button className="list-item" onClick={() => { onClose(); onHelp('superset') }}><CircleHelp size={20} /> Qué es una superserie</button>
          <button className="list-item" style={{ color: 'var(--danger)' }} onClick={() => { update((x) => ({ ...x, exercises: x.exercises.filter((ee) => ee.uid !== e.uid) }), 'Ejercicio eliminado de la sesión'); onClose() }}><Trash2 size={20} /> Quitar de la sesión</button>
        </div>
      )}
    </Sheet>
  )
}

function ReadinessCard({ onAnswer, onSkip }: { onAnswer: (r: Readiness) => void; onSkip: () => void }) {
  const [v, setV] = useState<{ sleep: number | null; energy: number | null; soreness: number | null }>({ sleep: null, energy: null, soreness: null })
  const complete = v.sleep !== null && v.energy !== null && v.soreness !== null
  return (
    <section className="card stack-sm" aria-label="Cómo llegas hoy">
      <div className="row between"><h3>¿Cómo llegas hoy?</h3><span className="tiny muted">Opcional</span></div>
      {(Object.keys(READINESS_SCALES) as (keyof typeof READINESS_SCALES)[]).map((k) => (
        <div key={k} className="stack-sm" style={{ gap: 4 }}>
          <span className="small"><strong>{READINESS_SCALES[k].label}</strong> <span className="muted">(1 {READINESS_SCALES[k].lo.toLowerCase()} · 5 {READINESS_SCALES[k].hi.toLowerCase()})</span></span>
          <div className="seg" role="group" aria-label={READINESS_SCALES[k].label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} aria-pressed={v[k] === n} aria-label={`${READINESS_SCALES[k].label} ${n}`} onClick={() => setV({ ...v, [k]: n })}>{n}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="row">
        <button className="btn ghost small grow" onClick={onSkip}>Omitir</button>
        <button className="btn primary small grow" disabled={!complete} onClick={() => complete && onAnswer({ sleep: v.sleep as number, energy: v.energy as number, soreness: v.soreness as number, at: Date.now() })}>Guardar</button>
      </div>
      <p className="tiny muted">Solo sirve para ajustar el día: si vas justo, la app te propone entrenar con más margen. No es un diagnóstico.</p>
    </section>
  )
}

function PinnedNoteSheet({ exerciseId, onClose }: { exerciseId: string | null; onClose: () => void }) {
  const setting = useLiveQuery(async () => (exerciseId ? (await db().exerciseSettings.get(exerciseId)) ?? null : null), [exerciseId], null)
  const [text, setText] = useState<string | null>(null)
  const toast = useToast()
  const value = text ?? setting?.note ?? ''
  const close = () => { setText(null); onClose() }
  return (
    <Sheet open={!!exerciseId} onClose={close} title="Nota fija del ejercicio">
      {exerciseId && (
        <div className="stack">
          <p className="small muted">Se muestra cada vez que hagas {getExercise(exerciseId)?.name ?? 'este ejercicio'}: altura del asiento, agarre, número de máquina, ajuste de la polea…</p>
          <textarea className="input" aria-label="Nota fija" maxLength={300} value={value} onChange={(ev) => setText(ev.target.value)} placeholder="Ej.: asiento en 4, respaldo en 2, agarre ancho" />
          <button className="btn primary" onClick={async () => { const cur = (await db().exerciseSettings.get(exerciseId)) ?? { exerciseId }; await db().exerciseSettings.put({ ...cur, exerciseId, note: value.trim() || undefined }); toast(value.trim() ? 'Nota fija guardada' : 'Nota fija borrada'); close() }}>Guardar</button>
        </div>
      )}
    </Sheet>
  )
}

function PlatesBody({ e, initialKg, increments, plates }: { e: SessionExercise; initialKg: number | null; increments: Increments; plates: number[] }) {
  const [kg, setKg] = useState<number | null>(initialKg)
  const bar = increments.barKg
  const warmCount = Math.max(2, e.sets.filter((x) => x.kind === 'warmup').length)
  const plan = kg ? warmupPlan(kg, warmCount, 'barbell_total', increments) : []
  const line = (target: number) => {
    const r = platesFor(target, bar, plates)
    if (r.belowBar) return `menos que la barra (${formatNumber(bar)} kg)`
    return `${describePlates(r.perSide, formatNumber)} por lado${r.exact ? '' : ` → ${formatNumber(r.totalKg)} kg (lo más cercano por debajo)`}`
  }
  return (
    <div className="stack">
      <label className="stack-sm" style={{ gap: 4 }}>
        <span className="small">Peso total de la barra cargada (kg)</span>
        <DecimalInput className="input" label="Peso total en kg" value={kg} onChange={setKg} max={500} placeholder="kg" />
      </label>
      {kg ? (
        <div className="card flat stack-sm" style={{ background: 'var(--surface-2)' }}>
          <span className="small muted">Barra de {formatNumber(bar)} kg +</span>
          <strong className="num" style={{ fontSize: '1.15rem' }}>{line(kg)}</strong>
        </div>
      ) : <p className="small muted">Escribe el peso total para ver los discos.</p>}
      {plan.length > 0 && (
        <div className="stack-sm">
          <h3>Calentamiento sugerido</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {plan.map((w, i) => <li key={i} className="num">{formatNumber(w.kg)} kg × {w.reps} — {w.kg <= bar ? 'barra sola' : line(w.kg)}</li>)}
          </ul>
          <p className="tiny muted">Cargas crecientes con pocas repeticiones para no cansarte antes de las series de trabajo. Es una convención práctica: ajústala a tu gusto.</p>
        </div>
      )}
      <p className="tiny muted">Discos disponibles: {plates.map(formatNumber).join(', ')} kg (por lado). Cámbialos en Ajustes → Incrementos de carga. Peso de la barra: {formatNumber(bar)} kg.</p>
    </div>
  )
}

function rangeText(p: Prescription): string {
  return p.unit === 'time' ? `${p.timeMinSec ?? '?'}–${p.timeMaxSec ?? '?'} s` : `${p.repMin}–${p.repMax}`
}
