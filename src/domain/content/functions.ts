import type { Exercise, Pattern } from '../types'

/**
 * «Qué aporta»: funciones musculares por patrón (anexo D1 del encargo del 15/11/2026). Criterios editoriales de revisión,
 * no una certificación anatómica. Son otra capa distinta de los contadores de series (mapa muscular).
 */
const BY_PATTERN: Partial<Record<Pattern, string>> = {
  push_h: 'Pecho: acerca el brazo por delante del tronco y, al ser un press, también extiende el codo (tríceps) con ayuda del hombro anterior.',
  chest_iso: 'Pecho: lleva el brazo hacia delante y hacia dentro. A diferencia de un press, no reproduce la extensión de codo del tríceps.',
  pull_v: 'Espalda: tirón vertical (el brazo baja desde arriba). «Espalda» agrupa músculos con papeles distintos; un tirón vertical no sustituye por completo a uno horizontal.',
  pull_h: 'Espalda: tirón horizontal (el codo va hacia atrás) con movimiento de escápulas. Complementa al tirón vertical; no es lo mismo que un jalón.',
  push_v: 'Hombro: press (flexión del hombro) con trabajo secundario de tríceps. Mucho press ya da trabajo al deltoides anterior: no hacen falta elevaciones frontales por defecto.',
  shoulder_lat: 'Hombro: abducción (separar el brazo hacia el lado), con el deltoides lateral como protagonista. No equivale a un press.',
  shoulder_rear: 'Hombro: abducción horizontal (abrir los brazos hacia atrás), con el deltoides posterior como protagonista.',
  squat: 'Cuádriceps: extensión de rodilla, con glúteos en la extensión de cadera. Sentadilla, prensa y extensión en máquina no son intercambiables en toda su respuesta regional; no cubre la dosis específica de isquios.',
  lunge: 'Cuádriceps y glúteos, una pierna cada vez: extensión de rodilla y de cadera con más demanda de equilibrio. No cubre la flexión de rodilla de los isquios.',
  knee_ext: 'Cuádriceps: extensión de rodilla aislada. Complementa a sentadilla o prensa (que no son idénticas en respuesta regional), sin ser obligatoria.',
  hinge: 'Isquios y glúteos: extensión de cadera (bisagra). Los isquios también flexionan la rodilla: una bisagra y un curl femoral cubren funciones distintas.',
  knee_flex: 'Isquios: flexión de rodilla. Complementa a la bisagra de cadera; ni la sentadilla ni el puente cubren esta función.',
  glute: 'Glúteo mayor: extensión de cadera. Sentadillas, zancadas y bisagras ya cuentan para el glúteo; esta variante no es obligatoria ni sustituye al curl femoral.',
  hip_abd: 'Glúteos (porción media) y abductores: abducción de cadera. No se suma como si fuera el mismo trabajo que un hip thrust.',
  biceps: 'Brazo: flexión de codo. El agarre (supino, neutro) y la posición del hombro cambian la variante; el curl martillo no es trabajo exclusivo del bíceps.',
  triceps: 'Brazo: extensión de codo. Con el brazo elevado o junto al cuerpo cambian las condiciones; no se trasladan kg de cuerda a mancuerna.',
  calves: 'Pantorrilla: flexión plantar (gastrocnemio y sóleo). Con la rodilla extendida o flexionada cambian las condiciones (F19), sin exclusividad absoluta.',
  core_flex: 'Tronco: flexión dinámica. Se cuenta por repeticiones; no se compara con una plancha por tiempo.',
  core_stab: 'Tronco: resistir la extensión o la flexión lateral, por tiempo. Para antes de perder la postura; no tiene RIR ni 1RM.',
}

export function functionText(ex: Pick<Exercise, 'id' | 'pattern' | 'loadType'>): string | null {
  if (ex.id === 'peso_muerto_convencional') return 'Práctica específica del tercer levantamiento del powerlifting: extensión de cadera y rodilla con estabilización de tronco y agarre. Los erectores trabajan, pero eso no lo convierte en un remo ni en todas las series de espalda.'
  if (ex.id === 'press_inclinado_mancuernas' || ex.id === 'press_inclinado_barra') return 'Pecho con el banco inclinado: mismo gesto de press (brazo por delante del tronco y extensión de codo) con otro ángulo y algo más de hombro anterior. El ángulo no garantiza crecimiento de una región concreta.'
  if (ex.pattern === 'push_h' && ex.loadType === 'bodyweight') return 'Pecho, tríceps y hombro anterior empujando el cuerpo; el tronco se mantiene en línea (el abdomen estabiliza). Las variantes cambian la carga, no la función.'
  if (ex.id === 'gemelos_sentado_maquina') return 'Pantorrilla con la rodilla flexionada: el sóleo trabaja en condiciones distintas que de pie (F19). Mantener ambas variantes no es redundante.'
  return BY_PATTERN[ex.pattern] ?? null
}

/** Cuando una alternativa cambia de patrón, qué cambia en el plan (6.4: «mismo músculo» no basta). */
export function patternChangeNote(from: Pattern, to: Pattern): string | null {
  const k = `${from}>${to}`
  const notes: Record<string, string> = {
    'knee_flex>hinge': 'cambia la función: bisagra de cadera en lugar de flexión de rodilla; revisa la cobertura de isquios del plan',
    'hinge>knee_flex': 'cambia la función: flexión de rodilla en lugar de bisagra de cadera; revisa la cobertura del plan',
    'hinge>glute': 'cambia la función: extensión de cadera sin la bisagra cargada; los isquios quedan con menos trabajo',
    'hinge>back_ext': 'cambia la carga y el patrón: revisa la cobertura de isquios',
    'glute>hinge': 'cambia el patrón: bisagra con más demanda de isquios y agarre',
    'pull_v>pull_h': 'cambia la dirección del tirón (horizontal en lugar de vertical)',
    'pull_h>pull_v': 'cambia la dirección del tirón (vertical en lugar de horizontal)',
    'push_h>push_v': 'cambia el patrón: press de hombro en lugar de press de pecho',
    'push_v>push_h': 'cambia el patrón: press de pecho en lugar de press de hombro',
    'chest_iso>push_h': 'un press añade extensión de codo (tríceps): no es la misma función',
    'squat>lunge': 'misma función, a una pierna: más equilibrio y otra carga',
    'lunge>squat': 'misma función, a dos piernas: otra carga',
    'knee_ext>squat': 'cambia de aislamiento a compuesto: no reproduce toda la respuesta de la extensión',
    'core_flex>core_stab': 'cambia la unidad: por tiempo en lugar de repeticiones',
    'core_stab>core_flex': 'cambia la unidad: repeticiones en lugar de tiempo',
  }
  return notes[k] ?? null
}
