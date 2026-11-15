# Pruebas: comandos, resultados reales y comprobaciones pendientes

Última ejecución: **15 de noviembre de 2026** (app 1.4.0, motor 2.2.0), en el contenedor de desarrollo (Linux, Node 22.23, Chromium 1243 y WebKit 26.6 vía Playwright 1.63). Las secciones de la 1.2 y la 1.1 se conservan debajo. **WebKit para Linux es el motor de Safari, no un iPhone real: no se ha probado en un iPhone físico.**

## Versión 1.4 (encargo 3: 26 plantillas, dosis explicable, fuerza + hipertrofia): resultados y criterios C01–C22

Ejecución del 15/11/2026 en el contenedor de desarrollo. **WebKit para Linux no es un iPhone: no se ha probado en un iPhone físico** (ni el uso con una mano, ni VoiceOver real, ni Safari instalado como app).

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm test` | ✅ **154/154** (6 ficheros; 24 nuevas en `plantillas.test.ts`; 4 anteriores ajustadas a decisiones nuevas: mapa muscular 2, formato de copia 3, 99 ejercicios, días válidos contados en todas las rutinas) |
| `npm run build` | ✅ precache ≈1117 KB |
| E2E Chromium (iPhone 13, SE y 15 Pro Max) + WebKit 26.6 (`webkit-iphone-13`) | ✅ **75 pasan, 1 omitida** (la de sin conexión en WebKit, limitación de Playwright). Incluye 6 nuevas en `plantillas.spec.ts` y la prueba de diseño ampliada al catálogo, la vista previa, el comparador y la ficha del convencional en claro y oscuro |
| Actualización real **1.3 → 1.4** con datos (builds en `/App-ejercicios/`, Chromium **y** WebKit, `upgrade14.cjs`) | ✅ 7/7 en cada motor: con la 1.3, una sesión completa, una parcial con 52,5 kg y la rutina marcada como del motor 1.0.0; copia exportada. Tras «Actualizar ahora»: «App 1.4.0 · motor de rutinas 2.2.0»; sesiones y versiones intactas y la rutina **sin migrar** (sigue en 1.0.0); Hoy muestra «Hay nuevas opciones para revisar tu rutina»; la parcial se retoma con 52,5; el catálogo abre. La copia de la 1.3 se restaura en una 1.4 limpia sin pérdidas. Sin errores |
| **Verificación en la URL publicada** (build fe98133, `verify-live-14.cjs`) | ✅ Chromium **15/15** y WebKit **14/14**: commit y «App 1.4.0 · motor 2.2.0» en Ajustes; plantillas que encajan en la propuesta; búsqueda «push pull legs» → 3; 26 en «Ver todas»; comparador con «Peso muerto convencional 1»; «Por qué estas series» de A15 (10 directas de pecho); Hoy con la línea de adaptación (10 → 16 series, 4 días válidos); ficha del convencional con «Qué aporta» y demostración pendiente; artículo con certeza; F01 ≡ E1; demostración de Commons; service worker; vista previa de plantilla sin conexión (Chromium). Sin errores de página. (Primera pasada en Chromium: 14/15 porque la comprobación del service worker se hizo antes de activarse; se cambió a esperar `serviceWorker.ready` y se repitió.) |
| Controles editoriales del anexo A | ✅ las 26 recetas reproducen exactamente las series directas y los días de pecho, espalda, cuádriceps, isquios y glúteos, las series por sesión y la contribución secundaria del convencional (1 y 1,5) — calculado, no copiado |
| Revisión visual | ✅ catálogo, comparador y vista previa (iPhone SE), Hoy con la línea de adaptación y el entrenamiento con la etiqueta «Adaptación» (iPhone SE, oscuro). Ajustados: selector de reparto a ancho completo, recetas de otro lugar fuera de «Encajan», duración de hoy frente al plan base en Hoy y «aprendizaje» en la cabecera del entrenamiento |

| # | Criterio | Dónde se prueba | Estado |
|---|---|---|---|
| C01 | 26 recetas completas; búsqueda por PPL, powerbuilding, anterior/posterior, SBD; sin duplicados | `plantillas.test.ts`, `plantillas.spec.ts`, `flows.spec.ts` (las 26 abren y una se activa) | ✅ |
| C02 | Estándar conserva 3 series con perfil principiante; hoy reduce solo por adaptación y lo explica | `plantillas.test.ts`, `plantillas.spec.ts` («Hoy: adaptación · 10 series… Plan base después: 16… Te quedan 4 días válidos») | ✅ |
| C03 | Días válidos, sesiones el mismo día, pausa y cambio de plantilla no reinician ni aceleran | `plantillas.test.ts` (los días válidos se cuentan en todas las rutinas) | ✅ |
| C04 | PPL 3 frecuencia 1; PPL 6 y PPL+torso/pierna calculan la suya; pedir frecuencia 2 muestra el conflicto sin ocultar PPL | `plantillas.test.ts`, `plantillas.spec.ts` | ✅ |
| C05 | A15: pecho 10, espalda 10, cuádriceps 10, isquios 7; convencional +1 secundaria a cuádriceps e isquios; calentamientos y bloques aparte | `plantillas.test.ts` | ✅ |
| C06 | A15: banca 2 días, sentadilla 1, convencional 1; el rumano no cuenta como convencional | `plantillas.test.ts`, comparador en `plantillas.spec.ts` | ✅ |
| C07 | A16 redistribuye brazos/hombros | `plantillas.test.ts` | ✅ |
| C08 | Unilateral: tiempo con los dos lados, series no duplicadas por músculo; aprendizaje ≠ base | `plantillas.test.ts`, vista previa en `plantillas.spec.ts` | ✅ |
| C09 | 30 min frente a receta larga: conflicto y alternativas sin quitar series | `plantillas.test.ts` | ✅ |
| C10 | Sin banco/anclaje no se proponen recetas que los requieren; casa sin material no anuncia espalda ni isquios | `plantillas.test.ts` | ✅ |
| C11 | Domingo→lunes, días seguidos y anterior/posterior con músculos reales | `plantillas.test.ts` (L-M comparten glúteos; con L X V D queda el domingo→lunes) | ✅ |
| C12 | Banca 4–6 y 8–10 con sugerencias separadas; los ejercicios nuevos no heredan kg | `plantillas.test.ts`; «Última vez con 4–6» y «Ver también 8–10» en el entrenamiento | ✅ |
| C13 | Misma entrada → misma propuesta; la preferencia de reparto cambia el orden de forma explicable | `plantillas.test.ts` | ✅ |
| C14 | Ver, comparar y cancelar no cambia nada; aceptar guarda; no durante un entrenamiento | `plantillas.spec.ts`, `plantillas.test.ts` | ✅ |
| C15 | Copia anterior y actualización desde 1.3 con sesiones, rutina del motor 1.0, bloques y parciales | `upgrade14.cjs` (Chromium y WebKit), `plantillas.spec.ts` (tarjeta y «Mantener»), `tecnicas.test.ts` (copias 1 y 2) | ✅ |
| C16 | Corrección guardada incluidos dos tramos 40×10→30×8; CSV/JSON/progreso coherentes; deshacer | `plantillas.test.ts`, `plantillas.spec.ts` (vista previa «40 → 42,5 kg», deshacer) | ✅ |
| C17 | Una corrección que cambia el 70 % no duplica días válidos ni borra decisiones de fase | `plantillas.test.ts` (una fecha = un día); las decisiones aceptadas viven en `program` y no se tocan | ✅ |
| C18 | Catálogo, artículos y fichas sin conexión; externos marcados; un fallo de vídeo no impide registrar | `plantillas.spec.ts` (Chromium; en WebKit Playwright no emula bien sin conexión), `offline-media.spec.ts` | ✅ Chromium |
| C19 | Actualización disponible durante una sesión: no recarga ni pierde filas | Banner existente: «Se aplicará cuando termines el entrenamiento en curso» (sin botón); `upgrade14.cjs` actualiza fuera de sesión | ✅ (lógica previa, sin cambios) |
| C20 | iPhone pequeño sin desplazamiento horizontal; táctiles ≥ 44 px; nombres accesibles | `layout.spec.ts` (SE, 13, 15 Pro Max, claro/oscuro), `plantillas.spec.ts` | ✅ emulado; VoiceOver real pendiente |
| C21 | Copia transaccional con propiedades nuevas; versión 3; una app anterior no la malinterpreta | `plantillas.test.ts`, `tecnicas.test.ts` | ✅ |
| C22 | Menores y señales de salud: las recetas adultas no se saltan protecciones | `plantillas.test.ts` | ✅ |

**Qué no prueban estas pruebas:** que una receta maximice la hipertrofia de una persona, que los textos de las fichas estén revisados por un profesional (no lo están) ni el funcionamiento en un iPhone físico.

## Versión 1.3 (ampliación: técnicas y fases): resultados y criterios B01–B22

Ejecución del 15/11/2026 en el contenedor de desarrollo (mismas herramientas que abajo). **WebKit para Linux no es un iPhone: no se ha probado en un iPhone físico.**

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm test` | ✅ **130/130** (5 ficheros; 30 nuevas en `tecnicas.test.ts`) |
| `npm run build` | ✅ precache ≈1009 KB |
| `npm run e2e` (Chromium: iPhone 13, iPhone SE, iPhone 15 Pro Max) | ✅ **35/35** (28 anteriores + 7 nuevas en `tecnicas.spec.ts`) |
| WebKit 26.6 (`webkit-iphone-13`) | ✅ **28/29** (1 omitida: la prueba sin conexión, por la misma limitación de Playwright) |
| Actualización **1.2 publicada → 1.3** con datos (builds reales en `/App-ejercicios/`, Chromium **y** WebKit) | ✅ Con la 1.2: rutina de principiante, una sesión completa y una parcial con 52,5 kg. Tras «Actualizar ahora»: «App 1.3.0 · motor de rutinas 2.1.0»; las sesiones se conservan; Progreso muestra «Aprendizaje · 1 de 4 días válidos»; la parcial aparece en Hoy y se retoma con 52,5 kg; en esa sesión antigua se registra un bloque rest-pause (pausa breve en marcha); al terminar, el bloque se cierra «antes de tiempo» con su tramo; la sesión siguiente es «familiarización 2/4». Sin errores |
| Revisión visual (iPhone 13 claro, iPhone SE oscuro) | ✅ Hoy con la tarjeta de revisión, pantalla de fase con la revisión breve, sección de técnicas de la rutina, bloque descendente en sus dos estados. Ajustados: lista de referencias de la tarjeta (máx. 3), redacción de los hitos y contraste del botón «Terminar bloque» |

