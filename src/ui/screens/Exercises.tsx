import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Image as ImageIcon, Link2, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { saveCustomExercise } from '../../data/repo'
import { allExercises, getExercise, hasEquipment } from '../../domain/catalog'
import { EQUIPMENT_LABEL, LOAD_LABEL, MAJOR_MUSCLES, MUSCLE_LABEL, PATTERN_LABEL } from '../../domain/catalog/exercises'
import { youTubeId } from '../../domain/catalog/media'
import { checkScope } from '../../domain/engine/scope'
import { alternativesFor } from '../../domain/engine/substitution'
import { computeRecords, exerciseTrend } from '../../domain/records'
import type { EquipmentId, Exercise, LoadType, MuscleId, Pattern, Session } from '../../domain/types'
import { formatDateShort, formatNumber, newId } from '../../domain/util'
import { defaultIncrement, historyFor } from '../../domain/engine/progression'
import { DEFAULT_INCREMENTS } from '../../domain/profile'
import { LineChart } from '../components/Charts'
import { DemoPlayer } from '../components/DemoPlayer'
import { Chip, DecimalInput } from '../components/inputs'
import { useToast } from '../components/overlay'
import { Thumb } from '../components/RoutineParts'
import { back, go, href } from '../router'

const LEVEL_TXT = { beginner: 'Principiante', returning: 'Tras pausa', intermediate: 'Intermedio' }

