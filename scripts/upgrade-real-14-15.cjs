// D19/D20/D21 · Actualización real 1.4 → 1.5 con datos variados, en Chromium y WebKit.
// Uso: node scripts/upgrade-real-14-15.cjs <dir> chromium|webkit · <dir> contiene dist-new14 (build 1.4 con BASE=/App-ejercicios/),
// dist-new15 (build actual con la misma BASE), p3/ y site/ servido con: python3 -m http.server 4180 --bind 127.0.0.1 --directory <dir>/site
const { chromium, webkit, devices } = require('playwright')
const fs = require('fs')
const [,, S, engine] = process.argv
const B = 'http://127.0.0.1:4180/App-ejercicios/'
const LOADRX = /^(kg de la máquina|kg de la polea|kg por mancuerna|kg totales), serie 1$/
const idb = (p, store) => p.evaluate((st) => new Promise((res) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const t = r.result.transaction([st], 'readonly').objectStore(st).getAll(); t.onsuccess = () => res(t.result) } }), store)
const results = []
const ok = (name, cond, extra = '') => { results.push(!!cond); console.log(`[${engine}] ${cond ? 'OK ' : 'NO '} ${name}${extra ? ' · ' + extra : ''}`) }
const step = (t) => console.log(`[${engine}] · ${t}`)
const use = (dir) => { fs.rmSync(`${S}/site/App-ejercicios`, { force: true }); fs.symlinkSync(`${S}/${dir}`, `${S}/site/App-ejercicios`) }

async function firstMachine(p) {
  const sections = p.locator('section.wk-ex')
  const n = await sections.count()
  for (let i = 0; i < n; i++) {
    const sec = sections.nth(i)
    if (await sec.getByRole('textbox', { name: LOADRX }).count()) return sec
  }
  return sections.first()
}

async function snapshot(p) {
  const sessions = await idb(p, 'sessions')
  const versions = await idb(p, 'routineVersions')
  const routines = await idb(p, 'routines')
  const settings = await idb(p, 'exerciseSettings')
  const meta = await idb(p, 'meta')
  const photos = await idb(p, 'photos')
  const changelog = await idb(p, 'changelog')
  const drop = sessions.flatMap((s) => s.exercises.flatMap((e) => e.sets.filter((x) => x.method === 'drop').map((x) => ({ status: s.status, seg: (x.block?.segments ?? []).map((g) => [g.weightKg, g.reps]) }))))
  return {
    sessions: sessions.map((s) => `${s.id}:${s.status}:${s.date}`).sort(),
    sets: sessions.map((s) => `${s.id}:` + s.exercises.map((e) => e.sets.map((x) => `${x.weightKg ?? '-'}x${x.reps ?? '-'}${x.completed ? '✓' : ''}`).join(',')).join('|')).sort(),
    versions: versions.map((v) => `${v.id}:${v.engineVersion}:${v.plan ? 'plan' : 'sinplan'}`).sort(),
    routines: routines.map((r) => `${r.id}:${r.currentVersionId ?? ''}:${r.archived ? 'arch' : ''}`).sort(),
    notes: settings.filter((s) => s.note).map((s) => `${s.exerciseId}:${s.note}`).sort(),
    favTemplates: (meta.find((m) => m.key === 'favoriteTemplates') || {}).value ?? [],
    currentRoutine: (meta.find((m) => m.key === 'currentRoutineId') || {}).value ?? null,
    photos: photos.map((x) => `${x.id}:${x.bytes}`).sort(),
    corrections: changelog.filter((c) => /correg|Corrección|corrección/.test(JSON.stringify(c))).length,
    drop,
  }
}

