# Formato de la copia de seguridad

Archivo JSON (UTF-8) exportado desde Ajustes → Copias de seguridad → Exportar copia completa. Nombre: `forja-copia-AAAA-MM-DD.json`.

```json
{
  "format": "forja-backup",
  "formatVersion": 4,
  "schemaVersion": 3,
  "appVersion": "1.5.0",
  "exportedAt": "2026-11-13T18:00:00.000Z",
  "tables": {
    "profile": [ ... ],
    "routines": [ ... ],
    "routineVersions": [ ... ],
    "overrides": [ ... ],
    "sessions": [ ... ],
    "bodyweight": [ ... ],
    "changelog": [ ... ],
    "customExercises": [ ... ],
    "exerciseSettings": [ ... ],
    "userMedia": [ ... ],
    "measurements": [ ... ],
    "photos": [ ... ],          // solo si se marca «Incluir fotos de progreso»
    "meta": [ ... ]
  }
}
```

Los tipos de cada registro están en `src/domain/types.ts`. Puntos clave:

- **Sesión** (`sessions`): `status` = `completed` | `partial` | `active`; `date` = `AAAA-MM-DD` local; cada ejercicio guarda una **copia** de su prescripción (`prescription`), del nombre (`nameSnapshot`) y del tipo de carga (`loadTypeSnapshot`), así el historial no cambia si se edita o borra la rutina.
- **Serie** (`sets[]`): `kind` (`warmup`/`work`), `weightKg`, `reps`, `rir` (null = no anotado), `durationSec`, `distanceM`, `assistKg`, `addedKg`, `bandLabel`, `side`, `completed`.
- **Significado de `weightKg`** según `loadTypeSnapshot`: `barbell_total` = barra + discos; `dumbbell_each` = una mancuerna; `machine`/`cable` = lo que marca esa máquina; en `assisted` la asistencia va en `assistKg` (más asistencia = más fácil); en `bodyweight` el lastre va en `addedKg`.
- **Campos de sesión añadidos en el esquema 2** (opcionales): `readiness` (`{ sleep, energy, soreness, at }`, escalas 1–5; `null` = se omitió), `backdated` (registrada a posteriori) y `manualDurationMin` (duración declarada).
- **Campos opcionales nuevos de la app 1.2 / motor 2** (mismo esquema 2: no cambian las tablas ni los índices; las copias anteriores se importan igual y sus valores originales se conservan aunque ahora se interpreten distinto):
  - Prescripción: `unit` (`reps` | `time` | `distance`; sin valor = dato antiguo, se deduce del ejercicio) y `reference` (ejercicio de referencia de fuerza).
  - Ejercicio de rutina: `optional` (accesorio opcional).
  - Versión de rutina: `familiarization` (`{ sessions, reason }`, por sesiones completadas; las versiones antiguas siguen usando `rampWeeks`) y `plan` (`{ engineVersion, goal, level, desiredFrequency, targetRegions, references, minutes }` para reproducir la propuesta).
  - Sesión: `partialAction` (`resume` | `next` | `repeat`) y `familiarization` (`{ index, total }`).
  - Serie: `effort` (esfuerzo percibido 0–10 en isométricos; no es RIR). El RIR antiguo de planchas se conserva como dato legado.
  - Perfil: `priorityRegions`, `frequencyExtraRegions`, `strengthRefs` (hasta 3) y `returningAdaptation`.
  - `meta.brokenLinks`: enlaces externos que la persona marcó como caídos.
