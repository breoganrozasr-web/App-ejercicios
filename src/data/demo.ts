import { getExercise } from '../domain/catalog'
import type { BodyWeightEntry, Session, SessionExercise, SetEntry } from '../domain/types'
import { addDays, newId, toLocalDate } from '../domain/util'
import { db } from './db'

/**
 * Datos de EJEMPLO, marcados con isDemo. Se pueden borrar sin tocar los registros personales.
 * Son inventados para enseñar la app: no son datos reales de nadie.
 */
const PLAN: { title: string; ex: [string, number, number][] }[] = [
  { title: 'Ejemplo · Día A', ex: [['prensa', 80, 5], ['press_banca_mancuernas', 14, 2], ['jalon_pecho', 40, 2.5]] },
  { title: 'Ejemplo · Día B', ex: [['peso_muerto_rumano_mancuernas', 16, 2], ['press_hombro_maquina', 25, 5], ['remo_polea_baja', 40, 2.5]] },
]

function set(kind: SetEntry['kind'], w: number | null, reps: number, rir: number | null, t: number): SetEntry {
  return { id: newId('set'), kind, weightKg: w, reps, rir, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: t }
}

export async function loadDemo(today = toLocalDate()): Promise<number> {
  const sessions: Session[] = []
  const start = addDays(today, -35)
  let k = 0
  for (let d = 0; d <= 34; d++) {
    const wd = (new Date(addDays(start, d)).getDay() + 6) % 7
    if (![0, 2, 4].includes(wd)) continue
    const day = PLAN[k % 2]
    const week = Math.floor(k / 3)
    const date = addDays(start, d)
    const t0 = new Date(`${date}T18:00:00`).getTime()
    const exercises: SessionExercise[] = day.ex.map(([id, base, step], i) => {
      const ex = getExercise(id)
      const w = base + step * Math.floor(week / 2)
      const repsTop = 8 + ((week % 2) * 3)
      return {
        uid: newId('se'), exerciseId: id, nameSnapshot: ex?.name ?? id, loadTypeSnapshot: ex?.loadType ?? 'machine', unilateralSnapshot: false,
        prescription: { sets: 3, repMin: 8, repMax: 12, rirMin: 2, rirMax: 3, restSec: 120, warmupSets: i === 0 ? 1 : 0 },
        sets: [...(i === 0 ? [set('warmup', Math.round(w * 0.5), 10, null, t0)] : []), set('work', w, repsTop, 2, t0), set('work', w, repsTop, 2, t0), set('work', w, Math.max(8, repsTop - 1), 1, t0)],
        notes: '', painFlag: false,
      }
    })
    sessions.push({
      id: newId('demo'), status: 'completed', routineId: null, routineVersionId: null, dayId: null, title: day.title, date, startedAt: t0, endedAt: t0 + 50 * 60000,
      pausedAt: null, pausedTotalMs: 0, exercises, notes: '', rampApplied: false, engineVersion: 'demo', isDemo: true, updatedAt: t0, rest: null,
    })
    k++
  }
  const bw: BodyWeightEntry[] = [0, 10, 20, 30].map((o, i) => ({ id: newId('bw'), date: addDays(start, o), kg: 72 + i * 0.3, isDemo: true }))
  await db().transaction('rw', db().sessions, db().bodyweight, async () => {
    await db().sessions.bulkPut(sessions)
    await db().bodyweight.bulkPut(bw)
  })
  return sessions.length
}

export async function clearDemo(): Promise<number> {
  let n = 0
  await db().transaction('rw', [db().sessions, db().bodyweight, db().routines, db().routineVersions], async () => {
    const s = await db().sessions.filter((x) => !!x.isDemo).primaryKeys()
    await db().sessions.bulkDelete(s)
    n += s.length
    const b = await db().bodyweight.filter((x) => !!x.isDemo).primaryKeys()
    await db().bodyweight.bulkDelete(b)
    const r = await db().routines.filter((x) => !!x.isDemo).toArray()
    for (const rt of r) {
      await db().routineVersions.where('routineId').equals(rt.id).delete()
      await db().routines.delete(rt.id)
    }
  })
  return n
}
