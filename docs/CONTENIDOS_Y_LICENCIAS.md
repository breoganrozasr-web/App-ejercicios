# Contenidos, demostraciones y licencias

Fecha de comprobación: **13 de noviembre de 2026**. Manifiestos de medios: [`media-manifest.json`](media-manifest.json) (Everkinetic, generado por `scripts/build_media.py`) y [`media-manifest-commons.json`](media-manifest-commons.json) (Wikimedia Commons, generado por `scripts/build_commons_media.py`); copias de los de `src/domain/catalog/`.

## Versión 1.4 (15/11/2026): fichas nuevas, funciones y estados de las demostraciones

- **Cuatro fichas nuevas** (anexo C): peso muerto convencional con barra, hip thrust con barra, remo con mancuernas y pecho apoyado, remo de pie con banda y anclaje. Antes de crearlas se comprobó que no existía la misma variante con otro id (el catálogo tenía rumano con barra y mancuernas, puente en el suelo, remo a una mano y apertura posterior con banda: variantes distintas que no se fusionan). Textos de Forja basados en las guías del anexo; **no son una certificación profesional de técnica**.
- **Sin demostración**: Everkinetic no tiene estas variantes (se revisó la lista de sus 252 ejercicios: no hay peso muerto convencional, hip thrust, remo con pecho apoyado ni remo de pie con banda; «upright band rows» es un remo al cuello, otra variante). Los recursos externos localizados por la investigación (NASM barbell deadlift y su vídeo, vídeo de Renaissance Periodization de hip thrust, página de PureGym de incline row y vídeo de NASM de standing band row) **no se pudieron abrir desde el entorno de desarrollo** (sin conexión a esos dominios), así que **no se presentan en la app** como demostración: las fichas muestran «Demostración pendiente» y el texto. Quedan como candidatos para comprobar (que abren, que corresponden al movimiento, licencia) desde un entorno con acceso. No se ha descargado ni copiado nada de terceros.
- **Etiquetas**: las ilustraciones Everkinetic alternadas se llaman «Animación de posiciones: dos posturas · se alternan» (no es un vídeo continuo). Los recursos externos se presentan como «Vídeo externo · requiere conexión» o «Página externa · requiere conexión», y se cargan solo tras pulsar. Cada recurso externo separa cuatro estados: enlace (no comprobado desde Forja), variante (vinculada por la página oficial), licencia (solo enlace; sin permiso de redistribución revisado) y técnica (no revisada visualmente). Un fallo del vídeo no impide registrar.
- **Demostraciones locales pendientes (lista vigente)**: flexiones con rodillas apoyadas, flexiones inclinadas, prensa sentada (horizontal) y zancada atrás sin peso siguen con demostración externa (T4–T6, T9), más las cuatro fichas nuevas sin ninguna. Commons respondió «demasiadas peticiones» (429) desde el entorno, así que no se buscó de nuevo; no se publica material sin licencia comprobada.
- **Fichas revisadas en esta entrega**: las 49 usadas por las 26 plantillas. Se añadieron «tres claves» a las 38 que no las tenían y la sección «Qué aporta» (función por patrón, anexo D1: press frente a apertura, tirón vertical frente a horizontal, flexión/abducción/abducción horizontal del hombro, extensión de rodilla, flexión de rodilla frente a bisagra, glúteo y abducción, flexión/extensión de codo, gemelo de pie y sentado, tronco dinámico frente a por tiempo). No se copió el mismo párrafo a las 99 fichas; las fichas no usadas por plantillas conservan su texto anterior. Ningún experto humano ha revisado cada movimiento.
- **Sustituciones con motivo**: primero la misma función con tu material; las que cambian de patrón lo dicen (p. ej. el rumano frente al curl femoral: «bisagra de cadera en lugar de flexión de rodilla; revisa la cobertura de isquios»). Los kg nunca se trasladan.
- **Aprender**: 9 textos nuevos del apartado 5 con fuentes F y nivel de certeza; biblioteca con F01–F21 y su tabla de equivalencias (docs/EVIDENCIA.md).

