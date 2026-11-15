import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { setMeta } from '../data/repo'

/** Ejercicios favoritos (meta local; viaja en las copias). */
export function useFavoriteExercises(): [string[], (id: string) => void] {
  const fav = useLiveQuery(async () => ((await db().meta.get('favoriteExercises'))?.value as string[] | undefined) ?? [], [], [] as string[])
  return [fav, (id: string) => void setMeta('favoriteExercises', fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id])]
}

/** Usados recientemente: sesiones reales (sin datos de ejemplo), del más reciente al más antiguo. */
export function useRecentExercises(limit = 8): string[] {
  return useLiveQuery(async () => {
    const list = (await db().sessions.toArray()).filter((s) => !s.isDemo && (s.status === 'completed' || s.status === 'partial')).sort((a, b) => b.startedAt - a.startedAt)
    const out: string[] = []
    for (const s of list) for (const e of s.exercises) if (!out.includes(e.exerciseId) && e.sets.some((x) => x.completed)) out.push(e.exerciseId)
    return out.slice(0, limit)
  }, [limit], [] as string[])
}
