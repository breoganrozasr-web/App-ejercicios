import { expect, test } from '@playwright/test'
import { acceptProposal, collectErrors, countSessions, onboard } from './helpers'

test('Caso 1/8 · perfil → rutina → entrenar con coma decimal → recargar → reanudar → terminar parcial', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page)
  await expect(page.getByText('Propuesta (aún no guardada)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Series semanales por músculo' })).toBeVisible()
  await acceptProposal(page)
  // Doble toque en Empezar: una sola sesión
  const start = page.getByRole('button', { name: /^Empezar$/ })
  await start.dblclick()
  await expect(page.getByRole('button', { name: 'Terminar' })).toBeVisible()
  expect(await countSessions(page, 'active')).toBe(1)

  const first = page.locator('section.wk-ex').first()
  await first.getByRole('textbox', { name: 'kg de la máquina, serie 1' }).fill('52,5')
  await first.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('10')
  // RIR opcional
  await first.getByRole('button', { name: 'RIR serie 1: sin anotar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '2', exact: true }).click()
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()

  // Recargar: todo sigue ahí (sin duplicar)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Terminar' })).toBeVisible()
  const firstAgain = page.locator('section.wk-ex').first()
  await expect(firstAgain.getByRole('textbox', { name: 'kg de la máquina, serie 1' })).toHaveValue('52,5')
  await expect(firstAgain.getByRole('textbox', { name: 'Repeticiones, serie 1' })).toHaveValue('10')
  await expect(firstAgain.getByRole('button', { name: 'Desmarcar serie 1' })).toBeVisible()
  await expect(firstAgain.getByRole('button', { name: 'RIR serie 1: 2' })).toBeVisible()
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()
  expect(await countSessions(page, 'active')).toBe(1)

  // Salir a Hoy y volver: “Continuar”
  await page.getByRole('button', { name: /Volver a Hoy/ }).click()
  await page.getByRole('link', { name: /Continuar/ }).click()
  await expect(page.getByRole('button', { name: 'Terminar' })).toBeVisible()

  // Terminar con series pendientes → parcial
  await page.getByRole('button', { name: 'Terminar' }).click()
  await expect(page.getByText('Faltan series por completar')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar como parcial' }).click()
  await expect(page.getByText('Parcial').first()).toBeVisible()
  await expect(page.getByText(/52,5 kg × 10 · RIR 2/)).toBeVisible()
  expect(await countSessions(page, 'partial')).toBe(1)
  expect(await countSessions(page)).toBe(1)

  // Progreso lo muestra
  await page.goto('/#/progreso')
  await expect(page.getByText('Constancia')).toBeVisible()
  await expect(page.getByText('1 sesión en total')).toBeVisible()
  expect(errors).toEqual([])
})

test('Caso 3 · dos días con frecuencia 3: conflicto explicado en la interfaz', async ({ page }) => {
  await onboard(page, { days: ['lunes', 'jueves'], freq: '3×' })
  await expect(page.getByText('Hay que decidir algo')).toBeVisible()
  await expect(page.getByText(/solo hay 2 sesiones/)).toBeVisible()
  await page.getByRole('button', { name: /Frecuencia 2 con 2 sesiones/ }).click()
  await expect(page.getByText('Propuesta (aún no guardada)')).toBeVisible()
})

test('Caso 2 · casa sin material: sin máquinas y con la carencia de tirón visible', async ({ page }) => {
  await onboard(page, { home: true })
  await expect(page.getByText(/no hay ningún ejercicio de tirón con carga/)).toBeVisible()
  await expect(page.getByText(/máquina|polea/i)).toHaveCount(0)
})

test('Caso 5 · sustituir durante la sesión conserva lo hecho y no copia los kg', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const first = page.locator('section.wk-ex').first()
  const name = (await first.locator('h3').textContent())!.replace(/^1\.\s*/, '')
  await first.getByRole('textbox', { name: 'kg de la máquina, serie 1' }).fill('80')
  await first.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('12')
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await first.getByRole('button', { name: `Opciones de ${name}` }).click()
  await page.getByRole('button', { name: 'Sustituir ejercicio' }).click()
  await page.locator('.sheet .list-item').first().click()
  await expect(page.getByText(/Sustituido por/)).toBeVisible()
  // El original conserva su serie hecha; el sustituto empieza vacío y sin los 80 kg
  await expect(page.locator('section.wk-ex').first().getByRole('textbox', { name: 'kg de la máquina, serie 1' })).toHaveValue('80')
  const sub = page.locator('section.wk-ex').nth(1)
  await expect(sub.getByText('Sustituto')).toBeVisible()
  await expect(sub.getByText(/Sin registros anteriores/)).toBeVisible()
  // Deshacer funciona
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('section.wk-ex').nth(1).getByText('Sustituto')).toHaveCount(0)
})

test('Caso 10 · exportar copia y rechazar archivo corrupto sin tocar los datos', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.goto('/#/ajustes/copias')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: /Exportar copia completa/ }).click()
  const file = await dl
  const path = await file.path()
  expect(file.suggestedFilename()).toMatch(/^forja-copia-\d{4}-\d{2}-\d{2}\.json$/)
  const fs = await import('node:fs')
  const json = JSON.parse(fs.readFileSync(path!, 'utf8'))
  expect(json.format).toBe('forja-backup')
  expect(json.tables.routines.length).toBe(1)

  const input = page.locator('input[type=file][accept*="json"]')
  await input.setInputFiles({ name: 'mala.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"forja-backup", roto') })
  await expect(page.getByRole('alert')).toContainText('No se ha restaurado nada')
  await input.setInputFiles({ name: 'buena.json', mimeType: 'application/json', buffer: fs.readFileSync(path!) })
  await expect(page.getByText('Vista previa de la copia')).toBeVisible()
  await page.getByRole('button', { name: 'Fusionar con mis datos' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Fusionar' }).click()
  await expect(page.getByText(/Fusionado: 0 nuevos/)).toBeVisible()
  await page.goto('/#/rutinas')
  await expect(page.locator('a.card h3')).toHaveCount(1)
})

test('Caso 11 · editar rutina crea versión nueva y las sesiones pasadas no cambian', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const first = page.locator('section.wk-ex').first()
  const original = await first.locator('h3').textContent()
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await page.getByRole('button', { name: 'Terminar' }).click()
  await page.getByRole('button', { name: 'Guardar como parcial' }).click()
  await expect(page.getByRole('button', { name: 'Editar sesión' })).toBeVisible()
  const sessionUrl = page.url()
  await page.goto('/#/rutinas')
  await page.locator('a.card').first().click()
  await page.getByRole('link', { name: 'Editar' }).click()
  await page.getByRole('button', { name: 'Quitar' }).first().click()
  await page.getByRole('button', { name: 'Guardar versión' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('v2', { exact: true })).toBeVisible()
  await page.goto(sessionUrl)
  await expect(page.getByRole('link', { name: original!.replace(/^1\.\s*/, '') })).toBeVisible()
})

test('Plantillas: todas se abren y se pueden activar sin errores', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page)
  await page.goto('/#/rutinas/plantillas')
  await expect(page.getByRole('heading', { name: 'Cuerpo completo · 2 días' })).toBeVisible()
  const links = await page.locator('a.card').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href')))
  expect(links.length).toBeGreaterThanOrEqual(10)
  for (const l of links) {
    await page.goto(`/${l}`)
    await expect(page.getByRole('button', { name: 'Usar esta plantilla' })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  expect(errors).toEqual([])
})
