// Comprobación de la versión 1.5 publicada (URL real). Uso: node verify-live-15.cjs chromium|webkit <commit7>
const { chromium, webkit, devices } = require('playwright')
const [,, engine, expected] = process.argv
const B = process.env.LIVE_BASE || 'https://breoganrozasr-web.github.io/App-ejercicios/'
const results = []
const ok = (name, cond, extra = '') => { results.push(!!cond); console.log(`[${engine}] ${cond ? 'OK ' : 'NO '} ${name}${extra ? ' · ' + extra : ''}`) }
const vis = (loc, t = 15000) => loc.waitFor({ timeout: t }).then(() => true, () => false)
const readActive = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const t = r.result.transaction(['sessions'], 'readonly').objectStore('sessions').getAll(); t.onsuccess = () => res(t.result.find((s) => s.status === 'active')) } }))
;(async () => {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch()
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid', deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(B)
  await p.getByRole('button', { name: /Empezar \(2 minutos\)/ }).click()
  await p.getByRole('group', { name: 'Tu experiencia' }).getByRole('button', { name: /^Avanzado/ }).click()
  await p.getByRole('group', { name: 'Ahora mismo' }).getByRole('button', { name: 'Vuelvo tras una pausa' }).click()
  let toggle = false
  for (let i = 0; i < 4; i++) { await p.getByRole('button', { name: 'Continuar' }).click(); toggle = toggle || (await p.getByText('Empezar con una vuelta gradual (4 días válidos)').count()) > 0 }
  ok('Alta: «Vuelvo tras una pausa» ofrece la vuelta gradual (sin cambiar la experiencia)', toggle)
  await p.getByRole('button', { name: 'Ver mi propuesta' }).click()
  ok('Propuesta con plantillas que encajan', await vis(p.getByRole('region', { name: 'Plantillas que encajan contigo' })))
  await p.goto(B + '#/ajustes/licencias')
  await p.getByTestId('build-commit').waitFor()
  const commit = (await p.getByTestId('build-commit').textContent()).trim()
  ok('Commit publicado = commit subido', commit === expected, commit)
  ok('App 1.5.0 · motor 2.3.0 · esquema 3', /App 1\.5\.0 · motor de rutinas 2\.3\.0 .*esquema de datos v3/.test(await p.getByText(/App 1\.\d\.\d · motor de rutinas/).textContent()))
  // Plantilla intermedia con vuelta gradual: la receta conserva su dosis
  await p.goto(B + '#/rutinas/plantillas/sh4')
  await p.getByRole('button', { name: 'Usar esta plantilla' }).click()
  ok('D02/D03 avanzado que vuelve: plan base 16 series, hoy adaptación', await vis(p.getByTestId('adaptation-line').filter({ hasText: 'Plan base después: 16 series de trabajo' })))
  await p.goto(B + '#/ajustes')
  ok('Ajustes agrupados y perfil «Avanzado · vuelvo tras una pausa»', await vis(p.getByText(/Avanzado · vuelvo tras una pausa/)) && await vis(p.locator('h2.section-title', { hasText: 'Durante el entrenamiento' }).first()))
  ok('Preparar sin conexión: estado real', await vis(p.getByRole('list', { name: 'Estado sin conexión de tu rutina' }).filter({ hasText: /Demostraciones locales: \d+ de \d+ preparadas/ })))
  // Ficha en capas con esquema muscular y V01
  await p.goto(B + '#/ejercicios/press_banca_barra')
  ok('Ficha: esquema muscular accesible', await vis(p.getByRole('img', { name: /Músculos de Press de banca con barra: Pecho \(principal\)/ })))
  await p.goto(B + '#/ejercicios/peso_muerto_convencional')
  ok('D25 V01 en el convencional, sin iframes', await vis(p.getByText(/NASM .*Barbell Deadlift.*V01/)) && (await p.locator('iframe').count()) === 0)
  // Entrenamiento: toque en dos pasos y «Hacer después»
  await p.goto(B + '#/hoy')
  await p.getByRole('button', { name: /^Empezar$/ }).click()
  await p.getByRole('button', { name: 'Omitir' }).click().catch(() => {})
  const first = p.locator('section.wk-ex').first()
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await p.waitForTimeout(500)
  let s = await readActive(p)
  ok('D10 un toque con campos vacíos no completa la serie', s && !s.exercises[0].sets.some((x) => x.completed))
  await p.locator('section.wk-ex').nth(1).getByRole('button', { name: /^Opciones de / }).first().click()
  await p.getByRole('button', { name: /Hacer después/ }).click()
  await p.waitForTimeout(500)
  s = await readActive(p)
  ok('D13 «Hacer después» mueve el pendiente al final con su orden planificado', s.exercises[s.exercises.length - 1].plannedIndex === 1 && s.exercises[s.exercises.length - 1].movedLater === true)
  await p.getByRole('button', { name: 'Terminar', exact: true }).click()
  await p.getByRole('alertdialog').getByRole('button', { name: /Descartar|Guardar como parcial|Terminar y guardar/ }).first().click()
  await p.goto(B + '#/progreso')
  ok('Progreso: reparto muscular (vista Entrenamiento)', await vis(p.getByRole('region', { name: 'Reparto muscular' })))
  await p.goto(B + '#/aprender/fuentes?f=S02')
  ok('Biblioteca: S02 y S01 ≡ F01', await vis(p.getByText(/Does Taking a Break Matter/)) && await vis(p.getByText(/Misma publicación que/).first()))
  await p.goto(B + '#/ejercicios/sentadilla_peso_corporal')
  const img = p.locator('img[src*="/media/wc/"]').first()
  let loaded = false
  if (await vis(img)) for (const t0 = Date.now(); Date.now() - t0 < 15000 && !loaded; await p.waitForTimeout(250)) loaded = await img.evaluate((el) => el.complete && el.naturalWidth > 0)
  ok('Regresión: demostración local de Commons', loaded)
  const sw = await p.evaluate(() => Promise.race([navigator.serviceWorker.ready.then((r) => r.active?.scriptURL), new Promise((r) => setTimeout(() => r(null), 15000))]))
  ok('Service worker activo', !!sw)
  if (engine !== 'webkit') {
    await ctx.setOffline(true)
    await p.goto(B + '#/ejercicios/press_banca_barra?vista=musculos')
    ok('Sin conexión: ficha con esquema muscular desde la caché', await vis(p.getByText('Principales:').first()))
    await ctx.setOffline(false)
  }
  ok('Sin errores de página', errs.length === 0, JSON.stringify(errs))
  await browser.close()
  console.log(`[${engine}] RESUMEN: ${results.filter(Boolean).length}/${results.length}`)
  process.exit(results.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error(`[${engine}] FALLO`, e.message.split('\n').slice(0, 6).join('\n')); process.exit(1) })
