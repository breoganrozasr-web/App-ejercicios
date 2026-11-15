import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, CalendarDays, Clock, Info, Lightbulb, Search, Star, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { createRoutine, saveProfile, setMeta } from '../../data/repo'
import { getExercise } from '../../domain/catalog'
import { REGION_LABEL } from '../../domain/engine/contribution'
import { pickSpacedDays } from '../../domain/engine/generator'
import {
  GOAL_LABEL, PLACE_LABEL, RECIPES, RECIPE_BY_ID, RETIRED_TEMPLATES, SPLIT_LABEL, SPLIT_PREF_LABEL, TEMPLATE_CONTENT_VERSION, basicsPractice, calendarText, frequencySummary,
  minutesText, rankRecipes, recipeMatches, timeAlternatives, type RecipeFit, type RecipePlace, type RecipeSplit,
} from '../../domain/engine/recipes'
import type { Goal, SplitPref } from '../../domain/types'
import { WEEKDAY_NAME } from '../../domain/util'
import { Chip } from '../components/inputs'
import { useToast } from '../components/overlay'
import { FrequencyTable, RoutineDaysView, ScheduleEditor, VolumePanel } from '../components/RoutineParts'
import { back, go, href } from '../router'
import { useProgram } from './Phase'
import { VolumeMap, rowsFromPlan } from '../components/VolumeMap'

function Header({ title, onBack = () => back('rutinas') }: { title: string; onBack?: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack} aria-label="Volver"><ArrowLeft /></button>
      <span className="title grow">{title}</span>
    </header>
  )
}

/** Recetas evaluadas para el perfil actual (fuera de Aprendizaje no se impone otra familiarización). */
function useFits(): RecipeFit[] | null {
  const { profile } = useApp()
  const { view: program } = useProgram()
  const learningDone = !!program && program.phase !== 'learning' && (program.validDays > 0 || program.phase === 'progression')
  return useMemo(() => (profile ? rankRecipes(profile, { learningDone }) : null), [profile, learningDone])
}

function useFavorites(): [string[], (id: string) => void] {
  const fav = useLiveQuery(async () => ((await db().meta.get('favoriteTemplates'))?.value as string[] | undefined) ?? [], [], [] as string[])
  const toggle = (id: string) => void setMeta('favoriteTemplates', fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id])
  return [fav, toggle]
}

function longestText(f: RecipeFit): string {
  const longest = f.build.minutes.reduce((a, b) => (b.base.minutes > a.base.minutes ? b : a))
  return minutesText(longest.base)
}

// ───────────────────────── Catálogo ─────────────────────────

const DAY_OPTS = [2, 3, 4, 5, 6]
const GOAL_OPTS: Goal[] = ['hypertrophy', 'mixed', 'strength', 'general']
const PLACE_OPTS: RecipePlace[] = ['gym', 'machines', 'home_db', 'home_mixed', 'home_none', 'park']
const SPLIT_OPTS: RecipeSplit[] = ['full', 'upper_lower', 'ppl', 'ant_post', 'strength']
const TIME_OPTS = [45, 60, 75]

