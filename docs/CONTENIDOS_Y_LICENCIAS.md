# Contenidos, demostraciones y licencias

Fecha de comprobación: **13 de noviembre de 2026**. Manifiestos de medios: [`media-manifest.json`](media-manifest.json) (Everkinetic, generado por `scripts/build_media.py`) y [`media-manifest-commons.json`](media-manifest-commons.json) (Wikimedia Commons, generado por `scripts/build_commons_media.py`); copias de los de `src/domain/catalog/`.

## Resultado

| | Cantidad | Tipo | Sin conexión |
|---|---|---|---|
| Ejercicios del catálogo | 93 | — | Fichas, instrucciones y errores: siempre |
| Con **animación de muñeco verificada** (Everkinetic) | **84** | Dibujo lineal en 2–4 posiciones, animado alternando fotogramas (pausa, paso a paso, velocidad 0,5×/1×/1,5×) | Sí, tras descargarlas (Ajustes → Demostraciones) o tras verlas una vez con conexión |
| Con **animación verificada de Wikimedia Commons** | **7** | Silueta animada (sentadilla), dibujo fijo (plancha, isométrico) y animaciones a color de los CDC (sentadilla a silla, zancada con apoyo, subida a escalón, gemelos, flexiones en pared) | Igual que las anteriores |
| Con **demostración pendiente** | **2** | Zancada atrás con peso corporal, flexiones inclinadas | Instrucciones escritas + referencia aproximada marcada como “otra variante” (zancada con apoyo / flexiones en pared). No se usan en ninguna plantilla. |
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
| YouTube (incrustación) — https://developers.google.com/youtube/player_parameters, https://developers.google.com/youtube/terms/developer-policies | Google / autor del vídeo | Términos de YouTube | **No** (prohibido descargar o cachear) | 🟡 Solo para enlaces que añada la persona, a petición y online |
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

Quedan 2 variantes sin demostración verificada: **zancada atrás con peso corporal** y **flexiones inclinadas**. Ya no se usan en ninguna plantilla (se sustituyeron por zancada con apoyo y flexiones en la pared, que sí tienen demostración). En Commons no se encontró un fichero con licencia clara que mostrara exactamente esas variantes; se mantienen con instrucciones escritas y referencia aproximada marcada como tal.
