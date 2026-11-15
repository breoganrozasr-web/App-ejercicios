/**
 * Demostraciones EXTERNAS (requieren internet). Fuentes técnicas indicadas en la especificación de mejoras del
 * 14/11/2026 (T1–T9): páginas oficiales de NASM, ACE y University of Wyoming Campus Recreation, y los vídeos de YouTube
 * que esas páginas enlazan. No se descargan, no se reexportan y no se guardan para uso sin conexión.
 * No se ha hecho una revisión fotograma a fotograma ni se tiene permiso de redistribución: solo se enlazan.
 * Desde el entorno de desarrollo no se pudieron abrir estos dominios (red bloqueada): ver docs/CONTENIDOS_Y_LICENCIAS.md.
 */
export interface ExternalDemo {
  /** Código de la fuente técnica (T1–T9). */
  code: string
  exerciseId: string
  author: string
  pageTitle: string
  pageUrl: string
  /** Vídeo enlazado por la página oficial (si lo hay). */
  videoUrl?: string
  kind: 'video' | 'pagina'
  /** 1.5: alcance de la consulta declarado (qué se comprobó y qué no). */
  scope?: string
}

export const EXTERNAL_DEMOS: ExternalDemo[] = [
  { code: 'T1', exerciseId: 'press_pecho_maquina', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'Chest Press Machine', pageUrl: 'https://www.nasm.org/resource-center/exercise-library/chest-press-machine', videoUrl: 'https://www.youtube.com/watch?v=lRo9zZ7EwpM', kind: 'video' },
  { code: 'T2', exerciseId: 'peso_muerto_rumano_mancuernas', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'Dumbbell Romanian Deadlift', pageUrl: 'https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift', videoUrl: 'https://www.youtube.com/watch?v=V8Hdl1FiNt4', kind: 'video' },
  { code: 'T3', exerciseId: 'curl_femoral_sentado', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'Seated Leg Curl', pageUrl: 'https://www.nasm.org/resource-center/exercise-library/seated-leg-curl', videoUrl: 'https://www.youtube.com/watch?v=_2Kd0d-JEUM', kind: 'video' },
  { code: 'T4', exerciseId: 'prensa_sentada', author: 'ACE (American Council on Exercise)', pageTitle: 'Seated Leg Press', pageUrl: 'https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/', kind: 'pagina' },
  { code: 'T5', exerciseId: 'flexiones_inclinadas', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'Incline Push-up', pageUrl: 'https://www.nasm.org/resource-center/exercise-library/incline-push-up', videoUrl: 'https://www.youtube.com/watch?v=0JUrOH--Kdk', kind: 'video' },
  { code: 'T6', exerciseId: 'flexiones_rodillas', author: 'ACE (American Council on Exercise)', pageTitle: 'Bent-knee Push-up', pageUrl: 'https://www.acefitness.org/resources/everyone/exercise-library/13/bent-knee-push-up/', kind: 'pagina' },
  { code: 'T7', exerciseId: 'puente_gluteo', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'Floor Bridge', pageUrl: 'https://www.nasm.org/resource-center/exercise-library/floor-bridge', videoUrl: 'https://www.youtube.com/watch?v=Z3cY3d3BBo4', kind: 'video' },
  { code: 'T8', exerciseId: 'plancha_frontal', author: 'ACE (American Council on Exercise)', pageTitle: 'Front Plank', pageUrl: 'https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/', kind: 'pagina' },
  // Encargo 4 (15/11/2026), apartado 7: recursos consultados por la investigación de ese encargo. Solo se ENLAZAN (apertura
  // explícita); no se descargan ni se alojan. Desde el entorno de desarrollo no se pudieron abrir (red restringida): eso no
  // demuestra que estén rotos para la persona usuaria. Técnica no revisada profesionalmente.
  { code: 'V01', exerciseId: 'peso_muerto_convencional', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'Barbell Deadlift', pageUrl: 'https://www.nasm.org/resource-center/exercise-library/barbell-deadlift', videoUrl: 'https://www.youtube.com/watch?v=Z6gcRfPNcZo', kind: 'video', scope: 'Guía externa con vídeo. Investigación del encargo: página y enlace/título del vídeo consultados; sin revisión visual cuadro a cuadro ni licencia de redistribución.' },
  { code: 'V02', exerciseId: 'hip_thrust_barra', author: 'PureGym', pageTitle: 'Barbell Hip Thrust', pageUrl: 'https://www.puregym.com/exercises/glutes/hip-thrusts/barbell-hip-thrust/', kind: 'pagina', scope: 'Página con instrucciones y vídeo (variante con barra y espalda apoyada en banco). Se usa como demostración; no se copian sus afirmaciones de beneficios ni consejos clínicos.' },
  { code: 'V03', exerciseId: 'remo_pecho_apoyado', author: 'PureGym', pageTitle: 'Incline Row', pageUrl: 'https://www.puregym.com/exercises/back/rows/incline-row/', kind: 'pagina', scope: 'Página con instrucciones y vídeo (banco inclinado y mancuernas). No se trasladan sus recomendaciones de series ni de agarres al motor de Forja.' },
  { code: 'V04', exerciseId: 'remo_banda_anclaje', author: 'NASM (National Academy of Sports Medicine)', pageTitle: 'How to do a Standing Tubing Row (21/11/2018)', pageUrl: 'https://www.youtube.com/watch?v=qykwviNOIyc', videoUrl: 'https://www.youtube.com/watch?v=qykwviNOIyc', kind: 'video', scope: 'Título, canal y descripción recuperados en el índice de búsqueda; apertura directa limitada. Sin verificación visual completa ni licencia de redistribución. Recurso de ejecución, no evidencia sobre hipertrofia.' },
  { code: 'T9', exerciseId: 'zancada_atras_peso_corporal', author: 'University of Wyoming Campus Recreation', pageTitle: 'Exercise Video Library · Backward Lunge', pageUrl: 'https://www.uwyo.edu/rec/group-fitness/exercise-video-library.html', videoUrl: 'https://www.youtube.com/watch?v=gd1a7i7-CMY', kind: 'video' },
]

const BY_EX = new Map(EXTERNAL_DEMOS.map((d) => [d.exerciseId, d]))

export function externalDemoFor(exerciseId: string): ExternalDemo | undefined {
  return BY_EX.get(exerciseId)
}

export function hasExternalDemo(exerciseId: string): boolean {
  return BY_EX.has(exerciseId)
}