;(async () => {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch()
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid', deviceScaleFactor: 1, acceptDownloads: true })
  let p = await ctx.newPage()
  const errs = []
  const watch = (pg) => pg.on('pageerror', (e) => errs.push(e.message))
  watch(p)
  use('dist-new14')

  // ── 1.4 publicada ───────────────────────────────────────────────
  step('1.4: alta intermedia y rutina propuesta (será la «antigua»)')
  await p.goto(B)
  await p.getByRole('button', { name: /Empezar \(2 minutos\)/ }).click()
  await p.getByRole('button', { name: /Intermedio/ }).click()
  for (let i = 0; i < 4; i++) await p.getByRole('button', { name: 'Continuar' }).click()
  await p.getByRole('button', { name: 'Ver mi propuesta' }).click()
  await p.getByRole('button', { name: 'Usar esta rutina' }).click()
  await p.getByRole('heading', { name: 'Hoy' }).waitFor()
  // Como al volver a abrir la app instalada: la página queda controlada por el service worker de la 1.4.
  await p.reload()
  await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
  // Rutina «antigua»: versión del motor 1 sin plan (como las creadas antes de la 1.2)
  await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const tx = r.result.transaction(['routineVersions'], 'readwrite'); const os = tx.objectStore('routineVersions'); os.getAll().onsuccess = (e) => { for (const v of e.target.result) { v.engineVersion = '1.0.0'; delete v.plan; os.put(v) } }; tx.oncomplete = () => res() } }))

  step('1.4: plantilla sh4 como rutina actual y favorita')
  await p.goto(B + '#/rutinas/plantillas')
  await p.getByRole('button', { name: /^Añadir .* a favoritas$/ }).first().click()
  await p.goto(B + '#/rutinas/plantillas/sh4')
  await p.getByRole('button', { name: 'Usar esta plantilla' }).click()
  await p.getByRole('heading', { name: 'Hoy' }).waitFor()

  step('1.4: sesión completa con bloque descendente')
  await p.getByRole('button', { name: /^Empezar$/ }).click()
  await p.locator('section.wk-ex').first().waitFor()
  await p.getByRole('button', { name: 'Omitir' }).click().catch(() => {})
  let ex = await firstMachine(p)
  let name = (await ex.getAttribute('aria-label')).replace(/^\d+\. /, '')
  await ex.getByRole('button', { name: 'Opciones de serie 2' }).click()
  await p.getByRole('button', { name: 'Como bloque descendente: añade una bajada' }).click()
  let block = p.getByRole('group', { name: `Descendente, bloque 2 de ${name}` })
  await block.getByRole('textbox', { name: /tramo inicial del bloque 2/ }).first().fill('40')
  await block.getByRole('textbox', { name: 'Repeticiones, tramo inicial del bloque 2' }).fill('10')
  await block.getByRole('button', { name: 'Registrar tramo' }).click()
  await p.waitForTimeout(750)
  await block.getByRole('button', { name: 'Continuar bajada' }).click()
  await p.waitForTimeout(750)
  await block.getByRole('textbox', { name: /bajada 1 del bloque 2/ }).first().fill('30')
  await block.getByRole('textbox', { name: 'Repeticiones, bajada 1 del bloque 2' }).fill('8')
  await block.getByRole('button', { name: 'Registrar tramo' }).click()
  await block.getByText('Bloque completo.').waitFor()
  for (;;) {
    const b = p.getByRole('button', { name: /^Marcar serie \d+ como hecha$/ }).first()
    if (!(await b.count())) break
    await b.click()
    await p.waitForTimeout(650)
  }
  await p.getByRole('button', { name: 'Terminar', exact: true }).click()
  await p.getByRole('alertdialog').getByRole('button', { name: /Terminar y guardar|Guardar como parcial/ }).click()
  await p.getByLabel('Resumen de la sesión').waitFor()

  step('1.4: corrección de la sesión guardada')
  await p.goto(B + '#/progreso')
  await p.locator('a[href^="#/progreso/sesion/"]').first().click()
  await p.getByRole('button', { name: 'Editar sesión' }).click()
  await p.getByRole('alertdialog').getByRole('button', { name: 'Editar' }).click()
  await p.getByRole('textbox', { name: 'RIR Serie 1' }).first().fill('2')
  await p.getByRole('button', { name: 'Guardar cambios' }).click()
  await p.getByRole('alertdialog').getByRole('button', { name: 'Guardar corrección' }).click()
  await p.waitForTimeout(500)

  step('1.4: sesión parcial con 52,5 kg y nota fija')
  await p.goto(B + '#/hoy')
  await p.getByRole('button', { name: /^Empezar$/ }).click()
  await p.getByRole('button', { name: 'Omitir' }).click().catch(() => {})
  ex = p.locator('section.wk-ex').first()
  await ex.getByRole('textbox', { name: LOADRX }).fill('52,5')
  await ex.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('10')
  await ex.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await ex.getByRole('button', { name: /^Opciones de / }).first().click()
  await p.getByRole('button', { name: /Nota fija/ }).click()
  await p.getByRole('textbox', { name: 'Nota fija' }).fill('Asiento en 4')
  await p.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await p.waitForTimeout(300)
  await p.getByRole('button', { name: 'Terminar', exact: true }).click()
  await p.getByRole('button', { name: 'Guardar como parcial' }).click()
  await p.getByText(/52,5 kg( c\/u)? × 10/).first().waitFor()

  step('1.4: foto de progreso (fila sembrada en el formato 1.4, sin pasar por la cámara)')
  await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const tx = r.result.transaction(['photos'], 'readwrite'); tx.objectStore('photos').put({ id: 'ph-upg-1', date: '2026-11-14', pose: 'front', dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==', bytes: 14, width: 1, height: 1, createdAt: Date.now() }); tx.oncomplete = () => res() } }))

  step('1.4: entrenamiento en curso con un bloque a medias (tramo activo)')
  await p.goto(B + '#/hoy')
  await p.getByRole('button', { name: /^Empezar$/ }).click()
  await p.getByRole('button', { name: 'Omitir' }).click().catch(() => {})
  ex = await firstMachine(p)
  name = (await ex.getAttribute('aria-label')).replace(/^\d+\. /, '')
  await ex.getByRole('textbox', { name: LOADRX }).fill('47,5')
  await ex.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('9')
  await ex.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await p.waitForTimeout(650)
  await ex.getByRole('button', { name: 'Opciones de serie 2' }).click()
  await p.getByRole('button', { name: 'Como bloque descendente: añade una bajada' }).click()
  block = p.getByRole('group', { name: `Descendente, bloque 2 de ${name}` })
  await block.getByRole('textbox', { name: /tramo inicial del bloque 2/ }).first().fill('42,5')
  await block.getByRole('textbox', { name: 'Repeticiones, tramo inicial del bloque 2' }).fill('8')
  await block.getByRole('button', { name: 'Registrar tramo' }).click()
  await block.getByRole('button', { name: 'Continuar bajada' }).waitFor()
  const workoutUrl = p.url()

  const before = await snapshot(p)
  console.log(`[${engine}] 1.4 lista:`, JSON.stringify(before))
  ok('Datos 1.4 preparados (2 rutinas, parcial, completa, activa, bloque, nota, favorita, foto, corrección)',
    before.routines.length === 2 && before.sessions.some((s) => s.endsWith(':active') || s.includes(':active:')) && before.sessions.some((s) => s.includes(':partial:')) && before.drop.length === 2 && before.notes.length === 1 && before.favTemplates.length === 1 && before.photos.length === 1 && before.corrections >= 1,
    JSON.stringify({ routines: before.routines.length, drop: before.drop, corrections: before.corrections }))

  // Copia de la 1.4 (incluye la sesión activa)
  await p.goto(B + '#/ajustes/copias')
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Exportar copia completa/ }).click()])
  const backupPath = `${S}/p3/backup14-full-${engine}.json`
  await dl.saveAs(backupPath)

  // ── Se publica la 1.5 mientras hay un entrenamiento en curso ────────
  use('dist-new15')
  await p.goto(workoutUrl)
  await p.evaluate(() => { window.__noReload = 'sigo-aqui' })
  await p.goto(B + '#/hoy')
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r && r.update()))
  const waiting = p.getByText('Se aplicará cuando termines el entrenamiento en curso')
  ok('D21 aviso de actualización durante el entrenamiento (sin botón de recarga)', await waiting.waitFor({ timeout: 30000 }).then(() => true, () => false) && (await p.getByRole('button', { name: 'Actualizar ahora' }).count()) === 0)
  await p.goto(workoutUrl)
  await p.waitForTimeout(3000)
  ok('D21 la página no se recarga sola', (await p.evaluate(() => window.__noReload)) === 'sigo-aqui')
  ok('D21 sigue la 1.4 con el bloque a medias', await p.getByRole('group', { name: `Descendente, bloque 2 de ${name}` }).getByRole('button', { name: 'Continuar bajada' }).waitFor({ timeout: 8000 }).then(() => true, () => false))

  // Terminar el entrenamiento (sin cerrar el bloque) y aceptar la actualización
  await p.getByRole('button', { name: 'Terminar', exact: true }).click()
  await p.getByRole('alertdialog').getByRole('button', { name: /Guardar como parcial|Terminar y guardar/ }).click()
  await p.getByLabel('Resumen de la sesión').waitFor()
  const mid = await snapshot(p)
  await p.goto(B + '#/hoy')
  await Promise.all([p.waitForEvent('load', { timeout: 30000 }).catch(() => null), p.getByRole('button', { name: 'Actualizar ahora' }).click({ timeout: 30000 })])
  let vtxt = ''
  for (let i = 0; i < 10 && !/App 1\.5\.0/.test(vtxt); i++) {
    await p.waitForTimeout(1000)
    await p.goto(B + '#/ajustes/licencias')
    await p.getByTestId('build-commit').waitFor()
    vtxt = await p.getByText(/App 1\.\d\.\d · motor de rutinas/).textContent()
  }
  ok('D20 1.5 cargada tras aceptar', /App 1\.5\.0 · motor de rutinas 2\.3\.0/.test(vtxt), vtxt)
  const after = await snapshot(p)
  const same = (k) => JSON.stringify(after[k]) === JSON.stringify(mid[k])
  for (const k of ['sessions', 'sets', 'versions', 'routines', 'notes', 'favTemplates', 'currentRoutine', 'photos', 'drop']) ok(`D20 conservado: ${k}`, same(k), same(k) ? '' : `${JSON.stringify(mid[k])} → ${JSON.stringify(after[k])}`)
  ok('D20 la rutina antigua sigue en motor 1 (no se regenera)', after.versions.filter((v) => v.includes(':1.0.0:sinplan')).length >= 1)
  ok('D20 la parcial de la 1.4 conserva el 52,5', after.sets.some((s) => s.includes('52.5x10✓')))
  ok('D20 el tramo inicial del bloque a medias se conserva (42,5 × 8)', after.drop.some((d) => JSON.stringify(d.seg) === '[[42.5,8]]'), JSON.stringify(after.drop))
  const prof = (await idb(p, 'profile'))[0]
  ok('D01 perfil intermedio migrado: experiencia intermedia, nivel efectivo intermedio', prof.experience === 'intermediate' && prof.level === 'intermediate' && !!prof.continuity, JSON.stringify({ level: prof.level, experience: prof.experience, continuity: prof.continuity }))

  // Rutas hash en subruta y pantallas nuevas con datos antiguos
  await p.goto(B + '#/progreso?vista=entreno')
  ok('Ruta hash en subruta: Progreso · Entrenamiento con reparto muscular', await p.getByRole('heading', { name: 'Reparto muscular' }).waitFor({ timeout: 10000 }).then(() => true, () => false))
  await p.goto(B + '#/ejercicios/press_banca_barra?vista=musculos')
  ok('Ficha en capas con la nota fija de la 1.4 accesible', await p.getByText('Principales:').first().waitFor({ timeout: 10000 }).then(() => true, () => false))
  await p.goto(B + '#/hoy')
  ok('Hoy ofrece retomar la parcial', await p.getByRole('region', { name: 'Sesión parcial' }).waitFor({ timeout: 10000 }).then(() => true, () => false))

  // Restaurar la copia completa de la 1.4 en una 1.5 limpia
  const ctx2 = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid', deviceScaleFactor: 1 })
  const q = await ctx2.newPage()
  watch(q)
  await q.goto(B + '#/ajustes/copias')
  await q.locator('input[type="file"]').setInputFiles(backupPath)
  await q.getByRole('button', { name: 'Reemplazar mis datos' }).click()
  await q.getByRole('alertdialog').getByRole('button', { name: 'Reemplazar' }).click()
  await q.getByText('Datos reemplazados por la copia').waitFor({ timeout: 10000 })
  const restored = await snapshot(q)
  // Las fotos solo viajan en la copia si se pide expresamente (por defecto no): no se comparan aquí.
  for (const k of ['sessions', 'sets', 'versions', 'routines', 'notes', 'favTemplates', 'drop']) ok(`D19 copia 1.4 restaurada en 1.5: ${k}`, JSON.stringify(restored[k]) === JSON.stringify(before[k]))
  const prof2 = (await idb(q, 'profile'))[0]
  ok('D19 perfil de la copia 1.4 migrado al restaurar', prof2.experience === 'intermediate' && !!prof2.continuity)
  ok('Sin errores de página', errs.length === 0, JSON.stringify(errs))
  await browser.close()
  console.log(`[${engine}] RESUMEN: ${results.filter(Boolean).length}/${results.length}`)
  process.exit(results.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error(`[${engine}] FALLO`, e.message.split('\n').slice(0, 8).join('\n')); process.exit(1) })
