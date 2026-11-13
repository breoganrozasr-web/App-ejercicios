import { describe, it } from 'vitest'
import { generateRoutine } from '../../src/domain/engine/generator'
import { analyzeRoutine } from '../../src/domain/engine/analysis'
import { defaultProfile } from '../../src/domain/profile'
import { HOME_NONE_EQUIPMENT } from '../../src/domain/catalog'
import type { Profile } from '../../src/domain/types'

function dump(label: string, p: Profile, opts = {}) {
  const r = generateRoutine(p, opts)
  console.log('\n=====', label, r.status)
  if (r.status !== 'ok') { console.log(JSON.stringify(r, null, 1).slice(0, 1200)); return }
  for (const d of r.draft.days) console.log(d.name, d.exercises.map((e) => `${e.exerciseId} ${e.prescription.sets}x${e.prescription.repMin}-${e.prescription.repMax} r${e.prescription.restSec}`).join(' | '))
  const a = analyzeRoutine(r.draft)
  console.log('sched', r.draft.schedule.map((s) => s.weekday + ':' + s.dayId).join(','))
  console.log(a.volume.map((v) => `${v.muscle}:${v.weighted}/f${v.frequencyDirect}`).join(' '))
  console.log('min', a.dayMinutes.map((d) => d.minutes), 'notices', r.notices, 'warn', r.draft.warnings, 'rec', a.recoveryWarnings, 'adj', r.timeAdjustments.map((t) => t.id + ':' + t.maxMinutesAfter))
}
describe('scenarios', () => {
  it('dump', () => {
    const p = defaultProfile(); p.days = [0, 3]; p.frequency = 3; dump('2d f3', p)
    const h = defaultProfile(); h.locations = ['home']; h.equipment = [...HOME_NONE_EQUIPMENT]; h.days = [0, 2, 4]; dump('home none', h)
    const u = defaultProfile(); u.level = 'returning'; u.days = [0, 1, 3, 4]; dump('4d returning', u)
    const i = defaultProfile(); i.level = 'intermediate'; i.days = [0, 1, 2, 3, 4, 5]; dump('6d intermediate', i)
    const c = defaultProfile(); c.days = [5, 6, 0]; c.frequency = 3; dump('sat sun mon f3', c)
    const t = defaultProfile(); t.days = [0, 2, 4]; t.minutesPerSession = 30; t.level = 'intermediate'; dump('30min', t)
    const y = defaultProfile(); y.ageBand = '14to17'; dump('youth', y)
    const s = defaultProfile(); s.goal = 'strength'; s.level = 'intermediate'; s.days = [0,2,4]; dump('strength int', s)
  })
})
