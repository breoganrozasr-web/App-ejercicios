# Estado del proyecto (punto de continuación)

Última actualización: **15 de noviembre de 2026** (versión 1.5). Rama: `claude/app-from-spec-1c0pa7`.

## Versión 1.5 (15/11/2026): experiencia, mapa muscular y comodidad en el gimnasio

Encargo: [ENCARGO_4.md](ENCARGO_4.md); avance por bloques: [ESTADO_ENCARGO_4.md](ESTADO_ENCARGO_4.md). App 1.5.0, motor 2.3.0, copia formato 4, esquema Dexie 3.

**Terminado y probado (automático, no en iPhone físico):**
- **Experiencia y situación actual** separadas (principiante / intermedio / avanzado + entreno con regularidad / vuelvo tras una pausa / aún no he empezado), con migración del perfil y sin regenerar rutinas. Avanzado no añade series. «Preparar mi vuelta» (también sin historial) con comparación hoy frente al plan base; tras 21 días sin registros, pregunta «¿Has entrenado fuera de Forja?»; fin de la vuelta con «Continuar» o «Prolongar 2 días»; sin porcentaje de carga tras la pausa.
- **Esquema muscular** SVG original (frente/espalda) con papeles principal/colabora/estabiliza y lista accesible; ficha en capas («Cómo hacerlo / Qué trabaja / Historial»); reparto muscular planificado y realizado (semana lunes–domingo) en Progreso y mapa del plan en la vista previa de plantillas.
- **Entrenamiento con una mano**: toque en dos pasos (preparar y confirmar), «Anterior: … · fecha» por serie, «Usar valores anteriores (sin completar)», aviso visible si falla el guardado, «Hacer después», «Sustituir hoy (solo esta sesión)», notas «para próximas veces» frente a «de hoy», contexto de material con sugerencias separadas, ficha y «Qué trabaja» en hoja sin salir de la sesión, barra de descanso plegable, ejercicios favoritos y recientes.
- **Objetivos por serie** («Personalizar series»: principal 1×4–6 + complementarias 2×6–8…) con progresión por grupo.
- **Catálogo compacto** («Encaja · ver por qué»), **Progreso en tres vistas** (Entrenamiento / Ejercicios / Cuerpo), **Ajustes agrupados** (Perfil y programa, Material, Durante el entrenamiento, Apariencia, Sin conexión y datos, Ayuda y versión) y **«Preparar mi rutina sin conexión»** con estado real (caché, service worker, locales/externas/sin recurso).
- **Demostraciones V01–V04** como enlaces externos con alcance; fuentes S01–S04 y T01–T02 en la biblioteca (S01 ≡ F01).
- **Copia formato 4** (una 1.4 la rechaza; restaurar copias 1–3 migra el perfil) y CSV con grupo, objetivo por serie y material.

**Publicada y verificada en la web real** el 15-11-2026 (build 8bc77fd) en Chromium y WebKit; actualización real desde la 1.4 con datos probada en ambos motores. Detalle en docs/PRUEBAS.md.

**Pendientes reales:** prueba en iPhone físico (una mano, teclado de iOS, VoiceOver, Safari como app, sonido y pantalla encendida reales); 8 demostraciones locales (solo enlace externo); abrir V01–V04, S01–S04, T01–T02, F01–F21, R1–R5 y T1–T9 desde un entorno con acceso; revisión profesional de fichas y del esquema muscular; la vuelta gradual de 4 días y los umbrales son decisiones de producto sin validación clínica; no hay importación de CSV.

## Versión 1.4 (15/11/2026): 26 plantillas, dosis explicable y fuerza + hipertrofia

