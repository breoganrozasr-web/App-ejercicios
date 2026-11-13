import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Columns2, Ruler, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { db } from '../../data/db'
import { getMeta, setMeta } from '../../data/repo'
import { MAJOR_MUSCLES, MUSCLE_LABEL } from '../../domain/catalog/exercises'
import { lastTrainedByMuscle } from '../../domain/records'
import type { MeasureSite, PhotoPose, ProgressPhoto, Session } from '../../domain/types'
import { daysBetween, formatDateShort, formatNumber, newId, toLocalDate } from '../../domain/util'
import { LineChart } from '../components/Charts'
import { DecimalInput, Segmented } from '../components/inputs'
import { Sheet, useConfirm, useToast } from '../components/overlay'
import { compressImage } from '../photos'

export const SITE_LABEL: Record<MeasureSite, string> = {
  waist: 'Cintura',
  hips: 'Cadera',
  chest: 'Pecho',
  arm: 'Brazo',
  thigh: 'Muslo',
  calf: 'Gemelo',
  neck: 'Cuello',
}
const SITE_HOW: Record<MeasureSite, string> = {
  waist: 'a la altura del ombligo, al final de una espiración normal, sin meter tripa',
  hips: 'en la parte más ancha de los glúteos, con los pies juntos',
  chest: 'a la altura de los pezones, con los brazos relajados',
  arm: 'en la parte más ancha del brazo, relajado y siempre del mismo lado',
  thigh: 'en la parte más ancha del muslo, siempre del mismo lado',
  calf: 'en la parte más ancha del gemelo, de pie',
  neck: 'justo por debajo de la nuez',
}
const POSE_LABEL: Record<PhotoPose, string> = { front: 'Frente', side: 'Perfil', back: 'Espalda' }

