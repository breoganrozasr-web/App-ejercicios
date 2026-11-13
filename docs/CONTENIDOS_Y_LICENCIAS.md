# Contenidos, demostraciones y licencias

Fecha de comprobación: **13 de noviembre de 2026**. Manifiesto de medios: [`media-manifest.json`](media-manifest.json) (copia de `src/domain/catalog/media-manifest.json`, generado por `scripts/build_media.py`).

## Resultado

| | Cantidad | Tipo | Sin conexión |
|---|---|---|---|
| Ejercicios del catálogo | 88 | — | Fichas, instrucciones y errores: siempre |
| Con **animación de muñeco verificada** (Everkinetic) | **84** | Dibujo lineal en 2–4 posiciones, animado alternando fotogramas (pausa, paso a paso, velocidad 0,5×/1×/1,5×) | Sí, tras descargarlas (Ajustes → Demostraciones) o tras verlas una vez con conexión |
| Con **demostración pendiente** | **4** | Sentadilla con peso corporal, zancada atrás con peso corporal, plancha frontal, flexiones inclinadas | Instrucciones escritas + referencia aproximada marcada como “otra variante” |
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
| Wikimedia Commons (animaciones y vídeos CC/PD) | Autor de cada fichero | Por fichero (CC BY-SA 4.0, CC BY 3.0, dominio público CDC…) | Sí según ficha | 🟡 Candidata para cubrir los 4 pendientes (host bloqueado en esta sesión) |
| Darebee | Darebee | CC BY-NC-ND y prohíbe uso en apps | No | ❌ |

## Cómo se cumple cada licencia

- **Everkinetic (CC BY-SA 4.0):** atribución en cada demostración (pie del reproductor: autor, fuente, licencia, enlace), pantalla Ajustes → Créditos y licencias, manifiesto con `author`, `license`, `licenseUrl`, `sourceFiles` (URL de cada archivo original con commit), `modifications` y `checkedAt`. Texto completo de la licencia en `public/LICENSES/CC-BY-SA-4.0-everkinetic.md`. Las adaptaciones (escala de grises, WebP, animación, inversión en tema oscuro) se distribuyen bajo la misma licencia. La licencia del código de la app (MIT) es independiente.
- **YouTube:** reproductor oficial en `youtube-nocookie.com` con `playsinline=1`, cargado solo al pulsar (patrón “fachada”), tamaño ≥200 px, sin superposiciones, enlace “Ver en YouTube” siempre visible como alternativa, política de referer `strict-origin-when-cross-origin`. El service worker **no** cachea nada de YouTube.
- **Contenido propio:** imágenes (≤2 MB, PNG/JPEG/WebP/GIF) guardadas en el dispositivo e incluidas en las copias; enlaces https validados. Marcado como “Contenido propio”.

## Descarga selectiva

Ajustes → Demostraciones sin conexión: “Descargar las de mi rutina (tamaño)”, “Descargar todo el catálogo (≈2 MB)”, tamaño ocupado y “Borrar demostraciones descargadas”. Caché `forja-demos-v1`. El catálogo y las rutinas no dependen de ningún proveedor externo en ejecución: todo va empaquetado.

## Pendiente real

Las 4 variantes de peso corporal sin demostración verificada (afectan a las plantillas “Casa sin material” y “Parque / calistenia”, que lo avisan). Para resolverlo: con acceso a commons.wikimedia.org, revisar las fichas de *Category:Fitness animations* (p. ej. CC BY-SA 4.0) o vídeos CDC de dominio público, verificar licencia y variante, añadirlos con `scripts/build_media.py` (o un script equivalente) y cambiar `demo: 'pendiente'` en el catálogo.