**Fallo encontrado y corregido durante las pruebas:** un doble toque en «Registrar tramo» podía pulsar el botón que aparece en ese mismo sitio («Deshacer último tramo» o «Terminar bloque») y perder el tramo recién registrado o cerrar el bloque. Ahora cada bloque admite una acción cada 0,7 s; la prueba B14 hace el doble toque y comprueba que el tramo se conserva. También se evitó que «Copiar lo de la última vez» y «Usar X kg» escriban en filas de bloque.

| # | Criterio | Dónde se prueba | Estado |
|---|---|---|---|
| B01 | Las mejoras del primer encargo siguen pasando | Toda la batería anterior (100 unitarias, 28 e2e) sigue en verde | ✅ |
| B02 | 4 días válidos terminan la familiarización; 4 días de calendario sin entrenar, no | `tecnicas.test.ts` (dos sesiones el mismo día cuentan una; 50 % no es válida; el calentamiento no cuenta; paso automático a Consolidación) | ✅ |
| B03 | 12 sesiones en menos de 42 días no disparan la revisión | `tecnicas.test.ts` | ✅ |
| B04 | 42 días sin constancia tampoco; ejemplo y duplicados no adelantan fase | `tecnicas.test.ts` | ✅ |
| B05 | Cumplir hitos propone revisión; no certifica intermedio ni activa técnicas | `tecnicas.test.ts`, `tecnicas.spec.ts` | ✅ |
| B06 | Posponer conserva la rutina y respeta el plazo (14 días y 4 días válidos) | `tecnicas.test.ts`, `tecnicas.spec.ts` | ✅ |
| B07 | Aceptar crea versión solo si cambia el plan y conserva las sesiones | `tecnicas.test.ts` (+1 serie → versión 2; sesiones intactas), `tecnicas.spec.ts` (aceptar sin cambios → sigue 1 versión) | ✅ |
| B08 | Pausa larga ofrece readaptación sin borrar nivel; ejercicio nuevo no hereda dominio | `tecnicas.test.ts`, `tecnicas.spec.ts` («Llevas 30 días sin entrenar» → «readaptación 1/4») | ✅ |
| B09 | Principiante, familiarización, menor o salud: sin propuestas de técnicas | `tecnicas.test.ts`, `tecnicas.spec.ts` | ✅ |
| B10 | Nueva fase sin consentimiento mantiene técnicas desactivadas | `tecnicas.test.ts`, `tecnicas.spec.ts` | ✅ |
| B11 | 40×10 + 30×8 = dos tramos; nunca 40×18 ni un 1RM | `tecnicas.test.ts`, `tecnicas.spec.ts` (IndexedDB: tramos [[40,10],[30,8]], peso/reps de la serie vacíos) | ✅ |
| B12 | Bajadas disponibles y estrictamente menores; sin aviso del 10 % | `tecnicas.test.ts` (máquina, polea, mancuernas, barra, empate → la menor, sin reducción razonable → a mano) | ✅ |
| B13 | Rest-pause conserva carga y pausas; cambio de carga identificado | `tecnicas.test.ts`, `tecnicas.spec.ts` | ✅ |
| B14 | Guardado tras cada tramo, recarga en pausa, doble toque y deshacer | `tecnicas.spec.ts` (recarga a mitad de bloque y durante la pausa breve; doble toque; deshacer conserva el tramo anterior), `tecnicas.test.ts` | ✅ (fallo del doble toque encontrado y corregido) |
| B15 | Terminar antes conserva lo hecho y el estado parcial | `tecnicas.test.ts`, `tecnicas.spec.ts`, prueba de actualización | ✅ |
| B16 | Reorganizar no toca lo hecho; prolongar avisa de trabajo añadido | `tecnicas.test.ts`, `tecnicas.spec.ts` (antes/después, vuelta a series normales) | ✅ |
| B17 | Métricas separadas sin conversión fisiológica | `tecnicas.test.ts` (semana, rutina, tonelaje por tramo, estimación de duración) | ✅ |
| B18 | A1/A2: pausas, orden y carga independiente; separar conserva registros | `tecnicas.test.ts`, `tecnicas.spec.ts` (transición «Ahora: …», descanso de la ronda, separar) | ✅ |
| B19 | No comparar contextos incompatibles | `tecnicas.test.ts` (bloque o superserie → nueva referencia; bloques solo con bloques iguales) | ✅ |
| B20 | JSON conserva bloques y fases; CSV tramos y métodos; copias antiguas valen | `tecnicas.test.ts` (exportar → restaurar en base nueva; CSV con una fila por tramo; copia de formato 1) | ✅ |
| B21 | Una propuesta no se registra como entrenamiento | `tecnicas.test.ts` | ✅ |
| B22 | PWA, rutas, sin conexión, actualización y URL pública tras desplegar | Actualización con builds reales (arriba) y «Web publicada, versión 1.3» | ✅ |