export function daysAgoText(d: number): string {
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`
}

/** Días desde el último entrenamiento directo de cada músculo (dato, no medida de recuperación). */
export function MuscleRecencyCard({ sessions }: { sessions: Session[] }) {
  const today = toLocalDate()
  const last = lastTrainedByMuscle(sessions)
  const rows = MAJOR_MUSCLES.map((m) => ({ m, date: last[m], d: last[m] ? daysBetween(last[m] as string, today) : null })).sort((a, b) => (a.d ?? 9999) - (b.d ?? 9999))
  return (
    <section className="card stack">
      <h3>Último entrenamiento por músculo</h3>
      <div className="stack-sm">
        {rows.map(({ m, date, d }) => (
          <div key={m} className="row between small">
            <span>{MUSCLE_LABEL[m]}</span>
            <span className={`num ${d === null ? 'muted' : ''}`}>{d === null ? 'sin registros' : `${daysAgoText(d)} · ${formatDateShort(date as string)}`}</span>
          </div>
        ))}
      </div>
      <p className="tiny muted">Cuenta solo ejercicios donde ese músculo es el principal. Es un dato, no una medida de recuperación: cada persona se recupera a su ritmo y unas agujetas no impiden entrenar. Si vas cargado, usa «¿Cómo llegas hoy?» al empezar la sesión.</p>
    </section>
  )
}

export function BodyweightCard() {
  const today = toLocalDate()
  const bw = useLiveQuery(() => db().bodyweight.orderBy('date').toArray(), [], [])
  const [val, setVal] = useState<number | null>(null)
  const toast = useToast()
  return (
    <section className="card stack">
      <div className="row"><Scale className="faint" aria-hidden /><h3 className="grow">Peso corporal (opcional)</h3></div>
      {bw.length >= 2 && <LineChart points={bw.map((b) => ({ x: b.date, y: b.kg }))} yLabel="kg" label="Peso corporal" />}
      {bw.length > 0 && <p className="small">Último: <strong>{formatNumber(bw[bw.length - 1].kg)} kg</strong> ({formatDateShort(bw[bw.length - 1].date)})</p>}
      <div className="row">
        <DecimalInput className="input grow" label="Peso corporal de hoy en kg" value={val} onChange={setVal} placeholder="kg hoy" max={400} />
        <button className="btn soft" disabled={!val} onClick={async () => { if (!val) return; await db().bodyweight.put({ id: newId('bw'), date: today, kg: val }); setVal(null); toast('Peso anotado') }}>Anotar</button>
      </div>
      <p className="tiny muted">También sirve para estimar las calorías de cada sesión. Pésate en condiciones parecidas (p. ej. por la mañana); lo útil es la tendencia de varias semanas, no un día suelto.</p>
      {bw.length > 0 && (
        <details className="more">
          <summary>Anotaciones ({bw.length})</summary>
          <EntryList items={[...bw].reverse().map((b) => ({ id: b.id, text: `${formatDateShort(b.date)} · ${formatNumber(b.kg)} kg`, demo: b.isDemo }))} onDelete={async (id) => { const row = await db().bodyweight.get(id); await db().bodyweight.delete(id); if (row) toast('Peso borrado', { label: 'Deshacer', run: () => void db().bodyweight.put(row) }) }} />
        </details>
      )}
    </section>
  )
}

function EntryList({ items, onDelete }: { items: { id: string; text: string; demo?: boolean }[]; onDelete: (id: string) => void }) {
  return (
    <div className="list">
      {items.map((it) => (
        <div key={it.id} className="list-item" style={{ padding: '4px 0' }}>
          <span className="grow small num">{it.text} {it.demo && <span className="badge demo">Ejemplo</span>}</span>
          <button className="icon-btn" aria-label={`Borrar ${it.text}`} onClick={() => onDelete(it.id)}><Trash2 size={18} /></button>
        </div>
      ))}
    </div>
  )
}

export function MeasurementsCard() {
  const today = toLocalDate()
  const all = useLiveQuery(() => db().measurements.orderBy('date').toArray(), [], [])
  const [site, setSite] = useState<MeasureSite>('waist')
  const [cm, setCm] = useState<number | null>(null)
  const toast = useToast()
  const bySite = (s: MeasureSite) => all.filter((x) => x.site === s)
  const sel = bySite(site)
  const withData = (Object.keys(SITE_LABEL) as MeasureSite[]).filter((s) => bySite(s).length)
  return (
    <section className="card stack">
      <div className="row"><Ruler className="faint" aria-hidden /><h3 className="grow">Medidas corporales (opcional)</h3></div>
      {withData.length > 0 && (
        <div className="stack-sm">
          {withData.map((s) => {
            const list = bySite(s)
            const first = list[0]
            const lastE = list[list.length - 1]
            const diff = Math.round((lastE.cm - first.cm) * 10) / 10
            return (
              <div key={s} className="row between small">
                <span>{SITE_LABEL[s]}</span>
                <span className="num"><strong>{formatNumber(lastE.cm)} cm</strong>{list.length > 1 && <span className="muted"> ({diff > 0 ? '+' : diff < 0 ? '−' : '±'}{formatNumber(Math.abs(diff))} desde {formatDateShort(first.date)})</span>}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="row wrap" role="group" aria-label="Zona a medir">
        {(Object.keys(SITE_LABEL) as MeasureSite[]).map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={site === s} onClick={() => setSite(s)}>{SITE_LABEL[s]}</button>
        ))}
      </div>
      <p className="tiny muted">Cómo medir {SITE_LABEL[site].toLowerCase()}: {SITE_HOW[site]}. Cinta flexible, sin apretar, mejor por la mañana.</p>
      <div className="row">
        <DecimalInput className="input grow" label={`${SITE_LABEL[site]} en centímetros`} value={cm} onChange={setCm} placeholder="cm hoy" max={300} />
        <button className="btn soft" disabled={!cm || cm < 10} onClick={async () => { if (!cm) return; await db().measurements.put({ id: newId('ms'), date: today, site, cm }); setCm(null); toast(`${SITE_LABEL[site]} anotada`) }}>Anotar</button>
      </div>
      {sel.length >= 2 && <LineChart points={sel.map((m) => ({ x: m.date, y: m.cm }))} yLabel="cm" label={`Evolución de ${SITE_LABEL[site].toLowerCase()}`} />}
      {sel.length > 0 && (
        <details className="more">
          <summary>Anotaciones de {SITE_LABEL[site].toLowerCase()} ({sel.length})</summary>
          <EntryList items={[...sel].reverse().map((m) => ({ id: m.id, text: `${formatDateShort(m.date)} · ${formatNumber(m.cm)} cm`, demo: m.isDemo }))} onDelete={async (id) => { const row = await db().measurements.get(id); await db().measurements.delete(id); if (row) toast('Medida borrada', { label: 'Deshacer', run: () => void db().measurements.put(row) }) }} />
        </details>
      )}
      <p className="tiny muted">Las medidas y el peso no dicen cuánto músculo has ganado, pero junto con tus cargas ayudan a ver la tendencia: p. ej., más brazo con la misma cintura suele ir en buena dirección. Diferencias de menos de 1 cm entran en el error de medida.</p>
    </section>
  )
}

export function PhotosCard() {
  const enabled = useLiveQuery(() => getMeta<boolean>('photosEnabled', false), [], false)
  const photos = useLiveQuery(() => db().photos.orderBy('date').reverse().toArray(), [], [] as ProgressPhoto[])
  const [pose, setPose] = useState<PhotoPose>('front')
  const [view, setView] = useState<ProgressPhoto | null>(null)
  const [compare, setCompare] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()
  const totalBytes = photos.reduce((a, p) => a + (p.bytes || 0), 0)
  const ofPose = photos.filter((p) => p.pose === pose)

  if (!enabled) {
    return (
      <section className="card stack">
        <div className="row"><Camera className="faint" aria-hidden /><h3 className="grow">Fotos de progreso (opcional)</h3></div>
        <p className="small">Desactivadas. Si las activas, las fotos se guardan <strong>solo en este dispositivo</strong>: no se suben a ningún sitio y no van en las copias de seguridad salvo que lo marques al exportar.</p>
        <button className="btn soft" style={{ alignSelf: 'flex-start' }} onClick={() => void setMeta('photosEnabled', true)}>Activar fotos de progreso</button>
      </section>
    )
  }
  return (
    <section className="card stack">
      <div className="row"><Camera className="faint" aria-hidden /><h3 className="grow">Fotos de progreso</h3></div>
      <Segmented label="Postura" value={pose} onChange={setPose} options={(Object.keys(POSE_LABEL) as PhotoPose[]).map((p) => ({ value: p, label: POSE_LABEL[p] }))} />
      <label className={`btn primary ${busy ? 'disabled' : ''}`} aria-disabled={busy}>
        <Camera size={18} /> {busy ? 'Guardando…' : `Añadir foto (${POSE_LABEL[pose].toLowerCase()})`}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setBusy(true)
            try {
              const c = await compressImage(f)
              await db().photos.put({ id: newId('ph'), date: toLocalDate(), pose, dataUrl: c.dataUrl, bytes: c.bytes, width: c.width, height: c.height, createdAt: Date.now() })
              toast('Foto guardada en este dispositivo')
            } catch (err) {
              toast((err as Error).message || 'No se pudo guardar la foto')
            } finally {
              setBusy(false)
            }
          }}
        />
      </label>
      {ofPose.length > 0 ? (
        <div className="photo-grid">
          {ofPose.map((p) => (
            <button key={p.id} className="photo-thumb" onClick={() => setView(p)} aria-label={`Foto de ${POSE_LABEL[p.pose].toLowerCase()} del ${formatDateShort(p.date)}`}>
              <img src={p.dataUrl} alt="" loading="lazy" />
              <span className="tiny">{formatDateShort(p.date)}</span>
            </button>
          ))}
        </div>
      ) : <p className="small muted">Aún no hay fotos de {POSE_LABEL[pose].toLowerCase()}.</p>}
      {ofPose.length >= 2 && <button className="btn soft small" style={{ alignSelf: 'flex-start' }} onClick={() => setCompare(true)}><Columns2 size={16} /> Comparar primera y última</button>}
      <p className="tiny muted">Para comparar: misma luz, misma hora, misma distancia y ropa parecida. {photos.length} fotos · {(totalBytes / 1048576).toFixed(1).replace('.', ',')} MB en este dispositivo.</p>
      <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={async () => {
        if (photos.length && !(await confirm({ title: 'Desactivar fotos', body: '¿Quieres borrar también las fotos guardadas? Si eliges «Desactivar y borrar» no se pueden recuperar.', confirm: 'Desactivar y borrar', danger: true, cancel: 'Cancelar' }))) return
        await db().photos.clear()
        await setMeta('photosEnabled', false)
        toast('Fotos desactivadas')
      }}>Desactivar fotos{photos.length ? ' y borrarlas' : ''}</button>

      <Sheet open={!!view} onClose={() => setView(null)} title={view ? `${POSE_LABEL[view.pose]} · ${formatDateShort(view.date)}` : ''}>
        {view && (
          <div className="stack">
            <img src={view.dataUrl} alt={`Foto de progreso, ${POSE_LABEL[view.pose].toLowerCase()}, ${formatDateShort(view.date)}`} style={{ width: '100%', borderRadius: 12 }} />
            <button className="btn soft danger" onClick={async () => { if (!(await confirm({ title: '¿Borrar esta foto?', body: 'Se elimina de este dispositivo.', confirm: 'Borrar', danger: true }))) return; await db().photos.delete(view.id); setView(null); toast('Foto borrada') }}><Trash2 size={18} /> Borrar foto</button>
          </div>
        )}
      </Sheet>
      <Sheet open={compare} onClose={() => setCompare(false)} title={`Comparar · ${POSE_LABEL[pose]}`}>
        {ofPose.length >= 2 && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
            {[ofPose[ofPose.length - 1], ofPose[0]].map((p) => (
              <figure key={p.id} className="grow" style={{ margin: 0, minWidth: 0 }}>
                <img src={p.dataUrl} alt={`${POSE_LABEL[p.pose]}, ${formatDateShort(p.date)}`} style={{ width: '100%', borderRadius: 10 }} />
                <figcaption className="small center">{formatDateShort(p.date)}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Sheet>
    </section>
  )
}
