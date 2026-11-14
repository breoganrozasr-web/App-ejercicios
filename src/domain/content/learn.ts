/**
 * Contenido de «Aprender» y biblioteca de fuentes (especificación de mejoras del 14/11/2026, apartados 2, 7.1 y 8).
 * Los artículos usan el texto original de la especificación. Las fichas de fuentes indican el ALCANCE REAL de la consulta
 * declarado en la especificación (resumen, fragmentos o texto completo): no se afirma haber leído textos completos
 * cuando no fue así. Todo esto viaja con la app y está disponible sin conexión; los enlaces externos requieren internet.
 */

export interface Article {
  id: string
  title: string
  body: string
  sources: string[]
}

export const ARTICLES: Article[] = [
  {
    id: 'fuerza-musculo',
    title: 'Fuerza y músculo',
    body: 'Ganar fuerza y ganar músculo se relacionan, pero no son lo mismo. Para mejorar una marca importa practicar ese movimiento y manejar cargas progresivamente exigentes. Para ganar músculo sirven distintas cargas y rangos de repeticiones. Forja cambia el énfasis según tu objetivo, sin presentar un único rango como obligatorio.',
    sources: ['E1', 'E2', 'E8'],
  },
  {
    id: 'volumen-frecuencia',
    title: 'Volumen y frecuencia',
    body: 'Volumen es cuánto trabajo haces; frecuencia, en cuántos días lo repartes. Entrenar más días no garantiza crecer más si haces el mismo trabajo total. Repartirlo puede hacer las sesiones más manejables. Empieza con una cantidad sostenible: más series pueden ayudar, pero también añaden tiempo y fatiga.',
    sources: ['E3', 'E7'],
  },
  {
    id: 'rir',
    title: 'RIR',
    body: 'RIR significa repeticiones que crees que aún podrías hacer con una técnica parecida. RIR 2 significa que estimas unas dos más. Es una orientación, especialmente imprecisa mientras aprendes. Puedes dejarlo vacío. No necesitas llegar al fallo para que una serie sea útil.',
    sources: ['E4', 'E5'],
  },
  {
    id: 'descanso',
    title: 'Descanso',
    body: 'El cronómetro orienta; no te obliga a empezar. Descansa lo suficiente para repetir con control. Si todavía te falta el aire o cae mucho tu rendimiento, puedes añadir tiempo. Forja usa descansos iniciales distintos según el ejercicio.',
    sources: ['E6'],
  },
  {
    id: 'progreso',
    title: 'Progreso',
    body: 'Progresar puede ser hacer más repeticiones con la misma carga, mover más peso con control o necesitar menos ayuda. Una sesión peor no borra el progreso. Compara el mismo ejercicio y material; los kilos de máquinas distintas no son equivalentes.',
    sources: ['E8', 'E10'],
  },
  {
    id: 'recorrido-variantes',
    title: 'Recorrido y variantes',
    body: 'Busca un recorrido que puedas controlar y que sea adecuado para el ejercicio. Más profundidad no es una obligación a cualquier precio. Las variantes pueden estimular regiones distintas o facilitar la técnica; ninguna gana siempre. Mantener algunas estables ayuda a saber si progresas.',
    sources: ['E9', 'E11', 'E12', 'E13'],
  },
  {
    id: 'primera-carga',
    title: 'Primera carga',
    body: 'Empieza ligero y haz una aproximación. Elige una carga con la que puedas completar la parte baja del rango dejando margen y manteniendo el control. Si no llegas, reduce. Si resulta muy fácil, ajusta poco a poco. No necesitas probar tu máximo para empezar.',
    sources: ['FORJA'],
  },
]

export interface SourceEntry {
  code: string
  title: string
  urls: string[]
  /** Tipo de fuente y alcance de la consulta, tal como se declaró. */
  scope: string
  synthesis?: string
  decision?: string
  kind: 'cientifica' | 'tecnica' | 'forja'
}

/** Fecha de consulta declarada en la especificación. */
export const SOURCES_CHECKED = '14/11/2026'

