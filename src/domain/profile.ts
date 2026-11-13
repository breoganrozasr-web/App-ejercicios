import { GYM_EQUIPMENT } from './catalog'
import type { Increments, Limitations, Profile } from './types'

export const DEFAULT_INCREMENTS: Increments = { barbellKg: 2.5, dumbbellKg: 2, machineKg: 5, cableKg: 2.5, barKg: 20 }

export const NO_LIMITATIONS: Limitations = {
  painNow: false, recentInjury: false, cardioMetabolic: false, pregnancy: false, otherCondition: false, notes: '', clearedByProfessional: false,
}

export function defaultProfile(now = Date.now()): Profile {
  return {
    id: 'me',
    level: 'beginner',
    goal: 'hypertrophy',
    days: [0, 2, 4],
    minutesPerSession: 60,
    locations: ['gym'],
    equipment: [...GYM_EQUIPMENT],
    frequency: 'auto',
    excludedExercises: [],
    priorityMuscles: [],
    preferences: '',
    ageBand: '18to39',
    limitations: { ...NO_LIMITATIONS },
    increments: { ...DEFAULT_INCREMENTS },
    createdAt: now,
    updatedAt: now,
  }
}
