import { GYM_EQUIPMENT, HOME_BASIC_EQUIPMENT, HOME_NONE_EQUIPMENT, OUTDOOR_EQUIPMENT } from '../catalog'
import type { Pattern } from '../types'
import type { TemplateDef } from './generator'
import type { SlotRole } from './params'

const M = (pattern: Pattern, ...prefer: string[]) => ({ pattern, role: 'main' as SlotRole, prefer })
const S = (pattern: Pattern, ...prefer: string[]) => ({ pattern, role: 'secondary' as SlotRole, prefer })
const A = (pattern: Pattern, ...prefer: string[]) => ({ pattern, role: 'accessory' as SlotRole, prefer })

/**
 * Plantillas completas y editables. Los ejercicios se eligen con la misma maquinaria que el generador
 * (respetan exclusiones y nivel); las series/repeticiones se adaptan al nivel y objetivo del perfil.
 * Días de la semana: 0 = lunes … 6 = domingo (se pueden cambiar al activarla).
 */
export const TEMPLATES: TemplateDef[] = [
  {
    id: 'fb2_gym',
    name: 'Cuerpo completo · 2 días',
    description: 'Dos sesiones de cuerpo completo (A y B). Cada grupo principal se trabaja 2 veces por semana. Ideal si tienes poco tiempo o empiezas.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 3],
    notes: ['Con solo 2 días, cada sesión incluye todos los grupos: es normal que dure algo más.'],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('squat', 'prensa'), M('push_h', 'press_banca_mancuernas'), M('pull_v', 'jalon_pecho'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('shoulder_lat'), A('biceps', 'curl_mancuernas'), A('core_flex', 'crunch_polea')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('squat', 'sentadilla_banco_mancuernas'), M('push_v', 'press_hombro_mancuernas'), M('pull_h', 'remo_polea_baja'), S('push_h', 'press_pecho_maquina'), A('knee_flex', 'curl_femoral_tumbado'), A('triceps', 'extension_triceps_cuerda'), A('calves', 'gemelos_maquina_pie')] },
    ],
  },
  {
    id: 'fb3_gym',
    name: 'Cuerpo completo · 3 días',
    description: 'Tres sesiones de cuerpo completo (A, B y C) en días alternos. Cada grupo principal se trabaja 2–3 veces por semana con pocas series por sesión: práctica frecuente de la técnica.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: ['La prensa se repite dos días para practicar y medir el progreso con el mismo ejercicio.'],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('squat', 'prensa'), M('push_h', 'press_banca_mancuernas'), M('pull_v', 'jalon_pecho'), A('shoulder_lat'), A('core_flex', 'crunch_polea')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('hinge', 'peso_muerto_rumano_mancuernas'), M('push_v', 'press_hombro_maquina'), M('pull_h', 'remo_polea_baja'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie'), A('triceps', 'extension_triceps_cuerda')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('squat', 'prensa'), S('push_h', 'press_inclinado_mancuernas'), M('pull_v', 'jalon_supino'), S('lunge', 'zancadas_mancuernas'), A('biceps', 'curl_mancuernas'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'ul4_gym',
    name: 'Torso / pierna · 4 días',
    description: 'Dos sesiones de torso y dos de pierna. Cada grupo principal se trabaja 2 veces por semana.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 1, 3, 4],
    notes: ['Lunes-martes y jueves-viernes alternan torso y pierna, así los días seguidos no repiten músculos.'],
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
    description: 'Un día de empuje (pecho, hombro, tríceps), uno de tirón (espalda, bíceps) y uno de pierna. Frecuencia efectiva: cada grupo recibe trabajo directo 1 vez por semana (más algo indirecto).',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: ['Con frecuencia 1, cada sesión concentra más series por músculo. Si prefieres repartirlas, el cuerpo completo de 3 días da frecuencia 2–3 con los mismos días.'],
    sessions: [
      { name: 'Empuje', focus: 'push', slots: [M('push_h', 'press_banca_barra'), S('push_h', 'press_inclinado_mancuernas'), S('push_v', 'press_hombro_mancuernas'), A('shoulder_lat'), A('triceps', 'extension_triceps_cuerda'), A('chest_iso', 'contractor_pecho')] },
      { name: 'Tirón', focus: 'pull', slots: [M('pull_v', 'jalon_pecho'), S('pull_h', 'remo_polea_baja'), S('pull_h', 'remo_mancuerna'), A('shoulder_rear', 'pajaros_tumbado'), A('biceps', 'curl_mancuernas'), A('biceps', 'curl_martillo')] },
      { name: 'Pierna', focus: 'legs', slots: [M('squat', 'sentadilla_barra'), S('hinge', 'peso_muerto_rumano'), S('squat', 'prensa'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie'), A('core_flex', 'crunch_polea')] },
    ],
  },
  {
    id: 'ppl6_gym',
    name: 'Empuje / tirón / pierna · 6 días',
    description: 'Seis sesiones (empuje, tirón y pierna dos veces). Frecuencia 2 por grupo con mucho volumen semanal. Para personas con experiencia, buena recuperación y tiempo.',
    location: 'gym', equipment: GYM_EQUIPMENT, minLevel: 'intermediate', weekdays: [0, 1, 2, 3, 4, 5],
    notes: ['⚠ Exige mucho tiempo y recuperación. No es la recomendación inicial: el generador nunca la propone por sí solo.', 'Domingo libre. La sesión B de cada bloque cambia ejercicios para variar ángulos sin cambiar todo cada semana.'],
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
    description: 'Orientada a ganar fuerza en ejercicios básicos con barra. Los principales usan menos repeticiones y descansos largos; sin máximos ni series de 1–3 repeticiones para principiantes.',
    location: 'gym', equipment: GYM_EQUIPMENT, goal: 'strength', minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: ['Sentadilla y press de banca se practican dos veces por semana: la fuerza mejora con la práctica frecuente del gesto.', 'Usa topes de seguridad o ayudante en sentadilla y press de banca.'],
    sessions: [
      { name: 'Fuerza A', focus: 'full', slots: [M('squat', 'sentadilla_barra'), M('push_h', 'press_banca_barra'), S('pull_h', 'remo_barra_supino', 'remo_polea_baja'), A('shoulder_lat'), A('core_flex', 'crunch_polea')] },
      { name: 'Fuerza B', focus: 'full', slots: [M('hinge', 'peso_muerto_rumano'), M('push_v', 'press_militar_barra_sentado', 'press_hombro_mancuernas'), M('pull_v', 'jalon_pecho'), S('lunge', 'zancadas_mancuernas'), A('biceps', 'curl_barra')] },
      { name: 'Fuerza C', focus: 'full', slots: [M('squat', 'sentadilla_barra'), M('push_h', 'press_banca_barra'), S('pull_h', 'remo_polea_baja'), A('knee_flex', 'curl_femoral_tumbado'), A('triceps', 'extension_triceps_polea'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'mixed4_gym',
    name: 'Mixta fuerza + músculo · 4 días',
    description: 'Torso/pierna con un ejercicio principal pesado al inicio de cada sesión (más fuerza) y el resto en rangos de hipertrofia.',
    location: 'gym', equipment: GYM_EQUIPMENT, goal: 'mixed', minLevel: 'beginner', weekdays: [0, 1, 3, 4],
    notes: ['El primer ejercicio de cada día es el “pesado”; los demás se trabajan con más repeticiones.'],
    sessions: [
      { name: 'Torso pesado', focus: 'upper', slots: [M('push_h', 'press_banca_barra'), S('pull_h', 'remo_polea_baja'), S('push_v', 'press_hombro_mancuernas'), S('pull_v', 'jalon_pecho'), A('triceps', 'extension_triceps_cuerda'), A('biceps', 'curl_mancuernas')] },
      { name: 'Pierna pesada', focus: 'legs', slots: [M('squat', 'sentadilla_barra'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('knee_flex', 'curl_femoral_tumbado'), A('calves', 'gemelos_maquina_pie'), A('core_flex', 'crunch_polea')] },
      { name: 'Torso volumen', focus: 'upper', slots: [M('push_v', 'press_militar_barra_sentado', 'press_hombro_mancuernas'), S('pull_v', 'jalon_supino'), S('push_h', 'press_inclinado_mancuernas'), S('pull_h', 'remo_mancuerna'), A('shoulder_lat'), A('shoulder_rear', 'pajaros_tumbado')] },
      { name: 'Pierna volumen', focus: 'legs', slots: [M('hinge', 'peso_muerto_rumano'), S('squat', 'prensa'), S('lunge', 'zancadas_mancuernas'), A('knee_ext', 'extension_cuadriceps'), A('calves', 'gemelos_sentado_maquina'), A('core_stab', 'plancha_lateral')] },
    ],
  },
  {
    id: 'home_none',
    name: 'Casa sin material · 3 días',
    description: 'Peso corporal y una silla estable. Cuerpo completo 3 días (puedes hacer solo 2). Progresas con más repeticiones y con variantes más difíciles.',
    location: 'home', equipment: HOME_NONE_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: [
      '⚠ Sin material no hay un ejercicio de tirón con carga (remo o dominada): el superman trabaja la zona lumbar pero NO sustituye a un tirón. Para cubrirlo: una banda elástica, una barra de dominadas o un parque con barras.',
      '⚠ Sentadilla y zancada con peso corporal no tienen todavía demostración con licencia verificada: se muestran instrucciones y una referencia aproximada marcada como tal.',
      'Si una variante te resulta muy fácil (más de 20 repeticiones con margen), pasa a la siguiente más difícil.',
    ],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [{ ...M('squat', 'sentadilla_peso_corporal') }, M('push_h', 'flexiones'), A('glute', 'puente_gluteo'), A('back_ext', 'superman'), A('core_stab', 'plancha_lateral')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('lunge', 'zancada_atras_peso_corporal'), M('triceps', 'fondos_entre_bancos'), A('glute', 'puente_gluteo'), A('core_flex', 'elevacion_cadera_rodillas'), A('back_ext', 'superman')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('squat', 'sentadilla_peso_corporal'), M('push_h', 'flexiones_pies_elevados', 'flexiones'), A('glute', 'puente_gluteo'), A('core_flex', 'encogimientos_abdominales'), A('core_flex', 'bicicleta_abdominal')] },
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
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [M('lunge', 'zancadas_mancuernas'), M('push_v', 'press_hombro_unilateral'), { ...M('pull_v', 'dominadas_supinas'), fallback: 'pull_h' as Pattern }, S('glute', 'puente_gluteo'), A('shoulder_lat', 'elevaciones_laterales'), A('calves', 'gemelos_banda'), A('core_stab', 'plancha_lateral')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('squat', 'sentadilla_sumo_mancuerna'), M('push_h', 'flexiones_pies_elevados', 'flexiones'), M('pull_h', 'remo_mancuerna'), S('hinge', 'peso_muerto_rumano_mancuernas'), A('triceps', 'patada_triceps'), A('chest_iso', 'aperturas_banda'), A('core_flex', 'elevacion_cadera_rodillas')] },
    ],
  },
  {
    id: 'park_calisthenics',
    name: 'Parque / calistenia · 3 días',
    description: 'Barras de parque (dominadas y barra baja), un banco y el suelo. Cuerpo completo 3 días con progresión por variantes.',
    location: 'outdoor', equipment: OUTDOOR_EQUIPMENT, minLevel: 'beginner', weekdays: [0, 2, 4],
    notes: [
      'El remo invertido es la puerta de entrada al tirón: cuanto más horizontal el cuerpo, más difícil. Las dominadas aparecen si tu nivel lo permite.',
      '⚠ Sentadilla y zancada con peso corporal no tienen todavía demostración con licencia verificada: se muestran instrucciones y una referencia aproximada marcada como tal.',
    ],
    sessions: [
      { name: 'Día A · Cuerpo completo', focus: 'full', slots: [M('pull_h', 'remo_invertido'), M('push_h', 'flexiones'), M('squat', 'sentadilla_peso_corporal'), A('glute', 'puente_gluteo'), A('core_stab', 'plancha_lateral')] },
      { name: 'Día B · Cuerpo completo', focus: 'full', slots: [{ ...M('pull_v', 'dominadas', 'dominadas_supinas'), fallback: 'pull_h' as Pattern }, M('triceps', 'fondos_entre_bancos'), M('lunge', 'zancada_atras_peso_corporal'), A('core_flex', 'elevacion_cadera_rodillas'), A('back_ext', 'superman')] },
      { name: 'Día C · Cuerpo completo', focus: 'full', slots: [M('pull_h', 'remo_invertido'), M('push_h', 'flexiones_pies_elevados', 'flexiones'), M('squat', 'sentadilla_peso_corporal'), A('glute', 'puente_gluteo'), A('core_flex', 'bicicleta_abdominal')] },
    ],
  },
]

export const TEMPLATE_BY_ID: Record<string, TemplateDef> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]))
