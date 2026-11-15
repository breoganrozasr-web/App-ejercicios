PROMPT 4 PARA CLAUDE — FORJA: EXPERIENCIA, MAPA MUSCULAR Y COMODIDAD EN EL GIMNASIO
Especificación de producto e implementación · 15 de noviembre de 2026

Trabaja sobre el repositorio breoganrozasr-web/App-ejercicios y la aplicación existente:
https://breoganrozasr-web.github.io/App-ejercicios/

La base revisada es app 1.4.0, motor 2.2.0, build fe98133; el informe señala un commit posterior 0e6b270 de documentación. Comprueba el estado real del repositorio y sus instrucciones antes de editar. Conserva el trabajo posterior que exista. No crees otra app ni vuelvas a ejecutar los encargos anteriores como si estuvieran pendientes.

Implementa, integra, prueba y publica este encargo completo mediante el flujo existente. La investigación y las decisiones de producto están incluidas. No devuelvas únicamente un plan o una maqueta, ni pidas al usuario que investigue, programe o seleccione cada detalle. Resuelve las decisiones normales de implementación. Publica agrupado al superar las comprobaciones; conserva la misma dirección y no cambies la visibilidad del repositorio ni la infraestructura. Si existe un bloqueo real de acceso o publicación, termina todo lo independiente y explica el bloqueo concreto, sin inventar una publicación.

OBJETIVO

Que Forja resulte cómoda de verdad durante una sesión: ver qué toca, registrar con pocos toques, consultar cómo se hace y qué músculos participan, resolver que una máquina esté ocupada, y consultar el progreso sin atravesar una página interminable. Añadir nivel avanzado, separando experiencia y vuelta tras una pausa. Mantener las decisiones científicas y los datos que ya funcionan.

Condiciones: español de España; kg y coma decimal; semana lunes–domingo; prioridad iPhone y una mano; PWA offline; IndexedDB/Dexie; coste 0 €/mes; sin cuentas, servidor, anuncios, analítica ni IA en ejecución; rutas hash y subruta de GitHub Pages. Conserva las 26 plantillas, 99 ejercicios, las rutinas versionadas, fases, familiaridad, técnicas, progresión, correcciones y copias. No aumentes automáticamente las series por escoger «Avanzado».

0. ALCANCE Y DIAGNÓSTICO YA REALIZADO

Revisión de la URL publicada el 15/11/2026: inicio, perfil, ajustes, catálogo, fichas de ejercicios, progreso e historial. Se comprobó 1.4.0/2.2.0/fe98133. No se registró un entrenamiento nuevo, no se cambió el perfil y no se probó un iPhone físico. El navegador de revisión tenía datos expresamente ficticios: no son el perfil ni los pesos del teléfono del usuario.

Hallazgos:
- El perfil mezcla «Empiezo desde cero», «Vuelvo tras una pausa» e «Intermedio» en la misma elección. No incluye avanzado. Se puede tener experiencia y, a la vez, estar volviendo: deben ser dimensiones independientes.
- Las fichas YA dicen qué músculos trabajan, pero en texto y mezclándolo con reglas como «cuenta 1» y «cuenta 0,5». Falta una representación corporal y una primera lectura sencilla.
- La ficha del peso muerto convencional muestra «Tras pausa» como etiqueta del ejercicio. Esa etiqueta no describe la dificultad de un movimiento: revisar el uso del antiguo enum del perfil en el catálogo.
- Las tarjetas de las 26 plantillas acumulan muchos motivos de incompatibilidad y detalles. Mantener la información, pero ordenar su prioridad visual.
- La plantilla de prioridad de pierna SÍ aparece en «Ver todas», aunque no encaje con el perfil. No corrijas ese comportamiento como si fuera un fallo: es el previsto.
- Progreso reúne en una página larga constancia, músculos, gráficos, calendario, historial, peso, medidas y fotos.
- YA existen calculadora de discos, configuración de barra/material, pantalla encendida, sonido de descanso, medidas corporales y fotos. Mejorar su acceso si procede; no duplicarlos como novedades.
- Una rutina antigua conservada muestra un texto de «semana de familiarización». Revisar textos heredados frente a las reglas actuales de días válidos sin modificar retroactivamente la prescripción antigua.
- Siguen faltando demostraciones locales y cuatro fichas nuevas carecen de recurso visible. En el apartado 7 se proporcionan enlaces concretos.

Estos hallazgos guían la intervención; revisa el código para identificar sus causas. No afirmes haber reproducido un fallo que no hayas observado.

1. REFERENCIAS CONSULTADAS Y QUÉ SE TOMA DE ELLAS

Consulta: 15/11/2026. Las descripciones de competidores son documentación comercial de sus autores, no pruebas independientes de todas sus funciones ni revisiones de sus aplicaciones instaladas.

U01. Resultado indexado como Lifta, de Mateo Tadic; la apertura más reciente muestra CyberBeef:
https://apps.apple.com/ca/app/lifta/id6760341468
Destino observado: https://apps.apple.com/ca/app/cyberbeef/id6760341468
Consulta: ficha pública, con discrepancia de nombre entre el índice inicial y la apertura final. Presenta planificación, registro de cargas/repeticiones/series, rendimiento anterior, objetivos de progresión, gráficos y medidas. No identificarla con certeza como la app que recuerda el usuario. Lyfta es otra referencia, con ficha distinta.

