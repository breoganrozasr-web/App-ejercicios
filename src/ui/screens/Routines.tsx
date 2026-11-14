import { useLiveQuery } from 'dexie-react-hooks'
import {
  Archive, ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Copy, FilePlus2, Info, Lightbulb, Link2, Pencil, Plus, Repeat, ShieldCheck, Sparkles, Star, Trash2, TriangleAlert, Wand2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import {
  createBlankRoutine, createRoutine, deleteRoutine, duplicateRoutine, getRoutineBundle, moveSession, plannedForWeek, saveRoutineVersion, setCurrentRoutine, setRoutineStatus, startFreeSession,
} from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { analyzeRoutine, dayDuration, durationText } from '../../domain/engine/analysis'
import { REGION_LABEL } from '../../domain/engine/contribution'
import { buildFromTemplate, generateRoutine, prescriptionFor, priorityRegionsOf, targetRegionsFor, type FrequencyRow, type GenerateOptions, type GenerateResult, type RoutineDraft } from '../../domain/engine/generator'
import { ENGINE_VERSION, PRIORITY_CEILING, weeklyBudget } from '../../domain/engine/params'
import { isTimePrescription } from '../../domain/engine/prescription'
import { TEMPLATES, TEMPLATE_BY_ID } from '../../domain/engine/templates'
import type { Prescription, Region, Routine, RoutineDay, RoutineVersion, ScheduleOverride } from '../../domain/types'
import { WEEKDAY_NAME, WEEKDAY_SHORT, addDays, formatDateShort, newId, toLocalDate, weekStart, weekdayMon0 } from '../../domain/util'
import { DecimalInput } from '../components/inputs'
import { useConfirm, useToast } from '../components/overlay'
import { ExercisePicker, RoutineDaysView, VolumePanel } from '../components/RoutineParts'
import { back, go, href } from '../router'

function Header({ title, onBack = () => back('rutinas') }: { title: string; onBack?: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack} aria-label="Volver"><ArrowLeft /></button>
      <span className="title grow">{title}</span>
    </header>
  )
}

// ───────────────────────── Lista ─────────────────────────

export function RoutinesScreen() {
  const { currentRoutineId } = useApp()
  const routines = useLiveQuery(() => db().routines.toArray(), [], [] as Routine[])
  const active = routines.filter((r) => r.status === 'active').sort((a, b) => (a.id === currentRoutineId ? -1 : b.id === currentRoutineId ? 1 : b.updatedAt - a.updatedAt))
  const archived = routines.filter((r) => r.status === 'archived')
  const toast = useToast()
  return (
    <>
      <header className="topbar"><h1 className="grow" style={{ fontSize: '1.6rem' }}>Rutinas</h1></header>
      <main className="page">
        <div className="stack-sm">
          <a className="btn primary block" href={href('rutinas/generar')}><Wand2 size={18} /> Proponer rutina con mi perfil</a>
          <div className="row">
            <a className="btn soft grow" href={href('rutinas/plantillas')}><Sparkles size={18} /> Plantillas</a>
            <button
              className="btn soft grow"
              onClick={async () => {
                const r = await createBlankRoutine()
                toast('Rutina en blanco creada')
                go(`rutinas/${r.id}/editar`)
              }}
            >
              <FilePlus2 size={18} /> En blanco
            </button>
          </div>
        </div>
        <h2 className="section-title">Mis rutinas</h2>
        {active.length === 0 && (
          <div className="card empty">
            <CalendarDays aria-hidden />
            <p>Aún no tienes rutinas. Pide una propuesta, elige una plantilla o empieza en blanco.</p>
          </div>
        )}
        {active.map((r) => <RoutineCard key={r.id} r={r} current={r.id === currentRoutineId} />)}
        {archived.length > 0 && (
          <details className="more">
            <summary>Archivadas ({archived.length})</summary>
            <div className="stack" style={{ paddingTop: 8 }}>
              {archived.map((r) => <RoutineCard key={r.id} r={r} current={false} />)}
            </div>
          </details>
        )}
      </main>
    </>
  )
}