export function TemplatesScreen() {
  const { profile } = useApp()
  const fits = useFits()
  const [fav, toggleFav] = useFavorites()
  const [q, setQ] = useState('')
  const [days, setDays] = useState<number | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [place, setPlace] = useState<RecipePlace | null>(null)
  const [split, setSplit] = useState<RecipeSplit | null>(null)
  const [maxMin, setMaxMin] = useState<number | null>(null)
  const [onlyFav, setOnlyFav] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [compare, setCompare] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  if (!profile || !fits) return null
  const filtering = !!q.trim() || days !== null || goal !== null || place !== null || split !== null || maxMin !== null || onlyFav
  const pass = (f: RecipeFit) =>
    recipeMatches(f.recipe, q) &&
    (days === null || f.recipe.sessions.length === days) &&
    (goal === null || f.recipe.goals.includes(goal)) &&
    (place === null || f.recipe.place === place) &&
    (split === null || f.recipe.splits.includes(split)) &&
    (maxMin === null || f.build.maxMinutes <= maxMin) &&
    (!onlyFav || fav.includes(f.recipe.id))
  const matching = fits.filter(pass)
  const fitting = matching.filter((f) => f.fits)
  const byCode = [...matching].sort((a, b) => a.recipe.code.localeCompare(b.recipe.code))
  const toggleCompare = (id: string) => setCompare(compare.includes(id) ? compare.filter((x) => x !== id) : compare.length >= 3 ? compare : [...compare, id])
  const nActive = [days, goal, place, split, maxMin].filter((x) => x !== null).length + (onlyFav ? 1 : 0)
  return (
    <>
      <Header title="Buscar plantilla" />
      <main className="page">
        <p className="small muted">{RECIPES.length} plantillas completas con su propia dosis. Verlas no cambia tu rutina: solo se guarda si eliges una y la revisas.</p>
        <label className="row" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12 }} aria-hidden />
          <input className="input" style={{ paddingLeft: 38 }} type="search" placeholder="PPL, torso pierna, powerbuilding, SBD, casa…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar plantilla" />
        </label>
        <div className="row wrap">
          <button className="chip" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Filtros{nActive ? ` (${nActive})` : ''}</button>
          <Chip on={onlyFav} onClick={() => setOnlyFav(!onlyFav)}><Star aria-hidden /> Favoritas</Chip>
        </div>
        <div className="row">
          <label className="row small grow" style={{ minWidth: 0 }}>
            <span className="tiny muted" style={{ flex: 'none' }}>Reparto preferido</span>
            <select className="input grow" style={{ minHeight: 44, minWidth: 0 }} aria-label="Reparto preferido" value={profile.splitPref ?? 'none'} onChange={(e) => void saveProfile({ ...profile, splitPref: e.target.value as SplitPref, updatedAt: Date.now() }, 'Reparto preferido actualizado')}>
              {(Object.keys(SPLIT_PREF_LABEL) as SplitPref[]).map((k) => <option key={k} value={k}>{SPLIT_PREF_LABEL[k]}</option>)}
            </select>
          </label>
        </div>
        {filtersOpen && (
          <section className="card flat stack-sm" aria-label="Filtros">
            <FilterRow label="Días">{DAY_OPTS.map((d) => <Chip key={d} on={days === d} onClick={() => setDays(days === d ? null : d)}>{d}</Chip>)}</FilterRow>
            <FilterRow label="Objetivo">{GOAL_OPTS.map((g) => <Chip key={g} on={goal === g} onClick={() => setGoal(goal === g ? null : g)}>{GOAL_LABEL[g]}</Chip>)}</FilterRow>
            <FilterRow label="Lugar y material">{PLACE_OPTS.map((p) => <Chip key={p} on={place === p} onClick={() => setPlace(place === p ? null : p)}>{PLACE_LABEL[p]}</Chip>)}</FilterRow>
            <FilterRow label="Reparto">{SPLIT_OPTS.map((x) => <Chip key={x} on={split === x} onClick={() => setSplit(split === x ? null : x)}>{SPLIT_LABEL[x]}</Chip>)}</FilterRow>
            <FilterRow label="Duración máxima calculada">{TIME_OPTS.map((m) => <Chip key={m} on={maxMin === m} onClick={() => setMaxMin(maxMin === m ? null : m)}>≤ {m} min</Chip>)}</FilterRow>
            {nActive > 0 && <button className="btn ghost small" onClick={() => { setDays(null); setGoal(null); setPlace(null); setSplit(null); setMaxMin(null); setOnlyFav(false) }}>Quitar filtros</button>}
          </section>
        )}
        {compare.length > 0 && (
          <div className="note info" style={{ alignItems: 'center' }}>
            <span className="grow small">{compare.length} de 3 para comparar</span>
            <button className="btn primary small" disabled={compare.length < 2} onClick={() => go(`rutinas/plantillas/comparar?ids=${compare.join(',')}`)}>Comparar</button>
            <button className="btn ghost small" onClick={() => setCompare([])}>Vaciar</button>
          </div>
        )}
        {filtering ? (
          <>
            <h2 className="section-title">{matching.length} {matching.length === 1 ? 'resultado' : 'resultados'}{fitting.length !== matching.length ? ` · ${fitting.length} encajan con tu perfil` : ''}</h2>
            {matching.length === 0 && <p className="small muted">Nada coincide. Prueba otra palabra o quita filtros.</p>}
            {matching.map((f) => <RecipeCard key={f.recipe.id} f={f} fav={fav.includes(f.recipe.id)} onFav={() => toggleFav(f.recipe.id)} comparing={compare.includes(f.recipe.id)} onCompare={() => toggleCompare(f.recipe.id)} />)}
          </>
        ) : (
          <>
            <h2 className="section-title">Encajan con tu perfil ({fitting.length})</h2>
            {fitting.length === 0 && <p className="small muted">Ninguna encaja del todo con tus días, material y nivel. Mira el catálogo completo: cada tarjeta explica qué no encaja.</p>}
            {fitting.map((f, i) => <RecipeCard key={f.recipe.id} f={f} first={i === 0} fav={fav.includes(f.recipe.id)} onFav={() => toggleFav(f.recipe.id)} comparing={compare.includes(f.recipe.id)} onCompare={() => toggleCompare(f.recipe.id)} />)}
            <button className="btn soft block" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'Ocultar el catálogo completo' : `Ver todas (${RECIPES.length})`}</button>
            {showAll && (
              <>
                <h2 className="section-title">Catálogo completo</h2>
                {byCode.map((f) => <RecipeCard key={f.recipe.id} f={f} fav={fav.includes(f.recipe.id)} onFav={() => toggleFav(f.recipe.id)} comparing={compare.includes(f.recipe.id)} onCompare={() => toggleCompare(f.recipe.id)} />)}
              </>
            )}
          </>
        )}
        <p className="tiny muted">Orden determinista: material y días disponibles, reparto preferido, objetivo, tiempo y un desempate fijo. Son criterios de interfaz, no una clasificación científica de repartos. Recetas editoriales de Forja (contenidos {TEMPLATE_CONTENT_VERSION}), no rutinas evaluadas como conjunto en ensayos.</p>
      </main>
    </>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="stack-sm" role="group" aria-label={label}>
      <span className="tiny muted">{label}</span>
      <div className="row wrap" style={{ gap: 6 }}>{children}</div>
    </div>
  )
}

