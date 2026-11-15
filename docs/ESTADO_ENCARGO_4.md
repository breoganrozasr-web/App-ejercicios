# Avance del encargo 4 (experiencia, mapa muscular y comodidad en el gimnasio)

Encargo completo: [ENCARGO_4.md](ENCARGO_4.md). Base: app 1.4.0, motor 2.2.0, build fe98133 (+ docs 0e6b270). Rama `claude/app-from-spec-1c0pa7`; se publica empujando el mismo HEAD a `main` (workflow «Publicar en GitHub Pages»).

Objetivo de versión: **app 1.5.0, motor 2.3.0, copia formato 4, esquema Dexie 3**.

## Decisiones tomadas

- Experiencia (`profile.experience`: beginner/intermediate/advanced/unconfirmed) y continuidad (`profile.continuity`: regular/returning/not_started/unconfirmed) son campos nuevos. `profile.level` se conserva como **nivel efectivo del motor** derivado (principiante → beginner; intermedio/avanzado → intermediate; experiencia sin confirmar → returning, comportamiento prudente). Así toda la elegibilidad que exigía «intermedio» incluye a avanzado sin condicionales sueltos. La vuelta tras pausa pasa a ser una dosis temporal (adaptación) independiente de la experiencia.
- Migración Dexie v3 transaccional del perfil: desde cero → principiante + continuidad sin confirmar; intermedio → intermedio + sin confirmar; vuelvo → experiencia sin confirmar + continuidad «vuelvo». No se regeneran rutinas ni se tocan sesiones.
- Mapa anatómico (roles principal/colabora/estabiliza) separado de los mapas de cómputo 1 y 2.

## Bloques

| Bloque | Estado |
|---|---|
| 1. Modelo y migración (experiencia, continuidad, avanzado, «Preparar mi vuelta», entreno fuera de Forja) | hecho (commit b80205a): `domain/profile.ts` (experienceOf, continuityOf, effectiveLevel, wantsReturnAdaptation, migrateProfile), Dexie v3, `ExperienceFields` en alta/perfil, `PrepareReturn` (perfil, rutina, Tu programa), oferta tras 21 días como pregunta con «he entrenado fuera de Forja», fin de la vuelta con continuar/prolongar, sugerencia tras pausa sin porcentaje. Tests ajustados: esquema 3 en features.test, vuelta sin % en progression.test |
| 2. Mapa muscular SVG, anatomía por ejercicio, ficha en capas, mapa del plan/realizado | hecho: `domain/catalog/anatomy.ts` (roles principal/colabora/estabiliza por patrón + variantes revisadas + grupos propios o «sin mapa»), `ui/components/BodyMap.tsx` (SVG original frente/espalda, leyenda con patrón y texto, lista accesible), `ui/components/VolumeMap.tsx` (planificado/realizado sin doble conteo), `records.doneByRegion` (semana lunes–domingo). Ficha en capas: unidad, demostración, músculos, tres claves y pestañas «Cómo hacerlo / Qué trabaja / Historial»; «Cómo se calcula» desplegable. Progreso en tres vistas (Entrenamiento / Ejercicios / Cuerpo) con mapa realizado (con semanas) y planificado. Mapa del plan en la vista previa de plantillas. Revisión visual hecha (claro y oscuro) |
| 3. Entrenamiento con una mano (filas compactas, anterior, idempotencia, «Hacer después», sustituir hoy, notas, contextos de material, favoritos) | hecho (a89abd2): toque en dos pasos, «Anterior: … · fecha», «Usar valores anteriores (sin completar)», aviso de guardado fallido, `sessions.doLater` (superserie en grupo, orden planificado), «Sustituir hoy (solo esta sesión)», ContextSheet de material (`exerciseSettings.contexts`, clave `|mat:` solo con contexto), notas para próximas veces / de hoy, hoja con «Qué trabaja», barra de descanso plegable, `ui/favorites.ts` |
| 4. Editor por series (grupos de prescripción) y progresión por grupo | hecho (a89abd2): `domain/setGroups.ts`, «Personalizar series» en el editor, `historyForGroup`, sugerencias por grupo en la sesión, duración por grupo |
| 5. Catálogo compacto, Progreso en tres vistas, Ajustes agrupados, preparar sin conexión, demostraciones V01–V04 | hecho (a89abd2): conflictos en `<details>`, `?vista=`, Ajustes por secciones, `routineOfflineStatus` (caché + service worker), V01–V04 con alcance; fuentes S01–S04, T01–T02 en la biblioteca |
| 6. Copia formato 4, CSV, pruebas D01–D25, actualización real 1.4→1.5, docs, publicación | hecho: formato 4 + restauración que migra el perfil; CSV con 3 columnas; `encargo4.test.ts` (14) y `encargo4.spec.ts` (7); `scripts/upgrade-real-14-15.cjs` 30/30 en Chromium y WebKit; docs (PRUEBAS, EVIDENCIA, CONTENIDOS_Y_LICENCIAS, FORMATO_COPIA, ESTADO, README, CAMBIOS); publicación: ver ESTADO.md |

## Pruebas ejecutadas

Ver la tabla D01–D25 en [PRUEBAS.md](PRUEBAS.md): typecheck, 168 unitarias, build, 88 E2E (Chromium iPhone 13/SE/15 Pro Max + WebKit; 1 omitida), actualización real 1.4 → 1.5 en dos motores. No se ha probado en un iPhone físico.

## Siguiente paso

Publicar (rama → `main`), verificar la URL real en Chromium y WebKit y anotar el build en ESTADO.md.
