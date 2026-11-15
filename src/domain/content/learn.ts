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
  /** Nivel de certeza declarado (1.4): qué tipo de evidencia lo respalda y qué no permite afirmar. */
  certainty?: string
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
    id: 'descendentes',
    title: 'Series descendentes',
    body: 'Haces un tramo, bajas el peso y continúas el mismo ejercicio. Puede ahorrar tiempo, pero no garantiza más crecimiento. Cada bajada tiene su propio peso y repeticiones. Puedes terminar el bloque cuando lo necesites. En los estudios disponibles, las series descendentes produjeron una hipertrofia parecida a la de las series convencionales y pueden ahorrar tiempo; no se ha demostrado una superioridad universal y la evidencia inicial era pequeña. Forja usa una variante conservadora (un tramo inicial de 8–12 repeticiones y una bajada de alrededor del 20 %, sin llegar al fallo por defecto): no reproduce exactamente los protocolos estudiados, que a menudo llegan al fallo.',
    sources: ['R1', 'R3'],
  },
  {
    id: 'rest-pause',
    title: 'Rest-pause',
    body: 'Mantienes el peso y haces una pausa breve antes de continuar con unas pocas repeticiones. Registra cada tramo por separado. No necesitas usar esta técnica para seguir progresando. Algunos ensayos y subgrupos muestran resultados favorables, pero eso no justifica presentarla como superior para todo el mundo. En Forja: tramo inicial de 10–15 repeticiones, pausa de unos 20 s ampliable y una miniserie de 3–5; el objetivo es comprimir trabajo, no demostrar más tolerancia al sufrimiento.',
    sources: ['R4', 'R5', 'R3'],
  },
  {
    id: 'superseries',
    title: 'Superseries',
    body: 'Alternas dos ejercicios y descansas después de completar ambos. Puede acortar la sesión. Si falta equipo o necesitas más descanso, puedes separarlos sin perder el registro. Pueden ahorrar tiempo con adaptaciones parecidas, aunque se perciben más exigentes. Emparejar músculos diferentes (por ejemplo, bíceps y tríceps) suele preservar mejor el trabajo que encadenar dos ejercicios del mismo músculo; esas parejas solo se hacen si las eliges tú.',
    sources: ['R2'],
  },
  {
    id: 'fases',
    title: 'Fases del programa',
    body: 'Forja adapta sus propuestas a tu práctica. La fase indica cómo organizamos tu programa; no certifica tu nivel físico. La constancia, tu rendimiento y cómo manejas los ejercicios importan más que una fecha. Aprendizaje: las primeras sesiones válidas con menos series y más margen. Consolidación: mantener tus ejercicios de referencia y progresar con calma. Cuando reúnes constancia suficiente (días válidos, semanas y sesiones completas en tus referencias), Forja te propone revisar el programa; puedes seguir como estás o dejarlo para más adelante. Son reglas de producto: ningún estudio valida que un número de sesiones o semanas convierta a alguien en intermedio, y aceptar Progresión no cambia tu experiencia declarada ni activa técnicas.',
    sources: ['FORJA', 'R3'],
  },
  {
    id: 'primera-carga',
    title: 'Primera carga',
    body: 'Empieza ligero y haz una aproximación. Elige una carga con la que puedas completar la parte baja del rango dejando margen y manteniendo el control. Si no llegas, reduce. Si resulta muy fácil, ajusta poco a poco. No necesitas probar tu máximo para empezar.',
    sources: ['FORJA'],
  },

  // ───── Textos del encargo del 15/11/2026 (apartado 5), con fuentes F y nivel de certeza ─────
  {
    id: 'dos-o-tres-series',
    title: '¿Dos o tres series?',
    body: 'Dos series pueden ser suficientes para progresar. Tres pueden aportar más trabajo y también requieren más tiempo y recuperación. Importa el conjunto: dos series de un ejercicio de pecho en tres días suman seis; tres series en un solo día suman tres. Si hay otros ejercicios de pecho, también cuentan. Durante una adaptación puedes ver menos series que en tu plan base. Forja te explica qué caso tienes, no elige dos para todo.',
    sources: ['F01', 'F02', 'F08'],
    certainty: 'Revisiones y metaanálisis: más volumen se asocia a más adaptación con rendimientos decrecientes. No fijan un número óptimo por ejercicio ni un mínimo obligatorio.',
  },
  {
    id: 'rangos-repeticiones',
    title: '¿Seis a ocho, ocho a diez u ocho a doce?',
    body: 'No existe una frontera en la que deje de crecer el músculo y empiece la fuerza. Los efectos se solapan. Las cargas altas ayudan a practicar levantar mucho peso; rangos moderados facilitan acumular trabajo. Por eso una rutina mixta puede empezar con banca a 4–6 y seguir con accesorios a 8–12 o 10–15. La carga debe ajustarse a tu control y al margen previsto.',
    sources: ['F04', 'F05'],
    certainty: 'Metaanálisis en red y metarregresión: rangos que se solapan; el RIR de los estudios se estimó a partir de descripciones. Los rangos de Forja son valores iniciales prácticos.',
  },
  {
    id: 'fuerza-y-musculo-misma-rutina',
    title: 'Fuerza y músculo en la misma rutina',
    body: 'Sentadilla, press banca y peso muerto son los tres levantamientos del powerlifting. Para una rutina mixta podemos practicar uno o dos primero y completar después otros grupos y funciones. Esos básicos ya forman parte del entrenamiento: no añadimos una rutina completa encima sin contar su trabajo. Un remo o jalón complementa la espalda. No necesitas competir ni probar máximos para ganar fuerza.',
    sources: ['F04', 'F10'],
    certainty: 'Síntesis amplia y revisión de alcance del powerlifting (con lagunas reconocidas). No validan las plantillas de Forja como conjunto.',
  },
  {
    id: 'como-crece',
    title: 'Cómo crece un músculo',
    body: 'La tensión durante el entrenamiento activa procesos de adaptación; con repetición y recuperación puede aumentar el tejido muscular. No hace falta perseguir agujetas o una gran congestión para comprobarlo. El proceso incluye síntesis y degradación de proteínas y no se mide con un temporizador de 48 horas. La evolución se valora con semanas de práctica, rendimiento y medidas interpretadas con cautela.',
    sources: ['F11', 'F12'],
    certainty: 'Revisiones mecanísticas: explican procesos, no establecen una rutina óptima ni una frecuencia exacta.',
  },
  {
    id: 'elegir-reparto',
    title: 'Elegir el reparto',
    body: 'Cuerpo completo, torso/pierna y PPL organizan los ejercicios. Su nombre no garantiza mejores resultados. Elige un reparto que puedas cumplir y comprueba el trabajo real que recibe cada grupo. PPL tres días suele dar una sesión directa por grupo; repetirlo seis días suele dar dos. Se puede repartir una dosis parecida en más o menos sesiones.',
    sources: ['F02', 'F03'],
    certainty: 'Metaanálisis con volumen equiparado: sin diferencias relevantes entre repartos. No demuestra que cualquier reparto mal organizado sea equivalente.',
  },
  {
    id: 'pierna-anterior-posterior',
    title: 'Pierna anterior y posterior',
    body: 'El día anterior da prioridad a cuádriceps y movimientos de rodilla; el posterior, a bisagras, glúteos y flexión de rodilla. Es un énfasis, no una división perfecta. Sentadillas y zancadas también implican glúteos. La extensión de rodilla complementa a sentadilla o prensa; curl y bisagra cubren funciones distintas de isquios. No necesitamos acumular cinco ejercicios casi iguales para cubrir la pierna.',
    sources: ['F13', 'F14', 'F17'],
    certainty: 'Ensayos pequeños con diferencias regionales; no se extrapolan porcentajes a cada persona.',
  },
  {
    id: 'recorrido-velocidad',
    title: 'Recorrido, estiramiento y velocidad',
    body: 'Usa un recorrido que puedas controlar y que encaje con el ejercicio. El trabajo en posiciones alargadas puede ser útil, pero las ventajas dependen del músculo y la comparación. Una parcial intencionada no es lo mismo que acortar sin querer porque la carga te supera. Tampoco bajar cada repetición exageradamente lento garantiza más crecimiento.',
    sources: ['F15', 'F16', 'F21'],
    certainty: 'Revisiones y ensayos con diferencias medias pequeñas; no justifican parciales ni tempos lentos como mejora automática.',
  },
  {
    id: 'que-cuenta-mejora',
    title: 'Qué cuenta como mejora',
    body: 'Mejorar puede ser completar más repeticiones con la misma carga y margen, mover un incremento real manteniendo control o cumplir el plan con regularidad. Un día peor no demuestra estancamiento. Compara el mismo ejercicio, material, método y rango de trabajo. Forja propone; no decide que te has recuperado ni certifica tu técnica. Las reglas de subida de carga y de fase son decisiones de la app, no tests clínicos.',
    sources: ['FORJA'],
    certainty: 'Reglas de producto de Forja (doble progresión, fases), no validadas clínicamente.',
  },
  {
    id: 'tecnicas-nivel',
    title: 'Más técnicas no significa más nivel',
    body: 'Superseries, descendentes y rest-pause son herramientas opcionales. Pueden ayudar a organizar el tiempo; no son necesarias para crecer. Tu progreso no depende de desbloquearlas. Mantener series normales es una elección válida incluso con experiencia.',
    sources: ['F20', 'R1', 'R2', 'R3'],
    certainty: 'Revisiones con efectos agudos y crónicos limitados: posible ahorro de tiempo, sin ventaja global demostrada.',
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
  kind: 'cientifica' | 'tecnica' | 'forja' | 'avanzada' | 'f2026'
  /** Misma publicación que otra entrada de la biblioteca (tabla de equivalencias; no es una fuente nueva). */
  sameAs?: string
}

