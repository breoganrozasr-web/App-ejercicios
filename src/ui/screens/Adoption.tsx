import { useLiveQuery } from 'dexie-react-hooks'
import { Info, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../App'
import { db } from '../../data/db'
import { createRoutine, saveRoutineVersion, setMeta } from '../../data/repo'
import { dayDuration, weeklyRegionVolume } from '../../domain/engine/analysis'
import { DEFAULT_TARGET_REGIONS, REGION_LABEL } from '../../domain/engine/contribution'
import { ENGINE_VERSION } from '../../domain/engine/params'
import { RECIPE_BY_ID, rankRecipes, type RecipeBuild } from '../../domain/engine/recipes'
import type { Routine, RoutineVersion } from '../../domain/types'
import { useConfirm, useToast } from '../components/overlay'
import { RoutineDaysView } from '../components/RoutineParts'
import { go } from '../router'
import { useProgram } from './Phase'

/** a < b en versiones «x.y.z». */
export function olderVersion(a: string | undefined, b: string): boolean {
  const pa = (a ?? '0').split('.').map((x) => Number(x) || 0)
  const pb = b.split('.').map((x) => Number(x) || 0)
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0)
  return false
}

/**
 * ¿Hay nuevas opciones para revisar esta rutina? Solo para rutinas de plantilla o generadas con un motor o una versión
 * editorial anterior. Las rutinas manuales no se marcan como incorrectas por su edad.
 */
export function adoptionCandidate(routine: Routine, version: RoutineVersion): boolean {
  if (routine.kind !== 'template' && routine.kind !== 'generated') return false
  if (routine.isDemo) return false
  const t = version.plan?.template
  if (t) {
    const r = RECIPE_BY_ID[t.id]
    return !!r && r.version > t.version
  }
  return olderVersion(version.engineVersion, ENGINE_VERSION)
}

function useDismissed(): Record<string, number> {
  return useLiveQuery(async () => ((await db().meta.get('adoptionDismissed'))?.value as Record<string, number> | undefined) ?? {}, [], {} as Record<string, number>)
}

/** Enlace discreto para Hoy (una sola línea, no se repite en cada pantalla). */
export function useAdoptionPending(routine: Routine | undefined, version: RoutineVersion | undefined): boolean {
  const dismissed = useDismissed()
  return !!routine && !!version && adoptionCandidate(routine, version) && !dismissed[version.id]
}

