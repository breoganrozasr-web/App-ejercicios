import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, CalendarClock, Check, ChevronRight, Compass, Info, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { getProgramState, getRoutineBundle, saveRoutineVersion, updateProgramState } from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { REGION_LABEL } from '../../domain/engine/contribution'
import {
  PHASE_LABEL, PHASE_RULES, addOneSet, computeProgram, decideReview, enterProgression, nextReviewText, reviewProposal, techniqueGate, type ProgramView, type ReviewAnswers,
} from '../../domain/program'
import { HELP_TEXT } from '../../domain/techniques'
import type { ProgramState, Session } from '../../domain/types'
import { formatDateShort, toLocalDate } from '../../domain/util'
import { Toggle } from '../components/inputs'
import { useConfirm, useToast } from '../components/overlay'
import { back, href } from '../router'

/** Estado del programa calculado con los datos actuales (sin efectos: las decisiones se guardan con updateProgramState). */
export function useProgram(): { view: ProgramView | null; state: ProgramState; bundle: Awaited<ReturnType<typeof getRoutineBundle>> | undefined; sessions: Session[] } {
  const { profile, currentRoutineId } = useApp()
  const today = toLocalDate()
  const state = useLiveQuery(() => getProgramState(), [], {} as ProgramState)
  const bundle = useLiveQuery(async () => (currentRoutineId ? await getRoutineBundle(currentRoutineId) : null), [currentRoutineId])
  const sessions = useLiveQuery(() => db().sessions.toArray(), [], [] as Session[])
  const view = profile && bundle !== undefined ? computeProgram({ profile, routine: bundle?.routine ?? null, version: bundle?.version ?? null, sessions, state, today }) : null
  return { view, state, bundle, sessions }
}

function learningText(v: ProgramView): string {
  if (!v.learning) return ''
  if (v.learning.extended) return 'Aprendizaje prolongado a petición tuya: misma dosis de familiarización hasta que decidas terminarlo.'
  if (v.learning.unit === 'weeks') return `Familiarización por semanas (rutina anterior a la versión 1.2): semana ${v.learning.completed + 1} de ${v.learning.total}.`
  return `${v.learning.reason === 'returning' ? 'Adaptación tras la pausa' : 'Familiarización'}: ${v.learning.completed} de ${v.learning.total} días válidos (al menos el 70 % de las series; uno por fecha).`
}

/** Tarjeta discreta en Progreso: fase actual, datos que la sustentan y próximo punto de revisión. */
export function PhaseCard() {
  const { view } = useProgram()
  if (!view) return null
  return (
    <a className="card stack-sm" href={href('progreso/fase')} style={{ textDecoration: 'none', color: 'inherit' }} aria-label={`Tu programa: fase ${PHASE_LABEL[view.phase]}`}>
      <div className="row between">
        <h3 className="row" style={{ gap: 6 }}><Compass size={18} aria-hidden /> Tu programa</h3>
        <span className="badge accent">{PHASE_LABEL[view.phase]}</span>
      </div>
      <span className="small">{view.phase === 'learning' ? learningText(view) : `${view.validDays} ${view.validDays === 1 ? 'día válido' : 'días válidos'} de entrenamiento${view.firstValid ? ` desde el ${formatDateShort(view.firstValid)}` : ''}.`}</span>
      <span className="small muted">{nextReviewText(view)}</span>
      <span className="tiny muted row" style={{ gap: 4 }}>Ver detalle <ChevronRight size={14} aria-hidden /></span>
    </a>
  )
}

