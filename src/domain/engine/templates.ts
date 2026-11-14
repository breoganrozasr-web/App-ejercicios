import { GYM_EQUIPMENT, HOME_BASIC_EQUIPMENT, HOME_NONE_EQUIPMENT, OUTDOOR_EQUIPMENT } from '../catalog'
import type { Pattern } from '../types'
import type { Slot, TemplateDef } from './generator'
import type { SlotRole } from './params'

const M = (pattern: Pattern, ...prefer: string[]): Slot => ({ pattern, role: 'main' as SlotRole, prefer })
const S = (pattern: Pattern, ...prefer: string[]): Slot => ({ pattern, role: 'secondary' as SlotRole, prefer })
const A = (pattern: Pattern, ...prefer: string[]): Slot => ({ pattern, role: 'accessory' as SlotRole, prefer })
/** Referencia de fuerza / pesado del día (solo cuenta como tal con objetivo fuerza o mixto). */
const R = (pattern: Pattern, ...prefer: string[]): Slot => ({ pattern, role: 'main' as SlotRole, prefer, reference: true })
const N = (slot: Slot, sets: number): Slot => ({ ...slot, sets })

/**
 * Plantillas completas y editables (motor 2). Los ejercicios se eligen con la misma maquinaria que el generador
 * (respetan material, exclusiones y nivel). La frecuencia real se CALCULA y se muestra en la vista previa:
 * las descripciones no prometen cifras. Días: 0 = lunes … 6 = domingo.
 */
