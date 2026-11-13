import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, Pause, Play, StepForward, TriangleAlert, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../../data/db'
import { getExercise } from '../../domain/catalog'
import { APPROX_REFERENCE } from '../../domain/catalog/exercises'
import { assetUrl, mediaForExercise, youTubeEmbedUrl, youTubeId } from '../../domain/catalog/media'
import { useOnline, useReducedMotion } from '../hooks'

const SPEEDS = [0.5, 1, 1.5] as const

/**
 * Demostración de un ejercicio:
 *  - Ilustraciones Everkinetic: animación alternando las posiciones (pausa, paso a paso y velocidad).
 *  - Contenido propio: imagen guardada en el dispositivo o enlace (YouTube en modo privacidad, solo con conexión).
 *  - Si falta o falla: aviso claro y enlace alternativo; nunca una ficha vacía.
 */
export function DemoPlayer({ exerciseId, onOpenReference }: { exerciseId: string; onOpenReference?: (id: string) => void }) {
  const ex = getExercise(exerciseId)
  const media = mediaForExercise(exerciseId)
  const userMedia = useLiveQuery(() => db().userMedia.where('exerciseId').equals(exerciseId).toArray(), [exerciseId])
  if (media?.frames?.length) return <FramesPlayer key={exerciseId} frames={media.frames.map(assetUrl)} durations={media.frameDurationsMs ?? null} colored={!!media.colored} name={ex?.name ?? ''} credit={media.attribution} sourceUrl={media.sourceUrl} licenseUrl={media.licenseUrl} />
  const img = userMedia?.find((m) => m.kind === 'image')
  const link = userMedia?.find((m) => m.kind === 'link')
  if (img || link) {
    return (
      <div className="stack-sm">
        {img && (
          <div className="demo">
            <div className="stage">
              <img src={img.value} alt={`Imagen propia de ${ex?.name ?? 'ejercicio'}`} style={{ filter: 'none' }} />
            </div>
            <div className="credit">Contenido añadido por ti (se guarda solo en este dispositivo y en tus copias).</div>
          </div>
        )}
        {link && <ExternalVideo url={link.value} name={ex?.name ?? ''} />}
      </div>
    )
  }
  const ref = APPROX_REFERENCE[exerciseId]
  return (
    <div className="note warn" role="status">
      <TriangleAlert aria-hidden />
      <div className="stack-sm">
        <strong>Demostración pendiente</strong>
        <span>
          {ex?.custom
            ? 'Este ejercicio propio no tiene demostración. Puedes añadir una imagen o un enlace desde su ficha.'
            : 'No hay una ilustración con licencia verificada de esta variante exacta. Sigue las instrucciones escritas.'}
        </span>
        {ref && onOpenReference && (
          <button className="btn small soft" onClick={() => onOpenReference(ref)}>
            Ver referencia aproximada: {getExercise(ref)?.name} (otra variante)
          </button>
        )}
      </div>
    </div>
  )
}

