import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Download, FileDown, HardDrive, Smartphone, Trash2, Upload, User, Volume2, WifiOff } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../../App'
import { APP_VERSION, BackupError, backupFileName, exportBackup, markBackupDone, parseBackupText, previewBackup, restoreBackup, sessionsToCsv, type BackupPreview } from '../../data/backup'
import { SCHEMA_VERSION, TABLES, db } from '../../data/db'
import { clearDemo, loadDemo } from '../../data/demo'
import { DEMO_CACHE, clearDemos, demoCacheInfo, downloadDemos, formatBytes } from '../../data/offline'
import { getMeta, getRoutineBundle, saveProfile, setMeta } from '../../data/repo'
import { EXERCISES } from '../../domain/catalog/exercises'
import { ALL_MEDIA, COMMONS_MANIFEST, MEDIA_MANIFEST, demoBytes } from '../../domain/catalog/media'
import { ENGINE_VERSION } from '../../domain/engine/params'
import { DEFAULT_PLATES, PLATE_CHOICES } from '../../domain/plates'
import type { Increments, Session } from '../../domain/types'
import { formatDateShort, formatNumber, toLocalDate } from '../../domain/util'
import { Chip, DecimalInput, Segmented, Toggle } from '../components/inputs'
import { useConfirm, useToast } from '../components/overlay'
import { useOnline } from '../hooks'
import { isIOS, isStandalone, persistenceStatus, requestPersistence } from '../pwa'
import { back, href } from '../router'
import { getKeepAwake, getSoundMode, hasAudioSessionApi, setKeepAwake, setSoundMode, testSound, type SoundMode } from '../sound'
import { wakeLockSupported } from '../wakelock'

const LEVEL_TXT = { beginner: 'Desde cero', returning: 'Vuelta tras pausa', intermediate: 'Intermedio' }
const GOAL_TXT = { hypertrophy: 'Ganar músculo', strength: 'Ganar fuerza', mixed: 'Fuerza + músculo', general: 'Condición física' }

function Section({ id, title, icon, children }: { id: string; title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section id={`s-${id}`} className="card stack" style={{ scrollMarginTop: 70 }}>
      <div className="row">{icon}<h2 className="grow" style={{ fontSize: '1.15rem' }}>{title}</h2></div>
      {children}
    </section>
  )
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

async function shareOrDownload(name: string, content: string, type: string): Promise<'shared' | 'downloaded'> {
  const file = typeof File !== 'undefined' ? new File([content], name, { type }) : null
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (file && isIOS() && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
    }
  }
  download(name, content, type)
  return 'downloaded'
}

