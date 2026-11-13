# Formato de la copia de seguridad

Archivo JSON (UTF-8) exportado desde Ajustes → Copias de seguridad → Exportar copia completa. Nombre: `forja-copia-AAAA-MM-DD.json`.

```json
{
  "format": "forja-backup",
  "formatVersion": 1,
  "schemaVersion": 1,
  "appVersion": "1.0.0",
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
    "meta": [ ... ]
  }
}
```

Los tipos de cada registro están en `src/domain/types.ts`. Puntos clave:

- **Sesión** (`sessions`): `status` = `completed` | `partial` | `active`; `date` = `AAAA-MM-DD` local; cada ejercicio guarda una **copia** de su prescripción (`prescription`), del nombre (`nameSnapshot`) y del tipo de carga (`loadTypeSnapshot`), así el historial no cambia si se edita o borra la rutina.
- **Serie** (`sets[]`): `kind` (`warmup`/`work`), `weightKg`, `reps`, `rir` (null = no anotado), `durationSec`, `distanceM`, `assistKg`, `addedKg`, `bandLabel`, `side`, `completed`.
- **Significado de `weightKg`** según `loadTypeSnapshot`: `barbell_total` = barra + discos; `dumbbell_each` = una mancuerna; `machine`/`cable` = lo que marca esa máquina; en `assisted` la asistencia va en `assistKg` (más asistencia = más fácil); en `bodyweight` el lastre va en `addedKg`.
- **Rutinas versionadas**: `routines.currentVersionId` apunta a `routineVersions`; las versiones antiguas se conservan.
- No se exportan: datos de ejemplo (`isDemo`), claves locales del dispositivo (fecha de última copia, persistencia), demostraciones descargadas de terceros (se pueden volver a descargar).
- Sí se exportan las imágenes propias de ejercicios creados por la persona (data URL en `userMedia`).

## Restauración

1. Se valida tamaño (≤ 25 MB), JSON, `format`, versiones (no se aceptan copias de versiones más nuevas), identificadores y estructura de sesiones/rutinas.
2. Se limpian caracteres de control y claves peligrosas (`__proto__`…). Las imágenes deben ser `data:image/(png|jpeg|webp|gif);base64`.
3. Vista previa: número de sesiones, rango de fechas, rutinas, registros que ya existen.
4. Modos:
   - **Fusionar**: añade lo que no existe; si un registro existe en ambos lados se queda el más reciente (`updatedAt`), nunca se duplica (las claves son estables). Una sesión activa local no se sobrescribe.
   - **Reemplazar**: borra los datos actuales y carga los de la copia.
5. Todo ocurre en **una transacción**: si algo falla, la base queda exactamente como estaba.

## CSV de registros

`forja-registros-AAAA-MM-DD.csv`, separador `;`, coma decimal, BOM UTF-8 (abre bien en Excel/Numbers en español). Una fila por serie: fecha, sesión, estado, ejercicio, id, tipo de carga, significado del peso, tipo de serie, nº de serie, peso, repeticiones, RIR, segundos, distancia, asistencia, lastre, banda, lado, completada, molestia, notas. Los textos que empiezan por `=`, `+`, `-` o `@` se escapan para evitar fórmulas.