export function ExercisesScreen() {
  const { profile } = useApp()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | null>(null)
  const [mine, setMine] = useState(false)
  const list = useMemo(() => {
    const nq = q.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    return allExercises()
      .filter((e) => !muscle || e.primary.includes(muscle))
      .filter((e) => !mine || !profile || hasEquipment(profile.equipment, e))
      .filter((e) => !nq || [e.name, ...e.synonyms, PATTERN_LABEL[e.pattern]].some((s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(nq)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [q, muscle, mine, profile])
  return (
    <>
      <header className="topbar">
        <h1 className="grow" style={{ fontSize: '1.6rem' }}>Ejercicios</h1>
        <a className="icon-btn soft" href={href('ejercicios/nuevo')} aria-label="Crear ejercicio propio"><Plus /></a>
      </header>
      <main className="page">
        <label className="row" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12 }} aria-hidden />
          <input className="input" style={{ paddingLeft: 38 }} type="search" placeholder="Buscar (sentadilla, remo, press…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" />
        </label>
        <div className="row" style={{ overflowX: 'auto', paddingBottom: 4 }} role="group" aria-label="Filtrar por músculo">
          <Chip on={mine} onClick={() => setMine(!mine)}>Mi material</Chip>
          {MAJOR_MUSCLES.map((m) => <Chip key={m} on={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>{MUSCLE_LABEL[m]}</Chip>)}
        </div>
        <span className="small muted">{list.length} ejercicios</span>
        <div className="card flat list" style={{ padding: '0 12px' }}>
          {list.map((e) => (
            <a key={e.id} className="list-item" href={href(`ejercicios/${e.id}`)}>
              <Thumb exerciseId={e.id} />
              <span className="grow stack-sm" style={{ gap: 2 }}>
                <span style={{ fontWeight: 650 }}>{e.name}</span>
                <span className="tiny muted">{e.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} · {e.equipment.length ? e.equipment.map((x) => EQUIPMENT_LABEL[x]).join(', ') : 'Sin material'}</span>
                <span className="row" style={{ gap: 4 }}>
                  {e.demoStatus === 'pendiente' && !e.custom && <span className="badge warn">Demostración pendiente</span>}
                  {e.custom && <span className="badge">Propio</span>}
                </span>
              </span>
            </a>
          ))}
        </div>
      </main>
    </>
  )
}

export function ExerciseDetailScreen({ exerciseId }: { exerciseId: string }) {
  const { profile } = useApp()
  const ex = getExercise(exerciseId)
  const sessions = useLiveQuery(() => db().sessions.toArray(), [], [] as Session[])
  const userMedia = useLiveQuery(() => db().userMedia.where('exerciseId').equals(exerciseId).toArray(), [exerciseId], [])
  const toast = useToast()
  if (!ex) return <main className="page"><p>Ejercicio no encontrado.</p></main>
  const allowE1rm = !profile || checkScope(profile).kind === 'adult'
  const rec = computeRecords(sessions, ex.id, allowE1rm)
  const trend = exerciseTrend(sessions, ex.id, allowE1rm)
  const alts = alternativesFor(ex.id, profile?.equipment ?? null, profile?.level ?? 'beginner').slice(0, 6)
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('ejercicios')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">Ejercicio</span>
      </header>
      <main className="page">
        <div className="stack-sm">
          <h1 style={{ fontSize: '1.6rem' }}>{ex.name}</h1>
          {ex.synonyms.length > 0 && <span className="small muted">También: {ex.synonyms.join(', ')}</span>}
          <div className="row wrap">
            <span className="badge">{PATTERN_LABEL[ex.pattern]}</span>
            <span className="badge">{LEVEL_TXT[ex.minLevel]}</span>
            {ex.unilateral && <span className="badge">Por lado</span>}
            {ex.custom && <span className="badge">Contenido propio</span>}
          </div>
        </div>
        <DemoPlayer exerciseId={ex.id} onOpenReference={(id) => go(`ejercicios/${id}`)} />
        {ex.variantNote && ex.demoStatus === 'verificada' && <p className="small muted">{ex.variantNote}</p>}
        <section className="card stack-sm">
          <div className="row wrap"><strong>Principales:</strong> {ex.primary.map((m) => MUSCLE_LABEL[m]).join(', ')}</div>
          {ex.secondary.length > 0 && <div className="row wrap small"><strong>Secundarios:</strong> {ex.secondary.map((m) => MUSCLE_LABEL[m]).join(', ')}</div>}
          <div className="row wrap small"><strong>Material:</strong> {ex.equipment.length ? ex.equipment.map((x) => EQUIPMENT_LABEL[x]).join(', ') : 'ninguno'}</div>
          <div className="small"><strong>Qué anotar:</strong> {LOAD_LABEL[ex.loadType].help}</div>
        </section>
        <section className="card stack-sm">
          <h3>Cómo se hace</h3>
          <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>{ex.instructions.map((t) => <li key={t}>{t}</li>)}</ol>
          <h3 style={{ marginTop: 8 }}>Errores habituales</h3>
          <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>{ex.errors.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="tiny muted">Movimiento controlado y recorrido cómodo para ti: no hace falta forzar amplitudes que duelan.</p>
        </section>

        {rec && (
          <section className="card stack">
            <h3>Tu historial</h3>
            {trend.length >= 2 && (
              <LineChart
                points={trend.map((t) => ({ x: t.date, y: ex.loadType === 'time' ? t.sec : ex.loadType === 'bodyweight' || ex.loadType === 'band' ? t.reps : t.topKg }))}
                yLabel={ex.loadType === 'time' ? 's' : ex.loadType === 'bodyweight' || ex.loadType === 'band' ? 'rep.' : 'kg'}
                second={allowE1rm && trend.some((t) => t.e1rm) ? trend.map((t) => ({ x: t.date, y: t.e1rm })) : undefined}
                label={`Evolución de ${ex.name}`}
              />
            )}
            {rec.bestLoadForReps.length > 0 && (
              <div className="stack-sm">
                <span className="small muted">Mejor carga para N repeticiones (solo series de trabajo de este mismo ejercicio):</span>
                <div className="row wrap">
                  {rec.bestLoadForReps.map((r) => <span key={r.reps} className="badge ok num">{r.reps} rep: {formatNumber(r.kg)} kg</span>)}
                </div>
              </div>
            )}
            {rec.bestE1rm && (
              <p className="small">
                <strong>1RM estimado: {formatNumber(rec.bestE1rm.kg)} kg</strong> <span className="badge suggest">Estimación</span>
                <br />
                <span className="muted tiny">Fórmula de Epley a partir de {formatNumber(rec.bestE1rm.fromKg)} kg × {rec.bestE1rm.reps} ({formatDateShort(rec.bestE1rm.date)}). Solo con series de 1–10 repeticiones; puede desviarse varios kilos. No hace falta probar tu máximo real.</span>
              </p>
            )}
            {rec.bestReps && <p className="small">Más repeticiones en una serie: <strong>{rec.bestReps.reps}</strong>{rec.bestReps.extraKg ? ` (con +${formatNumber(rec.bestReps.extraKg)} kg)` : ''} · {formatDateShort(rec.bestReps.date)}</p>}
            {rec.minAssist && <p className="small">Menor asistencia usada: <strong>{formatNumber(rec.minAssist.kg)} kg</strong> ({rec.minAssist.reps} rep.) · {formatDateShort(rec.minAssist.date)}. Menos asistencia = más difícil.</p>}
            {rec.bestTimeSec && <p className="small">Mayor tiempo: <strong>{rec.bestTimeSec.sec} s</strong> · {formatDateShort(rec.bestTimeSec.date)}</p>}
          </section>
        )}

        <ExerciseHistory exerciseId={ex.id} sessions={sessions} />
        {(ex.loadType !== 'time' && ex.loadType !== 'band') && <ExerciseSettingsCard exerciseId={ex.id} />}

        <section className="card stack-sm">
          <h3>Alternativas</h3>
          <div className="list">
            {alts.map((a) => (
              <a key={a.exercise.id} className="list-item" href={href(`ejercicios/${a.exercise.id}`)}>
                <Thumb exerciseId={a.exercise.id} />
                <span className="grow stack-sm" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 650 }}>{a.exercise.name}</span>
                  <span className="tiny muted">{a.reasons.join(' · ')}</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        {ex.custom && (
          <section className="card stack-sm">
            <h3>Demostración propia</h3>
            <p className="small muted">Añade una imagen (se guarda en este dispositivo y en tus copias) o un enlace (p. ej. un vídeo de YouTube; solo se reproduce con conexión y no se descarga).</p>
            <UserMediaEditor exerciseId={ex.id} />
            {userMedia.map((m) => (
              <div key={m.id} className="row">
                {m.kind === 'image' ? <ImageIcon size={18} aria-hidden /> : <Link2 size={18} aria-hidden />}
                <span className="grow small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.kind === 'image' ? `Imagen (${Math.round((m.bytes ?? 0) / 1024)} KB)` : m.value}</span>
                <button className="icon-btn" aria-label="Quitar" onClick={async () => { await db().userMedia.delete(m.id); toast('Demostración quitada') }}><Trash2 /></button>
              </div>
            ))}
          </section>
        )}
      </main>
    </>
  )
}

function UserMediaEditor({ exerciseId }: { exerciseId: string }) {
  const [url, setUrl] = useState('')
  const toast = useToast()
  return (
    <div className="stack-sm">
      <label className="btn soft">
        <ImageIcon size={18} /> Añadir imagen
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            if (f.size > 2 * 1024 * 1024) return toast('La imagen supera 2 MB. Usa una más pequeña.')
            if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return toast('Formato no admitido.')
            const dataUrl = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f) })
            await db().userMedia.put({ id: newId('um'), exerciseId, kind: 'image', value: dataUrl, mime: f.type, bytes: f.size, createdAt: Date.now() })
            toast('Imagen añadida')
          }}
        />
      </label>
      <div className="row">
        <input className="input grow" type="url" inputMode="url" placeholder="https://… (YouTube u otra web)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Enlace de demostración" />
        <button
          className="btn soft"
          onClick={async () => {
            try {
              const u = new URL(url.trim())
              if (u.protocol !== 'https:') throw new Error()
            } catch {
              return toast('Escribe un enlace https:// válido')
            }
            await db().userMedia.put({ id: newId('um'), exerciseId, kind: 'link', value: url.trim(), createdAt: Date.now() })
            setUrl('')
            toast(youTubeId(url) ? 'Vídeo de YouTube añadido (solo online)' : 'Enlace añadido')
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}

const PATTERNS = Object.keys(PATTERN_LABEL) as Pattern[]
const LOADS = Object.keys(LOAD_LABEL) as LoadType[]

export function NewExerciseScreen() {
  const toast = useToast()
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState<Pattern>('push_h')
  const [primary, setPrimary] = useState<MuscleId[]>(['chest'])
  const [load, setLoad] = useState<LoadType>('dumbbell_each')
  const [equip, setEquip] = useState<EquipmentId[]>([])
  const [uni, setUni] = useState(false)
  const [notes, setNotes] = useState('')
  const save = async () => {
    const id = `propio_${newId().slice(0, 8)}`
    const e: Exercise = {
      id, name: name.trim().slice(0, 80), synonyms: [], primary, secondary: [], equipment: equip, pattern, category: ['biceps', 'triceps', 'shoulder_lat', 'shoulder_rear', 'chest_iso', 'knee_ext', 'knee_flex', 'calves', 'lats_iso', 'traps', 'hip_abd', 'hip_add'].includes(pattern) ? 'isolation' : pattern.startsWith('core') ? 'core' : 'compound',
      minLevel: 'beginner', loadType: load, unilateral: uni, repProfile: 'moderate', instructions: notes.trim() ? notes.trim().split('\n').slice(0, 10) : ['Ejercicio creado por ti.'], errors: [], media: [], demoStatus: 'pendiente', custom: true, createdAt: Date.now(),
    }
    await saveCustomExercise(e)
    toast('Ejercicio creado')
    go(`ejercicios/${id}`, true)
  }
  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('ejercicios')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">Ejercicio propio</span>
      </header>
      <main className="page">
        <p className="small muted">Se marcará como contenido tuyo. Después podrás añadir una imagen o un enlace de demostración.</p>
        <div className="field"><label htmlFor="nname">Nombre</label><input id="nname" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="npat">Patrón de movimiento</label>
          <select id="npat" className="input" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>{PATTERNS.map((p) => <option key={p} value={p}>{PATTERN_LABEL[p]}</option>)}</select>
        </div>
        <span className="label">Músculos principales</span>
        <div className="row wrap">{MAJOR_MUSCLES.map((m) => <Chip key={m} on={primary.includes(m)} onClick={() => setPrimary(primary.includes(m) ? primary.filter((x) => x !== m) : [...primary, m])}>{MUSCLE_LABEL[m]}</Chip>)}</div>
        <div className="field">
          <label htmlFor="nload">Qué se anota como peso</label>
          <select id="nload" className="input" value={load} onChange={(e) => setLoad(e.target.value as LoadType)}>{LOADS.map((l) => <option key={l} value={l}>{LOAD_LABEL[l].field}</option>)}</select>
          <span className="tiny muted">{LOAD_LABEL[load].help}</span>
        </div>
        <span className="label">Material</span>
        <div className="row wrap">{(Object.keys(EQUIPMENT_LABEL) as EquipmentId[]).map((q) => <Chip key={q} on={equip.includes(q)} onClick={() => setEquip(equip.includes(q) ? equip.filter((x) => x !== q) : [...equip, q])}>{EQUIPMENT_LABEL[q]}</Chip>)}</div>
        <label className="row"><input type="checkbox" className="check" checked={uni} onChange={(e) => setUni(e.target.checked)} /> Se hace por lados (unilateral)</label>
        <div className="field"><label htmlFor="nnotes">Instrucciones (una por línea)</label><textarea id="nnotes" className="input" maxLength={1500} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button className="btn primary big block" disabled={!name.trim() || !primary.length} onClick={() => void save()}>Crear ejercicio</button>
      </main>
    </>
  )
}

/** Últimas sesiones de ESTE ejercicio (misma variante), con series de trabajo y calentamiento separados. */
function ExerciseHistory({ exerciseId, sessions }: { exerciseId: string; sessions: Session[] }) {
  const items = historyFor(exerciseId, sessions).slice(0, 8)
  if (!items.length) return null
  return (
    <section className="card stack-sm">
      <h3>Últimas sesiones</h3>
      <div className="list">
        {items.map((h) => {
          const work = h.ex.sets.filter((x) => x.kind === 'work' && x.completed)
          const lt = h.ex.loadTypeSnapshot
          const txt = work.map((x) => lt === 'time' ? `${x.durationSec ?? '?'} s` : lt === 'assisted' ? `${x.reps ?? '?'} (asist. ${formatNumber(x.assistKg)})` : lt === 'bodyweight' || lt === 'band' ? `${x.reps ?? '?'}${x.addedKg ? ` +${formatNumber(x.addedKg)}` : ''}` : `${formatNumber(x.weightKg)}×${x.reps ?? '?'}`).join(' · ')
          return (
            <a key={h.session.id} className="list-item small" href={href(`progreso/sesion/${h.session.id}`)}>
              <span style={{ width: 64 }} className="muted">{formatDateShort(h.date)}</span>
              <span className="grow num">{txt}{h.ex.painFlag ? ' · molestia' : ''}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

/** Ajustes propios de un ejercicio: incremento mínimo real (p. ej. mancuernas de 1 kg) y descanso preferido. */
function ExerciseSettingsCard({ exerciseId }: { exerciseId: string }) {
  const { profile } = useApp()
  const ex = getExercise(exerciseId)
  const setting = useLiveQuery(() => db().exerciseSettings.get(exerciseId), [exerciseId])
  const toast = useToast()
  if (!ex) return null
  const defInc = defaultIncrement(ex.loadType, profile?.increments ?? DEFAULT_INCREMENTS)
  const save = async (patch: { incrementKg?: number | undefined; restSec?: number | undefined }) => {
    await db().exerciseSettings.put({ ...(setting ?? { exerciseId }), ...patch, exerciseId })
    toast('Ajuste del ejercicio guardado')
  }
  return (
    <details className="more card flat">
      <summary>Ajustes de este ejercicio</summary>
      <div className="row" style={{ paddingTop: 8 }}>
        <label className="stack-sm grow" style={{ gap: 2 }}>
          <span className="small">{ex.loadType === 'assisted' ? 'Paso de asistencia (kg)' : 'Incremento mínimo (kg)'}</span>
          <DecimalInput className="input" label="Incremento mínimo en kg" value={setting?.incrementKg ?? null} placeholder={formatNumber(defInc)} onChange={(v) => void save({ incrementKg: v ?? undefined })} max={50} />
        </label>
        <label className="stack-sm grow" style={{ gap: 2 }}>
          <span className="small">Descanso (s)</span>
          <DecimalInput className="input" integer label="Descanso en segundos" value={setting?.restSec ?? null} placeholder="según rutina" onChange={(v) => void save({ restSec: v ?? undefined })} max={900} />
        </label>
      </div>
      <p className="tiny muted">Vacío = valor general de Ajustes ({formatNumber(defInc)} kg) o el descanso de la rutina. La sugerencia de subida usará este incremento.</p>
    </details>
  )
}