function RecipeCard({ f, fav, onFav, comparing, onCompare, first = false }: { f: RecipeFit; fav: boolean; onFav: () => void; comparing: boolean; onCompare: () => void; first?: boolean }) {
  const r = f.recipe
  const info = f.conflicts
  return (
    <section className="card stack-sm" aria-label={r.name}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow stack-sm" style={{ gap: 2 }}>
          {first && <span className="badge suggest" style={{ alignSelf: 'flex-start' }}><Lightbulb aria-hidden /> Punto de partida</span>}
          <h3>{r.name}</h3>
          <span className="tiny muted">{r.forWhom}</span>
        </div>
        <button className="icon-btn" aria-pressed={fav} aria-label={fav ? `Quitar ${r.name} de favoritas` : `Añadir ${r.name} a favoritas`} onClick={onFav}><Star fill={fav ? 'currentColor' : 'none'} /></button>
      </div>
      <span className="small"><CalendarDays size={14} aria-hidden /> {r.sessions.length} sesiones · {calendarText(r)} · <Clock size={14} aria-hidden /> {longestText(f)} por sesión</span>
      <div className="row wrap" style={{ gap: 4 }}>
        <span className="badge accent">{GOAL_LABEL[r.goals[0]]}</span>
        <span className="badge">{PLACE_LABEL[r.place]}</span>
        <span className="badge">{r.standardOf ? 'Dosis breve' : 'Dosis estándar'}</span>
        {r.sbd && <span className="badge">Práctica de básicos</span>}
      </div>
      <details className="tiny">
        <summary>{f.fits ? (info.length ? `Encaja · ${info.length} ${info.length === 1 ? 'aviso' : 'avisos'}` : 'Encaja con tu perfil') : `No encaja del todo · ver por qué`}</summary>
        <span className="muted">{frequencySummary(f.build)}.</span>
        {info.length > 0 && (
          <ul className="muted" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {info.map((c) => <li key={c.text}>{c.hard ? 'No encaja: ' : ''}{c.text}</li>)}
          </ul>
        )}
      </details>
      <div className="row">
        <a className="btn soft small grow" href={href(`rutinas/plantillas/${r.id}`)}>Elegir y revisar</a>
        <button className="chip" aria-pressed={comparing} onClick={onCompare}>Comparar</button>
      </div>
    </section>
  )
}