### Web publicada, versión 1.3

15-11-2026, https://breoganrozasr-web.github.io/App-ejercicios/ · workflow «Publicar en GitHub Pages» ejecución 9 (pruebas, build y despliegue correctos) · script principal servido `index-C62D1TWZ.js`. La app publicada corresponde al commit **31025e8**; el commit posterior que añade este registro solo cambia documentación y no se despliega.

Comprobado sobre la URL real con un iPhone 13 emulado y perfil intermedio (no es un iPhone físico):

| Comprobación | Chromium | WebKit |
|---|---|---|
| Ajustes: «App 1.3.0 · motor de rutinas 2.1.0 · build 31025e8» = commit subido | ✅ | ✅ |
| Progreso: «Tu programa» en Consolidación; pantalla de fase con el texto literal y «tu programa parte de esa declaración» | ✅ | ✅ |
| Bloque descendente: 40 kg × 10 con doble toque en «Registrar tramo» → recarga → «Continuar bajada» → 30 kg × 8. IndexedDB: tramos [[40,10],[30,8]], peso y repeticiones de la serie vacíos; descanso habitual al terminar el bloque (B11, B14) | ✅ | ✅ |
| Rest-pause: tramo inicial → «Pausa breve» → recarga → la pausa sigue (B13) | ✅ | ✅ |
| Superserie: A1 → «Transición de superserie» → A2 → «Descanso de la ronda» (B18) | ✅ | ✅ |
| Aprender «Series descendentes» con el texto de ayuda literal; fuente R1 con su alcance de consulta | ✅ | ✅ |
| Demostración local de Wikimedia Commons cargada; service worker activo | ✅ | ✅ |
| Sin conexión: la app y la pantalla de fase abren desde la caché | ✅ | no probado (limitación de Playwright con WebKit) |
| Sin errores de página ni recursos propios fallidos | ✅ | ✅ |

