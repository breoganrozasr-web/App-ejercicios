import { expect, test, type Page } from '@playwright/test'
import { acceptProposal, onboard } from './helpers'

async function noHorizontalOverflow(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }))
  expect(r.sw, 'desbordamiento horizontal').toBeLessThanOrEqual(r.w + 1)
}

async function shot(page: Page, name: string) {
  const project = test.info().project.name
  await page.screenshot({ path: `test-results/screens/${project}-${name}.png` })
}

test('Caso 14 · pantallas principales en tamaños de iPhone, tema claro y oscuro, sin desbordes', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    for (const route of ['hoy', 'rutinas', 'ejercicios', 'progreso', 'ajustes', 'ejercicios/sentadilla_barra']) {
      await page.goto(`/#/${route}`)
      await page.waitForTimeout(150)
      await noHorizontalOverflow(page)
      await shot(page, `${scheme}-${route.replace('/', '_')}`)
    }
  }
  await page.emulateMedia({ colorScheme: 'light' })
  // Controles de la barra inferior ≥ 44 px
  await page.goto('/#/hoy')
  for (const tab of await page.locator('.tab').all()) {
    const b = await tab.boundingBox()
    expect(b!.height).toBeGreaterThanOrEqual(44)
    expect(b!.width).toBeGreaterThanOrEqual(44)
  }
})

test('Caso 14 · entrenamiento: campos y botones táctiles, teclado decimal y barras que no tapan el campo', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const first = page.locator('section.wk-ex').first()
  const kg = first.getByRole('textbox', { name: 'kg de la máquina, serie 1' })
  await expect(kg).toHaveAttribute('inputmode', 'decimal')
  await expect(first.getByRole('textbox', { name: 'Repeticiones, serie 1' })).toHaveAttribute('inputmode', 'numeric')
  const done = first.getByRole('button', { name: 'Marcar serie 1 como hecha' })
  const bb = await done.boundingBox()
  expect(bb!.height).toBeGreaterThanOrEqual(44)
  expect(bb!.width).toBeGreaterThanOrEqual(44)
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  // Con el temporizador de descanso visible, enfocar un campo de la última tarjeta: debe quedar por encima de la barra
  const lastCard = page.locator('section.wk-ex').last()
  const lastInput = lastCard.getByRole('textbox').last()
  await lastInput.focus()
  await page.waitForTimeout(700)
  const ib = await lastInput.boundingBox()
  const rb = await page.getByRole('timer', { name: 'Descanso' }).boundingBox()
  expect(ib!.y + ib!.height).toBeLessThanOrEqual(rb!.y + 1)
  await noHorizontalOverflow(page)
  await shot(page, 'workout')
  await page.emulateMedia({ colorScheme: 'dark' })
  await shot(page, 'workout-dark')
})

test('Caso 14 · orientación horizontal', async ({ page }) => {
  const vp = page.viewportSize()!
  await page.setViewportSize({ width: vp.height, height: vp.width })
  await onboard(page)
  await acceptProposal(page)
  await noHorizontalOverflow(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await noHorizontalOverflow(page)
  await shot(page, 'landscape-workout')
})