function FramesPlayer({ frames, durations, colored, name, credit, sourceUrl, licenseUrl }: { frames: string[]; durations: number[] | null; colored: boolean; name: string; credit: string; sourceUrl: string; licenseUrl: string }) {
  const reduced = useReducedMotion()
  const online = useOnline()
  const [playing, setPlaying] = useState(!reduced)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [idx, setIdx] = useState(0)
  const [failed, setFailed] = useState<Set<number>>(new Set())
  // Dos posiciones (Everkinetic): fundido suave. Secuencias (Commons): cada fotograma con su duración, sin fundido.
  const phase = 1150 / speed
  const frameMs = durations ? (durations[idx] ?? 400) / speed : phase
  useEffect(() => {
    if (!playing || frames.length < 2) return
    const id = window.setTimeout(() => setIdx((i) => (i + 1) % frames.length), frameMs)
    return () => window.clearTimeout(id)
  }, [playing, frameMs, idx, frames.length])
  const allFailed = failed.size >= frames.length
  const imgFilter = colored ? 'none' : 'var(--demo-filter)'
  const labels = useMemo(
    () => frames.map((_, i) => (frames.length === 1 ? 'Posición mantenida' : frames.length === 2 ? (i === 0 ? 'Posición A' : 'Posición B') : durations ? `Fotograma ${i + 1} de ${frames.length}` : `Posición ${i + 1}`)),
    [frames, durations],
  )
  if (allFailed) {
    return (
      <div className="note warn" role="status">
        {online ? <TriangleAlert aria-hidden /> : <WifiOff aria-hidden />}
        <div className="stack-sm">
          <strong>No se pudo cargar la demostración</strong>
          <span>
            {online
              ? 'El archivo no responde. Las instrucciones de abajo siguen disponibles.'
              : 'Sin conexión y esta demostración no está descargada. Puedes descargar las de tu rutina en Ajustes → Demostraciones cuando tengas internet.'}
          </span>
          <button className="btn small soft" onClick={() => setFailed(new Set())}>Reintentar</button>
        </div>
      </div>
    )
  }
  if (frames.length === 1) {
    return (
      <div className="demo" role="group" aria-label={`Demostración: ${name}`}>
        <div className="stage">
          <img src={frames[0]} alt={`${name}: posición mantenida`} style={{ filter: imgFilter }} onError={() => setFailed(new Set([0]))} draggable={false} />
        </div>
        <div className="controls"><span className="small muted">Posición mantenida (ejercicio isométrico)</span></div>
        <div className="credit">
          {credit} <a href={sourceUrl} target="_blank" rel="noreferrer">Fuente</a> · <a href={licenseUrl} target="_blank" rel="noreferrer">Licencia</a>
        </div>
      </div>
    )
  }
  if (reduced && !playing) {
    return (
      <div className="demo">
        <div className="frames-static" style={{ padding: 8 }}>
          {frames.map((f, i) => (
            <figure key={f}>
              <img src={f} alt={`${name}: ${labels[i]}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', filter: imgFilter }} onError={() => setFailed((s) => new Set(s).add(i))} />
              <figcaption>{labels[i]}</figcaption>
            </figure>
          ))}
        </div>
        <div className="controls">
          <button className="btn small soft" onClick={() => setPlaying(true)}>
            <Play size={18} /> Animar
          </button>
          <span className="tiny muted grow">Movimiento reducido activado: se muestran las posiciones.</span>
        </div>
        <div className="credit">
          {credit} <a href={sourceUrl} target="_blank" rel="noreferrer">Fuente</a> · <a href={licenseUrl} target="_blank" rel="noreferrer">Licencia</a>
        </div>
      </div>
    )
  }
  return (
    <div className="demo" role="group" aria-label={`Demostración animada: ${name}`}>
      <div className="stage" style={{ ['--fade' as string]: durations ? '0ms' : `${Math.round(phase * 0.42)}ms` }}>
        {frames.map((f, i) => (
          <img
            key={f}
            className="frame"
            src={f}
            alt={i === idx ? `${name}: ${labels[i]}` : ''}
            aria-hidden={i !== idx}
            style={{ opacity: i === idx ? 1 : 0, filter: imgFilter }}
            onError={() => setFailed((s) => new Set(s).add(i))}
            draggable={false}
          />
        ))}
      </div>
      <div className="controls">
        <button className="icon-btn soft" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? <Pause /> : <Play />}
        </button>
        <button
          className="icon-btn soft"
          onClick={() => {
            setPlaying(false)
            setIdx((i) => (i + 1) % frames.length)
          }}
          aria-label="Siguiente posición"
        >
          <StepForward />
        </button>
        <span className="small muted grow" aria-live="polite">{labels[idx]}</span>
        <div className="seg" role="group" aria-label="Velocidad" style={{ padding: 3 }}>
          {SPEEDS.map((s) => (
            <button key={s} aria-pressed={s === speed} onClick={() => setSpeed(s)} style={{ minHeight: 38, minWidth: 44, fontSize: '0.82rem' }}>
              {String(s).replace('.', ',')}×
            </button>
          ))}
        </div>
      </div>
      <div className="credit">
        {credit} <a href={sourceUrl} target="_blank" rel="noreferrer">Fuente</a> · <a href={licenseUrl} target="_blank" rel="noreferrer">Licencia</a>
      </div>
    </div>
  )
}

export function ExternalVideo({ url, name }: { url: string; name: string }) {
  const online = useOnline()
  const [active, setActive] = useState(false)
  const id = youTubeId(url)
  if (!id) {
    return (
      <a className="btn soft block" href={url} target="_blank" rel="noreferrer">
        <ExternalLink size={18} /> Abrir enlace de demostración (externo)
      </a>
    )
  }
  const watch = `https://www.youtube.com/watch?v=${id}`
  return (
    <div className="demo">
      {active && online ? (
        <div style={{ position: 'relative', aspectRatio: '16 / 9', minHeight: 200 }}>
          <iframe
            src={youTubeEmbedUrl(id)}
            title={`Vídeo: ${name}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="stage" style={{ display: 'grid', placeItems: 'center', padding: 16 }}>
          <div className="stack-sm center">
            {online ? (
              <button className="btn primary" onClick={() => setActive(true)}>
                <Play size={18} /> Reproducir vídeo
              </button>
            ) : (
              <span className="row" style={{ justifyContent: 'center' }}>
                <WifiOff size={18} /> El vídeo necesita conexión
              </span>
            )}
            <span className="tiny muted">Vídeo externo de YouTube (modo de privacidad mejorada). No se descarga ni se guarda para uso sin conexión.</span>
          </div>
        </div>
      )}
      <div className="controls">
        <a className="btn small soft" href={watch} target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> Ver en YouTube
        </a>
        <span className="tiny muted grow">Si el vídeo no carga o no permite incrustarse, usa este enlace.</span>
      </div>
    </div>
  )
}