## Versión 1.3 (15/11/2026): textos de técnicas y fases

- **Aprender** pasa de 7 a 11 textos. Los nuevos («Series descendentes», «Rest-pause», «Superseries» y «Fases del programa») empiezan con los **textos de ayuda literales** del encargo del 14/11/2026 y añaden un resumen de sus conclusiones (sin atribuir a los estudios la validación de las cifras de Forja). Los mismos textos aparecen en el botón «Qué es» de cada bloque o superserie durante el entrenamiento y en la pantalla «Tu programa».
- **Fuentes R1–R5** (Sødal 2023, Zhang 2025, Cowley 2026, Enes 2021, Tsartsapakis 2026) en la biblioteca de fuentes, con el alcance de consulta tal como se declaró (resumen; resumen, métodos y secciones del texto abierto). Los enlaces no se pudieron abrir desde el entorno de desarrollo (red restringida): se usan tal como los da el encargo.
- No se ha añadido ningún medio nuevo ni se han generado vídeos o animaciones.

## Versión 1.2 (14/11/2026): demostraciones externas, etiquetas y fichas en dos niveles

### Etiquetas honestas del tipo de demostración (F6)
Cada demostración local lleva su etiqueta: **«Dos posiciones ilustradas · se alternan»** (82 ejercicios: dos dibujos alternados, no un movimiento continuo), **«N posiciones ilustradas»** (2), **«Animación continua»** (5 animaciones GIF de Wikimedia Commons), **«Imagen»** (1, plancha frontal). Los vídeos externos se etiquetan como vídeo y solo se cargan al tocar.

### Demostraciones externas (requieren internet)
Fuentes técnicas indicadas en la especificación del 14/11/2026, asociadas al **id exacto** del ejercicio (prueba A19 en `tests/unit/data.test.ts`). En la ficha y durante la sesión aparece **«Ver demostración · requiere internet»** con autor, enlace a la página oficial y, si la página enlaza un vídeo, el reproductor oficial de YouTube en modo de privacidad mejorada, cargado solo al tocar (sin reproducción automática). No se descargan, no se reexportan ni se guardan para uso sin conexión; no se generan vídeos con IA. Si no abre, se ofrece la página oficial y el texto, y se puede **anotar el enlace caído** (solo en el dispositivo; no se sustituye por otra variante).

| Código | Ejercicio (id) | Fuente | Vídeo enlazado por la página |
|---|---|---|---|
| T1 | Press de pecho en máquina (`press_pecho_maquina`) | NASM · Chest Press Machine | youtube.com/watch?v=lRo9zZ7EwpM |
| T2 | Peso muerto rumano con mancuernas (`peso_muerto_rumano_mancuernas`) | NASM · Dumbbell Romanian Deadlift | youtube.com/watch?v=V8Hdl1FiNt4 |
| T3 | Curl femoral sentado (`curl_femoral_sentado`) | NASM · Seated Leg Curl | youtube.com/watch?v=_2Kd0d-JEUM |
| T4 | Prensa sentada (`prensa_sentada`, nuevo) | ACE · Seated Leg Press | — (página con imágenes) |
| T5 | Flexiones inclinadas, manos elevadas (`flexiones_inclinadas`) | NASM · Incline Push-up | youtube.com/watch?v=0JUrOH--Kdk |
| T6 | Flexiones con rodillas apoyadas (`flexiones_rodillas`, nuevo) | ACE · Bent-knee Push-up | — (página con imágenes) |
| T7 | Puente de glúteo en el suelo (`puente_gluteo`) | NASM · Floor Bridge | youtube.com/watch?v=Z3cY3d3BBo4 |
| T8 | Plancha frontal (`plancha_frontal`) | ACE · Front Plank | — (página con imágenes) |
| T9 | Zancada atrás con peso corporal (`zancada_atras_peso_corporal`) | University of Wyoming Campus Recreation · Exercise Video Library | youtube.com/watch?v=gd1a7i7-CMY («Backward Lunge») |