U02. Lyfta, de Lindberg Development AS:
https://apps.apple.com/es/app/lyfta-rutinas-de-gym/id6443740936
https://www.lyfta.app/es/usage/registro-de-ejercicios
Consulta: ficha pública y documentación de registro. Referencias funcionales útiles: continuidad entre planificación y sesión, histórico junto al registro, notas y tipos de serie accesibles. No necesitamos copiar su catálogo enorme ni sus funciones sociales.

U03. Hevy, documentación oficial:
https://www.hevyapp.com/features/track-workouts/
https://www.hevyapp.com/features/exercise-programming-options/
https://www.hevyapp.com/features/training-chart/
Consulta: páginas funcionales. Referencias útiles: editar/reordenar/sustituir durante el entrenamiento, distinguir notas persistentes y de sesión, objetivos de series, y representar el trabajo por grupos musculares. En Forja, un dato anterior o propuesto nunca pasa a ser una serie realizada sin confirmación.

Adopta patrones de interacción comunes con diseño y código originales. No extraigas su código, bases de ejercicios, vídeos, imágenes, textos extensos, marcas ni programas de pago. Mantén la identidad de Forja. Comparar funciones públicas no requiere descompilar ninguna app.

S01. ACSM 2026. Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults: An Overview of Reviews.
https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
DOI: 10.1249/MSS.0000000000003897
Consulta: texto completo accesible; apartados de individualización, progresión y limitaciones. Ya corresponde a F01 del encargo anterior: enlaza la misma fuente, no cuentes dos estudios.
Uso: adaptar a objetivos, experiencia y rendimiento; no existe un número de series ni una etiqueta que garantice la mejor rutina individual. Entrenar al fallo no es obligatorio. Las síntesis de grupos no validan nuestras reglas de interfaz ni un «nivel avanzado» automático. Conserva la evidencia F01–F21; este encargo no sustituye sus conclusiones por consejos de una app comercial.

S02. Does Taking a Break Matter—Adaptations in Muscle Strength and Size Between Continuous and Periodic Resistance Training, 2024.
https://pubmed.ncbi.nlm.nih.gov/39364857/
https://onlinelibrary.wiley.com/doi/10.1111/sms.14739
Consulta: resumen indexado y fragmentos de resultados; no revisión del artículo completo. Ensayo en personas inicialmente no entrenadas: un periodo de desentrenamiento redujo adaptaciones y al reanudar se recuperaron con rapidez. No permite asegurar cuánto tardará una persona concreta ni validar cuatro sesiones como readaptación universal. No extrapolar su protocolo a deportistas avanzados.

S03. NSCA/CSCCa, Safe Return to Training, consenso de 2019:
https://www.nsca.com/about-us/position-statements/safe-return-to-training/
Consulta: resumen oficial. Excepción de antigüedad por tratar específicamente transiciones tras inactividad en deportistas universitarios. Apoya una transición prudente; no trasladar sus porcentajes, pruebas ni calendario como receta general para este usuario.

S04. OpenStax, Anatomy and Physiology 2e, anatomía funcional:
https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs
https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs
Consulta: texto de ambas secciones. Anatomía de referencia, no estudio reciente sobre cuál ejercicio produce más crecimiento. Se usa para orientar regiones y acciones, no para inventar porcentajes de activación ni pintar mapas de recuperación.

T01. Screen Wake Lock:
https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
https://www.w3.org/TR/screen-wake-lock/
Uso: detectar disponibilidad, gestionar rechazo/liberación y volver a solicitar cuando proceda al recuperar visibilidad. La pantalla encendida es una preferencia que depende del navegador y del sistema, no una garantía permanente.

T02. WebKit, web push para apps añadidas a la pantalla de inicio:
https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
Uso: no confundir soporte de push con un temporizador local preciso mientras iOS suspende una PWA. Esta actualización conserva la arquitectura local y no promete avisos exactos con la pantalla bloqueada.

Documenta fuente, alcance de consulta, aplicación y límites. Si tu red no abre una fuente ya consultada en este encargo, registra esa limitación adicional sin borrar la consulta realizada aquí. No digas que tú leíste un texto completo o viste un vídeo si no lo hiciste.

2. EXPERIENCIA, CONTINUIDAD Y VUELTA AL GIMNASIO

2.1 Modelo conceptual
Separar cuatro dimensiones que no se sustituyen:
A) Experiencia declarada: Principiante / Intermedio / Avanzado.
B) Situación actual: Entreno con regularidad / Vuelvo tras una pausa / Aún no he empezado. Internamente puede existir «sin confirmar» para migraciones.
C) Fase del programa: Aprendizaje / Consolidación / Progresión, con las reglas actuales.
D) Familiaridad con cada ejercicio: desconocido / en aprendizaje / conocido, como ahora.
La readaptación es una condición temporal aceptada, no una nueva experiencia ni una pérdida del historial.

