# Forja · cuaderno de entrenamiento

PWA instalable para entrenar en el gimnasio, en casa o en el parque: te propone una rutina adecuada a tu perfil, te enseña cada ejercicio con una animación del movimiento, registra tus series (peso, repeticiones, esfuerzo) y te muestra la evolución. **Funciona sin conexión, sin cuentas, sin anuncios y con coste 0 €/mes.** Tus datos se guardan solo en tu dispositivo.

- Interfaz en español de España, kilos, coma decimal, semana de lunes a domingo.
- Pensada para iPhone y uso con una mano (botones ≥ 44 px, áreas seguras, teclado numérico).
- Motor de rutinas **determinista y explicable** (reglas, no inteligencia artificial), basado en la evidencia resumida en [docs/EVIDENCIA.md](docs/EVIDENCIA.md).

## Qué incluye

| | |
|---|---|
| **Perfil** | Nivel, objetivo, días concretos y minutos reales, lugar y material, frecuencia por músculo (auto/1/2/3), músculos prioritarios, ejercicios excluidos, franja de edad, señales de salud y peso corporal opcional. |
| **Rutinas** | Propuesta generada con razones y advertencias; 10 plantillas completas (cuerpo completo 2 y 3 días, torso/pierna 4, empuje/tirón/pierna 3 y 6, fuerza 3, mixta 4, casa sin material, casa con material básico, parque/calistenia); rutina en blanco y sesión libre. Editar crea versiones; duplicar, archivar, mover sesiones, sustituir ejercicios. |
| **Entrenamiento** | Qué toca, cómo se hace, qué hiciste la última vez y la sugerencia (diferenciada de lo real). Series de calentamiento y de trabajo, RIR opcional, lastre/asistencia/banda/tiempo/distancia, unilateral por lado, superseries, notas, sustituir en la sesión, deshacer, descanso con marcas de tiempo, pausa, guardado inmediato, terminar como parcial. **Aviso sonoro al acabar el descanso** (también con el iPhone en silencio, o mezclado con tu música) y pantalla encendida mientras entrenas. «¿Cómo llegas hoy?» (sueño, energía, agujetas) con ajuste conservador opcional. Aviso de **récord** en directo. **Calculadora de discos** y calentamiento sugerido. **Nota fija** por ejercicio (asiento, agarre…). **Registrar una sesión pasada** y cambiar la fecha de una sesión. |
| **Ejercicios** | 93 fichas (músculos, material, nivel, patrón, instrucciones, errores, alternativas, historial, récords). **91 con demostración animada verificada**: 84 del muñeco Everkinetic (CC BY-SA 4.0) y 7 de peso corporal de Wikimedia Commons (CC BY-SA 4.0 y dominio público CDC); 2 con demostración pendiente declarada. Ejercicios propios con imagen o enlace. |
| **Progreso** | Constancia semanal, calendario, series por músculo frente al rango orientativo, días desde el último entrenamiento de cada músculo, evolución por ejercicio con tabla accesible, récords con criterio explícito, 1RM estimado solo cuando procede, peso corporal, **medidas corporales** con gráfico y **fotos de progreso** opcionales (solo en el dispositivo, con comparación). Resumen al terminar cada sesión con duración, series, repeticiones, récords, comparación con la vez anterior y **calorías en rango aproximado** (3,5–5 MET). |
| **Datos** | Copia completa (.json, fotos solo si lo eliges) y registros (.csv), restauración con vista previa (fusionar o reemplazar, en una transacción), recordatorio de copia, demostraciones descargables y borrables, datos de ejemplo separados. |

## Usarla en el iPhone

1. Abre **https://breoganrozasr-web.github.io/App-ejercicios/** en **Safari**.
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Ábrela desde el icono. Tras la primera carga funciona sin conexión.
4. En Ajustes → Demostraciones sin conexión, pulsa «Descargar las de mi rutina» para tener las animaciones offline.
5. Haz copias de vez en cuando: Ajustes → Copias de seguridad → Exportar (en iPhone se abre el menú Compartir para guardarla en Archivos).

> **Tus datos viven en ese navegador o app instalada.** No se sincronizan entre dispositivos. Otra dirección web, otro navegador o borrar los datos de Safari = base de datos distinta o vacía. Para cambiar de móvil: exporta la copia y restáurala en el nuevo (Ajustes → Copias).

## Desarrollo

Requisitos: Node 22 y npm.

```bash
npm install
npm run dev          # servidor de desarrollo (sin service worker)
npm test             # pruebas unitarias e integración (Vitest + fake-indexeddb)
npm run build        # comprobación de tipos + build de producción en dist/
npm run preview      # sirve dist/ en http://localhost:4173 (con service worker)
npm run e2e          # pruebas end-to-end (Playwright, Chromium emulando iPhone)
```

Estructura:

```
src/domain/        reglas puras: tipos, catálogo, motor (generator, templates, progression, analysis, scope), récords, utilidades
src/data/          persistencia IndexedDB (Dexie): esquema versionado, repositorio, copias/CSV, caché de demos, datos de ejemplo
src/ui/            interfaz React: pantallas, componentes, enrutado por hash, PWA
public/media/ek/   fotogramas WebP de las demostraciones (CC BY-SA 4.0)
scripts/           build_media.py: regenera fotogramas y manifiesto desde everkinetic/data
docs/              evidencia, licencias, estado, pruebas, formato de copia
tests/unit, tests/e2e
```

## Publicación gratuita

Se publica con **GitHub Pages** (gratis, sin cuentas nuevas) mediante `.github/workflows/deploy-pages.yml`, que se ejecuta en cada push a `main` (y a mano desde Actions): instala, pasa las pruebas, construye con la subruta del repositorio y despliega.

Requisitos que solo puede cambiar la persona propietaria en la web de GitHub (una vez):
1. GitHub Pages gratuito solo publica repositorios **públicos**: Settings → General → Danger Zone → Change visibility → Public. Antes se revisaron archivos e historial (sin credenciales ni datos personales; el correo del commit inicial se sustituyó por la dirección privada de GitHub).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.

URL: `https://breoganrozasr-web.github.io/App-ejercicios/` (HTTPS, necesario para instalarla y usarla sin conexión).

Alternativas si prefieres mantener el repositorio privado (requieren crear una cuenta gratuita, sin tarjeta, en el servicio): Cloudflare Pages o Netlify, subiendo la carpeta `dist/` generada con `npm run build`. Servirla desde tu ordenador por la red local (http://192.168…) **no** sirve para instalarla en el iPhone: el service worker exige HTTPS.

## Coste

- **Funcionamiento de la app: 0 €/mes.** Sin servidor, sin base de datos remota, sin API de pago, sin IA en ejecución, sin analítica ni publicidad. GitHub Pages es gratuito para repositorios públicos.
- **Desarrollo con Claude:** coste aparte de tu plan de Claude; no afecta al funcionamiento de la app.

## Licencias

Código: MIT. Ilustraciones de ejercicios: Everkinetic (Greg Priday), CC BY-SA 4.0, adaptadas (ver [docs/CONTENIDOS_Y_LICENCIAS.md](docs/CONTENIDOS_Y_LICENCIAS.md) y `public/LICENSES/`). Fuente Bricolage Grotesque (OFL). Iconos Lucide (ISC).

## Aviso

Forja ofrece puntos de partida razonables basados en evidencia, no un programa médico ni promesas de resultados. Con dolor, lesiones, enfermedad, embarazo o en menores, consulta a profesionales cualificados; la app limita sus recomendaciones en esos casos.