La primera pasada de Chromium marcó dos comprobaciones como fallidas porque el script las evaluaba al instante, antes de que terminara la carga tras navegar o recargar; con espera, ambas pasan (16/16). El tramo 2 registró una pausa de 0 s porque el script pulsa «Continuar bajada» menos de un segundo después de recargar.

## Versión 1.2 (motor 2): resultados y criterios de aceptación A01–A24

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm test` | ✅ **100/100** (4 ficheros) |
| `npm run build` | ✅ precache ≈934 KB; demos aparte, bajo demanda |
| `npm run e2e` (Chromium: iPhone 13, iPhone SE, iPhone 15 Pro Max) | ✅ **28/28** |
| WebKit 26.6 (`webkit-iphone-13`) | ✅ **21/22** (1 omitida: la prueba sin conexión, por la limitación de Playwright descrita abajo) |
| Actualización **1.1 publicada → 1.2** con datos (builds reales en `/App-ejercicios/`, Chromium y WebKit) | ✅ con la 1.1: rutina del motor 1 (familiarización por semanas), sesión parcial «52,5 kg × 10». Tras «Actualizar ahora»: la parcial aparece primero en Hoy, «Retomar lo pendiente» reabre la MISMA sesión con 52,5 kg, «Cerrar y pasar a la siguiente» funciona, la rutina antigua conserva su regla de semanas y la propuesta del motor 2 se genera. Sin errores |

**Reproducción previa de los fallos de la revisión (antes de corregir):** F1 (L/X/V principiante: la explicación decía «unas 3 veces» y hombros e isquios tenían 1 día directo), F2 (casa sin material: el día B solo tenía zancadas atrás), F3 (planchas con «RIR 2–3»), F4 (isquios 6,5 series con 3 directas), F5 (fuerza intermedia ofrecía alargar a ~81 min para completar dianas) se reprodujeron con un script sobre el motor 1. **F8 se reprodujo** con una prueba de navegador: tras marcar, escribir una nota con pulsaciones rápidas y recargar al instante, la nota perdía los últimos caracteres («agarre neutro» → «agarre neu»; peso, repeticiones, RIR y serie sí se conservaban). Causa: escrituras encadenadas a IndexedDB que la recarga cortaba. Corrección: diario síncrono en `localStorage` + escrituras coalescentes + recuperación al arrancar; además, marcar una serie usa los valores recién escritos y un doble toque no la marca y desmarca. F6 y F7 se comprobaron en la interfaz.

| # | Criterio | Dónde se prueba | Estado |
|---|---|---|---|
| A01 | Mismo perfil, catálogo y reglas → mismo resultado | `engine.test.ts` (5 perfiles + 10 plantillas, JSON idéntico; versión del motor guardada en la propuesta) | ✅ |
| A02 | La explicación de frecuencia coincide con días y series | `engine.test.ts` (recuento independiente día a día en 5 perfiles; nunca «unas N veces»; F1 corregido: 3 días directos en pecho, espalda, cuádriceps, isquios y glúteos) | ✅ |
| A03 | 2 días + frecuencia 3 → conflicto; la alternativa se recalcula sin promesas falsas | `engine.test.ts` (tabla real en cada alternativa; sin material de tirón la alternativa no se llama «conseguida»; frecuencia no conseguible → conflicto con tabla), `flows.spec.ts` | ✅ |
| A04 | Casa sin material, 3 días, 30 min → apartado 6 | `engine.test.ts` (ejercicios, series, rangos y descansos exactos de A/B/C; ≤30 min; ningún día solo de zancadas ni «cuerpo completo»; avisos de tirón e isquios; plantilla equivalente), `motor2.spec.ts` | ✅ |
| A05 | Material desmarcado o excluido jamás aparece, tampoco en una regresión | `engine.test.ts` (4 objetivos sin máquinas + exclusiones; casa sin pared), `progression.test.ts` (la variante más difícil no se ofrece sin su material) y el menú de variantes filtra por material | ✅ |
| A06 | Domingo/lunes cuenta como consecutivo | `engine.test.ts` | ✅ |
| A07 | Familiarización visible antes de empezar; 1/7 series no cuenta | `engine.test.ts` (dosis de hoy y posterior), `data.test.ts` (parcial 1/7 no cuenta; ≥70 % sí; versiones antiguas por semanas), `flows.spec.ts` (se ve en la propuesta) | ✅ |
| A08 | Fuerza prioriza referencias; no alarga para dianas de hipertrofia | `engine.test.ts` | ✅ |
| A09 | Cada cifra de volumen muestra origen; la estabilización no suma | `engine.test.ts` (directas = suma de fuentes con peso 1; secundarias con 0,5; estabilizador 0) y panel con desglose por ejercicio | ✅ |
| A10 | 2 series por pierna no duplican el total semanal, sí el tiempo | `engine.test.ts` | ✅ |
| A11 | Plancha: segundos y esfuerzo opcional, sin RIR ni kg | `progression.test.ts`, `engine.test.ts`, `motor2.spec.ts` (columna «Esf.», sin botón RIR) | ✅ |
| A12 | 12/12/12 con margen cumple; 12/10/8 no; RIR bajo no; RIR ausente = incertidumbre | `progression.test.ts` | ✅ |
| A13 | Ejercicio incompleto no sube; completo dentro de una parcial sí se evalúa | `progression.test.ts` | ✅ |
| A14 | Incrementos reales, asistencia, bandas y máquina respetan su significado | `progression.test.ts` (rejilla, 10 % de revisión, asistencia, banda sin kg; historial por ejercicio) | ✅ |
| A15 | Retomar parcial no duplica; repetir genera otra sesión | `data.test.ts`, `motor2.spec.ts` (desde Hoy) | ✅ |
| A16 | 20,5 + repeticiones/RIR + marcar + nota + recarga rápida conserva datos | `motor2.spec.ts` (3 rondas con recarga inmediata), `data.test.ts` (diario) | ✅ (fallo F8 reproducido y corregido) |
| A17 | Copias anteriores restauran; editar/migrar no cambia historial | `features.test.ts` (copias de esquema 1 y 2), `data.test.ts`, prueba de actualización 1.1 → 1.2 | ✅ |
| A18 | Fichas abren arriba y vuelven a la lista | `motor2.spec.ts` (posición de la lista recuperada al volver) | ✅ |
| A19 | Cada enlace de demostración corresponde al id exacto; online/offline y créditos honestos | `data.test.ts` (T1–T9 ↔ ids y vídeos), `motor2.spec.ts` | ✅ en la app · ⚠️ los enlaces no se pudieron abrir desde aquí (ver abajo) |
| A20 | Catálogo mantiene sus IDs | `data.test.ts` (93 anteriores intactos + 2 nuevos = 95) | ✅ |
| A21 | Salud y menores conservan restricciones; menores sin tabla adulta | `engine.test.ts` | ✅ |
| A22 | Chromium móvil y WebKit | arriba (no es un iPhone real) | ✅ |
| A23 | Build en `/App-ejercicios/`, rutas hash, offline y actualización controlada | prueba de actualización con builds reales; `offline-media.spec.ts` (Chromium) | ✅ |
| A24 | URL pública verificada tras el despliegue, con versión y commit | ver «Web publicada, versión 1.2» | ✅ |

### Web publicada, versión 1.2

14-11-2026, https://breoganrozasr-web.github.io/App-ejercicios/ · workflow «Publicar en GitHub Pages» ejecución 8 (pruebas, build y despliegue correctos) · script principal servido `index-B2JYHWfj.js`. La app publicada corresponde al commit **995ce67**; el commit posterior que añade este registro solo cambia documentación y no se despliega (la app no cambia).

Comprobado sobre la URL real con un iPhone 13 emulado (no es un iPhone físico):

| Comprobación | Chromium | WebKit |
|---|---|---|
| Ajustes muestra «App 1.2.0 · motor de rutinas 2.0.0 · build 995ce67» = commit subido (A24) | ✅ | ✅ |
| Propuesta con «Frecuencia real de esta propuesta», sin «unas N veces» (A02) y con «Hoy (familiarización)» visible antes de empezar (A07) | ✅ | ✅ |
| 20,5 kg + repeticiones 9→11 + RIR 2 + marcar + nota tecleada deprisa + **recarga inmediata**: todo conservado (A16/F8) | ✅ | ✅ |
| Plancha con segundos y sin RIR (A11) | ✅ | ✅ |
| Guardar como parcial → aparece primero en Hoy → «Retomar lo pendiente» reabre la misma sesión con 20,5 kg (1 sesión, 1 activa) (A15) | ✅ | ✅ |
| Zancada atrás: «Demostración local pendiente» + página oficial de University of Wyoming; press de pecho: «Dos posiciones ilustradas · se alternan» + demostración externa con crédito NASM (A19) | ✅ | ✅ |
| Demostración local de Wikimedia Commons (sentadilla) cargada | ✅ | ✅ |
| Biblioteca de fuentes con alcance de consulta y artículo «RIR» | ✅ | ✅ |
| Service worker activo en `/App-ejercicios/sw.js` | ✅ | ✅ |
| Sin conexión: la app abre desde la caché (A23) | ✅ | no probado (limitación de Playwright con WebKit) |
| Casa sin material: día A con sentadilla, día B con zancada atrás, aviso de isquiosurales (A04) | ✅ | ✅ |
| Sin errores de página ni recursos propios fallidos | ✅ | ✅ |

En la primera pasada de Chromium hubo dos avisos de la comprobación, no de la app: la imagen de Commons se evaluó antes de terminar de cargar (con espera, carga en ~0,3 s) y una miniatura (`media/ek/sentadilla_barra-2.webp`) dio `net::ERR_FAILED` durante un cambio de pantalla; el archivo responde 200 (10,8 KB) y en la repetición completa no hubo ningún fallo (18/18).

**Enlaces externos (T1–T9):** desde esta sesión de desarrollo no se pudo abrir nasm.org, acefitness.org, uwyo.edu ni youtube.com (red no permitida; también con la herramienta de lectura web). Los enlaces se usan tal como los da la especificación y la app ofrece la página oficial y «anotar enlace caído» si alguno no abre.

---

# Registro anterior (versión 1.1)

Ejecución del **13 de noviembre de 2026** (versión 1.1).

## Comandos

```bash
npm run typecheck    # tsc -b --noEmit (app, tests y configuración)
npm test             # Vitest 3.2 + fake-indexeddb: motor, progresión, datos, copias, catálogo/medios
npm run build        # tipos + build de producción (Vite 7) + service worker (Workbox)
npm run e2e          # Playwright: levanta `npm run preview` y prueba la app construida
```

## Resultados

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ (JS principal ≈163 KB gzip + Dexie 36 KB + iconos 7 KB; precache de la app ≈868 KB; demos aparte, bajo demanda) |
| `npm test` | ✅ **73/73** (4 ficheros; `features.test.ts` cubre la versión 1.1: calorías, discos, calentamiento, preparación, días por músculo, récords, sesión pasada y cambio de fecha, **actualización de una base v1 a v2 sin pérdida**, copias con y sin fotos) |
| `npm run e2e` | ✅ **22/22** (iPhone 13; además iPhone SE y iPhone 15 Pro Max en las pruebas de diseño). `mejoras.spec.ts`: preparación baja → quitar series con deshacer, nota fija, récord en directo, resumen con récords y comparación, sesión pasada con calorías (240–340 kcal con 75 kg y 55 min) y cambio de fecha con registro, discos (62,5 kg = 20 + 1,25 por lado) y calentamiento, medidas, modo de sonido guardado tras recargar |
| **WebKit 26.6, versión 1.1** | ✅ **15/16** en `webkit-iphone-13` (1 omitida: la prueba sin conexión, ver abajo) |
| **Actualización 1.0 → 1.1 con datos** (servidor local en la subruta `/App-ejercicios/`) | ✅ En **Chromium y WebKit**: con la build de la 1.0 se crea perfil, rutina, sesión parcial («52,5 kg × 10») y peso (74,5 kg); se sustituye por la build 1.1, aparece «Hay una versión nueva de la app» → «Actualizar ahora» → la base pasa a la versión 20 de IndexedDB (esquema 2, 13 tablas), la sesión y el peso siguen ahí, el resumen se muestra y se puede anotar una medida. Sin errores |
| **Web publicada, versión 1.1** (13-11-2026, workflow ejecución 6) | ✅ En **Chromium y WebKit** (iPhone 13 emulado): script nuevo servido, «¿Cómo llegas hoy?», serie con «52,5» conservada tras recargar, descanso, resumen de sesión, ajustes de sonido y «Probar sonido» sin errores, medida guardada, «Último entrenamiento por músculo», demostraciones de Wikimedia Commons cargadas (24 archivos, todos 200), service worker activo, sin errores ni recursos fallidos |
| Build bajo subruta `/App-ejercicios/` (como en GitHub Pages) | ✅ comprobado a mano con servidor estático: service worker, manifiesto y demos cargan sin errores |
| GitHub Actions (`main`, ejecución 1) | ✅ job `build` en los servidores de GitHub: `npm ci`, 52 pruebas y build con `BASE=/App-ejercicios/`. ❌ job `deploy`: «Get Pages site failed» porque GitHub Pages aún no está activado (repositorio privado) |
| **WebKit 26.6** (Playwright, Linux) | ✅ **12/13** E2E en `webkit-iphone-13`. La prueba del caso 9 se omite en WebKit porque `context.setOffline()` de Playwright corta también las respuestas del service worker («internal error»). Sustituida por una comprobación con **desconexión real** (servidor apagado): la app recarga desde el service worker, se empieza una sesión, se escribe «40,5» y se conserva tras recargar ✅ |
| **Web publicada** (13-11-2026, https://breoganrozasr-web.github.io/App-ejercicios/) | ✅ Workflow «Publicar en GitHub Pages» (ejecución 3): build y deploy correctos. ✅ En **Chromium y WebKit** (iPhone 13 emulado): HTTP 200, manifiesto con `start_url` correcto, 3 iconos y `apple-touch-icon` 200, service worker activo en `/App-ejercicios/sw.js`, demostración animada cargada, perfil → rutina → sesión → «52,5» y serie hecha conservados tras recargar, sesión parcial guardada visible tras recargar, Progreso con 1 sesión, sin errores ni recursos fallidos. ✅ Sin conexión (Chromium): la app recarga desde el service worker y permite empezar una sesión |

### Casos obligatorios del encargo

| # | Caso | Dónde se prueba | Estado |
|---|---|---|---|
| 1 | Principiante, 3 días, gimnasio: rutina coherente, tiempo y frecuencia reales | `engine.test.ts` (Caso 1: patrones cubiertos, nivel, RIR ≥2, sin 1–5 rep, duración ≤ tiempo, frecuencia recalculada a mano desde el calendario), `flows.spec.ts` | ✅ |
| 2 | Casa sin material: nada de máquinas ni material oculto | `engine.test.ts` (generador y plantilla), `flows.spec.ts` | ✅ |
| 3 | Dos días y frecuencia 3: conflicto y alternativas | `engine.test.ts`, `flows.spec.ts` (interfaz) | ✅ |
| 4 | Sesiones consecutivas y domingo/lunes | `engine.test.ts` (solapamiento detectado, reducción de dosis, alternancia torso/pierna en L-M-J-V, elección de días espaciados) | ✅ |
| 5 | Cambiar ejercicio sin borrar historia ni copiar kg | `data.test.ts` (versión nueva, sesión intacta, sugerencia “primera vez” sin kg), `flows.spec.ts` (sustituir en sesión conserva lo hecho, deshacer) | ✅ |
| 6 | 3×8–12: 12/12/12 vs 12/10/8, progresión y redondeo | `progression.test.ts` (subida a 42,5 kg y vuelta a 8; 12/10/8 repite; sin RIR = opcional; fallo; rejilla de barra/mancuerna/máquina/polea; salto demasiado grande; incremento por ejercicio; sesión floja; vuelta tras pausa; molestia) | ✅ |
| 7 | Asistencia, unilateral, mancuernas por unidad, carga cero y coma decimal | `progression.test.ts` (parseo “12,5”, “0”, “1.234,5”; menos asistencia = progreso; récord = menor asistencia; mancuerna no duplicada; CSV con coma y lado), `flows.spec.ts` (escribir “52,5” en la interfaz) | ✅ |
| 8 | Empezar, registrar, cerrar/recargar y reanudar sin pérdida ni duplicados | `data.test.ts` (doble inicio concurrente → 1 sesión; reabrir base), `flows.spec.ts` (doble toque, recarga real, valores y descanso conservados, terminar parcial) | ✅ |
| 9 | Offline tras la primera carga; medios diferenciados | `offline-media.spec.ts` (service worker, modo sin conexión, empezar sesión, demo descargada visible, no descargada con aviso) | ✅ (Chromium) |
| 10 | Exportar/restaurar; archivo corrupto o incompatible no daña la base | `data.test.ts` (fusionar sin duplicar, reemplazar exacto, JSON roto, otra app, versión futura, fecha inválida, fallo a mitad → transacción deshecha, limpieza de texto, demo no exportada), `flows.spec.ts` (descarga real, archivo roto rechazado, fusión) | ✅ |
| 11 | Editar rutina, archivar, actualizar: sesiones pasadas intactas | `data.test.ts`, `flows.spec.ts` | ✅ (la actualización del service worker se ha revisado por diseño: `registerType: 'prompt'`, no recarga durante un entrenamiento y no toca IndexedDB; no hay prueba automática de una actualización real) |
| 12 | Reproductor fallido, URL rota, proveedor caído | `offline-media.spec.ts` (404 de medios → aviso y registro usable; YouTube solo online con enlace alternativo; enlace no https rechazado) | ✅ |
| 13 | Rutinas precargadas con medios de su variante y atribuciones | `data.test.ts` (91 ejercicios verificados con archivos existentes, licencia, atribución y origen; **todas las plantillas usan solo ejercicios con demostración verificada**) + revisión visual manual de cada demostración | ✅ |
| 14 | Navegación, teclado y barras en tamaños de iPhone, orientación y tema oscuro | `layout.spec.ts` en 3 tamaños: sin desbordes en 6 pantallas × claro/oscuro, objetivos táctiles ≥44 px, `inputmode` decimal/numérico, el campo enfocado queda por encima de la barra de descanso, horizontal | ✅ (emulación Chromium) |
| 15 | Generación repetida sin duplicados ni cambios aleatorios | `engine.test.ts` (perfiles y plantillas idénticos al regenerar; sin ejercicios repetidos en un día) | ✅ |

## Qué se ha comprobado y qué no

- **Emulación, no iPhone real.** Las pruebas de navegador usan **Chromium** y **WebKit 26.6 para Linux** (el motor de Safari, pero no Safari de iOS) con viewport, escala y agente de usuario de iPhone. **No se ha probado en un iPhone físico.** Para repetir con WebKit: `npx playwright install webkit && npx playwright install-deps webkit` y `PW_WEBKIT=1 npm run e2e -- --project=webkit-iphone-13`.
- Revisión visual: capturas reales de las pantallas (claro/oscuro, SE/13/15 Pro Max, horizontal) revisadas a mano; se corrigieron fallos detectados (fechas, textos duplicados, insignias recortadas, enlaces partidos, sugerencias demasiado largas). En la v1.1 se revisaron además «¿Cómo llegas hoy?», el resumen de sesión, la hoja de sesión pasada, Progreso (medidas, fotos, músculos) y los ajustes de sonido, en claro y oscuro (se acortó una etiqueta recortada y se ensanchó el campo de hora).
- **Sonido:** el código y la interfaz se prueban (el botón «Probar sonido» no da errores y el modo se guarda), pero **que suene con el iPhone en silencio no se puede comprobar en emulación**: depende de `navigator.audioSession` en Safari de iOS (17+).
- Contenido de la evidencia: verificado solo a nivel de resumen/buscador (ver docs/EVIDENCIA.md).

## Lista breve para verificar en tu iPhone (pendiente)

1. Abrir la URL en Safari → Compartir → Añadir a pantalla de inicio. Abrir desde el icono: a pantalla completa, sin barras de Safari, notch y barra inferior respetados.
2. Completar el perfil y empezar la sesión. Al tocar un campo de peso aparece el teclado **con coma**; escribir `12,5` y comprobar que se guarda como 12,5.
3. Marcar una serie: aparece el descanso. Bloquear el iPhone 1 minuto y volver: el tiempo restante es correcto (no se pausó). El sonido solo suena con la app abierta (es lo esperado).
4. Cerrar la app desde el multitarea a mitad de sesión y volver a abrir: “Continuar” con los datos intactos.
5. Ajustes → Demostraciones → Descargar las de mi rutina. Activar modo avión, cerrar y abrir la app: funciona; las demos descargadas se ven.
6. Ajustes → Exportar copia: se abre el menú Compartir; guardar en Archivos. Restaurar ese archivo con «Fusionar»: no duplica.
7. Ajustes → Almacenamiento: anotar si dice “persistente concedido” (Safari puede no concederlo; por eso las copias).
8. Girar a horizontal en el entrenamiento y en una demostración.
9. Activar Ajustes de iOS → Accesibilidad → Reducir movimiento: la demostración muestra las posiciones fijas con botón «Animar».
10. VoiceOver: recorrer una serie (debe leer “kg de la máquina, serie 1”, “Marcar serie 1 como hecha”).
11. **Sonido del descanso (v1.1):** con el interruptor de silencio activado y los cascos puestos, Ajustes → «Aviso al terminar el descanso: Siempre» → «Probar sonido»: deben oírse tres pitidos. Repetir con música sonando (puede pausarla) y probar «Con música» (no la para, pero en silencio no suena).
12. **Pantalla encendida (v1.1):** durante un entrenamiento, dejar el iPhone quieto más tiempo que el bloqueo automático: no debe apagarse. Al terminar o pausar, vuelve a bloquearse con normalidad.
13. **Fotos (v1.1):** Progreso → Activar fotos → Añadir foto: elegir cámara o fototeca; la foto aparece bien orientada y ocupa poco.
