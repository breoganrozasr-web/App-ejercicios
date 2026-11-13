# Estado del proyecto (punto de continuación)

Última actualización: **13 de noviembre de 2026**. Rama: `claude/app-from-spec-1c0pa7`.

## Terminado y probado

- **App completa y utilizable** (PWA): perfil/onboarding, propuesta del generador con razones, conflictos y ajustes de tiempo; 10 plantillas; rutina en blanco y sesión libre; editor con versiones, superseries, sustituciones y calendario; modo entrenamiento completo; catálogo con 88 fichas; progreso (constancia, calendario mensual, series por músculo, evolución, récords, 1RM estimado con límites, peso corporal); ajustes (copias JSON/CSV, restauración con vista previa y transacción, demostraciones offline con tamaño y borrado, persistencia, guía de iPhone, datos de ejemplo, ayuda, licencias, borrado total).
- **Motor determinista** v1.0.0 con reglas R1–R17 documentadas en `docs/EVIDENCIA.md`.
- **Demostraciones**: 84 ejercicios con animación del muñeco (Everkinetic, CC BY-SA 4.0), cada par revisado a mano; manifiesto con origen, licencia, atribución y fecha.
- **Pruebas**: 52 unitarias/integración + 19 E2E en verde (`docs/PRUEBAS.md`).
- **Despliegue preparado**: `.github/workflows/deploy-pages.yml` (manual) y build verificado bajo `/App-ejercicios/`.

## Pendientes reales (no ocultos)

1. **Publicación**: el repositorio es privado; GitHub Pages gratuito requiere repositorio público. Acción del propietario (ver README → Publicación).
2. **Prueba en iPhone físico / Safari**: no disponible en este entorno (solo Chromium emulado). Lista de verificación en `docs/PRUEBAS.md`.
3. **4 demostraciones pendientes** (sentadilla y zancada con peso corporal, plancha frontal, flexiones inclinadas). Las plantillas “Casa sin material” y “Parque” usan las dos primeras y lo avisan. Posible fuente: Wikimedia Commons (bloqueado en esta sesión). Ver `docs/CONTENIDOS_Y_LICENCIAS.md`.
4. **Evidencia a texto completo**: las fuentes se verificaron a nivel de resumen/buscador; pubmed/pmc y webs de revistas estaban bloqueadas.

## Ideas no implementadas (fuera del alcance de la v1)

- Sincronización entre dispositivos (deliberadamente no incluida: los datos son locales; se usan copias).
- Notificaciones push de fin de descanso con la pantalla bloqueada (no fiables sin servidor; se avisa en la app).
- Integración de imágenes de wger (licencia por imagen; requiere acceso a wger.de).

## Cómo continuar

```bash
npm install
npm test && npm run build && npm run e2e
npm run dev            # desarrollo
```

- Reglas del motor: `src/domain/engine/params.ts` (+ subir `ENGINE_VERSION`).
- Catálogo: `src/domain/catalog/exercises.ts`; demos: `scripts/build_media.py <ruta a everkinetic/data>`.
- Esquema de datos: `src/data/db.ts` (añadir `this.version(N+1)` con `upgrade`, nunca borrar versiones).
- Antes de tocar copias: `docs/FORMATO_COPIA.md`.