export function SettingsScreen({ section }: { section?: string }) {
  const { profile, currentRoutineId } = useApp()
  const toast = useToast()
  const confirm = useConfirm()
  const online = useOnline()
  const lastBackup = useLiveQuery(() => getMeta<number | null>('lastBackupAt', null), [], null)
  const bundle = useLiveQuery(async () => (currentRoutineId ? await getRoutineBundle(currentRoutineId) : null), [currentRoutineId])
  const demoCount = useLiveQuery(() => db().sessions.filter((s) => !!s.isDemo).count(), [], 0)
  const [cache, setCache] = useState<{ files: number; bytes: number } | null>(null)
  const [dl, setDl] = useState<string | null>(null)
  const [persist, setPersist] = useState<boolean | null>(null)
  const [preview, setPreview] = useState<BackupPreview | null>(null)
  const [restoreErr, setRestoreErr] = useState<string | null>(null)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('forja-theme') ?? 'auto' } catch { return 'auto' } })
  const [sound, setSound] = useState<SoundMode>(getSoundMode())
  const [awake, setAwake] = useState(getKeepAwake())
  const [withPhotos, setWithPhotos] = useState(false)
  const photoCount = useLiveQuery(() => db().photos.count(), [], 0)
  const plates = useLiveQuery(() => getMeta<number[]>('plates', DEFAULT_PLATES), [], DEFAULT_PLATES)

  useEffect(() => {
    void demoCacheInfo().then(setCache)
    void persistenceStatus().then(setPersist)
  }, [])
  useEffect(() => {
    if (section) setTimeout(() => document.getElementById(`s-${section}`)?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [section])

  const routineExIds = bundle ? [...new Set(bundle.version.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))] : []
  const allIds = ALL_MEDIA.map((m) => m.exerciseId)

  const doDownload = async (ids: string[]) => {
    setDl('0 %')
    try {
      const r = await downloadDemos(ids, (d, t) => setDl(`${Math.round((d / t) * 100)} %`))
      toast(r.failed ? `Descargadas ${r.ok}; fallaron ${r.failed} (¿sin conexión?)` : `Demostraciones listas sin conexión (${r.ok} archivos)`)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setDl(null)
      setCache(await demoCacheInfo())
    }
  }

  const exportJson = async () => {
    const data = await exportBackup({ includePhotos: withPhotos })
    try {
      const how = await shareOrDownload(backupFileName(), JSON.stringify(data), 'application/json')
      await markBackupDone()
      toast(how === 'shared' ? 'Copia lista: guárdala en Archivos o donde prefieras' : 'Copia descargada')
    } catch {
      toast('Exportación cancelada')
    }
  }

  const setIncrement = (k: keyof Increments, v: number | null) => {
    if (!profile || v === null || v < 0) return
    void saveProfile({ ...profile, increments: { ...profile.increments, [k]: v } }, 'Incrementos de carga actualizados')
  }

  return (
    <>
      <header className="topbar">
        <button className="icon-btn" onClick={() => back('hoy')} aria-label="Volver"><ArrowLeft /></button>
        <span className="title grow">Ajustes</span>
      </header>
      <main className="page">
        <Section id="perfil" title="Perfil" icon={<User aria-hidden />}>
          {profile ? (
            <p className="small">{LEVEL_TXT[profile.level]} · {GOAL_TXT[profile.goal]} · {profile.days.length} días disponibles · {profile.minutesPerSession} min</p>
          ) : <p className="small muted">Sin perfil.</p>}
          <a className="btn soft" href={href('perfil')}>Editar perfil</a>
          <p className="tiny muted">Cambiar el perfil no modifica tu rutina actual; te ofrecerá una propuesta nueva para comparar.</p>
        </Section>

        {profile && (
          <Section id="incrementos" title="Incrementos de carga">
            <p className="small muted">El menor salto que tienes disponible. La app no propondrá saltos que no existan en tu material.</p>
            <div className="row wrap">
              {([['barbellKg', 'Barra (total)'], ['barKg', 'Peso de la barra'], ['dumbbellKg', 'Entre mancuernas'], ['machineKg', 'Máquinas'], ['cableKg', 'Poleas']] as [keyof Increments, string][]).map(([k, l]) => (
                <label key={k} className="stack-sm" style={{ width: 'calc(50% - 4px)', gap: 2 }}>
                  <span className="small">{l} (kg)</span>
                  <DecimalInput className="input" label={l} value={profile.increments[k]} onChange={(v) => setIncrement(k, v)} max={100} />
                </label>
              ))}
            </div>
            <span className="label">Discos que tienes (por lado)</span>
            <div className="row wrap" role="group" aria-label="Discos disponibles">
              {PLATE_CHOICES.map((p) => (
                <Chip key={p} on={plates.includes(p)} label={`Disco de ${formatNumber(p)} kg`} onClick={() => { const next = plates.includes(p) ? plates.filter((x) => x !== p) : [...plates, p].sort((a, b) => b - a); void setMeta('plates', next) }}>{formatNumber(p)}</Chip>
              ))}
            </div>
            <p className="tiny muted">Se usan en la calculadora de discos (botón «Discos» en los ejercicios con barra) junto con el peso de la barra.</p>
          </Section>
        )}

        <Section id="apariencia" title="Apariencia y avisos">
          <Segmented label="Tema" value={theme} onChange={(v) => { setTheme(v); try { if (v === 'auto') localStorage.removeItem('forja-theme'); else localStorage.setItem('forja-theme', v) } catch { /* sin almacenamiento */ } if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v }} options={[{ value: 'auto', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
          <div className="stack-sm" id="s-sonido">
            <span className="label"><Volume2 size={16} aria-hidden /> Aviso al terminar el descanso</span>
            <Segmented label="Aviso al terminar el descanso" value={sound} onChange={(v) => { setSound(v); setSoundMode(v) }} options={[{ value: 'always', label: 'Siempre' }, { value: 'mix', label: 'Con música' }, { value: 'off', label: 'Sin sonido' }]} />
            <p className="small muted">
              {sound === 'always' && <>Tres pitidos al acabar el descanso, <strong>también con el iPhone en silencio</strong> (por los cascos o el altavoz). Si estás escuchando música, iOS puede pausarla cuando suena el aviso: si te molesta, elige «Con música».</>}
              {sound === 'mix' && <>Los pitidos se mezclan con tu música sin pararla, pero <strong>no suenan si el iPhone está en modo silencio</strong>.</>}
              {sound === 'off' && <>Sin pitidos: solo el aviso en pantalla.</>}
            </p>
            {sound !== 'off' && <button className="btn soft small" style={{ alignSelf: 'flex-start' }} onClick={() => testSound()}><Volume2 size={16} /> Probar sonido</button>}
            {sound === 'always' && !hasAudioSessionApi() && <p className="tiny muted">Este navegador no permite elegir el tipo de audio: si no oyes la prueba con el modo silencio activado, quítalo durante el entrenamiento.</p>}
          </div>
          <Toggle checked={awake} onChange={(v) => { setAwake(v); setKeepAwake(v) }} label="Pantalla encendida durante el entrenamiento" desc={`Evita que el iPhone se bloquee mientras entrenas, para que el aviso del descanso pueda sonar. Con la pantalla bloqueada o la app en segundo plano, una web no puede avisar; el tiempo sí se recalcula al volver.${wakeLockSupported() ? '' : ' (Este navegador no lo permite.)'}`} />
        </Section>

        <Section id="demos" title="Demostraciones sin conexión" icon={<WifiOff aria-hidden />}>
          <p className="small">Las ilustraciones animadas (Everkinetic, licencia CC BY-SA) se pueden guardar en el dispositivo. Los vídeos externos de YouTube que añadas a ejercicios propios <strong>solo funcionan con conexión</strong> y no se descargan.</p>
          <p className="small">Descargado: <strong>{cache ? `${cache.files} archivos · ${formatBytes(cache.bytes)}` : '…'}</strong> {!online && <span className="badge warn">Sin conexión</span>}</p>
          {bundle && <button className="btn primary" disabled={!!dl || !online} onClick={() => void doDownload(routineExIds)}><Download size={18} /> Descargar las de mi rutina ({formatBytes(demoBytes(routineExIds))})</button>}
          <button className="btn soft" disabled={!!dl || !online} onClick={() => void doDownload(allIds)}><Download size={18} /> Descargar todo el catálogo ({formatBytes(demoBytes(allIds))})</button>
          {dl && <p className="small" aria-live="polite">Descargando… {dl}</p>}
          <button className="btn ghost danger" disabled={!cache?.files} onClick={async () => { if (await confirm({ title: 'Borrar descargas', body: 'Se liberará espacio. Podrás volver a descargarlas con conexión.', confirm: 'Borrar', danger: true })) { await clearDemos(); setCache(await demoCacheInfo()); toast('Descargas borradas') } }}><Trash2 size={18} /> Borrar demostraciones descargadas</button>
          <p className="tiny muted">Caché: {DEMO_CACHE}. Las que ves con conexión también se guardan automáticamente.</p>
        </Section>

        <Section id="copias" title="Copias de seguridad" icon={<HardDrive aria-hidden />}>
          <p className="small">Tus datos están <strong>solo en este navegador/instalación</strong>. No se sincronizan con otros dispositivos. Si borras los datos del navegador, desinstalas la app o el sistema libera espacio, podrías perderlos: haz copias.</p>
          <p className="small">Última copia: <strong>{lastBackup ? formatDateShort(toLocalDate(lastBackup)) : 'nunca'}</strong></p>
          {photoCount > 0 && <Toggle checked={withPhotos} onChange={setWithPhotos} label={`Incluir fotos de progreso (${photoCount})`} desc="Por defecto no se incluyen: la copia ocupa menos y no sacas tus fotos del dispositivo sin querer." />}
          <button className="btn primary" onClick={() => void exportJson()}><FileDown size={18} /> Exportar copia completa (.json)</button>
          <button className="btn soft" onClick={async () => { const s = (await db().sessions.toArray()).filter((x: Session) => !x.isDemo); download(`forja-registros-${toLocalDate()}.csv`, sessionsToCsv(s), 'text/csv;charset=utf-8'); toast('CSV descargado') }}><FileDown size={18} /> Exportar registros (.csv)</button>
          <label className="btn soft">
            <Upload size={18} /> Restaurar desde una copia…
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                setRestoreErr(null)
                setPreview(null)
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  const file = parseBackupText(await f.text())
                  setPreview(await previewBackup(file))
                } catch (err) {
                  setRestoreErr(err instanceof BackupError ? err.message : 'No se pudo leer el archivo.')
                }
              }}
            />
          </label>
          {restoreErr && <div className="note danger" role="alert"><span className="small"><strong>No se ha restaurado nada.</strong> {restoreErr} Tus datos actuales siguen intactos.</span></div>}
          {preview && (
            <div className="card flat stack-sm" style={{ background: 'var(--surface-2)' }}>
              <strong>Vista previa de la copia</strong>
              <span className="small">Creada: {preview.file.exportedAt ? new Date(preview.file.exportedAt).toLocaleString('es-ES') : 'desconocido'} · versión {preview.file.appVersion || '?'}</span>
              <span className="small">{preview.counts.sessions ?? 0} sesiones{preview.sessionRange ? ` (${formatDateShort(preview.sessionRange.from)} – ${formatDateShort(preview.sessionRange.to)})` : ''} · {preview.counts.routines ?? 0} rutinas · {preview.counts.customExercises ?? 0} ejercicios propios · {preview.counts.bodyweight ?? 0} pesos · {preview.counts.measurements ?? 0} medidas{preview.file.tables.photos ? ` · ${preview.counts.photos ?? 0} fotos` : ''}</span>
              <span className="small">{preview.existingIds} registros ya existen en este dispositivo.</span>
              {preview.warnings.map((w) => <span key={w} className="small muted">{w}</span>)}
              <button className="btn primary" onClick={async () => { if (!(await confirm({ title: 'Fusionar', body: 'Se añaden los registros que no tienes. Si un registro existe en ambos, se queda el más reciente. No se duplica nada.', confirm: 'Fusionar' }))) return; const r = await restoreBackup(preview.file, 'merge'); setPreview(null); toast(`Fusionado: ${r.added} nuevos, ${r.updated} actualizados`) }}>Fusionar con mis datos</button>
              <button className="btn soft danger" onClick={async () => { if (!(await confirm({ title: 'Reemplazar todo', body: 'Se borrarán TODOS los datos actuales de este dispositivo y se cargarán los de la copia. Si algo falla, no se borra nada.', confirm: 'Reemplazar', danger: true }))) return; await restoreBackup(preview.file, 'replace'); setPreview(null); toast('Datos reemplazados por la copia') }}>Reemplazar mis datos</button>
              <button className="btn ghost" onClick={() => setPreview(null)}>Cancelar</button>
            </div>
          )}
        </Section>

        <Section id="almacenamiento" title="Almacenamiento y otros dispositivos">
          <p className="small">Almacenamiento persistente: <strong>{persist === null ? 'no disponible en este navegador' : persist ? 'concedido' : 'no concedido'}</strong>. Ayuda a que el sistema no borre los datos por falta de espacio, pero <strong>no sustituye a una copia</strong>.</p>
          {persist === false && <button className="btn soft small" onClick={async () => setPersist(await requestPersistence())}>Solicitar de nuevo</button>}
          <details className="more">
            <summary>Cambiar de móvil, navegador o dirección web</summary>
            <ol className="small" style={{ paddingLeft: 18 }}>
              <li>Cada navegador, app instalada y dirección web (dominio) tiene su propia base de datos. Si abres la app desde otra dirección o instalas otra copia, empezará vacía.</li>
              <li>En el dispositivo antiguo: Ajustes → Exportar copia completa. Guarda el archivo (Archivos, correo, nube…).</li>
              <li>En el nuevo: abre la app, completa o salta el perfil, y Ajustes → Restaurar desde una copia → Reemplazar.</li>
              <li>En iPhone, la app instalada en la pantalla de inicio y Safari pueden no compartir datos: haz la copia desde donde hayas entrenado.</li>
            </ol>
          </details>
        </Section>

        <Section id="instalar" title="Instalar en el iPhone" icon={<Smartphone aria-hidden />}>
          {isStandalone() ? <p className="small"><span className="badge ok">Instalada</span> Estás usando la app instalada.</p> : (
            <ol className="small" style={{ paddingLeft: 18 }}>
              <li>Abre esta dirección en <strong>Safari</strong>.</li>
              <li>Pulsa el botón <strong>Compartir</strong> (cuadrado con flecha).</li>
              <li>Elige <strong>“Añadir a pantalla de inicio”</strong> y confirma.</li>
              <li>Ábrela desde el icono: funciona a pantalla completa y sin conexión tras la primera carga.</li>
            </ol>
          )}
          <p className="tiny muted">La primera vez necesitas conexión para descargar la app. Después, el registro funciona sin internet.</p>
        </Section>

        <Section id="demo" title="Datos de ejemplo">
          <p className="small">Para ver cómo lucen el progreso y los gráficos. Van marcados como <span className="badge demo">Ejemplo</span>, no se exportan en las copias y se borran sin tocar tus registros.</p>
          {demoCount > 0 ? (
            <button className="btn soft danger" onClick={async () => { const n = await clearDemo(); toast(`${n} sesiones de ejemplo borradas`) }}><Trash2 size={18} /> Borrar datos de ejemplo ({demoCount})</button>
          ) : (
            <button className="btn soft" onClick={async () => { const n = await loadDemo(); toast(`${n} sesiones de ejemplo cargadas`) }}>Cargar datos de ejemplo</button>
          )}
        </Section>

        <Section id="ayuda" title="Ayuda rápida">
          <dl className="small stack-sm" style={{ margin: 0 }}>
            <dt><strong>RIR (repeticiones en reserva)</strong></dt>
            <dd style={{ margin: 0 }}>Cuántas repeticiones más podrías hacer manteniendo buena técnica. Si hiciste 10 y podías hacer 12: RIR 2. Es opcional; al principio cuesta estimarlo y casi todo el mundo cree estar más cerca del fallo de lo que está.</dd>
            <dt><strong>Frecuencia</strong></dt>
            <dd style={{ margin: 0 }}>Días de entrenamiento ≠ frecuencia por músculo ≠ veces que repites un ejercicio. Con el mismo volumen semanal, entrenar un músculo 1, 2 o 3 veces da resultados parecidos; repartirlo ayuda a que cada sesión sea más llevadera.</dd>
            <dt><strong>Volumen</strong></dt>
            <dd style={{ margin: 0 }}>Series de trabajo por músculo y semana. Más volumen suele dar más resultado con rendimientos decrecientes, y cada persona tolera distinto. No hay un mínimo mágico: también se progresa con poco.</dd>
            <dt><strong>Doble progresión</strong></dt>
            <dd style={{ margin: 0 }}>Primero sumas repeticiones dentro del rango (p. ej. 8–12). Cuando todas las series llegan al máximo con margen, subes la carga lo mínimo y vuelves al principio del rango.</dd>
            <dt><strong>Descansos</strong></dt>
            <dd style={{ margin: 0 }}>Los suficientes para que la siguiente serie salga bien: 2–3 min en ejercicios exigentes, 1–2 en accesorios. Acortarlos no te hace progresar más.</dd>
            <dt><strong>Dolor</strong></dt>
            <dd style={{ margin: 0 }}>No entrenes con dolor. Marca la molestia en el ejercicio: la app dejará de sugerirte subir carga. Si persiste, consulta a un profesional sanitario.</dd>
          </dl>
          <p className="tiny muted">Las reglas del motor son deterministas y explicables (no es inteligencia artificial). Se basan en posicionamientos y metaanálisis (ACSM 2026, Currier 2023, Pelland 2025, Robinson 2024, Singer 2024, Refalo 2024…) resumidos en docs/EVIDENCIA.md del proyecto. Son puntos de partida razonables, no fórmulas óptimas para todo el mundo ni promesas de resultados.</p>
        </Section>

        <Section id="licencias" title="Créditos y licencias">
          <p className="small">Ilustraciones de ejercicios: <strong>Everkinetic</strong> (Greg Priday), repositorio <a href={MEDIA_MANIFEST.source.repo} target="_blank" rel="noreferrer">everkinetic/data</a>, licencia <a href={MEDIA_MANIFEST.source.licenseUrl} target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Adaptadas en esta app (escala de grises, WebP, animación alternando posiciones, colores invertidos en tema oscuro); las adaptaciones se distribuyen bajo la misma licencia.</p>
          <p className="small">Animaciones de ejercicios con peso corporal vía <strong>Wikimedia Commons</strong> ({COMMONS_MANIFEST.items.length}): «Squats.gif» de Wensceslao (CC BY-SA 4.0), «Plank exercise.svg» de Pk0001 (CC BY-SA 4.0) y animaciones de los CDC de EE. UU. («Growing Stronger», dominio público). Autor, licencia y enlace en el pie de cada demostración.</p>
          <p className="small">{ALL_MEDIA.length} ejercicios con demostración verificada a mano; {EXERCISES.filter((e) => e.demoStatus === 'pendiente').length} con demostración pendiente (indicado en cada ficha).</p>
          <p className="small">Vídeos de YouTube que añadas tú: se reproducen con el reproductor oficial en modo de privacidad mejorada (youtube-nocookie.com), bajo las condiciones de YouTube; no se descargan.</p>
          <p className="small">Código de la app: licencia MIT. Fuente tipográfica Bricolage Grotesque (SIL Open Font License). Iconos Lucide (ISC).</p>
          <p className="tiny muted">App {APP_VERSION} · motor de rutinas {ENGINE_VERSION} · esquema de datos v{SCHEMA_VERSION} · {TABLES.length} tablas locales. Sin analítica, sin publicidad, sin envío de datos a terceros.</p>
        </Section>

        <Section id="borrar" title="Borrar todos mis datos">
          <p className="small">Elimina perfil, rutinas, sesiones, medidas, fotos y ajustes de este dispositivo. No se puede deshacer: exporta una copia antes.</p>
          <button className="btn danger solid" onClick={async () => {
            if (!(await confirm({ title: '¿Borrar todos tus datos?', body: 'Perfil, rutinas, sesiones, pesos, medidas, fotos y ejercicios propios de este dispositivo.', confirm: 'Continuar', danger: true }))) return
            if (!(await confirm({ title: 'Confirmación final', body: 'Esta acción no se puede deshacer.', confirm: 'Borrar definitivamente', danger: true }))) return
            await db().transaction('rw', TABLES.map((t) => db().table(t)), async () => { for (const t of TABLES) await db().table(t).clear() })
            window.location.hash = '#/hoy'
            toast('Datos borrados')
          }}><Trash2 size={18} /> Borrar todo</button>
        </Section>
      </main>
    </>
  )
}
