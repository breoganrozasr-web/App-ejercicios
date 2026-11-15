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
| 1. Modelo y migración (experiencia, continuidad, avanzado, «Preparar mi vuelta», entreno fuera de Forja) | pendiente |
| 2. Mapa muscular SVG, anatomía por ejercicio, ficha en capas, mapa del plan/realizado | pendiente |
| 3. Entrenamiento con una mano (filas compactas, anterior, idempotencia, «Hacer después», sustituir hoy, notas, contextos de material, favoritos) | pendiente |
| 4. Editor por series (grupos de prescripción) y progresión por grupo | pendiente |
| 5. Catálogo compacto, Progreso en tres vistas, Ajustes agrupados, preparar sin conexión, demostraciones V01–V04 | pendiente |
| 6. Copia formato 4, CSV, pruebas D01–D25, actualización real 1.4→1.5, docs, publicación | pendiente |

## Pruebas ejecutadas

(se rellena al avanzar)

## Siguiente paso

Bloque 1.