**Terminado y probado (automático, no en iPhone físico):**
- **26 plantillas** del anexo A con su dosis propia (no aplanada por el perfil), generadas desde el texto del anexo (`scripts/recipes_from_annex.py` → `src/domain/engine/recipes-data.ts`) y con los controles editoriales comprobados por cálculo. Ids estables: continúan `fb2_gym`, `fb3_gym`, `ul4_gym`, `ppl3_gym`, `ppl6_gym`, `home_none` y `park_calisthenics` (versión editorial 2); retiradas del catálogo `strength3_gym`, `mixed4_gym` y `home_basic` (sus rutinas siguen funcionando). Tabla generada: [PLANTILLAS.md](PLANTILLAS.md).
- **Catálogo** «Buscar plantilla» destacado en Rutinas: alias, filtros (días, objetivo, lugar, reparto, duración calculada), «Encajan con tu perfil» / «Ver todas», favoritas, comparador de hasta tres, vista previa sin cambiar la rutina, conflictos de tiempo con alternativas y días separados. Selección determinista con reparto preferido. La propuesta del perfil muestra arriba las plantillas que encajan; la propuesta a medida (motor por bloques) se mantiene debajo.
- **Dosis explicable**: tres capas (receta base, adaptaciones, dosis de hoy); «Por qué estas series» con cifras calculadas y comparación de +1 serie; Hoy con «Hoy: adaptación… Plan base después… días válidos» y duración de hoy frente al plan base; etiquetas «Fuerza», «Trabajo complementario» y «Adaptación» en el entrenamiento; textos de aprendizaje unificados en días válidos (contados en todas las rutinas).
- **Fuerza + hipertrofia**: referencias SBD con RIR 2–3 y 180 s; contexto de prescripción (banca 4–6 y 8–10 por separado); 4 fichas nuevas (convencional, hip thrust, remo con pecho apoyado, remo con banda y anclaje) y material «anclaje para bandas».
- **Mapa muscular 2** versionado (las rutinas y sesiones anteriores conservan el mapa 1). Modelo de tiempo con aproximaciones por básico.
- **Adopción de mejoras** («Hay nuevas opciones para revisar tu rutina», comparar, «Mantener», nueva versión o rutina nueva; nunca durante un entrenamiento). **Correcciones** de sesiones guardadas (incluidos tramos) con vista previa y deshacer. **Tolerancia** opcional al terminar y aviso ante varias sesiones muy duras (sin añadir series).
- **Aprender**: 9 textos con nivel de certeza; fuentes F01–F21 con tabla de equivalencias. Fichas de las 49 usadas por plantillas con «tres claves» y «Qué aporta»; sustituciones con motivo. Etiquetas «Animación de posiciones» y «Vídeo externo · requiere conexión» con estados de comprobación separados.
- **Copia formato 3** (aditiva; una 1.3 la rechaza) y CSV con rango prescrito, corrección y dificultad.

**Publicada y verificada en la web real** el 15-11-2026 (build fe98133) en Chromium y WebKit; actualización desde la 1.3 con datos probada con las builds reales. Detalle en docs/PRUEBAS.md.

**Pendientes reales:** prueba en iPhone físico (uso con una mano, VoiceOver, Safari como app); demostraciones de las 4 fichas nuevas (los recursos externos localizados no se pudieron abrir desde el entorno: no se presentan en la app) y las 4 demostraciones locales que siguen siendo externas; abrir F01–F21, R1–R5 y T1–T9 desde un entorno con acceso; revisión profesional de las fichas (no la ha habido); las recetas, umbrales y valores iniciales son decisiones editoriales sin validación clínica ni ensayos como conjunto; los bloques no cambian de método al corregir (solo valores); no hay importación de CSV.

## Versión 1.3 (15/11/2026): series descendentes, rest-pause, superseries y fases

**Terminado y probado (automático, no en iPhone físico):**
- **Fases del programa** (Aprendizaje → Consolidación → Progresión), separadas de la experiencia declarada y de la familiaridad con cada ejercicio. Días válidos (≥ 70 %, sin ejemplo, uno por fecha). Paso automático a Consolidación con aviso y opción de prolongar el aprendizaje. Revisión con hitos (12 días válidos, 42 días, 3 sesiones completas en 2 referencias, sin bloqueo de salud), tarjeta única en Hoy, revisión breve de autorregistro, propuesta comparada (mantener o +1 serie opcional de una prioridad) y «Seguir como estoy» / «Más adelante» con plazo de 14 días y 4 días válidos. Tarjeta y pantalla «Tu programa» en Progreso.
- **Readaptación** ofrecida (nunca aplicada en silencio) tras 21 días o más sin entrenar: 4 días válidos con mitad de series y RIR 3–4.
- **Series descendentes y rest-pause** registradas tramo a tramo (carga, repeticiones, RIR y pausa reales; guardado inmediato; recarga en el tramo correcto; deshacer el último tramo; terminar antes; otra bajada solo si se elige; carga sugerida estrictamente menor y disponible). Reorganizar dos series pendientes o prolongar una serie, con antes/después y vuelta a series normales.
- **Superseries**: A1 → transición → A2 → descanso de la ronda; separar sin perder registros; etiqueta de «mismo músculo» para parejas manuales.
- **Propuestas opcionales** (con consentimiento «Quiero usar técnicas para ahorrar tiempo o variar»): un bloque al final de la sesión en aislamientos estables, máximo dos por semana; superseries de grupos distintos. Configuración manual de técnica por ejercicio en el editor.
- **Métricas** separadas (series convencionales y bloques), sin récords ni 1RM desde bloques, comparación solo en el mismo contexto, tonelaje anotado por tramo. Copia JSON formato 2 y CSV con una fila por tramo.
- **Aprender**: 4 textos nuevos (descendentes, rest-pause, superseries y fases, con los textos de ayuda literales) y fuentes R1–R5 con su alcance de consulta.

