# Pruebas: comandos, resultados reales y comprobaciones pendientes

Última ejecución: **13 de noviembre de 2026**, en el contenedor de desarrollo (Linux, Node 22.23, Chromium 1243 vía Playwright 1.63).

## Comandos

```bash
npm run typecheck    # tsc -b --noEmit (app, tests y configuración)
npm test             # Vitest 3.2 + fake-indexeddb: motor, progresión, datos, copias, catálogo/medios
npm run build        # tipos + build de producción (Vite 7) + service worker (Workbox)
npm run e2e          # Playwright: levanta `npm run preview` y prueba la app construida
```

## Resultados

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ (JS principal ≈149 KB gzip + Dexie 36 KB + iconos 6 KB; precache de la app ≈814 KB; demos aparte, ≈2 MB bajo demanda) |
| `npm test` | ✅ **52/52** (3 ficheros) |
| `npm run e2e` | ✅ **19/19** (iPhone 13; además iPhone SE y iPhone 15 Pro Max en las pruebas de diseño) |
| Build bajo subruta `/App-ejercicios/` (como en GitHub Pages) | ✅ comprobado a mano con servidor estático: service worker, manifiesto y demos cargan sin errores |
| GitHub Actions (`main`, ejecución 1) | ✅ job `build` en los servidores de GitHub: `npm ci`, 52 pruebas y build con `BASE=/App-ejercicios/`. ❌ job `deploy`: «Get Pages site failed» porque GitHub Pages aún no está activado (repositorio privado) |
| **WebKit 26.6** (Playwright, Linux) | ✅ **12/13** E2E en `webkit-iphone-13`. La prueba del caso 9 se omite en WebKit porque `context.setOffline()` de Playwright corta también las respuestas del service worker («internal error»). Sustituida por una comprobación con **desconexión real** (servidor apagado): la app recarga desde el service worker, se empieza una sesión, se escribe «40,5» y se conserva tras recargar ✅ |

### Casos obligatorios del encargo

| # | Caso | Dónde se prueba | Estado |
|---|---|---|---|
| 1 | Principiante, 3 días, gimnasio: rutina coherente, tiempo y frecuencia reales | `engine.test.ts` (Caso 1: patrones cubiertos, nivel, RIR ≥2, sin 1–5 rep, duración ≤ tiempo, frecuencia recalculada a mano desde el calendario), `flows.spec.ts` | ✅ |
| 2 | Casa sin material: nada de máquinas ni material oculto | `engine.test.ts` (generador y plantilla), `flows.spec.ts` | ✅ |
| 3 | Dos días y frecuencia 3: conflicto y alternativas | `engine.test.ts`, `flows.spec.ts` (interfaz) | ✅ |
| 4 | Sesiones consecutivas y domingo/lunes | `engine.test.ts` (solapamiento detectado, reducción de dosis, alternancia torso/pierna en L-M-J-V, elección de días espaciados) | ✅ |
| 5 | Cambiar ejercicio sin borrar historia ni copiar kg | `data.test.ts` (versión nueva, sesión intacta, sugerencia “primera vez” sin kg), `flows.spec.ts` (sustituir en sesión conserva lo hecho, deshacer) | ✅ |
| 6 | 3×8–12: 12/12/12 vs 12/10/8, progresión y redondeo | `progression.test.ts` (subida a 42,5 kg y vuelta a 8; 12/10/8 repite; sin RIR = opcional; fallo; rejilla de barra/mancuerna/máquina/polea; salto demasiado grande; incremento por ejercicio; sesión floja; vuelta tras pausa; molestia) | ✅ |
| 7 | Asistencia, unilateral, mancuernas por unidad, carga cero y coma decimal | `progression.test.ts` (parseo “12,5”, “0”, “1.234,5”; menos asistencia = progreso; récord = menor asistencia; mancuerna no duplicada; CSV con coma y lado), `flows.spec.ts` (escribir “52,5” en la interfaz) | ✅ |
| 8 | Empezar, registrar, cerrar/recargar y reanudar sin pérdida ni duplicados | `data.test.ts` (doble inicio concurrente → 1 sesión; reabrir base), `flows.spec.ts` (doble toque, recarga real, valores y descanso conservados, terminar parcial) | ✅ |
| 9 | Offline tras la primera carga; medios diferenciados | `offline-media.spec.ts` (service worker, modo sin conexión, empezar sesión, demo descargada visible, no descargada con aviso) | ✅ (Chromium) |
| 10 | Exportar/restaurar; archivo corrupto o incompatible no daña la base | `data.test.ts` (fusionar sin duplicar, reemplazar exacto, JSON roto, otra app, versión futura, fecha inválida, fallo a mitad → transacción deshecha, limpieza de texto, demo no exportada), `flows.spec.ts` (descarga real, archivo roto rechazado, fusión) | ✅ |
| 11 | Editar rutina, archivar, actualizar: sesiones pasadas intactas | `data.test.ts`, `flows.spec.ts` | ✅ (la actualización del service worker se ha revisado por diseño: `registerType: 'prompt'`, no recarga durante un entrenamiento y no toca IndexedDB; no hay prueba automática de una actualización real) |
| 12 | Reproductor fallido, URL rota, proveedor caído | `offline-media.spec.ts` (404 de medios → aviso y registro usable; YouTube solo online con enlace alternativo; enlace no https rechazado) | ✅ |
| 13 | Rutinas precargadas con medios de su variante y atribuciones | `data.test.ts` (84 ejercicios verificados con archivos existentes, licencia, atribución, URL de origen con commit; plantillas solo usan verificados salvo los **2 pendientes declarados**) + revisión visual manual de cada par de ilustraciones | ⚠️ Cumple salvo la sentadilla y la zancada con peso corporal (plantillas de casa sin material y parque): demostración pendiente, avisada en la app |
| 14 | Navegación, teclado y barras en tamaños de iPhone, orientación y tema oscuro | `layout.spec.ts` en 3 tamaños: sin desbordes en 6 pantallas × claro/oscuro, objetivos táctiles ≥44 px, `inputmode` decimal/numérico, el campo enfocado queda por encima de la barra de descanso, horizontal | ✅ (emulación Chromium) |
| 15 | Generación repetida sin duplicados ni cambios aleatorios | `engine.test.ts` (perfiles y plantillas idénticos al regenerar; sin ejercicios repetidos en un día) | ✅ |