Ayudas breves de experiencia, como autodescripción y no certificado:
- Principiante: «Estoy aprendiendo a entrenar y a regular el esfuerzo».
- Intermedio: «Conozco los ejercicios habituales y tengo experiencia siguiendo una rutina».
- Avanzado: «Tengo una trayectoria consistente y experiencia ajustando mi entrenamiento».
No establecer categorías por marcas en banca, peso corporal, una edad concreta, un número de días en la app o haber usado drops. No ascender automáticamente a avanzado. Una persona avanzada también puede necesitar aprender un ejercicio nuevo o readaptarse.

En edición del perfil, mostrar experiencia y continuidad juntas y en lenguaje sencillo. En el alta, integrarlas sin convertir los cinco pasos en un cuestionario largo. No pedir un peso máximo ni datos personales adicionales.

2.2 Migración de perfiles
- Antiguo «desde cero»: conservar como principiante; continuidad sin inventar si no consta.
- Antiguo «intermedio»: conservar intermedio; no deducir regularidad por esa etiqueta.
- Antiguo «vuelvo»: conservar que vuelve, pero su experiencia queda sin confirmar. No convertirlo en principiante ni intermedio a escondidas. Pedir una única elección breve al editar/revisar el perfil, permitiendo aplazarla sin bloquear el registro.
- Mientras haya datos sin confirmar, preservar el comportamiento prudente y la rutina ya aceptada. Resolver explícitamente cómo generará una propuesta nueva; no presentar como personalizado un dato desconocido.
- No regenerar rutinas ni modificar sesiones históricas al migrar o cambiar experiencia.
- Centralizar la elegibilidad: donde antes exigía intermedio, revisar si también corresponde avanzado. Evitar que un condicional exacto deje al avanzado con menos opciones accidentalmente. Adulto, salud, material y consentimiento siguen siendo condiciones independientes.

2.3 Readaptación también para quien estrena la app
No exigir un historial local para que alguien que llevaba meses sin entrenar pueda pedir una vuelta gradual. Añadir «Preparar mi vuelta» en el perfil y en la revisión de una rutina.

Mantener la oferta existente tras 21 días sin registros como una pregunta: «No hay entrenamientos registrados desde… ¿Has entrenado fuera de Forja?». La ausencia de registros no demuestra inactividad. Una declaración de entrenamiento fuera de la app evita tratar el hueco como una pausa confirmada, sin inventar sesiones.

Permitir conservar una plantilla intermedia o avanzada y aplicar una dosis temporal de vuelta. Antes de aceptar, comparar series, esfuerzo orientativo y duración de hoy con el plan base. Reutilizar la regla actual de cuatro sesiones, aproximadamente mitad de series y RIR 3–4, documentada como decisión de producto, no como protocolo clínico ni garantía de recuperación. Mantener las reglas existentes de redondeo y registro; no crear un segundo contador incompatible.

Al terminar la propuesta temporal, ofrecer revisar sensaciones y continuar o prolongar. No asegurar «ya estás recuperado». No sustituir silenciosamente una aceptación anterior del usuario.

Los kg antiguos se muestran con fecha. Tras una pausa confirmada no se precargan como obligación ni se calcula una carga supuestamente segura con un porcentaje arbitrario. El usuario elige una carga actual con margen. La sugerencia y el registro real siguen separados. No activar por defecto máximos, fallo, drops ni rest-pause por haber escogido avanzado.

La condición de salud y las restricciones por edad conservan sus reglas. «Avanzado» nunca las elude. Ninguna elección de nivel cambia una sesión activa.

2.4 Qué aporta avanzado
Acceso coherente a las plantillas y controles ya existentes, priorización de opciones pertinentes y personalización más cómoda. No crear una rutina inflada ni multiplicar volumen para justificar la etiqueta. El editor por series del apartado 5 estará disponible a quien lo necesite, sin bloquearlo por nivel. PPL 6 sigue requiriendo elección expresa.

Eliminar «Tras pausa» como dificultad de una ficha. Separar, si se conserva esa clasificación, «Exigencia técnica» de «Tu familiaridad». No inventar una puntuación precisa de riesgo o dificultad para todos los ejercicios: conservar únicamente clasificaciones justificadas y sus límites.

3. MAPA MUSCULAR Y FICHAS CLARAS

3.1 Representación original
Crear un SVG original ligero, frontal y posterior, con silueta corporal clara y regiones anatómicas reconocibles. Funciona offline, en claro y oscuro, sin modelos 3D, APIs, bibliotecas remotas ni imágenes tomadas de competidores. No dibujar manchas arbitrarias: comprobar visualmente posición y relación con los nombres. No usar un generador de imágenes para deducir anatomía.

Regiones suficientes: pecho; hombro anterior/lateral/posterior cuando el dato permita distinguirlos; espalda dorsal y superior; zona extensora lumbar; flexores del codo y tríceps; antebrazo; abdomen/oblicuos; glúteos y abductores; cuádriceps; isquios; aductores; pantorrilla. Las regiones pequeñas tienen alternativa en lista con controles grandes. No representar músculos profundos como si todos estuviesen en la superficie; la ilustración se identifica como esquema por grupos.

La leyenda de una ficha distingue «Principal», «Colabora» y, cuando esté documentado, «Estabiliza». Usa color, contorno o patrón y texto; nunca solo rojo/verde. No usar porcentajes de activación, supuestas calorías por músculo, eficacia de crecimiento ni recuperación estimada por colores.