**Comprobación de enlaces:** desde el entorno de desarrollo **no se pudo abrir ninguno** de estos dominios (nasm.org, acefitness.org, uwyo.edu y youtube.com están fuera de la red permitida de la sesión; también fallaron con la herramienta de lectura web). Los enlaces se incorporan tal como los da la especificación, cuyas fuentes oficiales vinculan esos vídeos a esos ejercicios. **No se ha hecho una revisión fotograma a fotograma ni se tiene permiso de redistribución**: por eso solo se enlazan.

### Fichas: contenido enriquecido, estructura migrada y demostraciones pendientes
- **Contenido enriquecido (9 fichas)** con la redacción de la especificación: tres claves para la sesión y «Aprender este ejercicio» (preparación y ejecución, variantes, avisos de alcance y fuente): press de pecho en máquina, rumano con mancuernas, curl femoral sentado, prensa sentada, flexiones con manos elevadas, flexiones con rodillas apoyadas, puente de glúteos en suelo, plancha frontal y zancada atrás sin carga.
- **Estructura migrada (86 fichas):** el resto del catálogo usa la estructura común (cómo se hace, errores, variantes, músculos con su peso en el cómputo, qué carga anotar) con **su contenido anterior**. No se ha hecho una revisión técnica exhaustiva ni se han inventado detalles de variantes no cubiertas; la ficha lo indica («estructura común: contenido de Forja anterior, sin revisión técnica nueva»).
- **Demostración local pendiente (4):** zancada atrás con peso corporal, flexiones inclinadas, flexiones con rodillas apoyadas y prensa sentada. Las cuatro tienen **referencia externa** (T9, T5, T6, T4); **no están disponibles sin conexión**. La zancada atrás ya no usa una zancada al frente como «referencia aproximada».
- La prensa existente («Prensa de piernas», ilustración de prensa inclinada de 45°) conserva su ficha; la de prensa sentada no se usa como manual de prensas inclinadas con seguros diferentes.

## Resultado (v1.1, con la actualización de cifras de la 1.2)

| | Cantidad | Tipo | Sin conexión |
|---|---|---|---|
| Ejercicios del catálogo | 95 (93 anteriores + flexiones con rodillas apoyadas y prensa sentada) | — | Fichas, instrucciones y errores: siempre |
| Con **animación de muñeco verificada** (Everkinetic) | **84** | Dibujo lineal en 2–4 posiciones, animado alternando fotogramas (pausa, paso a paso, velocidad 0,5×/1×/1,5×) | Sí, tras descargarlas (Ajustes → Demostraciones) o tras verlas una vez con conexión |
| Con **animación verificada de Wikimedia Commons** | **7** | Silueta animada (sentadilla), dibujo fijo (plancha, isométrico) y animaciones a color de los CDC (sentadilla a silla, zancada con apoyo, subida a escalón, gemelos, flexiones en pared) | Igual que las anteriores |
| Con **demostración local pendiente** | **4** | Zancada atrás con peso corporal, flexiones inclinadas, flexiones con rodillas apoyadas, prensa sentada | Instrucciones escritas + demostración EXTERNA (requiere internet). Se usan en «Casa sin material» y «Parque» con aviso. |
| Vídeos reales incluidos | 0 | — | — |
| Vídeos externos (YouTube) | Solo los que añada la persona en ejercicios propios | Reproductor oficial en modo privacidad mejorada | **No** (solo con conexión; no se descargan) |

Ninguna demostración se ha generado con IA ni se ha usado un muñeco genérico para varios movimientos: cada ejercicio usa los dibujos de su variante.

## Verificación de variantes

Cada par de ilustraciones se revisó a mano en hojas de contactos. Se **descartaron** las que no correspondían o no demostraban el movimiento (lista también en el manifiesto, campo `excluded`):