export const TEMPLATES: TemplateDef[] = [
  {
    id: 'fb2_gym',
    name: 'Cuerpo completo · 2 días',
    description: 'Dos sesiones de cuerpo completo (A y B) con sentadilla o zancada, bisagra o curl femoral, empuje y tirón cada día. Útil si tienes poco tiempo o empiezas.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 3],
    notes: ['Con solo 2 días, cada sesión incluye todos los grupos: es normal que dure algo más.'],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('squat', 'prensa'), M('push_h', 'press_banca_mancuernas'), M('pull_v', 'jalon_pecho'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('shoulder_lat'), A('biceps', 'curl_mancuernas'), A('core_stab', 'plancha_frontal')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('squat', 'sentadilla_banco_mancuernas'), M('push_h', 'press_pecho_maquina'), M('pull_h', 'remo_polea_baja'), S('push_v', 'press_hombro_mancuernas'), A('knee_flex', 'curl_femoral_sentado'), A('triceps', 'extension_triceps_cuerda'), A('calves', 'gemelos_maquina_pie')] },
    ],
  },
  {
    id: 'fb3_gym',
    name: 'Cuerpo completo · 3 días',
    description: 'Tres sesiones de cuerpo completo (A, B y C) en días alternos, con trabajo directo de pecho, espalda, cuádriceps, isquios y glúteos cada día y pocas series por sesión.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: ['La prensa se repite dos días para practicar y medir el progreso con el mismo ejercicio.'],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('squat', 'prensa'), M('push_h', 'press_banca_mancuernas'), M('pull_v', 'jalon_pecho'), S('knee_flex', 'curl_femoral_tumbado'), A('shoulder_lat'), A('core_stab', 'plancha_frontal')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('hinge', 'peso_muerto_rumano_mancuernas'), M('push_h', 'press_pecho_maquina'), M('pull_h', 'remo_polea_baja'), S('lunge', 'zancadas_mancuernas'), A('triceps', 'extension_triceps_cuerda'), A('calves', 'gemelos_maquina_pie')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('squat', 'prensa'), M('push_h', 'press_inclinado_mancuernas'), M('pull_v', 'jalon_supino'), S('knee_flex', 'curl_femoral_sentado'), A('biceps', 'curl_mancuernas'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'ul4_gym',
    name: 'Torso / pierna · 4 días',
    description: 'Dos sesiones de torso y dos de pierna. Lunes-martes y jueves-viernes alternan torso y pierna, así los días seguidos no repiten grupos.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 1, 3, 4],
    notes: [],
    sessions: [
      { name: 'Torso A', focus: 'upper', slots: [M('push_h', 'press_banca_barra'), M('pull_v', 'jalon_pecho'), S('push_v', 'press_hombro_mancuernas'), S('pull_h', 'remo_polea_baja'), A('shoulder_lat'), A('triceps', 'extension_triceps_cuerda'), A('biceps', 'curl_mancuernas')] },
      { name: 'Pierna A', focus: 'legs', slots: [M('squat', 'sentadilla_barra'), S('hinge', 'peso_muerto_rumano'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie'), A('core_flex', 'crunch_polea')] },
      { name: 'Torso B', focus: 'upper', slots: [M('pull_h', 'remo_mancuerna'), M('push_h', 'press_inclinado_mancuernas'), S('pull_v', 'jalon_estrecho'), S('push_v', 'press_hombro_maquina'), A('shoulder_rear', 'pajaros_tumbado'), A('biceps', 'curl_martillo'), A('triceps', 'extension_triceps_sobre_cabeza')] },
      { name: 'Pierna B', focus: 'legs', slots: [M('squat', 'prensa'), S('lunge', 'zancadas_mancuernas'), A('knee_ext', 'extension_cuadriceps'), A('knee_flex', 'curl_femoral_sentado'), A('calves', 'gemelos_sentado_maquina'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'ppl3_gym',
    name: 'Empuje / tirón / pierna · 3 días',
    description: 'Un día de empuje (pecho, hombro, tríceps), uno de tirón (espalda, bíceps) y uno de pierna. Cada grupo recibe trabajo directo un día por semana: no es una frecuencia 2.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: ['Con frecuencia 1, cada sesión concentra más series por grupo. Si prefieres repartirlas, el cuerpo completo de 3 días usa los mismos días.'],
    sessions: [
      { name: 'Empuje', focus: 'push', slots: [M('push_h', 'press_banca_barra'), S('push_h', 'press_inclinado_mancuernas'), S('push_v', 'press_hombro_mancuernas'), A('shoulder_lat'), A('triceps', 'extension_triceps_cuerda'), A('chest_iso', 'contractor_pecho')] },
      { name: 'Tirón', focus: 'pull', slots: [M('pull_v', 'jalon_pecho'), S('pull_h', 'remo_polea_baja'), S('pull_h', 'remo_mancuerna'), A('shoulder_rear', 'pajaros_tumbado'), A('biceps', 'curl_mancuernas'), A('biceps', 'curl_martillo')] },
      { name: 'Pierna', focus: 'legs', slots: [M('squat', 'sentadilla_barra'), S('hinge', 'peso_muerto_rumano'), S('squat', 'prensa'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie'), A('core_flex', 'crunch_polea')] },
    ],
  },
  {
    id: 'ppl6_gym',
    name: 'Empuje / tirón / pierna · 6 días',
    description: 'Seis sesiones (empuje, tirón y pierna dos veces). Mucho tiempo y volumen semanal: para personas con experiencia, buena recuperación y tiempo.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'intermediate', weekdays: [0, 1, 2, 3, 4, 5],
    notes: ['⚠ Exige mucho tiempo y recuperación. No es la recomendación inicial: el generador nunca la propone por sí solo a principiantes.', 'Domingo libre. La sesión B de cada bloque cambia ejercicios para variar ángulos sin cambiar todo cada semana.'],
    sessions: [
      { name: 'Empuje A', focus: 'push', slots: [M('push_h', 'press_banca_barra'), S('push_v', 'press_hombro_mancuernas'), S('push_h', 'press_inclinado_mancuernas'), A('shoulder_lat'), A('triceps', 'extension_triceps_cuerda')] },
      { name: 'Tirón A', focus: 'pull', slots: [M('pull_v', 'dominadas', 'jalon_pecho'), S('pull_h', 'remo_barra_supino'), A('lats_iso', 'pullover_polea'), A('shoulder_rear', 'pajaros_tumbado'), A('biceps', 'curl_barra_z')] },
      { name: 'Pierna A', focus: 'legs', slots: [M('squat', 'sentadilla_barra'), S('hinge', 'peso_muerto_rumano'), A('knee_ext', 'extension_cuadriceps'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie')] },
      { name: 'Empuje B', focus: 'push', slots: [M('push_v', 'press_militar_barra_sentado'), S('push_h', 'press_banca_mancuernas'), A('chest_iso', 'cruce_poleas'), A('shoulder_lat'), A('triceps', 'extension_triceps_sobre_cabeza')] },
      { name: 'Tirón B', focus: 'pull', slots: [M('pull_h', 'remo_mancuerna'), S('pull_v', 'jalon_supino'), S('pull_h', 'remo_polea_baja'), A('shoulder_rear', 'pajaros_tumbado'), A('biceps', 'curl_inclinado')] },
      { name: 'Pierna B', focus: 'legs', slots: [M('squat', 'prensa'), S('lunge', 'zancadas_caminando', 'zancadas_mancuernas'), A('knee_flex', 'curl_femoral_sentado'), A('glute', 'patada_gluteo_polea'), A('calves', 'gemelos_sentado_maquina'), A('core_flex', 'crunch_polea')] },
    ],
  },
  {
    id: 'strength3_gym',
    name: 'Fuerza básica · 3 días',
    description: 'Orientada a ganar fuerza en ejercicios básicos con barra, que se practican primero. Las referencias usan menos repeticiones y descansos largos; sin máximos ni series de 1–3 repeticiones.',
    location: 'gym', equipment: GYM_EQUIPMENT, goal: 'strength', minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: ['Sentadilla y press de banca se practican dos días por semana: la fuerza mejora con la práctica del gesto.', 'Usa topes de seguridad o ayudante en sentadilla y press de banca.'],
    sessions: [
      { name: 'Fuerza A', focus: 'full', slots: [R('squat', 'sentadilla_barra'), R('push_h', 'press_banca_barra'), S('pull_h', 'remo_barra_supino', 'remo_polea_baja'), A('core_stab', 'plancha_frontal')] },
      { name: 'Fuerza B', focus: 'full', slots: [R('hinge', 'peso_muerto_rumano'), R('push_v', 'press_militar_barra_sentado', 'press_hombro_mancuernas'), S('pull_v', 'jalon_pecho'), A('calves', 'gemelos_maquina_pie')] },
      { name: 'Fuerza C', focus: 'full', slots: [R('squat', 'sentadilla_barra'), R('push_h', 'press_banca_barra'), S('pull_h', 'remo_polea_baja'), A('knee_flex', 'curl_femoral_tumbado'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'mixed4_gym',
    name: 'Mixta fuerza + músculo · 4 días',
    description: 'Torso/pierna con un ejercicio pesado de referencia al inicio de cada sesión (5–8 repeticiones) y el resto en rangos de músculo.',
    location: 'gym', equipment: GYM_EQUIPMENT, goal: 'mixed', minLevel: 'beginner', weekdays: [0, 1, 3, 4],
    notes: ['El primer ejercicio de cada día es la referencia pesada; los demás se trabajan con más repeticiones.'],
    sessions: [
      { name: 'Torso pesado', focus: 'upper', slots: [R('push_h', 'press_banca_barra'), S('pull_h', 'remo_polea_baja'), S('push_v', 'press_hombro_mancuernas'), S('pull_v', 'jalon_pecho'), A('triceps', 'extension_triceps_cuerda'), A('biceps', 'curl_mancuernas')] },
      { name: 'Pierna pesada', focus: 'legs', slots: [R('squat', 'sentadilla_barra'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie'), A('core_flex', 'crunch_polea')] },
      { name: 'Torso volumen', focus: 'upper', slots: [R('pull_v', 'jalon_pecho'), S('push_h', 'press_inclinado_mancuernas'), S('pull_h', 'remo_mancuerna'), S('push_v', 'press_hombro_maquina'), A('shoulder_lat'), A('shoulder_rear', 'pajaros_tumbado')] },
      { name: 'Pierna volumen', focus: 'legs', slots: [R('hinge', 'peso_muerto_rumano'), S('squat', 'prensa'), S('lunge', 'zancadas_mancuernas'), A('knee_ext', 'extension_cuadriceps'), A('calves', 'gemelos_sentado_maquina'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'home_none',
    name: 'Casa sin material · 3 días',
    description: 'Peso corporal en el suelo, sin material. Cobertura: pierna, empuje y tronco. Progresas con más repeticiones y con variantes más difíciles (con tu confirmación).',
    location: 'home', equipment: HOME_NONE_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: [
      '⚠ Falta tirón de espalda con resistencia progresable: sin material no hay remo ni dominada, y el superman no lo sustituye. Si dispones de una banda con anclaje apto o de una barra de parque, márcalo en tu perfil; no hace falta comprar nada para empezar.',
      '⚠ Hay límites para entrenar los isquiosurales de forma completa: el puente trabaja glúteos, pero no la flexión de rodilla.',
      'Flexión adecuada a tu nivel: si no llegas a 6 con control, usa rodillas apoyadas. Pared o manos elevadas solo con un soporte confirmado, estable y adecuado.',
    ],
    sessions: [
      { name: 'Día A · Pierna, empuje y tronco', focus: 'full', slots: [N(M('squat', 'sentadilla_peso_corporal'), 2), N(M('push_h', '@flexion'), 2), N(A('glute', 'puente_gluteo'), 2), N(A('core_stab', 'plancha_frontal'), 2)] },
      { name: 'Día B · Pierna, empuje y tronco', focus: 'full', slots: [N(M('lunge', 'zancada_atras_peso_corporal'), 2), N(M('push_h', '@flexion'), 2), N(A('glute', 'puente_gluteo'), 2), N(A('core_stab', 'plancha_lateral'), 1)] },
      { name: 'Día C · Pierna y empuje', focus: 'full', slots: [N(M('squat', 'sentadilla_peso_corporal'), 2), N(M('push_h', '@flexion'), 2), N(A('glute', 'puente_gluteo'), 2), N(A('calves', 'gemelos_peso_corporal'), 2)] },
    ],
  },
  {
    id: 'home_basic',
    name: 'Casa con material básico · 3 días',
    description: 'Mancuernas, bandas elásticas, barra de dominadas y una silla estable. Cuerpo completo 3 días.',
    location: 'home', equipment: HOME_BASIC_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: [
      'Las dominadas aparecen si tu nivel lo permite; si aún no haces repeticiones completas, el remo con mancuerna cubre el tirón.',
      'Las bandas no tienen kilos comparables: anota el color o nivel de la banda.',
    ],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('squat', 'sentadilla_mancuernas'), M('push_h', 'flexiones'), M('pull_h', 'remo_mancuerna'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('shoulder_rear', 'aperturas_posteriores_banda'), A('biceps', 'curl_mancuernas')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('lunge', 'zancadas_mancuernas'), M('push_h', 'flexiones_rodillas', 'flexiones'), { ...M('pull_v', 'dominadas_supinas'), fallback: 'pull_h' as Pattern }, S('glute', 'puente_gluteo'), A('shoulder_lat', 'elevaciones_laterales'), A('calves', 'gemelos_banda'), A('core_stab', 'plancha_lateral')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('squat', 'sentadilla_sumo_mancuerna'), M('push_h', 'flexiones_pies_elevados', 'flexiones'), M('pull_h', 'remo_mancuerna'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('triceps', 'patada_triceps'), A('core_stab', 'plancha_frontal')] },
    ],
  },
  {
    id: 'park_calisthenics',
    name: 'Parque / calistenia · 3 días',
    description: 'Barras de parque (dominadas y barra baja), un banco y el suelo. Cuerpo completo 3 días con progresión por variantes (con tu confirmación).',
    location: 'outdoor', equipment: OUTDOOR_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: [
      'El remo invertido es la puerta de entrada al tirón: cuanto más horizontal el cuerpo, más difícil. Las dominadas aparecen si tu nivel lo permite.',
      '⚠ Sin bisagra con carga ni curl femoral, los isquiosurales no reciben trabajo directo: el puente trabaja glúteos.',
    ],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('pull_h', 'remo_invertido'), M('push_h', '@flexion'), M('squat', 'sentadilla_peso_corporal'), A('glute', 'puente_gluteo'), A('core_stab', 'plancha_lateral')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [{ ...M('pull_v', 'dominadas', 'dominadas_supinas'), fallback: 'pull_h' as Pattern }, M('push_h', 'flexiones_inclinadas', '@flexion'), M('lunge', 'zancada_atras_peso_corporal', 'zancada_apoyo'), A('glute', 'puente_gluteo'), A('core_stab', 'plancha_frontal')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('pull_h', 'remo_invertido'), M('push_h', 'flexiones_pies_elevados', '@flexion'), M('squat', 'sentadilla_peso_corporal'), A('glute', 'puente_gluteo'), A('core_flex', 'bicicleta_abdominal')] },
    ],
  },
]

export const TEMPLATE_BY_ID: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]))