3.2 Datos y anatomía separados de la contabilidad
Crear metadatos visuales explícitos por ejercicio/patrón y variante, con identificadores estables y procedencia. Reutilizar la información ya revisada de las fichas; no inferir todo desde una palabra del nombre. Validar las 99 correspondencias y detectar regiones desconocidas. Para ejercicios propios, permitir grupos seleccionados manualmente o «Sin mapa definido».

Principios anatómicos de orientación, que no son reglas nuevas de volumen:
- Pectoral: participa en acercar el brazo por delante del tronco; deltoides: mueve el brazo con distintas contribuciones por porción.
- Tríceps: extensión de codo; flexores del codo: flexión; dorsal: acciones del brazo hacia el tronco; musculatura escapular: movimiento y control de escápulas.
- Cuádriceps: extensión de rodilla; isquios: flexión de rodilla y, salvo excepciones anatómicas, extensión de cadera; glúteo mayor: extensión de cadera; abductores: separación/control lateral de cadera; pantorrilla: flexión plantar.
- Un estabilizador puede trabajar sin tener una serie directa asignada por el contador de Forja.

Estas orientaciones no determinan por sí solas la hipertrofia de una variante. Conserva la distinción de F13–F16 entre función, activación y crecimiento. No afirmar que un ejercicio aísla completamente una porción o que todos los movimientos de un grupo producen idéntica respuesta.

Revisar especialmente las 49 fichas de las plantillas: banca plana/inclinada/vertical; contractor; jalones/remos; sentadilla/prensa/extensión; convencional/rumano/curl femoral; hip thrust; abductores; flexiones; ejercicios unilaterales y planchas. Mantener el significado de cada variante. En el convencional, explicar participación y estabilización sin convertir el trabajo del tronco en series directas inventadas.

El mapa anatómico NO modifica los mapas de cómputo muscular 1 y 2 de las rutinas históricas. «Cuenta 0,5» es una aproximación de registro de volumen, no «activa un 50 %» ni «hace crecer la mitad». Mantener esa explicación dentro de «Cómo se calcula», no delante de los controles de entrenamiento.

Si el historial solo aporta un grupo agregado, dibujar ese grupo con esa resolución. No repartir arbitrariamente las series antiguas entre nuevas subregiones. Al agregar espalda u hombro, evitar sumar varias veces una misma contribución porque aparezca en varias zonas del dibujo.

3.3 Ficha en capas
Primera vista: nombre y variante exacta; demostración disponible; músculos principales; tres claves; unidad de carga. Accesos «Cómo hacerlo», «Qué trabaja» e «Historial». Los detalles de biomecánica, cómputo, fuentes y limitaciones quedan desplegables.

Al abrir desde una sesión, usar una hoja o panel que preserve borradores, posición, temporizador y ejercicio activo. Volver en un toque al registro. El mapa no desplaza la tabla de series fuera de pantalla cada vez que se entrena.

Corregir ayudas genéricas que describan otra variante: por ejemplo, una banca plana no necesita como explicación principal qué cambia al inclinar el banco. Mantener notas específicas de seguridad existentes y no transformar la ficha en una prescripción de rehabilitación.

3.4 Mapa del plan y del trabajo realizado
En vista previa de rutina y en Progreso, reutilizar el SVG con una leyenda diferente: aquí representa registros/plan, no roles anatómicos.
- Separar «Planificado» y «Realizado»; mostrar fechas de la semana local de lunes a domingo.
- Al tocar una región, mostrar ejercicios que contribuyen, días y series directas/indirectas según la versión correspondiente.
- Las sesiones parciales aportan solo lo realizado. Calentamientos y datos de ejemplo quedan fuera.
- Series convencionales y bloques especiales se muestran por separado; no inventar «series equivalentes» de drops o rest-pause.
- Unilateral: respetar el modelo por lado sin duplicar tres series como seis por músculo. No confundir cantidad total de ejecuciones con dosis por lado.
- Correcciones del historial actualizan los totales; nunca duplican sesiones o días válidos.
- Comparar con el plan elegido o el rango ya explicado en la app, sin emitir diagnósticos de desequilibrio ni mensajes de que un músculo está recuperado.

4. MODO ENTRENAMIENTO PARA USAR CON UNA MANO

4.1 Jerarquía
Conservar el estilo de Forja: fondos cálidos/neutros, acento naranja y contraste suficiente, con un tema oscuro cuidado. Evitar convertir todo en tarjetas enormes, sombras y párrafos. Una acción principal clara por contexto.

En el ejercicio activo mostrar de forma compacta:
- Nombre, objetivo y acceso a demostración/músculos.
- Filas con número/tipo de serie, anterior, kg y repeticiones o la magnitud correspondiente, y acción de completar.
- RIR opcional accesible sin abrir una pantalla completa; no obligatorio para guardar.
- Descanso visible y plegable, con ampliar/terminar, sin tapar la fila o el teclado.
- Próximo ejercicio y acceso al resto de la sesión.