**Publicada y verificada en la web real** el 15-11-2026 (build 31025e8) en Chromium y WebKit; actualización desde la 1.2 con datos probada con las builds reales. Detalle en docs/PRUEBAS.md.

**Pendientes reales:** prueba en iPhone físico (incluido el uso con una mano de los botones de tramo); abrir los enlaces R1–R5 y T1–T9 desde un entorno con acceso; los umbrales de fase y los límites de bloques son reglas de producto sin validación clínica; las técnicas solo se proponen en una lista corta de aislamientos; los bloques no se editan en una sesión ya guardada (se ven tramo a tramo); no hay importación de CSV (no se pedía).

## Versión 1.2 (14/11/2026): motor 2 y mejoras de la especificación

**Terminado y probado (automático, no en iPhone físico):**
- Motor 2.0.0: contabilidad por familias (principal 1 / secundario 0,5 / estabilizador 0, con origen de cada cifra), deltoides en tres regiones, tronco por tiempo aparte, unilaterales sin duplicar; frecuencia directa e indirecta por separado y grupos objetivo visibles; presupuestos iniciales de volumen; repartos por bloques; tiempo con margen y sin acortar descansos; fuerza por referencias; conflictos con tabla real.
- Familiarización por 4 sesiones completadas (≥70 %); adaptación opcional tras pausa; dosis de hoy y posterior visibles.
- Casa sin material exactamente como el apartado 6, con flexión adecuada al nivel y avisos de tirón e isquios.
- Progresión: doble progresión con RIR objetivo, umbral del 10 % para revisar el salto, estancamiento, isométricos con esfuerzo 0–10 y sin RIR, sesión parcial (retomar / pasar / repetir), variantes más fácil o difícil con confirmación (solo con tu material).
- F8 reproducido y corregido (diario de guardado). Marcar serie idempotente.
- Contenido: «Aprender» (7 artículos), biblioteca E1–E14 / T1–T9 sin conexión, 9 fichas enriquecidas (tres claves + «Aprender este ejercicio»), 2 ejercicios nuevos, demostraciones externas T1–T9 y etiquetas honestas del tipo de demostración.
- Usabilidad: parcial primero en Hoy, vista opcional de ejercicio actual, descanso +30/+60, panel de volumen con origen, fichas que abren arriba y lista que recupera su posición, semana recalculada al mover una sesión, calorías secundarias y desactivables.

**Publicada y verificada en la web real** el 14-11-2026 (build 995ce67) en Chromium y WebKit; actualización desde la 1.1 con datos probada con las builds reales. Detalle en docs/PRUEBAS.md.

**Pendientes reales:** prueba en iPhone físico; abrir y revisar los enlaces T1–T9 desde un entorno con acceso; demostración local de 4 variantes (tienen referencia externa); revisión técnica de las 86 fichas con estructura migrada; textos completos de las fuentes E1–E14 que solo se consultaron en resumen.

## Terminado y probado (hasta la versión 1.1)