| Original Everkinetic | Motivo |
|---|---|
| `t-bar-rows` | El dibujo no corresponde (muestra un encogimiento sobre fitball). |
| `hack-squat-machine` | Fotogramas prácticamente idénticos. |
| `barbell-dead-lifts` | Posición baja con espalda redondeada: no sirve como referencia técnica. |
| `one-leg-squat-with-barbell`, `single-leg-squat-with-barbell` | Variante no confirmable. |
| `rear-lunges-with-dumbbell` | Idéntico a la zancada al frente. |
| `standing-triceps-extension` | Muestra cable/banda aunque los datos dicen mancuerna. |
| `tricep-dips-using-body-weight` | Muestra la máquina asistida. |
| `upright-band-rows` | Es un remo al mentón, no un remo de espalda. |

Notas de variante aplicadas (visibles en la ficha): `chest-dips` se usa como **fondos en máquina asistida**; `rear-deltoid-row-dumbbell` se usa como **remo a una mano apoyado** (el dibujo lo muestra así); `dumbbell-dead-lifts` como **peso muerto rumano con mancuernas**; `wide-grip-lat-pull-down` comprobado ampliando el fotograma (barra por delante de la cara). Los ejercicios de gemelos y la plancha lateral tienen fotogramas casi iguales por naturaleza (movimiento pequeño o isométrico) y se indica en la ficha.

## Fuentes evaluadas

| Fuente | Titular | Licencia de los medios | ¿Empaquetar/offline? | Decisión |
|---|---|---|---|---|
| **Everkinetic** — https://github.com/everkinetic/data (commit `446bb9a3`) | Everkinetic, Greg Priday (coautor en package.json: Frank Paczynski) | **CC BY-SA 4.0** (LICENSE.md y package.json del repositorio). Copias antiguas en Wikimedia Commons/Open Training: CC BY-SA 3.0 (compatible) | Sí, con atribución y misma licencia para las adaptaciones | ✅ **Fuente principal** |
| wger — https://github.com/wger-project/wger | wger project | Código AGPL; datos y medios con licencia **por entrada** (CC BY-SA 3/4, CC BY 4, CC0) | Sí según cada licencia | 🟡 Complemento futuro (wger.de bloqueado en esta sesión; no usado) |
| AscendAPI / ExerciseDB — https://ascendapi.com, https://github.com/ExerciseDB/exercisedb-api | AscendAPI | Código AGPL, **medios propietarios**; términos prohíben almacenar/cachear (vía buscador) | No | ❌ No usar |
| yuhonas/free-exercise-db y wrkout/exercises.json | yuhonas / wrkout | Repos “Unlicense”, pero el upstream declara que las fotos se tomaron de internet sin derechos | No | ❌ No usar las imágenes |
| YouTube (incrustación) — https://developers.google.com/youtube/player_parameters, https://developers.google.com/youtube/terms/developer-policies | Google / autor del vídeo | Términos de YouTube | **No** (prohibido descargar o cachear) | 🟡 Enlaces que añada la persona y vídeos de las fuentes técnicas T1–T9: solo online, reproductor oficial al tocar |
| NASM, ACE, University of Wyoming (fuentes técnicas T1–T9) | NASM · ACE · University of Wyoming Campus Recreation | Contenido de terceros, sin permiso de redistribución | **No** | 🟡 Solo enlace externo con autor (requiere internet); texto de las fichas original de Forja |
| Wikimedia Commons — https://commons.wikimedia.org | Autor de cada fichero | Por fichero (comprobada con la API `extmetadata` de cada ficha) | Sí según ficha | ✅ **Usada para 7 ejercicios de peso corporal** (ver abajo) |
| Darebee | Darebee | CC BY-NC-ND y prohíbe uso en apps | No | ❌ |

## Cómo se cumple cada licencia