Las series ya realizadas se distinguen sin depender solo del color. Calentamientos, superseries y bloques conservan su semántica. Distancia, tiempo, bandas, asistencia, lastre y lados siguen teniendo controles apropiados; no meterlos a la fuerza en una tabla de kg/repeticiones.

En móvil estrecho o con texto grande, adaptar las filas a tarjetas compactas. No reducir tipografía ni objetivos táctiles para que quepan seis columnas. Controles importantes de al menos 44×44 px, áreas seguras y orden de foco correcto.

4.2 Registrar sin datos ficticios
El último resultado y la sugerencia se muestran diferenciados del borrador actual. Puede haber «Usar valores anteriores» para preparar campos compatibles, pero cada serie se confirma expresamente. Abrir un ejercicio, pasar de fila, terminar un descanso o cerrar la app nunca completa una serie.

Mostrar fecha y contexto del anterior: rango prescrito, método y material/contexto cuando corresponda. Si no hay referencia comparable, decirlo. Conservar «Ver también» para otros rangos. No trasladar kg al cambiar de ejercicio.

Guardar borradores mientras se escribe sin marcarlos como trabajo hecho. Preservar valores incompletos de edición, coma decimal y foco durante las actualizaciones del temporizador. Validar al confirmar, sin convertir un campo vacío en cero. Mantener RIR 0 válido y cero kg cuando la modalidad lo permite. No aceptar silenciosamente números imposibles o conversiones ambiguas.

Una acción completa una fila una sola vez. Garantizar idempotencia de escritura, no solo desactivar visualmente un botón. Mantener la protección contra doble toque de los bloques; no permitir que el segundo toque caiga sobre «Deshacer» o «Terminar» que aparece en su lugar. No bloquear innecesariamente acciones independientes en toda la pantalla.

Deshacer queda cerca del resultado y conserva las reglas actuales. Si falla el guardado, comunicarlo y conservar el borrador; no mostrar «Guardado» ni ocultar la fila como si la transacción hubiera terminado.

4.3 Material ocupado
Añadir acceso rápido «Hacer después» al ejercicio pendiente. Reordenar únicamente el trabajo pendiente de esta sesión; conservar orden planificado y orden realizado para interpretar el historial. No reescribir series terminadas ni cambiar la rutina base.

Para superseries, mover el grupo o proponer separarlo explícitamente. No deshacer automáticamente una relación ni mezclarla con bloques especiales. Reordenar o consultar una ficha no reinicia un descanso existente.

«Sustituir hoy» presenta primero alternativas de función y material compatibles, con explicación si cambia el patrón. Elegir una alternativa no hereda cargas de otro ejercicio. Los cambios de rutina para sesiones futuras se revisan fuera del entrenamiento y crean versión como ahora.

4.4 Notas, favoritos y contextos de material
- Favoritos de ejercicios y usados recientemente en catálogo y selector. Excluir datos de ejemplo; mantener búsqueda por alias y material.
- Separar «Nota para próximas veces» de «Nota de esta sesión». Ejemplo: asiento 3 es persistente; hoy había cola es de la sesión.
- Contexto opcional del material, con nombre local libre: «Polea A», «Prensa de mi gimnasio». No obligar a configurarlo para entrenar.
- No asumir comparables los números de máquinas distintas. Un contexto nuevo empieza sin referencia automática; permitir consultar el anterior sin copiarlo como dato equivalente.
- Los registros antiguos sin contexto siguen visibles y etiquetados como tales; no asignarlos automáticamente a una máquina recién creada.
- Mantener las convenciones existentes de kg totales, por mancuerna, lastre o asistencia. Cambiar un texto no debe alterar el significado de todo el historial.

4.5 Temporizador y continuidad
Reutilizar marcas de tiempo para reconstruir descansos tras recarga y suspensión. Integrar la opción de mantener pantalla encendida ya existente, con detección de soporte y gestión de liberación. Conservar sonido y modo música actuales.

No prometer que iOS emitirá una alarma exacta mientras la PWA está suspendida. No añadir audio silencioso continuo, permisos innecesarios, push con servidor ni APIs nativas que esta arquitectura no usa. Al volver, mostrar el tiempo real y el estado correcto.

Una sesión activa se puede minimizar y retomar sin perderla. Una actualización disponible espera: no recargar ni activar cambios incompatibles en mitad de un entrenamiento.

5. EDITOR MÁS ÚTIL PARA FUERZA + HIPERTROFIA

Conservar edición simple por ejercicio. Añadir, dentro de «Personalizar series», objetivos por serie de trabajo: rango de repeticiones, RIR orientativo y descanso; duplicar una fila y aplicar al grupo. Segundos/distancia conservan sus propios tipos. No convertir planchas en repeticiones.

Permitir, por ejemplo, una serie principal 4–6 y dos complementarias 6–8 en el mismo ejercicio. Es una posibilidad manual de organización, no una recomendación nueva ni una técnica superior. No crear recetas adicionales ni cambiar las 26 actuales para exhibirla.

Son series convencionales con descanso normal. No etiquetarlas como drop set ni imponer un porcentaje automático de reducción de carga. El usuario establece la carga de cada grupo. «Principal» y «Complementaria» son etiquetas opcionales.