## Qué se ha comprobado y qué no

- **Emulación, no iPhone real.** Las pruebas de navegador usan **Chromium** y **WebKit 26.6 para Linux** (el motor de Safari, pero no Safari de iOS) con viewport, escala y agente de usuario de iPhone. **No se ha probado en un iPhone físico.** Para repetir con WebKit: `npx playwright install webkit && npx playwright install-deps webkit` y `PW_WEBKIT=1 npm run e2e -- --project=webkit-iphone-13`.
- Revisión visual: capturas reales de las pantallas (claro/oscuro, SE/13/15 Pro Max, horizontal) revisadas a mano; se corrigieron fallos detectados (fechas, textos duplicados, insignias recortadas, enlaces partidos, sugerencias demasiado largas).
- Contenido de la evidencia: verificado solo a nivel de resumen/buscador (ver docs/EVIDENCIA.md).

## Lista breve para verificar en tu iPhone (pendiente)

1. Abrir la URL en Safari → Compartir → Añadir a pantalla de inicio. Abrir desde el icono: a pantalla completa, sin barras de Safari, notch y barra inferior respetados.
2. Completar el perfil y empezar la sesión. Al tocar un campo de peso aparece el teclado **con coma**; escribir `12,5` y comprobar que se guarda como 12,5.
3. Marcar una serie: aparece el descanso. Bloquear el iPhone 1 minuto y volver: el tiempo restante es correcto (no se pausó). El sonido solo suena con la app abierta (es lo esperado).
4. Cerrar la app desde el multitarea a mitad de sesión y volver a abrir: “Continuar” con los datos intactos.
5. Ajustes → Demostraciones → Descargar las de mi rutina. Activar modo avión, cerrar y abrir la app: funciona; las demos descargadas se ven.
6. Ajustes → Exportar copia: se abre el menú Compartir; guardar en Archivos. Restaurar ese archivo con «Fusionar»: no duplica.
7. Ajustes → Almacenamiento: anotar si dice “persistente concedido” (Safari puede no concederlo; por eso las copias).
8. Girar a horizontal en el entrenamiento y en una demostración.
9. Activar Ajustes de iOS → Accesibilidad → Reducir movimiento: la demostración muestra las posiciones fijas con botón «Animar».
10. VoiceOver: recorrer una serie (debe leer “kg de la máquina, serie 1”, “Marcar serie 1 como hecha”).