/** Tarjetas en Hoy: revisión de fase (una sola, no intrusiva), readaptación tras pausa y paso a Consolidación. */
export function TodayProgramCards({ hasActive }: { hasActive: boolean }) {
  const { view, state, bundle } = useProgram()
  const toast = useToast()
  const today = toLocalDate()
  if (!view || hasActive) return null
  const seenKey = bundle ? `consolidation:${bundle.version.id}` : ''
  const showDone = !!view.learningDoneOn && view.phase === 'consolidation' && !!bundle && !(state.seen ?? []).includes(seenKey) && view.learningDoneOn >= addDaysSafe(today, -21)
  return (
    <>
      {view.reviewDue && (
        <section className="card stack-sm" aria-label="Revisión del programa">
          <strong>Ya tienes constancia suficiente para revisar tu programa.</strong>
          <span className="small muted">{(() => {
            const done = view.refs.filter((r) => r.exposures >= PHASE_RULES.reviewRefExposures)
            const names = done.slice(0, 3).map((r) => `${getExercise(r.exerciseId)?.name ?? r.exerciseId} (${r.exposures})`).join(', ')
            return `${view.validDays} días válidos en ${Math.max(1, Math.round(view.spanDays / 7))} semanas · referencias practicadas: ${names}${done.length > 3 ? ` y ${done.length - 3} más` : ''}.`
          })()}</span>
          <a className="btn primary small" href={href('progreso/fase')}>Revisar y continuar</a>
          <div className="row">
            <button className="btn soft small grow" onClick={async () => { await updateProgramState((s) => decideReview(s, 'declined', today, view.validDays)); toast('Sigues como estás. Nada de tu progreso cambia.') }}>Seguir como estoy</button>
            <button className="btn soft small grow" onClick={async () => { await updateProgramState((s) => decideReview(s, 'postponed', today, view.validDays)); toast('Te lo volveremos a ofrecer más adelante') }}>Más adelante</button>
          </div>
        </section>
      )}
      {view.readaptation.offer && (
        <section className="card stack-sm" aria-label="Vuelta tras una pausa">
          <strong>Llevas {view.readaptation.gapDays} días sin entrenar.</strong>
          <span className="small">Una pausa no borra tu historial ni tu fase. ¿Quieres empezar con {PHASE_RULES.readaptationSessions} sesiones de readaptación (mitad de series y RIR 3–4)? Es una pauta orientativa, no una medida de lo que hayas perdido.</span>
          <div className="row">
            <button className="btn primary small grow" onClick={async () => { await updateProgramState((s) => ({ ...s, readaptation: { lastValidBefore: view.lastValid as string, decision: 'accepted', on: today, sessions: PHASE_RULES.readaptationSessions } }), 'Readaptación aceptada'); toast('Readaptación activada para las próximas sesiones') }}>Sí, con readaptación</button>
            <button className="btn soft small grow" onClick={async () => { await updateProgramState((s) => ({ ...s, readaptation: { lastValidBefore: view.lastValid as string, decision: 'declined', on: today, sessions: PHASE_RULES.readaptationSessions } }), 'Readaptación no aceptada'); toast('Sigues con tu dosis habitual') }}>No, seguir como antes</button>
          </div>
        </section>
      )}
      {showDone && (
        <section className="card stack-sm" aria-label="Fin de la familiarización">
          <strong>Has completado la familiarización: pasas a Consolidación.</strong>
          <span className="small">Desde ahora, tu rutina usa la dosis base que ya figuraba en la propuesta que aceptaste. No es otra rutina.</span>
          <div className="row">
            <button className="btn primary small grow" onClick={() => void updateProgramState((s) => ({ ...s, seen: [...(s.seen ?? []), seenKey] }))}>Entendido</button>
            <button className="btn soft small grow" onClick={async () => { await updateProgramState((s) => ({ ...s, extendLearning: true, seen: [...(s.seen ?? []), seenKey] }), 'Aprendizaje prolongado'); toast('Seguirás con la dosis de aprendizaje hasta que lo termines en Progreso') }}>Prolongar el aprendizaje</button>
          </div>
        </section>
      )}
    </>
  )
}

function addDaysSafe(d: string, n: number): string {
  const [y, m, dd] = d.split('-').map(Number)
  const t = new Date(y, m - 1, dd + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="stack-sm" style={{ gap: 4 }}>
      <span className="small">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        <button aria-pressed={value === true} onClick={() => onChange(true)}>Sí</button>
        <button aria-pressed={value === false} onClick={() => onChange(false)}>No del todo</button>
      </div>
    </div>
  )
}