Comparaciones y doble progresión:
- Mantener ejercicio, rango, método, contexto y un identificador estable de grupo de prescripción.
- Evaluar por separado grupos compatibles: la serie 4–6 no se suma al grupo 6–8.
- En un grupo 3×8–12 sigue siendo necesario que TODAS sus series previstas alcancen el extremo alto con el margen definido. No recomendar subir solo porque una fila lo consiguió.
- En una principal 1×4–6 y complementarias 2×6–8, una propuesta para la principal no cambia las complementarias.
- Series omitidas, incompletas y calentamientos no satisfacen un grupo. Sin RIR, mantener el carácter opcional de la subida como ahora.
- No usar el índice de pantalla como identidad: reordenar no puede unir referencias distintas.
- En migración, crear una referencia coherente con la prescripción anterior; no fragmentar sin motivo el historial de grupos homogéneos.

No alterar los criterios actuales de 1RM, récords y exclusión de bloques. Aceptar cambios crea una versión nueva, sin alterar el pasado. Durante una sesión solo se modifica el plan de esa sesión y queda claro su alcance.

6. CATÁLOGO, PROGRESO Y PREPARACIÓN SIN CONEXIÓN

6.1 Menos ruido, misma información
Plantillas: tarjeta compacta con reparto, días, duración estimada y objetivo. Mantener favoritas y comparación de tres. Motivos de incompatibilidad detallados dentro de «Ver encaje», con las restricciones que impiden adoptar un plan visibles en el punto de decisión. No ocultar PPL ni las demás opciones de «Ver todas».

El nuevo nivel avanzado participa coherentemente en filtros y orden, pero no oculta opciones sencillas. Una rutina de tres días no se vuelve inadecuada solo por declarar avanzado. Mantener material, calendario real, frecuencia y tiempo como criterios verificables.

Progreso: organizar con tres vistas o segmentados, conservando enlaces y accesibilidad:
- Entrenamiento: constancia, calendario, historial y reparto muscular.
- Ejercicios: evolución, referencias comparables y récords con criterio visible.
- Cuerpo: peso, medidas y fotografías ya existentes.
No duplicar funciones ni exigir datos corporales. Mostrar primero resúmenes útiles; las tablas completas quedan disponibles. No transformar tonelaje en crecimiento ni fotos en cálculo de grasa o músculo.

Ajustes: agrupar perfil/programa, material, comportamiento durante entrenamiento, apariencia/accesibilidad y datos/versión. Respetar lo que ya funcione; evitar un rediseño gratuito de cada pantalla.

6.2 Preparar mi rutina sin conexión
Un acceso permite revisar/descargar las demostraciones locales de la rutina elegida. Reutilizar el sistema de descarga existente. Mostrar estado real: registro y fichas disponibles, X de Y demostraciones locales preparadas, y recursos externos que necesitan internet. No contar una URL de YouTube como archivo descargado.

Comprobar disponibilidad efectiva en caché/almacenamiento y estado del service worker, no solamente navigator.onLine. No afirmar que todo funciona offline tras la primera visita si aún no terminó la preparación. Errores de cuota o descargas parciales deben ser recuperables; no borran entrenamientos ni imágenes propias.

Mantener recordatorio y exportación de copia, con explicación breve de que los datos viven en este dispositivo. No prometer sincronización ni copias en la nube. La descarga de una demostración no equivale a una copia de los registros.

7. DEMOSTRACIONES: RECURSOS CONCRETOS Y ESTADOS HONESTOS

No confundir tres cosas: enlace a un recurso externo, licencia para copiarlo y revisión técnica del movimiento. Para mostrar un enlace normal a una guía pública no hace falta descargar su vídeo. Para alojarlo o distribuirlo offline, sí se necesita autorización/licencia compatible comprobada. No marques la técnica como revisada profesionalmente.

Recursos consultados por la investigación de este encargo:

V01. Peso muerto convencional con barra — NASM.
https://www.nasm.org/resource-center/exercise-library/barbell-deadlift
Vídeo enlazado por esa página: https://youtu.be/Z6gcRfPNcZo
Alcance: página e identificación del enlace/título consultados. No revisión visual cuadro a cuadro ni licencia para redistribución. Usar como «Guía externa con vídeo · requiere conexión» y conservar las claves propias de Forja.

V02. Hip thrust con barra — PureGym.
https://www.puregym.com/exercises/glutes/hip-thrusts/barbell-hip-thrust/
Alcance: página, instrucciones y presencia de vídeo consultadas. Variante de barra y apoyo del tronco en banco. No copiar las afirmaciones comerciales sobre beneficios ni consejos para poblaciones clínicas; el enlace aporta la demostración, no reglas nuevas del motor.

V03. Remo con mancuernas y pecho apoyado — PureGym.
https://www.puregym.com/exercises/back/rows/incline-row/
Alcance: página e instrucciones con vídeo consultadas, banco inclinado y mancuernas. No trasladar sus recomendaciones genéricas de series/repeticiones ni afirmaciones de agarres al motor de Forja.

