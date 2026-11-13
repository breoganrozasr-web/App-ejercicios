import { expect, test } from '@playwright/test'
import { acceptProposal, onboard } from './helpers'

test('Caso 9 · tras la primera carga funciona sin conexión; las demos descargadas se ven y las demás avisan', async ({ page, context }) => {
  await onboard(page)
  await acceptProposal(page)
  // Esperar a que el service worker controle la página
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  // Descargar demostraciones de la rutina
  await page.goto('/#/ajustes/demos')
  await page.getByRole('button', { name: /Descargar las de mi rutina/ }).click()
  await expect(page.getByText(/Demostraciones listas sin conexión/)).toBeVisible({ timeout: 20000 })

  await context.setOffline(true)
  await page.goto('/#/hoy')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  // Se puede entrenar sin conexión
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await expect(page.getByRole('button', { name: 'Terminar' })).toBeVisible()
  // La demo del primer ejercicio (descargada) se ve
  await page.locator('section.wk-ex').first().getByRole('button', { name: 'Ver cómo se hace' }).click()
  const img = page.locator('.sheet .demo img.frame').first()
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Cerrar' }).click()
  // Una demo NO descargada avisa claramente (las instrucciones siguen)
  await page.goto('/#/ejercicios/curl_concentrado')
  await expect(page.getByText(/Sin conexión y esta demostración no está descargada/)).toBeVisible()
  await expect(page.getByText('Cómo se hace')).toBeVisible()
  await context.setOffline(false)
})

test('Caso 12 · archivo de demostración roto: aviso comprensible y el registro sigue usable', async ({ page }) => {
  await page.route('**/media/ek/**', (r) => r.fulfill({ status: 404, body: '' }))
  await onboard(page)
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await page.locator('section.wk-ex').first().getByRole('button', { name: 'Ver cómo se hace' }).click()
  await expect(page.getByText('No se pudo cargar la demostración')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  const first = page.locator('section.wk-ex').first()
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await expect(first.getByRole('button', { name: 'Desmarcar serie 1' })).toBeVisible()
})

test('Caso 12 · vídeo externo (YouTube) en ejercicio propio: solo online, con enlace alternativo', async ({ page, context }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.goto('/#/ejercicios/nuevo')
  await page.getByLabel('Nombre').fill('Mi ejercicio de prueba')
  await page.getByRole('button', { name: 'Crear ejercicio' }).click()
  await expect(page.getByText('Demostración propia')).toBeVisible()
  await page.getByLabel('Enlace de demostración').fill('https://www.youtube.com/watch?v=aaaaaaaaaaa')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await expect(page.getByRole('link', { name: /Ver en YouTube/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=aaaaaaaaaaa')
  await expect(page.getByText(/No se descarga ni se guarda para uso sin conexión/)).toBeVisible()
  await context.setOffline(true)
  await expect(page.getByText('El vídeo necesita conexión')).toBeVisible()
  await context.setOffline(false)
  // Enlace no válido: rechazado
  await page.getByLabel('Enlace de demostración').fill('javascript:alert(1)')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await expect(page.getByText('Escribe un enlace https:// válido')).toBeVisible()
})
