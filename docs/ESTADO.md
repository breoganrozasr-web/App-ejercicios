# Estado del proyecto (punto de continuación)

Última actualización: **13 de noviembre de 2026**. Rama: `claude/app-from-spec-1c0pa7`.

## Terminado y probado

- **App completa y utilizable** (PWA): perfil/onboarding, propuesta del generador con razones, conflictos y ajustes de tiempo; 10 plantillas; rutina en blanco y sesión libre; editor con versiones, superseries, sustituciones y calendario; modo entrenamiento completo; catálogo con 93 fichas; progreso (constancia, calendario mensual, series por músculo, evolución, récords, 1RM estimado con límites, peso corporal); ajustes (copias JSON/CSV, restauración con vista previa y transacción, demostraciones offline con tamaño y borrado, persistencia, guía de iPhone, datos de ejemplo, ayuda, licencias, borrado total).
- **Versión 1.1** (13-11-2026): aviso sonoro del descanso con modos «Siempre» (suena con el iPhone en silencio; usa `navigator.audioSession = 'playback'` solo durante el pitido), «Con música» y «Sin sonido», botón «Probar sonido»; pantalla encendida durante el entrenamiento (Screen Wake Lock); «¿Cómo llegas hoy?» con ajuste conservador; récords en directo y resumen de sesión (duración, series, repeticiones, récords, comparación, calorías en rango); calculadora de discos y calentamiento sugerido; nota fija por ejercicio; registrar sesión pasada y cambiar fecha/hora/duración; medidas corporales; fotos de progreso opcionales (locales, fuera de las copias por defecto); días desde el último entrenamiento por músculo. Esquema de datos v2 (tablas `measurements` y `photos`; la v1 se actualiza sin perder datos, probado).
- **Motor determinista** v1.0.0 con reglas R1–R17 documentadas en `docs/EVIDENCIA.md`, más R18–R22 (calorías, preparación, días por músculo, aproximaciones, récords) que no cambian la generación de rutinas.
- **Demostraciones**: 91 ejercicios con demostración verificada: 84 del muñeco Everkinetic (CC BY-SA 4.0) y 7 de peso corporal de Wikimedia Commons (CC BY-SA 4.0 y dominio público CDC), cada una revisada a mano; manifiestos con origen, licencia, atribución y fecha.
- **Pruebas**: 73 unitarias/integración + 22 E2E en Chromium y 15 (+1 omitida) en WebKit, en verde (`docs/PRUEBAS.md`).
- **Publicada** en GitHub Pages con `.github/workflows/deploy-pages.yml` (en cada push a `main` y a mano).

## Pendientes reales (no ocultos)

1. **Publicación: HECHA.** Forja está en https://breoganrozasr-web.github.io/App-ejercicios/ (repositorio público, GitHub Pages con GitHub Actions; cada push a `main` vuelve a desplegar). Verificado el 13-11-2026 en la web real con Chromium y WebKit emulando iPhone 13 (ver docs/PRUEBAS.md).
   - Aviso de privacidad: el correo personal del commit inicial se sustituyó por la dirección privada de GitHub antes de publicar, pero GitHub puede conservar el commit antiguo (sin referencia) accesible por su identificador o en el registro de actividad. Para purgarlo del todo: solicitud gratuita al soporte de GitHub.
2. **Prueba en iPhone físico**: probado con Chromium y WebKit para Linux emulando iPhone, no en un iPhone real. Lista de verificación en `docs/PRUEBAS.md`.
3. **2 demostraciones pendientes** (zancada atrás con peso corporal, flexiones inclinadas). Ya no las usa ninguna plantilla. Ver `docs/CONTENIDOS_Y_LICENCIAS.md`.
5. **Sonido en iPhone real**: el modo «Siempre» depende de la API `navigator.audioSession` de Safari (iOS 17 o posterior). Comprobado solo en emulación; si en el iPhone no suena en silencio, la alternativa es quitar el modo silencio durante el entrenamiento. Con la pantalla bloqueada o la app en segundo plano una web no puede avisar.
4. **Evidencia a texto completo**: las fuentes se verificaron a nivel de resumen/buscador; pubmed/pmc y webs de revistas estaban bloqueadas.

## Ideas no implementadas (fuera del alcance de la v1)

- Sincronización entre dispositivos (deliberadamente no incluida: los datos son locales; se usan copias).
- Notificaciones push de fin de descanso con la pantalla bloqueada (requieren servidor de envío; se mitiga manteniendo la pantalla encendida durante el entrenamiento).
- Integración de imágenes de wger (licencia por imagen; requiere acceso a wger.de).

## Cómo continuar

```bash
npm install
npm test && npm run build && npm run e2e
npm run dev            # desarrollo
```

- Reglas del motor: `src/domain/engine/params.ts` (+ subir `ENGINE_VERSION`).
- Catálogo: `src/domain/catalog/exercises.ts`; demos: `scripts/build_media.py <ruta a everkinetic/data>`.
- Esquema de datos: `src/data/db.ts` (v2; añadir `this.version(N+1)` con `upgrade`, nunca borrar versiones; prueba de migración en `tests/unit/features.test.ts`).
- Antes de tocar copias: `docs/FORMATO_COPIA.md`.