V04. Remo de pie con banda y anclaje — National Academy of Sports Medicine.
https://www.youtube.com/watch?v=qykwviNOIyc
Título: How to do a Standing Tubing Row. Publicado 21/11/2018.
Alcance: título, canal y descripción recuperados en el índice de búsqueda; apertura directa del vídeo limitada. La fecha del vídeo no lo convierte en evidencia antigua sobre hipertrofia: aquí se usa como recurso de ejecución. No se ha verificado visualmente el vídeo completo ni una licencia de redistribución. Mostrar como enlace externo con ese alcance documentado; no como demostración local verificada.

Implementación:
- Asociar por ID real de cada variante, sin crear ejercicios duplicados ni reemplazar rumano por convencional.
- Incorporar los enlaces suministrados como recursos externos con autor, tipo y alcance. No dejar las cuatro fichas vacías solo porque tu entorno no pueda acceder a dominios que la investigación sí identificó. Si obtienes evidencia concreta de un enlace incorrecto o retirado, deshabilitar ese recurso y documentar el motivo; un bloqueo de red de desarrollo no demuestra que esté roto para el usuario.
- Preferir abrir una página externa por elección expresa. No cargar iframes o contenido de terceros automáticamente al entrar en una ficha. Sin conexión, explicar la limitación y mantener las claves escritas y mapa local.
- Conservar las demostraciones existentes y sus atribuciones. Las alternancias de Everkinetic siguen llamándose animaciones de posiciones, no vídeo continuo.
- Mantener los recursos externos ya existentes de flexiones con rodillas, flexiones inclinadas, prensa horizontal y zancada atrás; comprobar que no se pierden. Sus demostraciones locales siguen pendientes si no hay material con licencia verificada.
- Las ocho demostraciones locales pendientes no se declaran resueltas por añadir enlaces externos. Contadores separados de local disponible, enlace externo y sin recurso.
- No fabricar una animación de ejecución biomecánica para cerrar una casilla. El esquema muscular original sí puede ser nuevo, porque no pretende demostrar una trayectoria técnica.

8. DATOS, COMPATIBILIDAD Y ALCANCE DE LA VERSIÓN

Usa cambios aditivos y migraciones transaccionales. Conserva IDs de ejercicios, versiones de rutina, mapas musculares históricos, sesiones, bloques, correcciones, fotos y preferencias.

Introducir avanzado y prescripciones por serie añade semántica que una app 1.4 podría interpretar mal. Usar formato de copia JSON 4 y conservar restauración de formatos 1, 2 y 3. La app antigua debe rechazar 4 claramente, no importar un perfil o plan degradado. Versionar el esquema Dexie según lo necesario, sin borrar o recrear la base del usuario.

Las copias incluyen los nuevos campos, contextos de material, notas, favoritos y objetivos por serie. Validar relaciones y tipos antes de una restauración; vista previa y modos fusionar/reemplazar siguen atómicos. Una copia inválida no deja media base modificada. Definir qué contenido derivado se recalcula y qué datos de usuario se preservan.

CSV: conservar columnas y significado existentes; añadir, si no están, grupo de prescripción, objetivo por serie y contexto de material de forma documentada. Seguir con una fila por tramo en bloques. No introducir importación CSV ni prometer que equivale a la copia completa.

No hacer actualizaciones mayores de dependencias para aprovechar el encargo. No crear cuentas, suscripciones, entrenador IA, reconocimiento corporal por cámara, nutrición, red social, tienda, integración Apple Watch/Health o sincronización. Son otros proyectos. Esta versión se centra en una app de entrenamiento local más completa y cómoda.

9. PRUEBAS DE ACEPTACIÓN OBLIGATORIAS

Añadir comprobaciones significativas, aprovechando la suite existente. No contar tests triviales para inflar cifras. Typecheck, pruebas de dominio, flujos relevantes y build. Registrar navegador, versión y entorno; WebKit emulado no equivale a Safari instalado en un iPhone real.