/** Fecha de consulta declarada en la especificación. */
export const SOURCES_CHECKED = '14/11/2026'
/** Fecha de consulta declarada por la investigación del encargo del 15/11/2026 (F01–F21). */
export const SOURCES_CHECKED_F = '15/11/2026'

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
  {
    code: 'R1', kind: 'avanzada',
    title: 'Sødal et al., 2023. Revisión sistemática y metaanálisis sobre series descendentes (drop sets).',
    urls: ['https://link.springer.com/article/10.1186/s40798-023-00620-5'],
    scope: 'Revisión sistemática y metaanálisis. Consulta: resumen, métodos y secciones del texto abierto.',
    synthesis: 'Seis estudios, 142 participantes; sin diferencia significativa de hipertrofia entre métodos y posible ahorro de tiempo.',
    decision: 'Ofrecer las series descendentes como opción para ahorrar tiempo, sin prometer más crecimiento; desactivadas por defecto en el generador.',
  },
  {
    code: 'R2', kind: 'avanzada',
    title: 'Zhang et al., 2025. Revisión sistemática y metaanálisis sobre superseries.',
    urls: ['https://link.springer.com/article/10.1007/s40279-025-02176-8'],
    scope: 'Revisión sistemática y metaanálisis. Consulta: resumen y secciones del texto abierto.',
    synthesis: 'Resultados compatibles con adaptaciones crónicas similares y sesiones más breves; mayor esfuerzo percibido. Los resultados dependen del tipo de emparejamiento.',
    decision: 'Proponer parejas de grupos distintos (bíceps + tríceps u otros accesorios) para ahorrar tiempo; las del mismo músculo, solo por elección manual.',
  },
  {
    code: 'R3', kind: 'avanzada',
    title: 'Cowley et al., 2026. Revisión y metaanálisis en red de métodos avanzados de entrenamiento.',
    urls: ['https://link.springer.com/article/10.1007/s40279-026-02428-1'],
    scope: 'Revisión y metaanálisis en red. Consulta: resumen y secciones del texto abierto.',
    synthesis: 'No identificó una superioridad consistente para fuerza o hipertrofia de los métodos avanzados frente a los tradicionales en las poblaciones estudiadas.',
    decision: 'Las técnicas son opcionales y no son un requisito para progresar; las series convencionales siguen siendo la alternativa visible.',
  },
  {
    code: 'R4', kind: 'avanzada',
    title: 'Enes et al., 2021. Ensayo de rest-pause y series descendentes.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/34260860/'],
    scope: 'Ensayo controlado. Consulta: resumen.',
    synthesis: 'Ensayo pequeño en hombres entrenados; hipertrofia similar, con alguna ventaja de fuerza para rest-pause.',
    decision: 'No extrapolarlo a todos los ejercicios ni a todas las personas: rest-pause como opción, no como recomendación general.',
  },
  {
    code: 'R5', kind: 'avanzada',
    title: 'Tsartsapakis et al., 2026. Síntesis sobre métodos de entrenamiento avanzados.',
    urls: ['https://pubmed.ncbi.nlm.nih.gov/41718208/'],
    scope: 'Síntesis de estudios. Consulta: resumen.',
    synthesis: 'Señales favorables en determinados métodos o subgrupos, incluido rest-pause, sin ventaja global de hipertrofia.',
    decision: 'La diferencia con R3 aconseja no prometer superioridad de ninguna técnica.',
  },

  // ───── Investigación entregada con el encargo del 15/11/2026 (F01–F21). La consulta la hizo esa investigación
  // externa; el entorno de desarrollo de Forja no pudo abrir estos enlaces (red restringida). Alcance tal como se declaró.
  { code: 'F01', kind: 'f2026', sameAs: 'E1', title: 'ACSM / Currier et al., 2026. Resistance Training Prescription… An Overview of Reviews.', urls: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/', 'https://doi.org/10.1249/MSS.0000000000003897'], scope: 'Revisión de revisiones (137 revisiones; búsqueda hasta octubre de 2024). Consulta declarada: texto completo; resumen, resultados y discusión.', synthesis: 'Múltiples prescripciones funcionan; las cargas altas favorecen la fuerza máxima y el volumen influye en la hipertrofia. No hay un número óptimo universal por ejercicio; ≥10 series semanales no es un umbral por debajo del cual no haya crecimiento.', decision: 'Dosis propia por receta, sin mínimo obligatorio de diez series.' },
  { code: 'F02', kind: 'f2026', sameAs: 'E3', title: 'Pelland et al., 2025/2026. The Resistance Training Dose Response.', urls: ['https://pubmed.ncbi.nlm.nih.gov/41343037/'], scope: '67 estudios, 2058 participantes, principalmente hombres jóvenes. Consulta declarada: resumen completo.', synthesis: 'Más volumen, más adaptación con rendimientos decrecientes; efecto independiente de la frecuencia sobre hipertrofia pequeño/incierto; la fuerza puede beneficiarse de más práctica. El cómputo fraccional de indirectas encajó mejor en el modelo.', decision: 'Directas e indirectas por separado; el 0,5 es una convención, no una equivalencia individual.' },
  { code: 'F03', kind: 'f2026', sameAs: 'E7', title: 'Ramos-Campo et al., 2024. Split versus full-body.', urls: ['https://pubmed.ncbi.nlm.nih.gov/38595233/'], scope: '14 estudios, 392 participantes. Consulta declarada: resumen.', synthesis: 'Con volumen equiparado, sin diferencias relevantes entre repartos.', decision: 'Elegir reparto por calendario, adherencia y dosis real.' },
  { code: 'F04', kind: 'f2026', sameAs: 'E2', title: 'Currier et al., 2023. Metaanálisis bayesiano en red.', urls: ['https://pubmed.ncbi.nlm.nih.gov/37414459/'], scope: '178 estudios (fuerza) y 119 (hipertrofia). Consulta declarada: resumen.', synthesis: 'Distintas combinaciones producen hipertrofia; las cargas mayores favorecen la fuerza máxima; los rangos se solapan.', decision: 'Rangos concretos por receta sin etiquetar «más de ocho = hipertrofia».' },
  { code: 'F05', kind: 'f2026', sameAs: 'E4', title: 'Robinson et al., 2024. Proximity to Failure.', urls: ['https://link.springer.com/article/10.1007/s40279-024-02069-2'], scope: 'Metarregresiones exploratorias. Consulta declarada: resumen editorial.', synthesis: 'Más proximidad al fallo se relacionó con hipertrofia, con RIR estimado y ajuste modesto; no hay un RIR óptimo exacto.', decision: 'RIR 1–3 o 2–3 como margen inicial; sin fallo por defecto.' },
  { code: 'F06', kind: 'f2026', sameAs: 'E5', title: 'Refalo et al., 2024. Similar muscle hypertrophy… failure or RIR.', urls: ['https://pubmed.ncbi.nlm.nih.gov/38393985/'], scope: '18 personas entrenadas, 8 semanas. Consulta declarada: resumen recuperado por índice.', synthesis: 'Crecimiento de cuádriceps similar a 1–2 RIR y al fallo; el fallo dio más fatiga aguda.', decision: 'Ninguna receta exige fallo.' },
  { code: 'F07', kind: 'f2026', sameAs: 'E6', title: 'Singer et al., 2024. Give it a rest.', urls: ['https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full'], scope: 'Nueve estudios. Consulta declarada: texto completo.', synthesis: 'Ligera señal a favor de descansos superiores a 60 s; por encima de 90 s, incierto.', decision: 'Descansos iniciales 90/150/180 s editables (+30/+60 s), no un techo universal.' },
  { code: 'F08', kind: 'f2026', title: 'Without Fail: single-set training to failure or with RIR, 2025.', urls: ['https://pubmed.ncbi.nlm.nih.gov/40249908/'], scope: '42 adultos entrenados, una serie de nueve ejercicios dos veces por semana, 8 semanas. Consulta declarada: resumen.', synthesis: 'Poca dosis puede funcionar; no compara una frente a tres series ni demuestra que la dosis baja maximice ganancias.', decision: 'Las variantes breves existen y se explican como dosis reducida, no como equivalentes.' },
  { code: 'F09', kind: 'f2026', title: 'Moesgaard et al., 2022. Periodization in volume-equated programs.', urls: ['https://pubmed.ncbi.nlm.nih.gov/35044672/'], scope: 'Metaanálisis. Consulta declarada: resumen (excepción de 2022 por pertinencia).', synthesis: 'Beneficio medio de periodizar para 1RM; sin ventaja clara para hipertrofia. Contrasta con F01.', decision: 'Días con distinto énfasis como organización útil, sin venderlos como superiores.' },
  { code: 'F10', kind: 'f2026', title: 'Silverthorne et al., 2025. Applied Sport Science and Medicine of Powerlifting.', urls: ['https://link.springer.com/article/10.1007/s40279-025-02305-3'], scope: 'Revisión de alcance, 218 estudios (hasta junio de 2025). Consulta declarada: introducción y sección de entrenamiento.', synthesis: 'El deporte comprende sentadilla, banca y peso muerto; persisten lagunas, también en la representación de mujeres.', decision: 'No obliga a probar máximos; no valida las plantillas de Forja.' },
  { code: 'F11', kind: 'f2026', title: 'Van Every et al., 2025. Load-induced hypertrophy: mechanisms, myths, misconceptions.', urls: ['https://pubmed.ncbi.nlm.nih.gov/41276164/'], scope: 'Revisión mecanística. Consulta declarada: resumen y fragmentos indexados.', synthesis: 'Tensión mecánica y señalización son centrales; congestión y picos hormonales agudos no prueban crecimiento.', decision: 'No usar agujetas ni congestión como medida de progreso.' },
  { code: 'F12', kind: 'f2026', title: 'Greyvenstein et al., 2026. Tension to Translation.', urls: ['https://pubmed.ncbi.nlm.nih.gov/41324917/'], scope: 'Revisión. Consulta declarada: resumen.', synthesis: 'La acumulación de proteína depende del balance sostenido entre síntesis y degradación.', decision: 'Sin calculadoras de frecuencia por picos de síntesis ni pautas de dieta.' },
  { code: 'F13', kind: 'f2026', title: 'Kassiano et al., 2026. Back Squat and Leg Extension.', urls: ['https://pubmed.ncbi.nlm.nih.gov/41379528/'], scope: '63 mujeres jóvenes no entrenadas, 8 semanas (sentadilla en Smith frente a extensión). Consulta declarada: resumen.', synthesis: 'Diferencias regionales: más recto femoral con extensión; ventaja de sentadilla en una región del vasto lateral.', decision: 'La extensión complementa a sentadilla o prensa, sin ser obligatoria.' },
  { code: 'F14', kind: 'f2026', title: 'Kinoshita et al., 2026. Single- vs multi-joint: knee extension and leg press.', urls: ['https://pubmed.ncbi.nlm.nih.gov/41630124/'], scope: '17 adultos no entrenados, 12 semanas, resonancia. Consulta declarada: resumen indexado.', synthesis: 'Prensa y extensión no son idénticas en respuesta regional.', decision: 'No contar prensa como sustituto completo de la extensión ni del curl.' },
  { code: 'F15', kind: 'f2026', title: 'Varovic et al., 2025. Muscle length and regional hypertrophy.', urls: ['https://pubmed.ncbi.nlm.nih.gov/40570881/'], scope: 'Doce estudios. Consulta declarada: resumen completo.', synthesis: 'Diferencias medias pequeñas, con limitaciones.', decision: 'Evitar «más estiramiento siempre gana».' },
  { code: 'F16', kind: 'f2026', title: 'Wolf et al., 2025. Lengthened partials vs full range of motion.', urls: ['https://pubmed.ncbi.nlm.nih.gov/39959841/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11829627/'], scope: 'Ensayo. Consulta declarada: resumen y fragmentos indexados.', synthesis: 'Adaptaciones similares en el contexto estudiado.', decision: 'No implantar parciales como mejora automática.' },
  { code: 'F17', kind: 'f2026', title: 'Plotkin et al., 2023. Hip thrust and back squat… gluteus hypertrophy.', urls: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC10593473/'], scope: 'Ensayo en principiantes. Consulta declarada: resumen, resultados y discusión.', synthesis: 'Crecimiento glúteo parecido; la mayor señal EMG del hip thrust no predijo más crecimiento. Ninguno cubre por sí solo el trabajo específico de isquios.', decision: 'Hip thrust opcional; curl femoral aparte.' },
  { code: 'F18', kind: 'f2026', title: 'Krause Neto et al., 2025. Resistance training and gluteus maximus hypertrophy.', urls: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC12018462/'], scope: 'Revisión. Consulta declarada: resumen y fragmentos.', synthesis: 'Varias extensiones de cadera pueden desarrollar el glúteo mayor.', decision: 'Sin ejercicio obligatorio ni dosis redundantes.' },
  { code: 'F19', kind: 'f2026', title: 'Triceps surae hypertrophy: standing vs seated calf raise, 2023.', urls: ['https://pubmed.ncbi.nlm.nih.gov/38156065/'], scope: '14 adultos no entrenados, 12 semanas. Consulta declarada: resumen.', synthesis: 'Más crecimiento del gastrocnemio con rodilla extendida; sóleo parecido.', decision: 'Mantener elevación de talones de pie y sentado.' },
  { code: 'F20', kind: 'f2026', title: 'Superset Versus Traditional Resistance Training Prescriptions, 2025.', urls: ['https://pubmed.ncbi.nlm.nih.gov/39903375/'], scope: '19 estudios, muchos de efectos agudos. Consulta declarada: resumen. No se ha comprobado si coincide con R2.', synthesis: 'Posible ahorro de tiempo con más esfuerzo percibido; evidencia longitudinal limitada.', decision: 'Superseries opcionales con los controles de la 1.3.' },
  { code: 'F21', kind: 'f2026', title: 'Enes et al., 2025. How Slow Should You Go? Repetition tempo.', urls: ['https://pubmed.ncbi.nlm.nih.gov/42709703/'], scope: '14 estudios. Consulta declarada: resumen.', synthesis: 'Diferencias globales pequeñas entre tempos.', decision: 'No imponer excéntricas lentas; el tiempo por repetición solo se usa para estimar la duración.' },
  { code: 'FORJA', kind: 'forja', title: 'Decisión práctica de Forja.', urls: [], scope: 'No es una fuente externa: valor inicial de la app, revisable.' },
]

export const SOURCE_BY_CODE: Record<string, SourceEntry> = Object.fromEntries(SOURCES.map((s) => [s.code, s]))

export const SCOPE_NOTE =
  'Estas conclusiones no permiten diagnosticar recuperación, garantizar ausencia de lesión, estimar crecimiento individual ni certificar que una rutina es «la mejor científicamente». Los valores de programación de Forja son valores iniciales revisables, no cifras óptimas universales demostradas.'