- **Everkinetic (CC BY-SA 4.0):** atribución en cada demostración (pie del reproductor: autor, fuente, licencia, enlace), pantalla Ajustes → Créditos y licencias, manifiesto con `author`, `license`, `licenseUrl`, `sourceFiles` (URL de cada archivo original con commit), `modifications` y `checkedAt`. Texto completo de la licencia en `public/LICENSES/CC-BY-SA-4.0-everkinetic.md`. Las adaptaciones (escala de grises, WebP, animación, inversión en tema oscuro) se distribuyen bajo la misma licencia. La licencia del código de la app (MIT) es independiente.
- **Wikimedia Commons:** cada demostración lleva en su pie autor, licencia, enlace a la ficha de Commons y las modificaciones; también en Ajustes → Créditos y en el manifiesto (`author`, `license`, `licenseUrl`, `sourceUrl`, `sourceFiles`, `modifications`, `checkedAt`, `verification`).
  - «Squats.gif», de **Wensceslao**, **CC BY-SA 4.0** → sentadilla con peso corporal. Adaptación: colores invertidos (silueta oscura), recorte, 1 de cada 3 fotogramas, WebP; se distribuye con la misma licencia.
  - «Plank exercise.svg», de **Pk0001**, **CC BY-SA 4.0** → plancha frontal (imagen fija: es un ejercicio isométrico). Adaptación: renderizado a WebP; misma licencia.
  - Animaciones de los **CDC de EE. UU.** («Growing Stronger – Strength Training for Older Adults»), **dominio público** (obra del Gobierno federal de EE. UU., plantilla PD-USGov-HHS-CDC) → sentadilla hacia una silla, zancada con apoyo, subida a escalón, elevación de talones y flexiones en la pared. Adaptación: fotogramas extraídos a WebP con sus tiempos originales. Se cita la fuente aunque no sea obligatorio.
- **YouTube:** reproductor oficial en `youtube-nocookie.com` con `playsinline=1`, cargado solo al pulsar (patrón “fachada”), tamaño ≥200 px, sin superposiciones, enlace “Ver en YouTube” siempre visible como alternativa, política de referer `strict-origin-when-cross-origin`. El service worker **no** cachea nada de YouTube.
- **Contenido propio:** imágenes (≤2 MB, PNG/JPEG/WebP/GIF) guardadas en el dispositivo e incluidas en las copias; enlaces https validados. Marcado como “Contenido propio”.

## Descarga selectiva

Ajustes → Demostraciones sin conexión: “Descargar las de mi rutina (tamaño)”, “Descargar todo el catálogo (≈2 MB)”, tamaño ocupado y “Borrar demostraciones descargadas”. Caché `forja-demos-v1`. El catálogo y las rutinas no dependen de ningún proveedor externo en ejecución: todo va empaquetado.

## Fotos de progreso (contenido de la persona)

Las fotos de progreso son opcionales (desactivadas por defecto), se comprimen en el propio dispositivo (JPEG, lado largo ≤ 1280 px), se guardan solo en IndexedDB y **no** van en las copias salvo que se marque al exportar. No se envían a ningún servidor.

## Pendiente real

- **Demostración local** de 4 variantes (zancada atrás con peso corporal, flexiones inclinadas, flexiones con rodillas apoyadas, prensa sentada): no hay ilustración con licencia verificada. Tienen demostración externa (requiere internet). Para resolverlo: buscar ficheros con licencia clara de esas variantes exactas (p. ej. en Wikimedia Commons), verificar licencia y variante a mano y añadirlos con un script equivalente a `scripts/build_commons_media.py`.
- **Comprobar los enlaces externos T1–T9** desde un entorno con acceso a nasm.org, acefitness.org, uwyo.edu y youtube.com (no fue posible en esta sesión). Si alguno no abre, la app ya ofrece la página oficial y permite anotar el enlace caído.
- **Revisión técnica** de las 86 fichas con estructura migrada: no se ha hecho; conservan su contenido anterior.