D01. Migración de los tres perfiles antiguos; «vuelvo» no inventa experiencia y aplazar confirmación no bloquea registro.
D02. Avanzado funciona en elegibilidad, catálogo y editor; no añade series, no fuerza PPL 6, no elude edad/salud/consentimiento y no cambia una sesión activa.
D03. Una persona nueva sin historial puede aceptar readaptación conservando una plantilla intermedia. Huecos del registro no se confunden con pausa confirmada.
D04. Experiencia, fase, readaptación y familiaridad evolucionan separadamente. Cambiar de plantilla o corregir sesión no duplica días válidos.
D05. Mapas de las 99 fichas sin IDs inválidos; ejercicios propios sin mapa tienen alternativa explícita. Revisar visualmente frontal/posterior y texto accesible.
D06. Banca/press vertical, convencional/rumano/curl e hip thrust muestran su variante; roles anatómicos no cambian factores históricos 1/2 ni se presentan como porcentajes.
D07. Resumen semanal correcto con sesión parcial, unilateral, calentamientos, bloques, superserie, datos de ejemplo y corrección de historial. Sin doble conteo al agrupar regiones.
D08. Planificado y realizado no se mezclan, con semana local, cambio domingo→lunes y fechas de registros.
D09. Registro con coma decimal, RIR 0, valores vacíos, kg por mancuerna, asistencia, lastre, bandas, tiempo, distancia y lados.
D10. Borrador sobrevive a recarga entre campos; un anterior/sugerido no se convierte en serie completada automáticamente. Error de escritura conserva borrador y se comunica.
D11. Doble toque y reintento de guardado no duplican serie/tramo ni accionan el botón nuevo bajo el dedo; deshacer conserva datos correctos.
D12. Abrir mapa, demostración y notas mantiene temporizador, borrador, foco razonable y ejercicio activo. El teclado no tapa la acción principal.
D13. «Hacer después» conserva lo terminado, orden original, orden real y descanso. Superserie se mueve como grupo o se separa de forma expresa.
D14. Sustituir hoy conserva historial y no copia kg a otro ejercicio; modificación futura exige la vía de versión correspondiente.
D15. Notas persistentes y de sesión tienen alcance distinto. Material A/B no mezcla sugerencias automáticamente; histórico sin contexto sigue accesible.
D16. Grupos homogéneos conservan progresión. En principal 1×4–6 y complementarias 2×6–8, cada grupo usa su referencia y no arrastra cargas al otro. Reordenar no cambia identidad; omitidas no satisfacen objetivos.
D17. Temporizador tras recarga/suspensión; pantalla encendida no soportada o rechazada no bloquea entrenamiento. No afirmar sonido en segundo plano sin prueba real.
D18. Offline: arranque después de preparación, registro, fichas, SVG y demostraciones descargadas. Externas indisponibles no bloquean; contador de disponibilidad correcto y descarga interrumpida recuperable.
D19. Copias 1/2/3 se restauran; 4 hace ida y vuelta sin pérdida de datos nuevos; app anterior rechaza 4. Fallo de validación/transacción no modifica el destino.
D20. Actualización real 1.4→nueva versión con una rutina antigua, una actual, sesión parcial con decimales, bloque, corrección, foto, notas y favoritos. No regenerar planes ni perder el tramo activo.
D21. Aviso de actualización durante entrenamiento no recarga. Al terminar y aceptar actualización se conservan datos y rutas hash en subruta.
D22. Catálogo conserva 26, favoritas, comparador y «Ver todas». Lo que no encaja se explica; no vuelve a aplanar la dosis a dos series.
D23. Claro/oscuro, anchuras 320/375/390 y mayor, orientación, texto ampliado al 200 %, objetivos táctiles y ausencia de desplazamiento horizontal. Documentar lectura por VoiceOver como pendiente si no se dispone de dispositivo real.
D24. Todos los accesos anteriores a medidas, fotos, calculadora, copia, corrección y Aprender siguen funcionando; navegación a una sesión activa siempre disponible.
D25. Enlaces V01–V04 asociados a variantes correctas, apertura explícita sin carga automática de terceros; atribuciones locales y estados de licencia/técnica no se confunden.

No modificar expectativas de un test antiguo para ocultar una regresión. Si una regla cambia por este encargo, documentar por qué la expectativa debe cambiar. Una captura bonita no prueba persistencia; pasar tests no valida científicamente las recetas.

10. EJECUCIÓN, CONTEXTO Y ENTREGA

1) Lee README, instrucciones locales, docs/ESTADO.md, PRUEBAS.md, EVIDENCIA.md, PLANTILLAS.md, FORMATO_COPIA.md y CONTENIDOS_Y_LICENCIAS.md, además del código relevante. Comprueba qué ya existe antes de duplicar.
2) Guarda este encargo en docs/ENCARGO_4.md y una lista de avance en docs/ESTADO_ENCARGO_4.md. Implementa por bloques manejables: modelo/migración; mapa/fichas; entrenamiento/editor; navegación/offline; pruebas/publicación.
3) Antes de compactar contexto, guarda estado concreto: rama/commits, archivos cambiados, decisiones, pruebas ejecutadas y resultado, fallos pendientes y siguiente paso. Tras compactar, continúa desde esos archivos. No hace falta que el usuario vuelva a enviar todos los prompts ni que repita decisiones aceptadas.
4) Comprueba la interfaz con capturas reales de los flujos implementados y corrige problemas de legibilidad, espaciado y teclado. No entregues únicamente una propuesta de diseño.
5) Ejecuta las pruebas apropiadas y una actualización real desde la 1.4, no solo una instalación limpia. Usa datos ficticios aislados, nunca sesiones del usuario para probar.
6) Actualiza documentación, versión de app/motor cuando corresponda, formato de copia y registro de cambios. Conserva fuentes anteriores; documenta las nuevas equivalencias y límites.
7) Publica por el workflow existente cuando las comprobaciones pasen y verifica la URL real, build, rutas, carga y flujos críticos. No pidas autorización después de cada pequeño cambio de este encargo. No fuerces reescrituras de historia ni sobrescribas cambios ajenos para publicar.
8) Entrega un informe breve: versión/build/URL, cambios visibles, migraciones, pruebas realmente ejecutadas, limitaciones, y un recorrido de cinco comprobaciones sencillas para el iPhone físico. No declarar esa prueba realizada por haber usado emulación.

Criterio de cierre: una persona puede conservar su experiencia, preparar una vuelta gradual, ver qué trabaja cada ejercicio, entrenar con menos pasos, reorganizar lo pendiente y recuperar su historial sin sorpresas. Las mejoras están integradas y publicadas; cualquier pendiente real queda identificado con su alcance, sin disfrazarlo de completado.