export const SOURCES: SourceEntry[] = [
  {
    code: 'E1', kind: 'cientifica',
    title: 'ACSM 2026. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/41843416/', 'https://doi.org/10.1249/MSS.0000000000003897'],
    scope: 'Posicionamiento. Consulta: resumen, página oficial y fragmentos indexados; acceso directo al texto de PMC interrumpido por verificación.',
    synthesis: 'El entrenamiento progresivo admite muchas configuraciones eficaces. Las cargas altas favorecen la fuerza máxima; mayores volúmenes pueden favorecer la hipertrofia. Individualizar y sostener la práctica importa.',
    decision: 'Distinguir objetivos y permitir empezar con dosis moderadas; no exigir 10 series como mínimo para que «cuente».',
  },
  {
    code: 'E2', kind: 'cientifica',
    title: 'Currier et al., 2023. Revisión sistemática y metaanálisis en red.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/37414459/'],
    scope: 'Revisión sistemática y metaanálisis en red. Consulta: resumen y secciones indexadas.',
    synthesis: 'Las distintas prescripciones superaron no entrenar; la fuerza favoreció cargas mayores y la hipertrofia no quedó limitada a una única combinación.',
    decision: 'Intervalos de repeticiones prácticos, sin una frontera mágica entre fuerza y músculo.',
  },
  {
    code: 'E3', kind: 'cientifica',
    title: 'Pelland et al., publicación online 2025, volumen impreso 2026. The Resistance Training Dose Response.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/41343037/', 'https://doi.org/10.1007/s40279-025-02344-w'],
    scope: 'Metaanálisis/metarregresión. Consulta: resumen; texto completo restringido.',
    synthesis: 'Volumen y frecuencia muestran relaciones distintas según el resultado, con rendimientos decrecientes. El recuento fraccionado de trabajo indirecto ajustó mejor los modelos.',
    decision: 'Separar dosis y frecuencia; mostrar el 0,5 indirecto como convención aproximada, no equivalencia biológica exacta ni permiso para contar cualquier estabilizador.',
  },
  {
    code: 'E4', kind: 'cientifica',
    title: 'Robinson et al., 2024. Proximidad al fallo.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/38970765/'],
    scope: 'Metarregresión. Consulta: resumen.',
    synthesis: 'El análisis exploratorio asoció acercarse al fallo con mayor hipertrofia, sin identificar un RIR óptimo exacto; el RIR se estimó a partir de descripciones.',
    decision: 'Margen moderado y ajustable, sin imponer fallo ni interpretar RIR como medición precisa.',
  },
  {
    code: 'E5', kind: 'cientifica',
    title: 'Refalo et al., 2024.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/38393985/'],
    scope: 'Ensayo. Consulta: resumen y resumen divulgativo del artículo.',
    synthesis: 'En un ensayo de ocho semanas, 1–2 RIR produjo crecimiento de cuádriceps parecido al fallo con menor fatiga aguda. No representa todos los músculos ni poblaciones.',
    decision: 'Ninguna plantilla exige fallo sistemático.',
  },
  {
    code: 'E6', kind: 'cientifica',
    title: 'Singer et al., 2024. Give it a rest.',
    urls: ['https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full'],
    scope: 'Revisión/metaanálisis. Consulta: texto completo.',
    synthesis: 'Posible pequeña ventaja de descansos más largos frente a muy cortos; no establece un número universal.',
    decision: 'Descansos editables, suficientemente largos para repetir trabajo de calidad.',
  },
  {
    code: 'E7', kind: 'cientifica',
    title: 'Ramos-Campo et al., 2024. Split versus full-body.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/38595233/'],
    scope: 'Revisión y metaanálisis. Consulta: resumen.',
    synthesis: 'No se detectaron diferencias relevantes entre ambos repartos al igualar volumen.',
    decision: 'Elegir reparto por calendario, tiempo y preferencias; ninguno lleva la etiqueta «científicamente superior».',
  },
  {
    code: 'E8', kind: 'cientifica',
    title: 'Haugen et al., 2023. Máquinas frente a peso libre.',
    urls: ['https://link.springer.com/article/10.1186/s13102-023-00713-4'],
    scope: 'Revisión sistemática y metaanálisis. Consulta: texto completo.',
    synthesis: 'No se detectó superioridad de una modalidad para hipertrofia; las ganancias de fuerza dependen de la modalidad practicada. La evidencia de hipertrofia era limitada.',
    decision: 'Ambas sirven; para fuerza se siguen ejercicios concretos, no solo músculos.',
  },
  {
    code: 'E9', kind: 'cientifica',
    title: 'Revisión de variación de ejercicios, 2022.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/35438660/'],
    scope: 'Revisión. Consulta: resumen.',
    decision: 'Variedad intencional, manteniendo referencias estables; no cambiar ejercicios aleatoriamente cada semana.',
  },
  {
    code: 'E10', kind: 'cientifica',
    title: 'Ensayo de progresión por carga o repeticiones, 2024.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/38286426/'],
    scope: 'Ensayo. Consulta: resumen.',
    decision: 'Subir repeticiones también es progresar. El ensayo no valida la fórmula exacta de doble progresión de Forja; esa fórmula es una regla de producto.',
  },
  {
    code: 'E11', kind: 'cientifica',
    title: 'Maeo et al., 2021. Curl femoral a distinta longitud muscular.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/33009197/'],
    scope: 'Ensayo. Consulta: resumen.',
    decision: 'El curl sentado es una opción interesante cuando está disponible; tumbado sigue siendo válido. Combinar flexión de rodilla y bisagra permite cubrir funciones diferentes.',
  },
  {
    code: 'E12', kind: 'cientifica',
    title: 'Maeo et al., 2023, online 2022. Extensión de tríceps con brazo elevado o al costado.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/35819335/'],
    scope: 'Ensayo. Consulta: resumen.',
    decision: 'Ofrecer ambas variantes y explicar sus diferencias; no convertir un ensayo en obligación de hacer extensiones por encima de la cabeza.',
  },
  {
    code: 'E13', kind: 'cientifica',
    title: 'Strey et al., 2026. Parciales a longitud muscular larga frente a corta.',
    urls: ['https://doi.org/10.1007/s11332-025-01586-5'],
    scope: 'Ensayo. Consulta: resumen.',
    decision: 'Recorrido controlado y adecuado como opción inicial; no recomendar parciales largas de forma universal ni afirmar superioridad sobre recorrido completo basándose en esta comparación.',
  },
  {
    code: 'E14', kind: 'cientifica',
    title: 'AAP, Resistance Training for Children and Adolescents, 2020.',
    urls: ['https://publications.aap.org/pediatrics/article/145/6/e20201011/76942/'],
    scope: 'Informe clínico. Consulta: recomendaciones recuperadas.',
    decision: 'Preservar el itinerario separado y supervisado para 14–17 años; las tablas adultas no se aplican a menores.',
  },
  { code: 'T1', kind: 'tecnica', title: 'NASM · Chest Press Machine (y vídeo enlazado por esa página).', urls: ['https://www.nasm.org/resource-center/exercise-library/chest-press-machine', 'https://www.youtube.com/watch?v=lRo9zZ7EwpM'], scope: 'Página oficial consultada por quien redactó la especificación; texto de Forja original (no traducido).' },
  { code: 'T2', kind: 'tecnica', title: 'NASM · Dumbbell Romanian Deadlift (y vídeo).', urls: ['https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift', 'https://www.youtube.com/watch?v=V8Hdl1FiNt4'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T3', kind: 'tecnica', title: 'NASM · Seated Leg Curl (y vídeo).', urls: ['https://www.nasm.org/resource-center/exercise-library/seated-leg-curl', 'https://www.youtube.com/watch?v=_2Kd0d-JEUM'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T4', kind: 'tecnica', title: 'ACE · Seated Leg Press.', urls: ['https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T5', kind: 'tecnica', title: 'NASM · Incline Push-up (y vídeo).', urls: ['https://www.nasm.org/resource-center/exercise-library/incline-push-up', 'https://www.youtube.com/watch?v=0JUrOH--Kdk'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T6', kind: 'tecnica', title: 'ACE · Bent-knee Push-up.', urls: ['https://www.acefitness.org/resources/everyone/exercise-library/13/bent-knee-push-up/'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T7', kind: 'tecnica', title: 'NASM · Floor Bridge (y vídeo).', urls: ['https://www.nasm.org/resource-center/exercise-library/floor-bridge', 'https://www.youtube.com/watch?v=Z3cY3d3BBo4'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T8', kind: 'tecnica', title: 'ACE · Front Plank.', urls: ['https://www.acefitness.org/resources/everyone/exercise-library/32/front-plank/'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'T9', kind: 'tecnica', title: 'University of Wyoming Campus Recreation · Exercise Video Library («Backward Lunge»).', urls: ['https://www.uwyo.edu/rec/group-fitness/exercise-video-library.html', 'https://www.youtube.com/watch?v=gd1a7i7-CMY'], scope: 'Página oficial; texto de Forja original.' },
  { code: 'FORJA', kind: 'forja', title: 'Decisión práctica de Forja.', urls: [], scope: 'No es una fuente externa: valor inicial de la app, revisable.' },
]

export const SOURCE_BY_CODE: Record<string, SourceEntry> = Object.fromEntries(SOURCES.map((s) => [s.code, s]))

export const SCOPE_NOTE =
  'Estas conclusiones no permiten diagnosticar recuperación, garantizar ausencia de lesión, estimar crecimiento individual ni certificar que una rutina es «la mejor científicamente». Los valores de programación de Forja son valores iniciales revisables, no cifras óptimas universales demostradas.'