- **App completa y utilizable** (PWA): perfil/onboarding, propuesta del generador con razones, conflictos y ajustes de tiempo; 10 plantillas; rutina en blanco y sesión libre; editor con versiones, superseries, sustituciones y calendario; modo entrenamiento completo; catálogo con 93 fichas; progreso (constancia, calendario mensual, series por músculo, evolución, récords, 1RM estimado con límites, peso corporal); ajustes (copias JSON/CSV, restauración con vista previa y transacción, demostraciones offline con tamaño y borrado, persistencia, guía de iPhone, datos de ejemplo, ayuda, licencias, borrado total).
- **Versión 1.1** (13-11-2026): aviso sonoro del descanso con modos «Siempre» (suena con el iPhone en silencio; usa `navigator.audioSession = 'playback'` solo durante el pitido), «Con música» y «Sin sonido», botón «Probar sonido»; pantalla encendida durante el entrenamiento (Screen Wake Lock); «¿Cómo llegas hoy?» con ajuste conservador; récords en directo y resumen de sesión (duración, series, repeticiones, récords, comparación, calorías en rango); calculadora de discos y calentamiento sugerido; nota fija por ejercicio; registrar sesión pasada y cambiar fecha/hora/duración; medidas corporales; fotos de progreso opcionales (locales, fuera de las copias por defecto); días desde el último entrenamiento por músculo. Esquema de datos v2 (tablas `measurements` y `photos`; la v1 se actualiza sin perder datos: probado en pruebas unitarias y con las builds reales 1.0 → 1.1 en Chromium y WebKit). **Publicada y verificada en la web real** el 13-11-2026.
- **Motor determinista** v1.0.0 con reglas R1–R17 documentadas en `docs/EVIDENCIA.md`, más R18–R22 (calorías, preparación, días por músculo, aproximaciones, récords) que no cambian la generación de rutinas.
- **Demostraciones**: 91 ejercicios con demostración verificada: 84 del muñeco Everkinetic (CC BY-SA 4.0) y 7 de peso corporal de Wikimedia Commons (CC BY-SA 4.0 y dominio público CDC), cada una revisada a mano; manifiestos con origen, licencia, atribución y fecha.
- **Pruebas**: 73 unitarias/integración + 22 E2E en Chromium y 15 (+1 omitida) en WebKit, en verde (`docs/PRUEBAS.md`).
- **Publicada** en GitHub Pages con `.github/workflows/deploy-pages.yml` (en cada push a `main` y a mano).

## Pendientes reales (no ocultos)

1. **Publicación: HECHA.** Forja está en https://breoganrozasr-web.github.io/App-ejercicios/ (repositorio público, GitHub Pages con GitHub Actions; cada push a `main` vuelve a desplegar). Verificado el 13-11-2026 en la web real con Chromium y WebKit emulando iPhone 13 (ver docs/PRUEBAS.md).
   - Aviso de privacidad: el correo personal del commit inicial se sustituyó por la dirección privada de GitHub antes de publicar, pero GitHub puede conservar el commit antiguo (sin referencia) accesible por su identificador o en el registro de actividad. Para purgarlo del todo: solicitud gratuita al soporte de GitHub.
2. **Prueba en iPhone físico**: probado con Chromium y WebKit para Linux emulando iPhone, no en un iPhone real. Lista de verificación en `docs/PRUEBAS.md`.
3. **2 demostraciones pendientes** (zancada atrás con peso corporal, flexiones inclinadas). Ya no las usa ninguna plantilla. Ver `docs/CONTENIDOS_Y_LICENCIAS.md`.
5. **Sonido en iPhone real**: el modo «Siempre» depende de la API `navigator.audioSession` de Safari (iOS 17 o posterior). Comprobado solo en emulación; si en el iPhone no suena en silencio, la alternativa es quitar el modo silencio durante el entrenamiento. Con la pantalla bloqueada o la app en segundo plano una web no puede avisar.
4. **Evidencia a texto completo**: las fuentes se verificaron a nivel de resumen/buscador; pubmed/pmc y webs de revistas estaban bloqueadas.

## Ideas no implementadas (fuera del alcance de la v1)

- Sincronización entre dispositivos (deliberadamente no incluida: los datos son locales; se usan copias).
- Notificaciones push de fin de descanso con la pantalla bloqueada (requieren servidor de envío; se mitiga manteniendo la pantalla encendida durante el entrenamiento).
- Integración de imágenes de wger (licencia por imagen; requiere acceso a wger.de).

## Cómo continuar

```bash
npm install
npm test && npm run build && npm run e2e
npm run dev            # desarrollo
```

- Reglas del motor: `src/domain/engine/params.ts` (+ subir `ENGINE_VERSION`).
- Catálogo: `src/domain/catalog/exercises.ts`; demos: `scripts/build_media.py <ruta a everkinetic/data>`.
- Esquema de datos: `src/data/db.ts` (v2; añadir `this.version(N+1)` con `upgrade`, nunca borrar versiones; prueba de migración en `tests/unit/features.test.ts`).
- Antes de tocar copias: `docs/FORMATO_COPIA.md`.