- **Formato 2 (app 1.3, ampliación de técnicas y fases)**: mismo esquema de base de datos 2 (no cambian tablas ni índices). Es **aditivo**: las copias de formato 1 se restauran igual (una serie sin `method` es una serie convencional). Una app anterior a la 1.3 **rechaza** las copias de formato 2 («copia de una versión más nueva») en lugar de malinterpretar los bloques.
  - Serie (`sets[]`): `method` (`drop` | `rest_pause`; sin valor = convencional; nunca es un tipo de calentamiento: `kind` sigue siendo `warmup`/`work`) y `block` con `{ plannedSegments, segments[], nextStartedAt, ended (complete|early|null), target, origin (routine|reorganize|extend), replaces, draft? }`. En un bloque, `weightKg`/`reps` de la serie quedan **vacíos**: lo real está en `segments[]`, un tramo por elemento: `{ id, weightKg, assistKg?, addedKg?, reps, rir, pauseSec (pausa real antes del tramo; null en el inicial), suggestedKg?, completedAt }`. 40 kg × 10 → 30 kg × 8 son **dos tramos**, nunca 40 × 18. `target` guarda los objetivos por separado: `{ firstRepMin, firstRepMax, nextRepMin, nextRepMax, rirMin, rirMax, pauseSec? (rest-pause), dropPct? (descendente) }`.
  - Ejercicio de rutina: `technique` `{ method, mode (reorganize|extend), extra (1|2) }` (la elección queda en la versión de rutina).
  - Sesión: `rest.kind` (`rest` | `transition` | `round` | `short`) y `rest.label`; `familiarization.reason` (`readaptation` | `extended`).
  - `meta.program` (estado del programa): `{ progressionSince?, review? { decision, on, validDaysAt }, extendLearning?, readaptation? { lastValidBefore, decision, on, sessions }, techniquesConsent?, knownExercises? { <id>: { at, basis (history|prior) } }, seen?, log? [{ at, text }] }`. La fase Aprendizaje no se guarda: se deriva de la familiarización de la rutina y del historial.
- El **diario local de guardado** (`localStorage`, claves `forja-wal:<id>`) no forma parte de la copia: solo protege la sesión activa ante una recarga brusca y se borra al guardarse en IndexedDB.
- **Medidas** (`measurements`): `{ id, date, site, cm }`; `site` = `waist` | `hips` | `chest` | `arm` | `thigh` | `calf` | `neck`.
- **Fotos de progreso** (`photos`): `{ id, date, pose (front|side|back), dataUrl (JPEG en base64), bytes, width, height, createdAt }`. **Solo se exportan si se pide** (casilla al exportar); si la tabla no aparece en el archivo, la copia no lleva fotos.
- **Ajustes por ejercicio** (`exerciseSettings`): `incrementKg`, `restSec` y `note` (nota fija que se ve al entrenar).
- **Rutinas versionadas**: `routines.currentVersionId` apunta a `routineVersions`; las versiones antiguas se conservan.
- No se exportan: datos de ejemplo (`isDemo`), claves locales del dispositivo (fecha de última copia, persistencia), demostraciones descargadas de terceros (se pueden volver a descargar).
- Sí se exportan las imágenes propias de ejercicios creados por la persona (data URL en `userMedia`).

## Versión 3 (app 1.4, 15/11/2026)

Aditiva sobre la 2. Novedades:
- Ejercicios nuevos del catálogo: `peso_muerto_convencional`, `hip_thrust_barra`, `remo_pecho_apoyado`, `remo_banda_anclaje` (y material `band_anchor`).
- `routineVersions[].plan.template` = `{ id, code, version, contentVersion }` y `plan.muscleMap` = `'v2'` en las rutinas creadas desde una plantilla 1.4. Sin `muscleMap`, el mapa se deduce de `engineVersion` (≤ 2.1 → mapa 1).
- `routineVersions[].days[].exercises[].origin` = `{ base: { templateId, templateVersion, sets, repMin, repMax, timeMinSec?, timeMaxSec? }, adaptations?: [{ kind, text, at }], role?: 'strength' | 'complement' }`.
- `sessions[].corrections` = `[{ id, at, changes: [{ exerciseUid, setId, segmentId?, field, from, to }], undoneAt? }]`: valores anteriores de cada corrección (para deshacer).
- `sessions[].tolerance` = `{ difficulty?: 'easy' | 'normal' | 'hard' | 'very_hard', limitingDiscomfort?: boolean, enoughTime?: boolean }`.
- `profile.splitPref` y meta `favoriteTemplates` / `adoptionDismissed`.

Las copias 1 y 2 se restauran igual (sin estos campos). **Una app 1.3 o anterior rechaza la versión 3** («copia de una versión más nueva») en lugar de interpretar mal ejercicios o el mapa que no conoce. La restauración sigue siendo transaccional: si la validación falla, no se escribe nada.

## Versión 4 (app 1.5, esquema 3, 15/11/2026)