// ───────────────────────── Comparador (hasta 3) ─────────────────────────

const CMP_REGIONS = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'delt_side', 'biceps', 'triceps'] as const

export function TemplateCompareScreen({ ids }: { ids: string[] }) {
  const fits = useFits()
  if (!fits) return null
  const list = ids.map((id) => fits.find((f) => f.recipe.id === id)).filter((x): x is RecipeFit => !!x).slice(0, 3)
  const cell = { padding: '6px 4px', textAlign: 'right' as const }
  return (
    <>
      <Header title="Comparar plantillas" onBack={() => back('rutinas/plantillas')} />
      <main className="page">
        <p className="small muted">Comparar no cambia nada. Directas + indirectas estimadas (media serie); «d» = días con trabajo directo.</p>
        <section className="card stack-sm" aria-label="Plantillas comparadas">
          {list.map((f, i) => (
            <div key={f.recipe.id} className="stack-sm" style={{ gap: 2 }}>
              <strong>{i + 1}. {f.recipe.name}</strong>
              <span className="tiny muted">{calendarText(f.recipe)} · {longestText(f)} por sesión{f.build.maxLearningMinutes ? ` · en aprendizaje ≈${f.build.maxLearningMinutes} min` : ''}</span>
              {!f.fits && <span className="tiny muted">No encaja: {f.conflicts.filter((c) => c.hard).map((c) => c.text).join(' ')}</span>}
            </div>
          ))}
        </section>
        <section className="card stack-sm">
          <h3>Series semanales por grupo</h3>
          <table className="freq-table small" style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Grupo</th>{list.map((f, i) => <th key={f.recipe.id} scope="col" style={cell}>{i + 1}</th>)}</tr></thead>
            <tbody>
              {CMP_REGIONS.map((r) => (
                <tr key={r}>
                  <th scope="row" style={{ textAlign: 'left', fontWeight: 600 }}>{REGION_LABEL[r]}</th>
                  {list.map((f) => {
                    const v = f.build.volume.find((x) => x.region === r)
                    return <td key={f.recipe.id} className="num" style={cell}>{fmt(v?.direct ?? 0)}{v?.secondary ? ` +${fmt(v.secondary * 0.5)}` : ''}<br /><span className="tiny muted">{v?.directDays ?? 0} d</span></td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card stack-sm">
          <h3>Práctica de básicos (días/semana)</h3>
          {list.map((f, i) => {
            const b = basicsPractice(f.recipe)
            return <span key={f.recipe.id} className="small">{i + 1}. {b.length ? b.map((x) => `${x.name.replace(' con barra', '')} ${x.days}`).join(' · ') : 'Sin sentadilla, banca ni convencional con barra'}</span>
          })}
          <span className="tiny muted">El rumano no cuenta como práctica del peso muerto convencional.</span>
        </section>
        {list.map((f, i) => (
          <details key={f.recipe.id} className="more card flat">
            <summary>{i + 1}. Ejercicios de {f.recipe.name}</summary>
            <div className="stack-sm" style={{ paddingTop: 8 }}>
              {f.recipe.sessions.map((s, si) => (
                <div key={si} className="stack-sm" style={{ gap: 2 }}>
                  <strong className="small">{WEEKDAY_NAME[s.weekday]} · {s.name} <span className="tiny muted">({minutesText(f.build.minutes[si].base)})</span></strong>
                  <span className="tiny">{s.items.map((it) => `${getExercise(it[0])?.name ?? it[0]} ${it[1]}×${it[2]}–${it[3]}${it[4] === 's' ? ' s' : ''}`).join(' · ')}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
        <div className="stack-sm">
          {list.map((f, i) => <a key={f.recipe.id} className="btn soft block" href={href(`rutinas/plantillas/${f.recipe.id}`)}>Elegir y revisar la {i + 1}</a>)}
        </div>
      </main>
    </>
  )
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', ',')
}

// ───────────────────────── Vista previa ─────────────────────────

export function TemplatePreviewScreen({ templateId }: { templateId: string }) {
  const { profile, activeSession } = useApp()
  const fits = useFits()
  const [schedule, setSchedule] = useState<{ weekday: number; dayId: string }[] | null>(null)
  const toast = useToast()
  const retired = RETIRED_TEMPLATES[templateId]
  if (retired) {
    return (
      <>
        <Header title="Plantilla" />
        <main className="page">
          <h1>{retired.name}</h1>
          <div className="note info"><Info aria-hidden /><span className="small">Plantilla retirada del catálogo. {retired.why} Las rutinas y sesiones que la usaron se conservan tal cual.</span></div>
          <a className="btn soft block" href={href('rutinas/plantillas')}>Buscar entre las {RECIPES.length} plantillas</a>
        </main>
      </>
    )
  }
  const f = fits?.find((x) => x.recipe.id === templateId)
  if (!profile || !fits) return null
  if (!f) return <><Header title="Plantilla" /><main className="page"><p>No encontrada.</p></main></>
  const r = f.recipe
  const b = f.build
  const sched = schedule ?? b.draft.schedule
  const version = { days: b.draft.days, schedule: sched, engineVersion: b.draft.engineVersion, plan: b.draft.plan, familiarization: b.draft.familiarization }
  const blockedReason = b.blocked ?? (b.missing.length ? f.conflicts.find((c) => c.kind === 'material')?.text ?? 'Falta material.' : null) ?? (activeSession ? 'Tienes un entrenamiento en curso: termínalo o descártalo antes de cambiar de rutina.' : null)
  const timeConflict = f.conflicts.find((c) => c.kind === 'time')
  const spaced = pickSpacedDays([0, 1, 2, 3, 4, 5, 6], r.sessions.length)
  const spacedSchedule = b.draft.days.map((d, i) => ({ weekday: spaced[i], dayId: d.id }))
  const isSpaced = sched.length === spacedSchedule.length && sched.every((s, i) => s.weekday === spacedSchedule[i].weekday)
  const consecutive = sched.some((s) => sched.some((t) => t.weekday === (s.weekday + 1) % 7))
  const other = (id: string) => fits.find((x) => x.recipe.id === id)
  return (
    <>
      <Header title="Plantilla" />
      <main className="page">
        <section className="stack-sm">
          <div className="row wrap" style={{ gap: 4 }}>
            <span className="badge">{r.code} · versión editorial {r.version}</span>
            <span className="badge accent">{GOAL_LABEL[r.goals[0]]}</span>
            <span className="badge">{PLACE_LABEL[r.place]}</span>
            <span className="badge">{r.standardOf ? 'Dosis breve' : 'Dosis estándar'}</span>
          </div>
          <h1>{r.name}</h1>
          <span className="small muted">{r.forWhom}</span>
          <p>{r.summary}</p>
        </section>
        <div className="note info"><Info aria-hidden /><span className="small">Vista previa sin cambiar tu rutina. Solo se guarda si pulsas «Usar esta plantilla».</span></div>
        {f.conflicts.length > 0 && (
          <section className="card flat stack-sm" aria-label="Qué no encaja">
            {f.conflicts.map((c) => <span key={c.text} className="small"><TriangleAlert size={15} aria-hidden className="faint" /> {c.text}</span>)}
          </section>
        )}
        {r.standardOf && other(RECIPE_BY_ID_CODE(r.standardOf)) && (
          <p className="small muted">Dosis reducida elegida: tiene menos trabajo semanal que <a href={href(`rutinas/plantillas/${RECIPE_BY_ID_CODE(r.standardOf)}`)}>la versión estándar</a>; no se anuncia como equivalente.</p>
        )}
        {timeConflict && (
          <section className="card stack-sm" aria-label="Si no cabe en tu tiempo">
            <h3>Si no cabe en {profile.minutesPerSession} min</h3>
            <p className="small muted">No quitamos series sin tu aceptación. Compara:</p>
            {timeAlternatives(f, fits, profile).map((a) => (
              a.recipeId
                ? <a key={a.label} className="choice" href={href(`rutinas/plantillas/${a.recipeId}`)}><strong>{a.label}</strong><span className="small">{a.detail}</span></a>
                : a.label.startsWith('Indicar')
                  ? <a key={a.label} className="choice" href={href('perfil')}><strong>{a.label}</strong><span className="small">{a.detail}</span></a>
                  : <div key={a.label} className="choice" style={{ cursor: 'default' }}><strong>{a.label}</strong><span className="small">{a.detail}</span></div>
            ))}
          </section>
        )}
        <section className="card stack-sm" aria-label="Duración estimada">
          <h3>Duración estimada por sesión</h3>
          {b.draft.days.map((d, i) => (
            <span key={d.id} className="small">{d.name}: <strong>{minutesText(b.minutes[i].base)}</strong> (plan base){b.minutes[i].learning ? ` · ${minutesText(b.minutes[i].learning!)} durante el aprendizaje` : ''}</span>
          ))}
          <span className="tiny muted">Intervalo estimado (preparación, aproximaciones, ejecución, descansos y cambios de material), no un tiempo exacto. Las aproximaciones son editables y no obligan a porcentajes de 1RM.</span>
        </section>
        {b.draft.warnings.length > 0 && (
          <details className="more card flat">
            <summary><TriangleAlert size={18} aria-hidden /> Límites y avisos ({b.draft.warnings.length})</summary>
            <ul className="small stack-sm" style={{ paddingLeft: 18 }}>{b.draft.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </details>
        )}
        <details className="more card flat">
          <summary><Info size={18} aria-hidden /> Por qué esta dosis</summary>
          <ul className="small stack-sm" style={{ paddingLeft: 18 }}>{b.draft.rationale.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="tiny muted"><a href={href('aprender/dos-o-tres-series')}>¿Dos o tres series?</a> · <a href={href('aprender/elegir-reparto')}>Elegir el reparto</a></p>
        </details>
        <section className="card stack-sm">
          <h3>Frecuencia real</h3>
          <FrequencyTable rows={b.table} />
        </section>
        <ScheduleEditor days={b.draft.days} schedule={sched} onChange={setSchedule} />
        {consecutive && !isSpaced && (
          <button className="btn soft block" onClick={() => setSchedule(spacedSchedule)}>Probar días separados: {spacedSchedule.map((s) => WEEKDAY_NAME[s.weekday]).join(', ')}</button>
        )}
        <RoutineDaysView version={version} onOpenExercise={(id) => go(`ejercicios/${id}`)} />
        <section className="card stack-sm" aria-label="Mapa del plan">
          <h3>Mapa del plan (semana tipo)</h3>
          <VolumeMap rows={rowsFromPlan(b.volume)} title={`Planificado en ${r.name}`} empty="Sin series previstas." />
        </section>
        <VolumePanel version={version} level={profile.level} goal={r.goals[0]} priority={profile.priorityRegions ?? []} />
        {blockedReason && <div className="note warn"><TriangleAlert aria-hidden /><span className="small">{blockedReason}</span></div>}
        {b.blocked && f.conflicts.some((c) => c.kind === 'blocked') && <a className="btn soft block" href={href('rutinas/generar')}>Ver la propuesta adecuada a mi perfil</a>}
        <button
          className="btn primary big block"
          disabled={!!blockedReason}
          onClick={async () => {
            await createRoutine({ ...b.draft, schedule: sched }, { makeCurrent: true, changeNote: `Desde plantilla ${r.code} «${r.name}» (versión editorial ${r.version})` })
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

function RECIPE_BY_ID_CODE(code: string): string {
  return RECIPES.find((x) => x.code === code)?.id ?? ''
}

// ───────────────────────── Recomendadas (en la propuesta) ─────────────────────────

/** Plantillas que encajan con el perfil: se muestran en la propuesta sin esconder el catálogo. */
export function RecommendedTemplates() {
  const fits = useFits()
  if (!fits) return null
  const top = fits.filter((f) => f.fits).slice(0, 3)
  return (
    <section className="card stack-sm" aria-label="Plantillas que encajan contigo">
      <h3>Plantillas que encajan contigo</h3>
      {top.length === 0 && <p className="small muted">Ninguna de las {RECIPES.length} encaja del todo con tus días y material; abajo tienes una propuesta a medida.</p>}
      {top.map((f) => (
        <a key={f.recipe.id} className="choice" href={href(`rutinas/plantillas/${f.recipe.id}`)}>
          <strong>{f.recipe.name}</strong>
          <span className="small">{calendarText(f.recipe)} · {longestText(f)} · {frequencySummary(f.build)}</span>
        </a>
      ))}
      <a className="btn soft block" href={href('rutinas/plantillas')}><Search size={18} aria-hidden /> Buscar entre las {RECIPES.length} plantillas</a>
    </section>
  )
}

export { RECIPE_BY_ID }