/** Detalle de la fase, revisión breve (autorregistro) y propuesta comparada. */
export function PhaseScreen() {
  const { profile, activeSession } = useApp()
  const { view, state, bundle } = useProgram()
  const toast = useToast()
  const confirm = useConfirm()
  const today = toLocalDate()
  const [answers, setAnswers] = useState<ReviewAnswers>({ control: null, tolerance: null, time: null })
  const [extra, setExtra] = useState(false)
  if (!view || !profile) return null
  const answered = answers.control !== null && answers.tolerance !== null && answers.time !== null
  const proposal = bundle && answered ? reviewProposal(bundle.version, profile, answers) : null
  const gate = techniqueGate(view, state)
  const steps: ('learning' | 'consolidation' | 'progression')[] = ['learning', 'consolidation', 'progression']

  const accept = async () => {
    if (activeSession) {
      toast('Termina o descarta el entrenamiento en curso antes de cambiar la rutina: nunca cambia a mitad de una sesión.')
      return
    }
    const change = extra && proposal?.extra && bundle ? proposal.extra : null
    const ok = await confirm({
      title: 'Pasar a Progresión',
      body: change ? `Se creará una versión nueva de tu rutina con +1 serie semanal de ${REGION_LABEL[change.region].toLowerCase()} (${getExercise(change.exerciseId)?.name}). Tus sesiones pasadas no cambian. Tu experiencia declarada tampoco.` : 'Tu rutina se mantiene tal cual. Tu experiencia declarada no cambia y no se activan técnicas.',
      confirm: 'Aceptar',
    })
    if (!ok) return
    if (change && bundle) await saveRoutineVersion(bundle.routine.id, { days: addOneSet(bundle.version.days, change.uid) }, `Revisión de fase: +1 serie semanal de ${REGION_LABEL[change.region].toLowerCase()}`)
    await updateProgramState((s) => enterProgression(s, today, change ? `+1 serie de ${REGION_LABEL[change.region].toLowerCase()}` : 'rutina sin cambios'))
    toast('Fase: Progresión')
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('progreso')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">Tu programa</span>
      </header>
      <main className="page">
        <section className="card stack-sm">
          <div className="phase-steps" role="list" aria-label="Fases">
            {steps.map((p) => <div key={p} role="listitem" className={view.phase === p ? 'on' : ''} aria-current={view.phase === p ? 'step' : undefined}>{PHASE_LABEL[p]}</div>)}
          </div>
          <p className="small">{HELP_TEXT.phases}</p>
          <p className="tiny muted">Experiencia declarada en tu perfil: <strong>{profile.level === 'beginner' ? 'desde cero' : profile.level === 'returning' ? 'vuelvo tras una pausa' : 'intermedio'}</strong>. Forja no la cambia sola ni certifica tu técnica con un contador.{profile.level === 'intermediate' ? ' Tu programa parte de esa declaración, no de un historial en la app.' : ''}</p>
        </section>

        <section className="card stack-sm" aria-label="Datos de tu fase">
          <h3>Datos que la sustentan</h3>
          {view.phase === 'learning' && <p className="small">{learningText(view)}</p>}
          <ul className="milestones small">
            <li><span className={view.milestones.validDays ? 'ok' : 'no'}>{view.milestones.validDays ? '✓' : '·'}</span><span>{view.validDays} {view.validDays === 1 ? 'día válido' : 'días válidos'} de entrenamiento; hacen falta {PHASE_RULES.reviewValidDays} (sin datos de ejemplo; uno por fecha)</span></li>
            <li><span className={view.milestones.span ? 'ok' : 'no'}>{view.milestones.span ? '✓' : '·'}</span><span>{view.firstValid ? `${view.spanDays} días desde tu primera sesión válida (${formatDateShort(view.firstValid)}); hacen falta ${PHASE_RULES.reviewSpanDays}` : 'Aún no hay sesiones válidas'}</span></li>
            <li><span className={view.milestones.refs ? 'ok' : 'no'}>{view.milestones.refs ? '✓' : '·'}</span><span>Sesiones completas en tus ejercicios de referencia: {view.refs.length ? view.refs.slice(0, 4).map((r) => `${getExercise(r.exerciseId)?.name ?? r.exerciseId} ${r.exposures}`).join(' · ') : 'sin rutina actual'} (hacen falta {PHASE_RULES.reviewRefExposures} en {view.refsRequired})</span></li>
            <li><span className={view.milestones.health ? 'ok' : 'no'}>{view.milestones.health ? '✓' : '·'}</span><span>{view.milestones.health ? 'Sin señales de salud activas en tu perfil' : 'Hay una señal de salud activa en tu perfil'}</span></li>
          </ul>
          <p className="small muted"><CalendarClock size={14} aria-hidden /> {nextReviewText(view)}</p>
          <p className="tiny muted">Estos umbrales son reglas de producto de Forja para proponer una revisión. No son una prueba de dominio físico ni un plazo de resultados: ningún estudio valida que un número de sesiones o semanas convierta a alguien en intermedio.</p>
          {view.phase === 'learning' && view.learning?.extended && (
            <button className="btn soft small" style={{ alignSelf: 'flex-start' }} onClick={async () => { await updateProgramState((s) => ({ ...s, extendLearning: false }), 'Fin del aprendizaje prolongado'); toast('Aprendizaje terminado: pasas a Consolidación') }}>Terminar el aprendizaje</button>
          )}
          {view.phase === 'learning' && view.learning && !view.learning.extended && view.learning.unit === 'days' && (
            <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={async () => { await updateProgramState((s) => ({ ...s, extendLearning: true }), 'Aprendizaje prolongado'); toast('Al acabar la familiarización seguirás con la dosis de aprendizaje hasta que lo termines') }}>Quiero prolongar el aprendizaje</button>
          )}
          {view.readaptation.active && <p className="small"><RotateCcw size={14} aria-hidden /> Readaptación: sesión {view.readaptation.active.index} de {view.readaptation.active.total} (mitad de series y RIR 3–4).</p>}
        </section>

        {view.reviewReady && (
          <section className="card stack" aria-label="Revisión breve">
            <h3>Revisión breve</h3>
            <p className="small muted">Es un autorregistro: tú decides. La app no evalúa tu técnica.</p>
            <YesNo label="¿Manejas los ejercicios con control?" value={answers.control} onChange={(v) => setAnswers({ ...answers, control: v })} />
            <YesNo label="¿Toleras bien la rutina (recuperación, molestias, ganas)?" value={answers.tolerance} onChange={(v) => setAnswers({ ...answers, tolerance: v })} />
            <YesNo label="¿Tu tiempo disponible sigue siendo adecuado?" value={answers.time} onChange={(v) => setAnswers({ ...answers, time: v })} />
            {proposal && bundle && (
              <div className="stack-sm" aria-label="Propuesta comparada">
                <h3>Propuesta comparada</h3>
                <div className="card flat tight small" style={{ background: 'var(--surface-2)' }}>
                  <div><strong>Actual:</strong> «{bundle.routine.name}» (v{bundle.version.version}), sin cambios.</div>
                  <div><strong>Propuesta:</strong> {extra && proposal.extra ? `la misma rutina con +1 serie semanal de ${REGION_LABEL[proposal.extra.region].toLowerCase()} en ${getExercise(proposal.extra.exerciseId)?.name} (${proposal.extra.dayName}): ${proposal.extra.directBefore} → ${proposal.extra.directAfter} series directas; sesión ≈${proposal.extra.minutesBefore} → ≈${proposal.extra.minutesAfter} min.` : 'mantener la rutina actual. Subir de fase no obliga a aumentar series, dificultad ni días.'}</div>
                </div>
                {proposal.extra && (
                  <label className="row small" style={{ gap: 8 }}>
                    <input type="checkbox" className="check" checked={extra} onChange={(e) => setExtra(e.target.checked)} aria-label={`Añadir +1 serie semanal de ${REGION_LABEL[proposal.extra.region].toLowerCase()}`} />
                    <span className="grow">Opcional: +1 serie semanal de {REGION_LABEL[proposal.extra.region].toLowerCase()} (tu prioridad), que cabe en tu tiempo.</span>
                  </label>
                )}
                {proposal.notes.map((n) => <p key={n} className="small muted"><Info size={14} aria-hidden /> {n}</p>)}
                <button className="btn primary" onClick={() => void accept()}><Check size={18} /> Aceptar y pasar a Progresión</button>
              </div>
            )}
            <div className="row">
              <button className="btn soft small grow" onClick={async () => { await updateProgramState((s) => decideReview(s, 'declined', today, view.validDays)); toast('Sigues como estás. Nada de tu progreso cambia.'); back('progreso') }}>Seguir como estoy</button>
              <button className="btn soft small grow" onClick={async () => { await updateProgramState((s) => decideReview(s, 'postponed', today, view.validDays)); toast('Te lo volveremos a ofrecer más adelante'); back('progreso') }}>Más adelante</button>
            </div>
            <p className="tiny muted">Si lo pospones o sigues como estás, no se borra nada ni hay mensajes de fracaso; se volverá a ofrecer tras {PHASE_RULES.snoozeDays} días y {PHASE_RULES.snoozeValidDays} días válidos más.</p>
          </section>
        )}

        <section className="card stack-sm" aria-label="Técnicas opcionales">
          <h3>Técnicas para ahorrar tiempo o variar</h3>
          <Toggle checked={!!state.techniquesConsent} onChange={(v) => void updateProgramState((s) => ({ ...s, techniquesConsent: v }), v ? 'Técnicas opcionales activadas' : 'Técnicas opcionales desactivadas')} label="Quiero usar técnicas para ahorrar tiempo o variar" desc="Activa propuestas opcionales de series descendentes, rest-pause y superseries. No son necesarias para ganar fuerza o músculo. Registrar lo que hagas es posible siempre." />
          {state.techniquesConsent && (gate.allowed
            ? <p className="small">Puedes ver las propuestas en el detalle de tu rutina (un bloque al final de una sesión, máximo dos por semana).</p>
            : <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{gate.reasons.map((r) => <li key={r}>{r}</li>)}</ul>)}
          {bundle && <a className="btn soft small" style={{ alignSelf: 'flex-start' }} href={href(`rutinas/${bundle.routine.id}`)}>Ver mi rutina</a>}
        </section>

        {(state.log ?? []).length > 0 && (
          <details className="more card flat">
            <summary>Tus decisiones ({state.log?.length})</summary>
            <ul className="small" style={{ paddingLeft: 18 }}>{[...(state.log ?? [])].reverse().map((l) => <li key={`${l.at}-${l.text}`}>{new Date(l.at).toLocaleDateString('es-ES')}: {l.text}</li>)}</ul>
          </details>
        )}
        <a className="btn ghost small" style={{ alignSelf: 'flex-start' }} href={href('aprender/fases')}>Más sobre las fases</a>
      </main>
    </>
  )
}
