import type { CorrectionChange, Session, SessionCorrection } from './types'

/**
 * Correcciones de una sesión ya guardada (apartado 6.5): carga, repeticiones, RIR, segundos, asistencia o lastre de
 * series y de TRAMOS de bloques. Cada corrección guarda los valores anteriores para poder deshacerla. No toca
 * temporizadores, prescripciones ni el método de un bloque: 40×10 → 30×8 sigue siendo dos tramos.
 */
const FIELDS: CorrectionChange['field'][] = ['weightKg', 'reps', 'rir', 'durationSec', 'assistKg', 'addedKg']

/** Cambios de valores entre la sesión guardada y la editada (solo los campos corregibles). */
export function diffCorrection(before: Session, after: Session): CorrectionChange[] {
  const out: CorrectionChange[] = []
  for (const eb of before.exercises) {
    const ea = after.exercises.find((x) => x.uid === eb.uid)
    if (!ea) continue
    for (const sb of eb.sets) {
      const sa = ea.sets.find((x) => x.id === sb.id)
      if (!sa) continue
      if (sb.block && sa.block) {
        for (const gb of sb.block.segments) {
          const ga = sa.block.segments.find((x) => x.id === gb.id)
          if (!ga) continue
          for (const f of ['weightKg', 'reps', 'rir', 'assistKg', 'addedKg'] as const) {
            const from = (gb[f] ?? null) as number | null
            const to = (ga[f] ?? null) as number | null
            if (from !== to) out.push({ exerciseUid: eb.uid, setId: sb.id, segmentId: gb.id, field: f, from, to })
          }
        }
        continue
      }
      for (const f of FIELDS) {
        const from = (sb[f] ?? null) as number | null
        const to = (sa[f] ?? null) as number | null
        if (from !== to) out.push({ exerciseUid: eb.uid, setId: sb.id, field: f, from, to })
      }
    }
  }
  return out
}

function applyValues(s: Session, changes: CorrectionChange[], dir: 'to' | 'from'): Session {
  const c = structuredClone(s)
  for (const ch of changes) {
    const ex = c.exercises.find((x) => x.uid === ch.exerciseUid)
    const set = ex?.sets.find((x) => x.id === ch.setId)
    if (!set) continue
    const v = ch[dir]
    if (ch.segmentId) {
      const seg = set.block?.segments.find((x) => x.id === ch.segmentId)
      if (seg && ch.field !== 'durationSec') (seg as unknown as Record<string, unknown>)[ch.field] = v
    } else {
      ;(set as unknown as Record<string, unknown>)[ch.field] = v
    }
  }
  return c
}

/** Añade una corrección (con los valores anteriores) a la sesión. Sin cambios, devuelve null. */
export function withCorrection(before: Session, edited: Session, id: string, at: number): { session: Session; correction: SessionCorrection } | null {
  const changes = diffCorrection(before, edited)
  if (!changes.length) return null
  const correction: SessionCorrection = { id, at, changes }
  const session = applyValues(before, changes, 'to')
  session.corrections = [...(before.corrections ?? []), correction]
  return { session, correction }
}

/** Última corrección sin deshacer. */
export function lastOpenCorrection(s: Session): SessionCorrection | null {
  return [...(s.corrections ?? [])].reverse().find((c) => !c.undoneAt) ?? null
}

/** Deshace la última corrección: restaura los valores anteriores y la marca como deshecha (queda en el registro). */
export function undoLastCorrection(s: Session, at: number): Session | null {
  const last = lastOpenCorrection(s)
  if (!last) return null
  const restored = applyValues(s, last.changes, 'from')
  restored.corrections = (s.corrections ?? []).map((c) => (c.id === last.id ? { ...c, undoneAt: at } : c))
  return restored
}

const FIELD_LABEL: Record<CorrectionChange['field'], string> = { weightKg: 'kg', reps: 'rep', rir: 'RIR', durationSec: 's', assistKg: 'kg de asistencia', addedKg: 'kg de lastre' }

/** Texto de vista previa: «Press de banca, serie 2: 40 → 42,5 kg». */
export function describeChanges(s: Session, changes: CorrectionChange[], fmt: (n: number) => string): string[] {
  return changes.map((ch) => {
    const ex = s.exercises.find((x) => x.uid === ch.exerciseUid)
    const work = ex?.sets.filter((x) => x.kind === 'work') ?? []
    const idx = work.findIndex((x) => x.id === ch.setId)
    const set = ex?.sets.find((x) => x.id === ch.setId)
    const where = set?.kind === 'warmup' ? 'calentamiento' : ch.segmentId ? `bloque ${idx + 1}, tramo ${(set?.block?.segments.findIndex((g) => g.id === ch.segmentId) ?? 0) + 1}` : `serie ${idx + 1}`
    const v = (n: number | null) => (n === null ? '—' : fmt(n))
    return `${ex?.nameSnapshot ?? '?'}, ${where}: ${v(ch.from)} → ${v(ch.to)} ${FIELD_LABEL[ch.field]}`
  })
}
