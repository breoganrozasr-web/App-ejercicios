import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, ChartLine, House, ListChecks, RefreshCw } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { db } from './data/db'
import { getActiveSession } from './data/repo'
import type { Profile, Session } from './domain/types'
import { OverlayProvider } from './ui/components/overlay'
import { useNeedRefresh } from './ui/pwa'
import { go, href, useRoute } from './ui/router'
import { ExerciseDetailScreen, ExercisesScreen, NewExerciseScreen } from './ui/screens/Exercises'
import { LearnScreen } from './ui/screens/Learn'
import { OnboardingScreen } from './ui/screens/Onboarding'
import { PhaseScreen } from './ui/screens/Phase'
import { ProgressScreen, SessionDetailScreen } from './ui/screens/Progress'
import { GenerateScreen, RoutineDetailScreen, RoutineEditScreen, RoutinesScreen, TemplatePreviewScreen, TemplatesScreen } from './ui/screens/Routines'
import { SettingsScreen } from './ui/screens/Settings'
import { TodayScreen } from './ui/screens/Today'
import { WorkoutScreen } from './ui/screens/Workout'

interface AppState {
  profile: Profile | undefined
  currentRoutineId: string | null
  activeSession: Session | undefined
  loaded: boolean
}
const AppCtx = createContext<AppState>({ profile: undefined, currentRoutineId: null, activeSession: undefined, loaded: false })
export const useApp = () => useContext(AppCtx)

export function App() {
  const route = useRoute()
  const profile = useLiveQuery(() => db().profile.get('me'), [], null)
  const currentRoutineId = useLiveQuery(async () => ((await db().meta.get('currentRoutineId'))?.value as string | null) ?? null, [], null)
  const activeSession = useLiveQuery(() => getActiveSession(), [], null)
  const loaded = profile !== null && activeSession !== null
  const state: AppState = { profile: profile ?? undefined, currentRoutineId: currentRoutineId ?? null, activeSession: activeSession ?? undefined, loaded }

  const [section] = route.path
  useEffect(() => {
    if (!route.path.length) go('hoy', true)
  }, [route.path.length])
  useScrollRestoration(route.path.join('/'))

  let screen: ReactNode
  let tab: string | null = section ?? 'hoy'
  if (!loaded) screen = <div className="page" aria-busy="true" />
  else if (!state.profile && section !== 'ajustes') {
    screen = <OnboardingScreen />
    tab = null
  } else {
    switch (section) {
      case 'entreno':
        screen = <WorkoutScreen sessionId={route.path[1]} />
        tab = null
        break
      case 'rutinas':
        if (route.path[1] === 'plantillas' && route.path[2]) screen = <TemplatePreviewScreen templateId={route.path[2]} />
        else if (route.path[1] === 'plantillas') screen = <TemplatesScreen />
        else if (route.path[1] === 'generar') screen = <GenerateScreen />
        else if (route.path[1] && route.path[2] === 'editar') screen = <RoutineEditScreen routineId={route.path[1]} />
        else if (route.path[1]) screen = <RoutineDetailScreen routineId={route.path[1]} />
        else screen = <RoutinesScreen />
        break
      case 'ejercicios':
        if (route.path[1] === 'nuevo') screen = <NewExerciseScreen />
        else if (route.path[1]) screen = <ExerciseDetailScreen exerciseId={route.path[1]} />
        else screen = <ExercisesScreen />
        break
      case 'progreso':
        if (route.path[1] === 'sesion' && route.path[2]) screen = <SessionDetailScreen sessionId={route.path[2]} />
        else if (route.path[1] === 'fase') screen = <PhaseScreen />
        else screen = <ProgressScreen />
        break
      case 'ajustes':
        screen = <SettingsScreen section={route.path[1]} />
        tab = null
        break
      case 'perfil':
        screen = <OnboardingScreen editing />
        tab = null
        break
      case 'aprender':
        screen = <LearnScreen section={route.path[1]} focus={route.query.get('f')} />
        tab = null
        break
      default:
        screen = <TodayScreen />
        tab = 'hoy'
    }
  }

  return (
    <AppCtx.Provider value={state}>
      <OverlayProvider>
        <div className="app">
          <UpdateBanner hasActive={!!state.activeSession} />
          {screen}
        </div>
        {tab && <TabBar current={tab} />}
      </OverlayProvider>
    </AppCtx.Provider>
  )
}

/**
 * Posición de desplazamiento por entrada del historial (F7): al entrar en una pantalla nueva (p. ej. una ficha),
 * arriba del todo; al volver atrás, la posición en la que estabas (p. ej. en la lista de ejercicios).
 */
function useScrollRestoration(key: string): void {
  const positions = useRef(new Map<string, number>())
  const currentEntry = useRef<string | null>(null)
  useEffect(() => {
    try {
      history.scrollRestoration = 'manual'
    } catch {
      /* navegador antiguo */
    }
    const onScroll = () => {
      if (currentEntry.current) positions.current.set(currentEntry.current, window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    let entry = (history.state as { forjaKey?: string } | null)?.forjaKey
    const saved = entry ? positions.current.get(entry) : undefined
    if (!entry) {
      entry = `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      try {
        history.replaceState({ ...(history.state ?? {}), forjaKey: entry }, '')
      } catch {
        /* sin history */
      }
    }
    currentEntry.current = entry
    if (saved === undefined) {
      window.scrollTo(0, 0)
      return
    }
    // Volver: restaurar cuando el contenido ya tenga altura suficiente (los datos cargan de forma asíncrona).
    let tries = 0
    let raf = 0
    const tick = () => {
      if (document.documentElement.scrollHeight - window.innerHeight >= saved - 2 || tries++ > 60) {
        window.scrollTo(0, saved)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [key])
}

function TabBar({ current }: { current: string }) {
  const items = [
    { id: 'hoy', label: 'Hoy', icon: <House aria-hidden /> },
    { id: 'rutinas', label: 'Rutinas', icon: <ListChecks aria-hidden /> },
    { id: 'ejercicios', label: 'Ejercicios', icon: <BookOpen aria-hidden /> },
    { id: 'progreso', label: 'Progreso', icon: <ChartLine aria-hidden /> },
  ]
  return (
    <div className="tabbar">
      <nav aria-label="Secciones">
        {items.map((it) => (
          <a key={it.id} className="tab" href={href(it.id)} aria-current={current === it.id ? 'page' : undefined}>
            {it.icon}
            {it.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

function UpdateBanner({ hasActive }: { hasActive: boolean }) {
  const [need, update] = useNeedRefresh()
  if (!need) return null
  return (
    <div className="note info" role="status" style={{ margin: '8px 16px 0', marginTop: 'calc(var(--safe-top) + 8px)' }}>
      <RefreshCw aria-hidden />
      <div className="grow stack-sm">
        <strong>Hay una versión nueva de la app</strong>
        {hasActive ? (
          <span className="small">Se aplicará cuando termines el entrenamiento en curso. Tus datos ya están guardados.</span>
        ) : (
          <>
            <span className="small">Actualizar no borra tus datos.</span>
            <button className="btn small primary" onClick={() => void update()}>Actualizar ahora</button>
          </>
        )}
      </div>
    </div>
  )
}
