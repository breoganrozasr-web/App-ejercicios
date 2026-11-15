/**
 * Genera docs/PLANTILLAS.md a partir de las recetas (no es texto estático): series por sesión, frecuencias reales,
 * duración estimada, material y conflictos. Uso: npx vite-node scripts/recipes-table.ts
 * Perfil de cálculo: adulto, gimnasio completo (o el material de la plantilla), 7 días disponibles, 60 min, sin exclusiones.
 */
import { writeFileSync } from 'node:fs'
import { EQUIPMENT_LABEL } from '../src/domain/catalog/exercises'
import { REGION_LABEL } from '../src/domain/engine/contribution'
import { ENGINE_VERSION } from '../src/domain/engine/params'
import { GOAL_LABEL, PLACE_LABEL, RECIPES, TEMPLATE_CONTENT_VERSION, basicsPractice, buildFromRecipe, calendarText, minutesText } from '../src/domain/engine/recipes'
import { defaultProfile } from '../src/domain/profile'

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const lines: string[] = []
lines.push('# Plantillas de Forja (tabla generada)', '')
lines.push(`Generada con \`npx vite-node scripts/recipes-table.ts\` desde el código (motor ${ENGINE_VERSION}, contenidos ${TEMPLATE_CONTENT_VERSION}). Los «controles» del anexo A son referencias editoriales que las pruebas comparan con este cálculo; no lo sustituyen.`, '')
lines.push('Perfil de cálculo: adulto, 7 días disponibles, 60 min por sesión, sin exclusiones, con el material que pide cada plantilla. Directas + indirectas estimadas (0,5) por semana; «d» = días con trabajo directo. Duración: intervalo estimado del plan base y, entre paréntesis, durante el aprendizaje (principiante).', '')
lines.push('| Código | Plantilla | Calendario | Series/sesión | Pecho | Espalda | Cuádriceps | Isquios | Glúteos | Duración base (aprendizaje) | Básicos (días) | Material | Conflictos con el perfil de cálculo |')
lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const r of RECIPES) {
  const p = { ...defaultProfile(0), level: 'beginner' as const, days: [0, 1, 2, 3, 4, 5, 6], equipment: [...new Set([...defaultProfile(0).equipment, ...r.equipment])], locations: [r.location], minutesPerSession: 60 }
  const b = buildFromRecipe(r, p)
  const v = (reg: string) => { const x = b.volume.find((y) => y.region === reg)!; return `${fmt(x.direct)}${x.secondary ? ` + ${fmt(x.secondary * 0.5)}` : ''} · ${x.directDays} d` }
  const dur = b.minutes.map((m) => `${minutesText(m.base)}${m.learning ? ` (${minutesText(m.learning)})` : ''}`).join('; ')
  const basics = basicsPractice(r).map((x) => `${x.name.replace(' con barra', '')} ${x.days}`).join(', ') || '—'
  const conflicts = [r.explicitOnly ? 'solo elección explícita' : '', r.lowerPriority ? 'requiere prioridad de pierna/glúteos' : '', b.maxMinutes > 63 ? `sesión más larga ≈${b.maxMinutes} min > 60` : '', ...(r.limits ?? []).map((l) => l.split(':')[0])].filter(Boolean).join('; ') || '—'
  lines.push(`| ${r.code} | ${r.name} (\`${r.id}\` v${r.version}) | ${calendarText(r)} | ${r.perSession.join(', ')} | ${v('chest')} | ${v('back')} | ${v('quads')} | ${v('hamstrings')} | ${v('glutes')} | ${dur} | ${basics} | ${PLACE_LABEL[r.place]}: ${r.equipment.map((e) => EQUIPMENT_LABEL[e].toLowerCase()).join(', ') || 'ninguno'} | ${conflicts} |`)
}
lines.push('', `Objetivo principal por plantilla: ${RECIPES.map((r) => `${r.code} ${GOAL_LABEL[r.goals[0]].toLowerCase()}`).join(' · ')}.`, '')
lines.push(`Regiones: ${['chest', 'back', 'quads', 'hamstrings', 'glutes'].map((r) => REGION_LABEL[r as 'chest']).join(', ')} (mapa muscular 2, anexo B). Brazos, deltoides, gemelos y tronco se ven en la app con su origen.`)
writeFileSync('docs/PLANTILLAS.md', lines.join('\n') + '\n')
console.log('docs/PLANTILLAS.md', RECIPES.length)