Aditiva sobre la 3. Novedades:
- `profile.experience` (`beginner` | `intermediate` | `advanced` | `unconfirmed`) y `profile.continuity` (`regular` | `returning` | `not_started` | `unconfirmed`). `profile.level` se conserva como **nivel efectivo del motor** derivado de la experiencia (principiante → `beginner`; intermedio y avanzado → `intermediate`; sin confirmar → `returning`). «Avanzado» no añade series.
- **Esquema Dexie 3** (sin tablas ni índices nuevos): migración transaccional del perfil desde cero → principiante + continuidad sin confirmar; intermedio → intermedio + sin confirmar; vuelvo → experiencia sin confirmar + «vuelvo tras una pausa». No se regeneran rutinas ni se tocan sesiones. **Al restaurar una copia 1–3**, el perfil se migra igual.
- Prescripción (en rutinas y en la copia que guarda cada sesión): `setGroups?: [{ id, label ('principal' | 'complementaria' | null), count, repMin, repMax, rirMin, rirMax, restSec }]` (objetivos por serie; el `id` es estable y la progresión se calcula por grupo). Serie: `groupId?`.
- Ejercicio de sesión: `plannedIndex?` (orden planificado), `movedLater?` («Hacer después») y `equipmentContext?` (material o máquina concreta usada ese día: «Polea A»). Ajustes por ejercicio: `contexts?` (materiales guardados). La sugerencia de carga solo compara el mismo contexto; sin contexto se usa la clave antigua.
- `meta.favoriteExercises` (ejercicios favoritos). `meta.program.readaptation`: decisión `trained_outside` («he entrenado fuera de Forja»), `manual?` (vuelta preparada a mano con «Preparar mi vuelta») y `endReviewed?`.
- Las notas siguen en dos sitios: `exerciseSettings.note` (para próximas veces) y `sessions[].exercises[].note` / `sessions[].note` (solo esa sesión).

Las copias 1, 2 y 3 se restauran igual. **Una app 1.4 o anterior rechaza la versión 4** («copia de una versión más nueva») en lugar de importar un perfil o unos grupos degradados. Contenido derivado que se recalcula (no se guarda): mapa anatómico de cada ejercicio, reparto muscular planificado/realizado, nivel efectivo si faltara.

## Restauración

1. Se aceptan copias de los esquemas 1, 2 y 3 y de los formatos de copia 1 a 4. Se valida tamaño (≤ 100 MB), JSON, `format`, versiones (no se aceptan copias de versiones más nuevas), identificadores y estructura de sesiones/rutinas.
2. Se limpian caracteres de control y claves peligrosas (`__proto__`…). Las imágenes deben ser `data:image/(png|jpeg|webp|gif);base64`.
3. Vista previa: número de sesiones, rango de fechas, rutinas, registros que ya existen.
4. Modos:
   - **Fusionar**: añade lo que no existe; si un registro existe en ambos lados se queda el más reciente (`updatedAt`), nunca se duplica (las claves son estables). Una sesión activa local no se sobrescribe.
   - **Reemplazar**: borra los datos actuales y carga los de la copia. Excepción: si la copia **no incluye** la tabla de fotos, las fotos del dispositivo se conservan (para no perderlas por exportar sin ellas).
5. Todo ocurre en **una transacción**: si algo falla, la base queda exactamente como estaba.

## CSV de registros

1.5 añade al final `grupo_prescripcion` (`principal`, `complementaria` o vacío), `objetivo_serie` (p. ej. `4–6 · RIR 2–3 · 180 s`, el objetivo del grupo de esa serie) y `contexto_material` (p. ej. `Rack 2`). Las columnas anteriores no cambian de orden ni de significado.

1.4 añade al final las columnas `rango_prescrito` (p. ej. `4–6` o `15–30 s`: contexto de prescripción), `corregida` (`sí` si la serie o el bloque tiene una corrección vigente) y `dificultad_sesion` (si se anotó).


`forja-registros-AAAA-MM-DD.csv`, separador `;`, coma decimal, BOM UTF-8 (abre bien en Excel/Numbers en español). Una fila por serie: fecha, sesión, estado, ejercicio, id, tipo de carga, significado del peso, tipo de serie, nº de serie, peso, repeticiones, RIR, segundos, distancia, asistencia, lastre, banda, lado, completada, molestia, notas. Los textos que empiezan por `=`, `+`, `-` o `@` se escapan para evitar fórmulas.

Desde la app 1.3 se añaden **al final** (para no romper hojas existentes) las columnas `metodo` (convencional, descendente, rest-pause), `id_bloque`, `tramo` (0 = inicial), `pausa_s`, `estado_bloque` (completo, terminado antes de tiempo, sin terminar) y `superserie` (identificador de la pareja). Un bloque especial ocupa **una fila por tramo**, todas con el mismo `id_bloque` y `n_serie`, cada una con su carga, repeticiones, RIR y pausa reales. No hay importación de CSV (la copia JSON es la que se restaura).