function RoutineCard({ r, current }: { r: Routine; current: boolean }) {
  const v = useLiveQuery(() => db().routineVersions.get(r.currentVersionId), [r.currentVersionId])
  return (
    <a className="card stack-sm" href={href(`rutinas/${r.id}`)} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="row between">
        <h3 className="grow">{r.name}</h3>
        {current && <span className="badge accent"><Star size={12} aria-hidden /> Actual</span>}
        {r.status === 'archived' && <span className="badge">Archivada</span>}
        {r.isDemo && <span className="badge demo">Ejemplo</span>}
      </div>
      {v && (
        <span className="small muted">
          {v.days.length} {v.days.length === 1 ? 'día' : 'días'} · {v.schedule.length ? v.schedule.map((s) => WEEKDAY_SHORT[s.weekday]).join(' ') : 'sin días asignados'} · v{v.version}
        </span>
      )}
    </a>
  )
}

// ───────────────────────── Propuesta del generador ─────────────────────────

/** Tabla real de frecuencia (días con trabajo directo; aparte, días solo indirectos). */
function FrequencyTable({ rows, compact = false }: { rows: FrequencyRow[]; compact?: boolean }) {
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

export function GenerateScreen() {
  const { profile } = useApp()
  const [options, setOptions] = useState<GenerateOptions>({})
  const [youthOk, setYouthOk] = useState(false)
  const toast = useToast()
  const result = useMemo(() => (profile ? generateRoutine(profile, options) : null), [profile, options])
  // Para «pedir más trabajo»: la propuesta sin las series extra, para comparar antes/después.
  const baseResult = useMemo<GenerateResult | null>(() => (profile && options.extraSets ? generateRoutine(profile, { ...options, extraSets: undefined }) : null), [profile, options])
  if (!profile || !result) return null
  const priorities = priorityRegionsOf(profile)
  const targets = targetRegionsFor(profile)
  const accept = async (draft: RoutineDraft) => {
    await createRoutine(draft, { makeCurrent: true, changeNote: `Generada por el motor ${ENGINE_VERSION}` })
    toast('Rutina guardada como actual')
    go('hoy')
  }
  return (
    <>
      <Header title="Propuesta" onBack={() => back('rutinas')} />
      <main className="page">
        {result.status === 'out_of_scope' && (
          <section className="card stack">
            <h2>Fuera del alcance del generador</h2>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <p>{result.message}</p>
            <div className="stack-sm">
              <button className="btn primary block" onClick={async () => { const r = await createBlankRoutine(); go(`rutinas/${r.id}/editar`) }}>Crear mi rutina a mano</button>
              <button className="btn soft block" onClick={async () => { const s = await startFreeSession(); go(`entreno/${s.id}`) }}>Registrar una sesión libre</button>
              <a className="btn ghost block" href={href('perfil')}>Revisar mi perfil</a>
            </div>
          </section>
        )}
        {result.status === 'conflict' && (
          <section className="card stack">
            <div className="row"><TriangleAlert className="faint" aria-hidden /><h2>Hay que decidir algo</h2></div>
            <p>{result.message}</p>
            <div className="stack-sm">
              {result.alternatives.map((a) => (
                <div key={a.label} className="stack-sm">
                  <button
                    className="choice"
                    onClick={() => {
                      if (a.profileAction) go('perfil')
                      else if (a.options) setOptions(a.options)
                    }}
                  >
                    <strong>{a.label}</strong>
                    <span>{a.explanation}{a.maxMinutes ? ` Sesión más larga: ≈${Math.round(a.maxMinutes / 5) * 5} min.` : ''}</span>
                  </button>
                  {a.table && <FrequencyTable rows={a.table} compact />}
                </div>
              ))}
            </div>
          </section>
        )}
        {result.status === 'ok' && (
          <>
            <section className="stack-sm">
              <span className="badge suggest" style={{ alignSelf: 'flex-start' }}><Lightbulb aria-hidden /> Propuesta (aún no guardada)</span>
              <h1>{result.draft.name}</h1>
            </section>
            {result.notices.map((n) => <div key={n} className="note info"><Info aria-hidden /><span className="small">{n}</span></div>)}
            {result.draft.warnings.map((w) => <div key={w} className="note warn"><TriangleAlert aria-hidden /><span className="small">{w}</span></div>)}
            {result.timeAdjustments.length > 0 && (
              <section className="card stack">
                <h3>Si no cabe en {profile.minutesPerSession} min</h3>
                <p className="small muted">Primero se quitan accesorios opcionales; después, series; por último, otro reparto. Revisa el cambio antes de aceptarlo. Los descansos no se acortan.</p>
                {result.timeAdjustments.map((t) => (
                  <button key={t.id} className="choice" onClick={() => setOptions(t.options)}>
                    <strong>{t.label} → sesión más larga ≈{Math.round(t.maxMinutesAfter / 5) * 5} min</strong>
                    <span>{t.explanation}</span>
                  </button>
                ))}
              </section>
            )}
            <section className="card stack-sm">
              <h3>Frecuencia real de esta propuesta</h3>
              <p className="small muted">Pedida: {profile.frequency === 'auto' && !options.frequencyOverride ? 'auto (resultado real abajo)' : `${options.frequencyOverride ?? profile.frequency}`}. Se aplica a: {targets.map((r) => REGION_LABEL[r].toLowerCase()).join(', ')}. Hombros y brazos se muestran con su resultado real.</p>
              <FrequencyTable rows={result.frequency} />
            </section>
            {profile.level === 'returning' && !result.draft.youth && (
              <label className="note info" style={{ alignItems: 'center' }}>
                <Info aria-hidden />
                <span className="grow small">Empezar con {4} sesiones de adaptación (mitad de series, RIR 3–4). Puedes quitarla o seguir con tu rutina anterior.</span>
                <input type="checkbox" className="check" aria-label="Empezar con sesiones de adaptación" checked={!options.skipAdaptation && profile.returningAdaptation !== false} onChange={(e) => setOptions({ ...options, skipAdaptation: !e.target.checked })} />
              </label>
            )}
            {!result.draft.youth && priorities.some((r) => weeklyBudget(r, profile.level, profile.goal, true)) && (
              <section className="card stack-sm">
                <h3>¿Quieres más trabajo para una prioridad?</h3>
                <p className="small muted">Propone +1 serie semanal para ese grupo sin tocar el resto. Verás la comparación antes de aceptar; nunca se aplica solo.</p>
                <div className="row wrap">
                  {priorities.filter((r) => weeklyBudget(r, profile.level, profile.goal, true)).map((r) => {
                    const cur = result.frequency.find((x) => x.region === r)?.direct ?? 0
                    return (
                      <button key={r} className="btn soft small" disabled={cur >= PRIORITY_CEILING} onClick={() => setOptions({ ...options, extraSets: { ...(options.extraSets ?? {}), [r]: (options.extraSets?.[r] ?? 0) + 1 } })}>
                        +1 serie de {REGION_LABEL[r].toLowerCase()}
                      </button>
                    )
                  })}
                </div>
                {baseResult?.status === 'ok' && (
                  <div className="note info small">
                    <span>
                      Comparación con la propuesta inicial: {priorities.map((r) => {
                        const a = baseResult.frequency.find((x) => x.region === r)?.direct ?? 0
                        const b = result.frequency.find((x) => x.region === r)?.direct ?? 0
                        return a !== b ? `${REGION_LABEL[r].toLowerCase()} ${a} → ${b} series directas` : null
                      }).filter(Boolean).join(', ')}. Sesión más larga: ≈{maxMin(baseResult.draft.days)} → ≈{maxMin(result.draft.days)} min (estimación).
                    </span>
                  </div>
                )}
              </section>
            )}
            {Object.keys(options).length > 0 && (
              <button className="btn ghost small" onClick={() => setOptions({})}>Deshacer ajustes y volver a la propuesta original</button>
            )}
            <details className="more card flat">
              <summary><Info size={18} aria-hidden /> Por qué esta rutina</summary>
              <ul className="small stack-sm" style={{ paddingLeft: 18 }}>{result.draft.rationale.map((r) => <li key={r}>{r}</li>)}</ul>
              <p className="tiny muted">Reglas deterministas del motor v{ENGINE_VERSION} (no es inteligencia artificial). Mismo perfil y misma versión de reglas → misma propuesta. Son valores iniciales de Forja, no cifras óptimas demostradas. <a href={href('aprender')}>Fuentes y artículos</a>.</p>
            </details>
            <RoutineDaysView version={result.draft} onOpenExercise={(id) => go(`ejercicios/${id}`)} />
            <VolumePanel version={result.draft} level={result.draft.youth ? 'beginner' : profile.level} goal={profile.goal} priority={priorities} targets={result.draft.plan.targetRegions} />
            {result.draft.youth && (
              <label className="note warn" style={{ alignItems: 'center' }}>
                <ShieldCheck aria-hidden />
                <span className="grow small">Entrenaré con supervisión de un adulto cualificado (entrenador, profesorado o club).</span>
                <input type="checkbox" className="check" checked={youthOk} onChange={(e) => setYouthOk(e.target.checked)} />
              </label>
            )}
            <button className="btn primary big block" disabled={result.draft.youth && !youthOk} onClick={() => void accept(result.draft)}>Usar esta rutina</button>
            <a className="btn soft block" href={href('rutinas/plantillas')}>Ver plantillas</a>
          </>
        )}
      </main>
    </>
  )
}

// ───────────────────────── Plantillas ─────────────────────────

const LOC_LABEL = { gym: 'Gimnasio', home: 'Casa', outdoor: 'Exterior' }
const LVL_LABEL = { beginner: 'Desde cero', returning: 'Tras pausa', intermediate: 'Intermedio' }

export function TemplatesScreen() {
  return (
    <>
      <Header title="Plantillas" />
      <main className="page">
        <p className="muted small">Rutinas completas y editables. Las series y repeticiones se adaptan a tu nivel y objetivo; los ejercicios, a lo que excluyas.</p>
        {TEMPLATES.map((t) => (
          <a key={t.id} className="card stack-sm" href={href(`rutinas/plantillas/${t.id}`)} style={{ textDecoration: 'none', color: 'inherit' }}>
            <h3>{t.name}</h3>
            <span className="small muted">{t.description}</span>
            <div className="row wrap">
              <span className="badge">{LOC_LABEL[t.location]}</span>
              <span className="badge">{t.sessions.length} sesiones</span>
              {t.minLevel !== 'beginner' && <span className="badge warn">Nivel: {LVL_LABEL[t.minLevel]}</span>}
              {t.goal && <span className="badge accent">{t.goal === 'strength' ? 'Fuerza' : 'Mixta'}</span>}
            </div>
          </a>
        ))}
        <section className="card stack-sm">
          <h3>Rutina en blanco</h3>
          <span className="small muted">Créala a tu manera, ejercicio a ejercicio.</span>
          <button className="btn soft" onClick={async () => { const r = await createBlankRoutine(); go(`rutinas/${r.id}/editar`) }}>Crear en blanco</button>
        </section>
        <section className="card stack-sm">
          <h3>Sesión libre</h3>
          <span className="small muted">Registra un entrenamiento sin rutina.</span>
          <button className="btn soft" onClick={async () => { const s = await startFreeSession(); go(`entreno/${s.id}`) }}>Empezar sesión libre</button>
        </section>
      </main>
    </>
  )
}

export function TemplatePreviewScreen({ templateId }: { templateId: string }) {
  const { profile } = useApp()
  const t = TEMPLATE_BY_ID[templateId]
  const built = useMemo(() => (t && profile ? buildFromTemplate(t, profile) : null), [t, profile])
  const [schedule, setSchedule] = useState<{ weekday: number; dayId: string }[] | null>(null)
  const toast = useToast()
  if (!t || !built || !profile) return <><Header title="Plantilla" /><main className="page"><p>No encontrada.</p></main></>
  const sched = schedule ?? built.draft.schedule
  return (
    <>
      <Header title="Plantilla" />
      <main className="page">
        <h1>{t.name}</h1>
        <p className="muted">{t.description}</p>
        {built.warnings.map((w) => <div key={w} className="note warn"><TriangleAlert aria-hidden /><span className="small">{w}</span></div>)}
        <details className="more card flat">
          <summary><Info size={18} aria-hidden /> Notas</summary>
          <ul className="small stack-sm" style={{ paddingLeft: 18 }}>{built.draft.rationale.map((r) => <li key={r}>{r}</li>)}</ul>
        </details>
        <ScheduleEditor days={built.draft.days} schedule={sched} onChange={setSchedule} />
        <RoutineDaysView version={{ days: built.draft.days, schedule: sched, familiarization: built.draft.familiarization }} onOpenExercise={(id) => go(`ejercicios/${id}`)} />
        <VolumePanel version={{ days: built.draft.days, schedule: sched }} level={profile.level} goal={t.goal ?? profile.goal} priority={priorityRegionsOf(profile)} />
        <button
          className="btn primary big block"
          onClick={async () => {
            await createRoutine({ ...built.draft, schedule: sched }, { makeCurrent: true, changeNote: `Desde plantilla «${t.name}»` })
            toast('Plantilla guardada como rutina actual')
            go('hoy')
          }}
        >
          Usar esta plantilla
        </button>
      </main>
    </>
  )
}

/** Asigna días de la semana a cada día de la rutina (se puede empezar cualquier día). */
function ScheduleEditor({ days, schedule, onChange }: { days: RoutineDay[]; schedule: { weekday: number; dayId: string }[]; onChange: (s: { weekday: number; dayId: string }[]) => void }) {
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

// ───────────────────────── Detalle ─────────────────────────

export function RoutineDetailScreen({ routineId }: { routineId: string }) {
  const { currentRoutineId, profile } = useApp()
  const bundle = useLiveQuery(() => getRoutineBundle(routineId), [routineId])
  const overrides = useLiveQuery(() => db().overrides.where('routineId').equals(routineId).toArray(), [routineId], [])
  const confirm = useConfirm()
  const toast = useToast()
  const [moving, setMoving] = useState<{ date: string; dayId: string } | null>(null)
  if (bundle === undefined) return null
  if (!bundle) return <><Header title="Rutina" /><main className="page"><p>Esta rutina ya no existe.</p></main></>
  const { routine, version, versions } = bundle
  const isCurrent = routine.id === currentRoutineId
  const wk = weekStart(toLocalDate())
  const planned = plannedForWeek(version, wk, overrides)
  const weekCheck = weekWithMoves(version, planned, overrides)
  return (
    <>
      <Header title="Rutina" />
      <main className="page">
        <div className="stack-sm">
          <div className="row wrap">
            {isCurrent && <span className="badge accent"><Star size={12} aria-hidden /> Actual</span>}
            {routine.status === 'archived' && <span className="badge">Archivada</span>}
            <span className="badge">v{version.version}</span>
            <span className="badge">motor {version.engineVersion}</span>
          </div>
          <h1>{routine.name}</h1>
        </div>
        <div className="row wrap">
          <a className="btn soft small" href={href(`rutinas/${routine.id}/editar`)}><Pencil size={16} /> Editar</a>
          {!isCurrent && routine.status === 'active' && <button className="btn soft small" onClick={async () => { await setCurrentRoutine(routine.id); toast('Ahora es tu rutina actual') }}><Star size={16} /> Hacer actual</button>}
          <button className="btn soft small" onClick={async () => { const r = await duplicateRoutine(routine.id); if (r) { toast('Rutina duplicada'); go(`rutinas/${r.id}`) } }}><Copy size={16} /> Duplicar</button>
          {routine.status === 'active' ? (
            <button className="btn soft small" onClick={async () => { if (await confirm({ title: 'Archivar rutina', body: 'Deja de aparecer en Hoy. Su historial de sesiones se conserva y puedes restaurarla cuando quieras.', confirm: 'Archivar' })) { await setRoutineStatus(routine.id, 'archived'); toast('Rutina archivada', { label: 'Deshacer', run: () => void setRoutineStatus(routine.id, 'active') }) } }}><Archive size={16} /> Archivar</button>
          ) : (
            <button className="btn soft small" onClick={async () => { await setRoutineStatus(routine.id, 'active'); toast('Rutina restaurada') }}><Repeat size={16} /> Restaurar</button>
          )}
          <button className="btn soft small danger" onClick={async () => { if (await confirm({ title: '¿Eliminar la rutina?', body: 'Se borra la plantilla y sus versiones. Las sesiones que ya hiciste se mantienen en tu historial.', confirm: 'Eliminar', danger: true })) { await deleteRoutine(routine.id); toast('Rutina eliminada'); go('rutinas', true) } }}><Trash2 size={16} /> Eliminar</button>
        </div>

        {version.schedule.length > 0 && (
          <section className="card stack-sm">
            <h3>Esta semana</h3>
            {planned.map((p) => (
              <div key={p.originalDate + p.dayId} className="row between" style={{ minHeight: 48 }}>
                <span className="grow">
                  <strong>{WEEKDAY_NAME[weekdayMon0(p.date)]}</strong> {formatDateShort(p.date)} · {p.dayName}
                  {p.moved && <span className="badge" style={{ marginLeft: 6 }}>Movida</span>}
                </span>
                <button className="btn ghost small" onClick={() => setMoving({ date: p.originalDate, dayId: p.dayId })}>Mover</button>
              </div>
            ))}
            {weekCheck && (
              <div className="note info small" role="status">
                <span>
                  Con las sesiones movidas esta semana: {weekCheck.freq}. {weekCheck.warnings.length ? weekCheck.warnings.join(' ') : 'Sin grupos repetidos en días seguidos.'} Duración por sesión sin cambios. Los registros ya hechos no se tocan.
                </span>
              </div>
            )}
            {moving && (
              <div className="stack-sm">
                <span className="small muted">Mover esta sesión a (solo esta semana; la rutina no cambia):</span>
                <div className="weekdays">
                  {WEEKDAY_SHORT.map((d, i) => (
                    <button key={d} className="chip" style={{ justifyContent: 'center', padding: 0 }} onClick={async () => { await moveSession(routine.id, moving.date, moving.dayId, addDays(wk, i)); setMoving(null); toast('Sesión movida') }} aria-label={WEEKDAY_NAME[i]}>{d}</button>
                  ))}
                </div>
                <div className="row">
                  <button className="btn ghost small" onClick={async () => { await moveSession(routine.id, moving.date, moving.dayId, null); setMoving(null); toast('Sesión saltada esta semana') }}>Saltar esta semana</button>
                  <button className="btn ghost small" onClick={() => setMoving(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        )}

        {version.warnings.map((w) => <div key={w} className="note warn"><TriangleAlert aria-hidden /><span className="small">{w}</span></div>)}
        <RoutineDaysView version={version} onOpenExercise={(id) => go(`ejercicios/${id}`)} />
        {profile && <VolumePanel version={version} level={profile.level} goal={profile.goal} priority={priorityRegionsOf(profile)} targets={version.plan?.targetRegions} />}
        <details className="more card flat">
          <summary><Info size={18} aria-hidden /> Por qué está así</summary>
          <ul className="small stack-sm" style={{ paddingLeft: 18 }}>{version.rationale.map((r) => <li key={r}>{r}</li>)}</ul>
          {version.familiarization ? <p className="small muted">Familiarización: las primeras {version.familiarization.sessions} sesiones completadas (al menos el 70 % de las series) llevan la mitad de series y RIR 3–4.</p> : version.rampWeeks > 0 && <p className="small muted">Familiarización (motor 1): las primeras {version.rampWeeks} semanas desde el {formatDateShort(routine.startedOn)}, cada sesión empieza con una serie menos y RIR 3–4.</p>}
        </details>
        <details className="more card flat">
          <summary>Historial de versiones ({versions.length})</summary>
          <div className="list">
            {versions.map((v) => (
              <div key={v.id} className="list-item small" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2 }}>
                <strong>v{v.version} · {new Date(v.createdAt).toLocaleDateString('es-ES')}</strong>
                <span className="muted">{v.changeNote} · motor {v.engineVersion}</span>
              </div>
            ))}
          </div>
          <p className="tiny muted">Editar crea una versión nueva. Las sesiones ya registradas guardan su propia copia y no cambian.</p>
        </details>
      </main>
    </>
  )
}

// ───────────────────────── Editor ─────────────────────────

export function RoutineEditScreen({ routineId }: { routineId: string }) {
  const { profile } = useApp()
  const bundle = useLiveQuery(() => getRoutineBundle(routineId), [routineId])
  const [name, setName] = useState<string | null>(null)
  const [days, setDays] = useState<RoutineDay[] | null>(null)
  const [schedule, setSchedule] = useState<RoutineVersion['schedule'] | null>(null)
  const [picker, setPicker] = useState<{ dayId: string; replaceUid?: string } | null>(null)
  const toast = useToast()
  const confirm = useConfirm()
  if (!bundle || !profile) return null
  const d = days ?? bundle.version.days
  const sched = schedule ?? bundle.version.schedule
  const nm = name ?? bundle.routine.name
  const dirty = days !== null || schedule !== null || name !== null
  const updDay = (id: string, f: (day: RoutineDay) => RoutineDay) => setDays(d.map((x) => (x.id === id ? f(structuredClone(x)) : x)))

  const save = async () => {
    const note = await confirm({ title: 'Guardar cambios', body: 'Se creará una versión nueva de la rutina. Las sesiones ya hechas no cambian.', confirm: 'Guardar' })
    if (!note) return
    await saveRoutineVersion(routineId, { days: d, schedule: sched.filter((s) => d.some((x) => x.id === s.dayId)) }, 'Edición manual', nm !== bundle.routine.name ? nm : undefined)
    toast('Cambios guardados')
    go(`rutinas/${routineId}`, true)
  }
  return (
    <>
      <Header title="Editar rutina" onBack={async () => { if (!dirty || (await confirm({ title: 'Descartar cambios', body: 'Hay cambios sin guardar.', confirm: 'Descartar', danger: true }))) back('rutinas') }} />
      <main className="page full">
        <div className="field">
          <label htmlFor="rname">Nombre</label>
          <input id="rname" className="input" value={nm} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        {d.map((day, di) => (
          <section key={day.id} className="card stack">
            <div className="row">
              <input className="input grow" aria-label="Nombre del día" value={day.name} maxLength={60} onChange={(e) => updDay(day.id, (x) => ({ ...x, name: e.target.value }))} />
              <button className="icon-btn" aria-label="Eliminar día" onClick={async () => { if (await confirm({ title: `Eliminar «${day.name}»`, confirm: 'Eliminar', danger: true })) setDays(d.filter((x) => x.id !== day.id)) }}><Trash2 /></button>
            </div>
            <span className="small muted">{durationText(day)}</span>
            {day.exercises.map((re, i) => {
              const ex = getExercise(re.exerciseId)
              const setP = (patch: Partial<Prescription>) => updDay(day.id, (x) => ({ ...x, exercises: x.exercises.map((e) => (e.uid === re.uid ? { ...e, prescription: { ...e.prescription, ...patch } } : e)) }))
              return (
                <div key={re.uid} className="card flat tight stack-sm" style={{ background: 'var(--surface-2)' }}>
                  <div className="row">
                    <strong className="grow">{i + 1}. {ex?.name ?? re.exerciseId}</strong>
                    <button className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => updDay(day.id, (x) => { const e = x.exercises; [e[i - 1], e[i]] = [e[i], e[i - 1]]; return x })}><ArrowUp /></button>
                    <button className="icon-btn" aria-label="Bajar" disabled={i === day.exercises.length - 1} onClick={() => updDay(day.id, (x) => { const e = x.exercises; [e[i + 1], e[i]] = [e[i], e[i + 1]]; return x })}><ArrowDown /></button>
                  </div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <Num label="Series" v={re.prescription.sets} on={(v) => setP({ sets: Math.max(1, v ?? 1) })} />
                    {ex?.loadType === 'time' ? (
                      <>
                        <Num label="Seg. mín." v={re.prescription.timeMinSec ?? 20} on={(v) => setP({ timeMinSec: v ?? 20 })} />
                        <Num label="Seg. máx." v={re.prescription.timeMaxSec ?? 40} on={(v) => setP({ timeMaxSec: v ?? 40 })} />
                      </>
                    ) : (
                      <>
                        <Num label="Rep. mín." v={re.prescription.repMin} on={(v) => setP({ repMin: Math.max(1, v ?? 1) })} />
                        <Num label="Rep. máx." v={re.prescription.repMax} on={(v) => setP({ repMax: Math.max(re.prescription.repMin, v ?? re.prescription.repMin) })} />
                      </>
                    )}
                    {!isTimePrescription(re.prescription, ex) && (
                      <>
                        <Num label="RIR mín." v={re.prescription.rirMin} on={(v) => setP({ rirMin: v ?? 0 })} />
                        <Num label="RIR máx." v={re.prescription.rirMax} on={(v) => setP({ rirMax: Math.max(re.prescription.rirMin, v ?? 0) })} />
                      </>
                    )}
                    <Num label="Desc. (s)" v={re.prescription.restSec} on={(v) => setP({ restSec: Math.max(0, v ?? 90) })} />
                    <Num label="Aprox." v={re.prescription.warmupSets} on={(v) => setP({ warmupSets: Math.max(0, v ?? 0) })} />
                  </div>
                  {re.prescription.restSec < 60 && <span className="tiny" style={{ color: 'var(--warn)' }}>Descansos por debajo de 60 s pueden restar calidad a las series.</span>}
                  <div className="row wrap">
                    <button className="btn small soft" onClick={() => setPicker({ dayId: day.id, replaceUid: re.uid })}><Repeat size={16} /> Sustituir</button>
                    {i < day.exercises.length - 1 && (
                      <button className="btn small soft" onClick={() => updDay(day.id, (x) => {
                        const a = x.exercises[i]
                        const b = x.exercises[i + 1]
                        const tag = a.superset && a.superset === b.superset ? undefined : `ss-${newId().slice(0, 6)}`
                        a.superset = tag
                        b.superset = tag
                        return x
                      })}><Link2 size={16} /> {re.superset && re.superset === day.exercises[i + 1]?.superset ? 'Quitar superserie' : 'Superserie con el siguiente'}</button>
                    )}
                    <button className="btn small soft danger" onClick={() => updDay(day.id, (x) => ({ ...x, exercises: x.exercises.filter((e) => e.uid !== re.uid) }))}><Trash2 size={16} /> Quitar</button>
                  </div>
                </div>
              )
            })}
            <button className="btn soft" onClick={() => setPicker({ dayId: day.id })}><Plus size={18} /> Añadir ejercicio</button>
            {di === d.length - 1 && null}
          </section>
        ))}
        <button className="btn soft block" onClick={() => setDays([...d, { id: newId('d').slice(0, 10), name: `Día ${String.fromCharCode(65 + d.length)}`, focus: 'custom', exercises: [] }])}><Plus size={18} /> Añadir día</button>
        <ScheduleEditor days={d} schedule={sched} onChange={setSchedule} />
        <VolumePanel version={{ days: d, schedule: sched }} level={profile.level} goal={profile.goal} priority={priorityRegionsOf(profile)} targets={bundle.version.plan?.targetRegions} />
      </main>
      <div className="wk-foot">
        <div className="inner">
          <button className="btn primary big grow" disabled={!dirty} onClick={() => void save()}>Guardar versión</button>
        </div>
      </div>
      <ExercisePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        replacing={picker?.replaceUid ? d.find((x) => x.id === picker.dayId)?.exercises.find((e) => e.uid === picker.replaceUid)?.exerciseId : undefined}
        equipment={profile.equipment}
        level={profile.level}
        onPick={(ex) => {
          if (!picker) return
          updDay(picker.dayId, (x) => {
            if (picker.replaceUid) {
              x.exercises = x.exercises.map((e) => {
                if (e.uid !== picker.replaceUid) return e
                // Al sustituir se recalcula la prescripción para el nuevo ejercicio conservando series y papel aproximado.
                const p = prescriptionFor(ex.id, e.prescription.warmupSets >= 2 ? 'main' : ex.category === 'compound' ? 'secondary' : 'accessory', profile)
                return { ...e, uid: `${x.id}-${newId().slice(0, 6)}-${ex.id}`, exerciseId: ex.id, prescription: p ? { ...p, sets: e.prescription.sets } : e.prescription }
              })
            } else {
              const p = prescriptionFor(ex.id, ex.category === 'compound' ? 'secondary' : 'accessory', profile)
              if (p) x.exercises.push({ uid: `${x.id}-${newId().slice(0, 6)}-${ex.id}`, exerciseId: ex.id, prescription: p })
            }
            return x
          })
          setPicker(null)
        }}
      />
    </>
  )
}

function maxMin(days: RoutineDay[]): number {
  return Math.round(Math.max(0, ...days.map((d) => dayDuration(d).minutes)) / 5) * 5
}

/** Semana actual con las sesiones movidas: frecuencia directa y días seguidos recalculados (sin tocar el historial). */
function weekWithMoves(version: RoutineVersion, planned: { date: string; dayId: string; moved: boolean }[], overrides: ScheduleOverride[]): { freq: string; warnings: string[] } | null {
  if (!planned.some((p) => p.moved) && !overrides.length) return null
  if (!planned.some((p) => p.moved)) return null
  const schedule = planned.map((p) => ({ weekday: weekdayMon0(p.date), dayId: p.dayId }))
  const targets = version.plan?.targetRegions ?? (['chest', 'back', 'quads', 'hamstrings', 'glutes'] as Region[])
  const a = analyzeRoutine({ days: version.days, schedule }, targets)
  const freq = targets.map((r) => `${REGION_LABEL[r].toLowerCase()} ${a.volume.find((v) => v.region === r)?.directDays ?? 0} d`).join(', ')
  return { freq: `frecuencia directa ${freq}`, warnings: a.recoveryWarnings }
}

function Num({ label, v, on }: { label: string; v: number; on: (v: number | null) => void }) {
  return (
    <label className="stack-sm" style={{ width: 74, gap: 2 }}>
      <span className="tiny muted">{label}</span>
      <DecimalInput label={label} value={v} onChange={on} integer className="num-input" />
    </label>
  )
}