export function AdoptionCard({ routine, version }: { routine: Routine; version: RoutineVersion }) {
  const { profile, activeSession } = useApp()
  const dismissed = useDismissed()
  const { view: program } = useProgram()
  const [open, setOpen] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()
  const learningDone = !!program && program.phase !== 'learning' && (program.validDays > 0 || program.phase === 'progression')
  const proposal = useMemo<{ build: RecipeBuild; why: string } | null>(() => {
    if (!profile || !open) return null
    const fits = rankRecipes(profile, { learningDone })
    const same = routine.templateId ? fits.find((f) => f.recipe.id === routine.templateId) : undefined
    if (same) return { build: same.build, why: `Tu rutina viene de «${same.recipe.name}». La versión editorial ${same.recipe.version} tiene su propia dosis por ejercicio (no aplanada por el perfil).` }
    const top = fits.find((f) => f.fits)
    return top ? { build: top.build, why: `Propuesta actualizada que encaja con tu perfil: «${top.recipe.name}».` } : null
  }, [profile, open, routine.templateId, learningDone])
  if (!profile || !adoptionCandidate(routine, version) || dismissed[version.id]) return null
  const keep = async () => {
    await setMeta('adoptionDismissed', { ...dismissed, [version.id]: Date.now() })
    toast('Mantienes tu rutina tal cual')
  }
  return (
    <section className="card flat stack-sm" aria-label="Nuevas opciones para revisar tu rutina">
      <div className="row"><Sparkles size={18} aria-hidden className="faint" /><strong className="grow">Hay nuevas opciones para revisar tu rutina</strong></div>
      <span className="small muted">Tu rutina es de una versión anterior ({version.plan?.template ? `editorial ${version.plan.template.version}` : `motor ${version.engineVersion}`}). No es incorrecta por ello: puedes compararla y decidir. Nada cambia sin tu aceptación y tu historial se conserva.</span>
      <div className="row">
        <button className="btn soft small grow" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Ocultar comparación' : 'Comparar con una propuesta actualizada'}</button>
        <button className="btn ghost small" onClick={() => void keep()}>Mantener</button>
      </div>
      {open && !proposal && <p className="small muted">Ninguna plantilla encaja ahora con tu perfil. Puedes mantener tu rutina o buscar en el catálogo.</p>}
      {open && proposal && <Comparison version={version} build={proposal.build} why={proposal.why} />}
      {open && proposal && (
        <div className="stack-sm">
          {activeSession && <div className="note warn small"><Info aria-hidden /><span>Tienes un entrenamiento en curso: termínalo o descártalo antes de aceptar.</span></div>}
          <button
            className="btn primary block"
            disabled={!!activeSession}
            onClick={async () => {
              if (!(await confirm({ title: 'Guardar como nueva versión', body: 'Tu rutina pasa a la versión propuesta. Las versiones anteriores y las sesiones hechas se conservan.', confirm: 'Guardar versión' }))) return
              const d = proposal.build.draft
              await saveRoutineVersion(routine.id, { days: d.days, schedule: d.schedule, rationale: d.rationale, warnings: d.warnings, engineVersion: d.engineVersion, plan: d.plan, familiarization: d.familiarization, rampWeeks: 0 }, `Propuesta actualizada aceptada: ${proposal.build.recipe.code} «${proposal.build.recipe.name}» (versión editorial ${proposal.build.recipe.version})`)
              toast('Nueva versión guardada')
            }}
          >
            Aceptar como nueva versión de esta rutina
          </button>
          <button
            className="btn soft block"
            disabled={!!activeSession}
            onClick={async () => {
              const r = await createRoutine(proposal.build.draft, { makeCurrent: true, changeNote: `Desde la revisión de «${routine.name}»` })
              toast('Rutina nueva guardada como actual')
              go(`rutinas/${r.id}`)
            }}
          >
            Aceptar como rutina nueva (la actual se conserva)
          </button>
        </div>
      )}
    </section>
  )
}

function Comparison({ version, build, why }: { version: RoutineVersion; build: RecipeBuild; why: string }) {
  const before = weeklyRegionVolume(version)
  const after = build.volume
  const minBefore = Math.max(0, ...version.days.map((d) => dayDuration(d).minutes))
  const sets = (v: RoutineVersion['days']) => v.reduce((a, d) => a + d.exercises.reduce((b, e) => b + e.prescription.sets, 0), 0)
  return (
    <div className="stack-sm">
      <p className="small">{why}</p>
      <table className="freq-table small" style={{ width: '100%' }}>
        <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Dato</th><th scope="col">Ahora</th><th scope="col">Propuesta</th></tr></thead>
        <tbody>
          <tr><th scope="row" style={{ textAlign: 'left' }}>Sesiones</th><td className="num">{version.days.length}</td><td className="num">{build.draft.days.length}</td></tr>
          <tr><th scope="row" style={{ textAlign: 'left' }}>Sesión más larga</th><td className="num">≈{minBefore} min</td><td className="num">≈{build.maxMinutes} min</td></tr>
          <tr><th scope="row" style={{ textAlign: 'left' }}>Series de trabajo/semana</th><td className="num">{sets(version.days)}</td><td className="num">{sets(build.draft.days)}</td></tr>
          {DEFAULT_TARGET_REGIONS.map((r) => {
            const a = before.find((x) => x.region === r)
            const b = after.find((x) => x.region === r)
            return <tr key={r}><th scope="row" style={{ textAlign: 'left' }}>{REGION_LABEL[r]}</th><td className="num">{a?.direct ?? 0} · {a?.directDays ?? 0} d</td><td className="num">{b?.direct ?? 0} · {b?.directDays ?? 0} d</td></tr>
          })}
        </tbody>
        <caption className="tiny muted" style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 4 }}>Series directas semanales · días con trabajo directo. La rutina actual se cuenta con su propio mapa (versión anterior).</caption>
      </table>
      <details className="more card flat">
        <summary>Ver los ejercicios propuestos</summary>
        <RoutineDaysView version={{ ...build.draft }} />
      </details>
    </div>
  )
}
