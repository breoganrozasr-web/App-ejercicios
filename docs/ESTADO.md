# Estado del proyecto (punto de continuación)

Última actualización: 2026-11-13 (sesión inicial).

## Hecho
- Investigación de evidencia y licencias (notas resumidas en docs/EVIDENCIA.md y docs/CONTENIDOS_Y_LICENCIAS.md — en curso).
- Proyecto Vite 7 + React 19 + TypeScript 5.9 + Dexie 4 + vite-plugin-pwa 1.3 + Vitest 3 + Playwright 1.63.
- Dominio: tipos, catálogo (85 ejercicios con demostración verificada + 4 con demostración pendiente), motor de rutinas,
  plantillas, progresión doble, récords, sustituciones.
- Medios Everkinetic generados (`scripts/build_media.py`) + manifiesto `src/domain/catalog/media-manifest.json`.
- Datos: esquema Dexie v1, repositorio (rutinas versionadas, sesiones con instantánea), copias (JSON/CSV, restauración).

## En curso
- Interfaz (pantallas).

## Pendiente
- Pruebas E2E, revisión visual, documentación final.

## Cómo continuar
1. `npm install`
2. `npm run dev` (desarrollo) / `npm test` (unitarias) / `npm run build && npm run e2e`.
3. Revisar este archivo y docs/PRUEBAS.md.
