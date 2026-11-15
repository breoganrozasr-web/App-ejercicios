# Forja · cuaderno de entrenamiento

PWA instalable para entrenar en el gimnasio, en casa o en el parque: te propone una rutina adecuada a tu perfil, te enseña cada ejercicio (demostración ilustrada en la app y, en algunos, enlace a una demostración externa), registra tus series (peso, repeticiones, esfuerzo) y te muestra la evolución. **Funciona sin conexión, sin cuentas, sin anuncios y con coste 0 €/mes.** Tus datos se guardan solo en tu dispositivo.

- Interfaz en español de España, kilos, coma decimal, semana de lunes a domingo.
- Pensada para iPhone y uso con una mano (botones ≥ 44 px, áreas seguras, teclado numérico).
- Motor de rutinas **determinista y explicable** (reglas, no inteligencia artificial), versión 2.3.0 (app 1.5.0): frecuencia y volumen reales con el origen de cada cifra, familiarización por sesiones, fuerza por ejercicios de referencia. Sus valores son **valores iniciales de Forja**, no cifras óptimas demostradas; fuentes y alcance de consulta en [docs/EVIDENCIA.md](docs/EVIDENCIA.md) y en la propia app (Ajustes → Aprender y fuentes).

## Qué incluye

| | |
|---|---|
| **Perfil** | Experiencia (principiante, intermedio, avanzado) y situación actual (entreno con regularidad, vuelvo tras una pausa, aún no he empezado) por separado —«Avanzado» no añade series—, «Preparar mi vuelta» gradual, objetivo, días concretos y minutos reales, lugar y material, frecuencia deseada (auto/1/2/3) para los grupos objetivo y, si quieres, para otros; regiones prioritarias (el deltoides en anterior, lateral y posterior), referencias de fuerza, adaptación tras una pausa, ejercicios excluidos, franja de edad, señales de salud y peso corporal opcional. |
| **Rutinas** | Propuesta generada con razones y advertencias, **tabla de frecuencia real** por grupo (directa e indirecta por separado), tiempo estimado con margen, familiarización visible antes de empezar y conflictos con alternativas recalculadas; **26 plantillas con dosis propia** (cuerpo completo estándar, breve y en máquinas; torso/pierna; PPL 3 y 6; PPL + torso/pierna; anterior/posterior; fuerza + hipertrofia 3–5 días; fuerza SBD 3 y 4; prioridad de tren inferior; casa con mancuernas, material mixto o sin material; parque), con buscador por alias, filtros, «Encajan con tu perfil», favoritas, comparador de hasta tres y vista previa sin cambiar la rutina ([tabla generada](docs/PLANTILLAS.md)); «Por qué estas series»; revisión de rutinas antiguas con «Mantener»; rutina en blanco y sesión libre. Editar crea versiones; duplicar, archivar, mover sesiones, sustituir ejercicios. |
| **Entrenamiento** | Qué toca, cómo se hace, qué hiciste la última vez y la sugerencia (diferenciada de lo real). Series de calentamiento y de trabajo, RIR opcional, lastre/asistencia/banda/tiempo/distancia, unilateral por lado, superseries, notas, sustituir en la sesión, deshacer, descanso con marcas de tiempo (+30/+60 s), pausa, guardado inmediato que sobrevive a una recarga, vista opcional de un solo ejercicio. **Sesión parcial** con «retomar lo pendiente», «pasar a la siguiente» o «repetir otro día». **Con una mano**: tocar ✓ con campos vacíos prepara los valores y otro toque confirma (nada se marca solo), «Anterior: … · fecha» en cada serie, «Usar valores anteriores (sin completar)», «Hacer después» si la máquina está ocupada, «Sustituir hoy (solo esta sesión)», material concreto («Polea A») con sugerencias separadas, nota «para próximas veces» y nota «de hoy», barra de descanso plegable y «Qué trabaja» sin salir de la sesión. **Objetivos por serie** (p. ej. principal 1×4–6 y complementarias 2×6–8) con progresión por grupo. Planchas en segundos con esfuerzo 0–10 (sin RIR ni kg). Variantes más fácil o difícil (solo con tu material). **Aviso sonoro al acabar el descanso** (también con el iPhone en silencio, o mezclado con tu música) y pantalla encendida mientras entrenas. «¿Cómo llegas hoy?» (sueño, energía, agujetas) con ajuste conservador opcional. Aviso de **récord** en directo. **Calculadora de discos** y calentamiento sugerido. **Nota fija** por ejercicio (asiento, agarre…). **Registrar una sesión pasada** y cambiar la fecha de una sesión. |
| **Ejercicios** | 99 fichas en capas («Cómo hacerlo / Qué trabaja / Historial») con **esquema muscular original** (frente y espalda: principal, colabora, estabiliza, con lista accesible), favoritos y usados recientemente; dos niveles (tres claves durante la sesión y «Aprender este ejercicio»: preparación, errores, variantes, músculos con su peso en el cómputo, qué carga anotar y fuente). **91 con demostración local verificada** (84 Everkinetic, 7 Wikimedia Commons) etiquetada honestamente («dos posiciones ilustradas», «animación continua», «imagen»); 13 con **enlace externo** (NASM, ACE, University of Wyoming, PureGym; requiere internet), 8 de ellas sin demostración local. Ejercicios propios con imagen o enlace. |
| **Progreso** | Tres vistas (Entrenamiento, Ejercicios, Cuerpo); **reparto muscular** realizado por semana (lunes–domingo) y planificado; constancia semanal, calendario, series directas e indirectas por región con el origen de cada cifra (tronco por tiempo aparte), días desde el último entrenamiento de cada músculo, evolución por ejercicio con tabla accesible, récords con criterio explícito, 1RM estimado solo cuando procede, peso corporal, **medidas corporales** con gráfico y **fotos de progreso** opcionales (solo en el dispositivo, con comparación). Resumen al terminar cada sesión con duración, series, repeticiones, récords, comparación con la vez anterior y **calorías en rango aproximado** (3,5–5 MET). |
| **Fases y técnicas** | Fases del programa (Aprendizaje → Consolidación → Progresión) con revisión propuesta por constancia real, que no cambia tu experiencia declarada. Readaptación ofrecida tras 21 días sin entrenar. **Series descendentes y rest-pause** registradas tramo a tramo (cada uno con su carga, repeticiones y pausa reales) y **superseries** con transición y descanso de la ronda. Propuestas opcionales solo con tu consentimiento; las técnicas no son necesarias para progresar. |
| **Aprender** | 11 textos breves (fuerza y músculo, volumen y frecuencia, RIR, descanso, progreso, recorrido y variantes, primera carga, series descendentes, rest-pause, superseries y fases) y biblioteca de fuentes con el alcance real de cada consulta. Funcionan sin conexión; los enlaces requieren internet. |
| **Datos** | «Preparar mi rutina sin conexión» con el estado real (demostraciones locales preparadas, enlaces externos que necesitan internet); copia completa (.json formato 4, fotos solo si lo eliges) y registros (.csv), restauración con vista previa (fusionar o reemplazar, en una transacción), recordatorio de copia, demostraciones descargables y borrables, datos de ejemplo separados. |

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
src/domain/        reglas puras: tipos, catálogo (+ demostraciones externas), motor (generator, templates, contribution, prescription, progression, analysis, scope), técnicas (bloques y superseries), programa (fases), contenidos de Aprender, récords
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

Forja ofrece puntos de partida razonables (valores iniciales propios, apoyados en principios generales de la literatura; no cifras óptimas demostradas), no un programa médico ni promesas de resultados. Con dolor, lesiones, enfermedad, embarazo o en menores, consulta a profesionales cualificados; la app limita sus recomendaciones en esos casos.
