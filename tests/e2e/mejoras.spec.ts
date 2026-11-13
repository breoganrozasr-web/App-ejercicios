import { expect, test, type Page } from '@playwright/test'
import { acceptProposal, collectErrors, countSessions, onboard } from './helpers'

async function finishAll(page: Page) {
  await page.getByRole('button', { name: 'Terminar' }).click()
  const partial = page.getByRole('button', { name: 'Guardar como parcial' })
  const full = page.getByRole('button', { name: 'Terminar y guardar' })
  await expect(partial.or(full)).toBeVisible()
  if (await partial.isVisible()) await partial.click()
  else await full.click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
}

test('Preparación del día, récord en directo, resumen con calorías y nota fija', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page)
  await acceptProposal(page)

  // Peso corporal para poder estimar calorías
  await page.goto('/#/progreso')
  await page.getByRole('textbox', { name: 'Peso corporal de hoy en kg' }).fill('75')
  await page.getByRole('button', { name: 'Anotar' }).first().click()
  await expect(page.getByText(/Último: 75 kg/)).toBeVisible()

  // 1.ª sesión: 50 × 10 en el primer ejercicio
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await expect(page.getByRole('heading', { name: '¿Cómo llegas hoy?' })).toBeVisible()
  await page.getByRole('button', { name: 'Omitir' }).click()
  await expect(page.getByRole('heading', { name: '¿Cómo llegas hoy?' })).toHaveCount(0)
  const ex1 = page.locator('section.wk-ex').first()
  await ex1.getByRole('textbox', { name: 'kg de la máquina, serie 1' }).fill('50')
  await ex1.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('10')
  await ex1.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await finishAll(page)
  await expect(page.getByLabel('Resumen de la sesión')).toBeVisible()
  await expect(page.getByText('Sesión demasiado corta para estimar calorías.')).toBeVisible() // < 5 min

  // 2.ª sesión del mismo día de rutina, con preparación baja
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: 'Otro día de la rutina' }).click()
  await page.getByRole('dialog').getByRole('button').filter({ hasText: 'Día A' }).click()
  await expect(page.getByRole('heading', { name: '¿Cómo llegas hoy?' })).toBeVisible()
  await page.getByRole('button', { name: 'Sueño 2' }).click()
  await page.getByRole('button', { name: 'Energía 3' }).click()
  await page.getByRole('button', { name: 'Agujetas 2' }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Hoy vas con menos margen')).toBeVisible()
  const pending = page.locator('section.wk-ex').getByRole('button', { name: /^Marcar serie \d+ como hecha$/ })
  const before = await pending.count()
  await page.getByRole('button', { name: 'Quitar una serie pendiente de cada ejercicio' }).click()
  await expect.poll(() => pending.count()).toBeLessThan(before)

  // Nota fija desde el menú del ejercicio
  const ex = page.locator('section.wk-ex').first()
  await ex.getByRole('button', { name: /^Opciones de / }).first().click()
  await page.getByRole('button', { name: /Nota fija/ }).click()
  await page.getByRole('textbox', { name: 'Nota fija' }).fill('Asiento en 4')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(ex.getByText('Asiento en 4')).toBeVisible()

  // Récord: más peso para las mismas repeticiones
  await ex.getByRole('textbox', { name: 'kg de la máquina, serie 1' }).fill('52,5')
  await ex.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('10')
  await ex.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await expect(page.getByRole('status').filter({ hasText: /Récord: 52,5 kg × 10/ })).toBeVisible()
  await finishAll(page)
  await expect(page.getByText('Récords en esta sesión')).toBeVisible()
  await expect(page.getByText(/Respecto a la vez anterior/)).toBeVisible()
  await expect(page.getByText(/sueño 2\/5/)).toBeVisible()
  expect(errors).toEqual([])
})

test('Registrar una sesión pasada y cambiarle la fecha', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page)
  await acceptProposal(page)
  await page.goto('/#/progreso')
  await page.getByRole('textbox', { name: 'Peso corporal de hoy en kg' }).fill('75')
  await page.getByRole('button', { name: 'Anotar' }).first().click()
  await expect(page.getByText(/Último: 75 kg/)).toBeVisible()
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: 'Registrar una sesión pasada' }).click()
  const dlg = page.getByRole('dialog')
  await dlg.getByLabel('Fecha').fill('2026-11-10')
  await dlg.getByLabel('Hora de inicio').fill('19:30')
  await dlg.getByRole('textbox', { name: 'Duración en minutos' }).fill('55')
  await dlg.getByRole('button', { name: 'Empezar a anotar' }).click()
  await expect(page.getByText(/Registro a posteriori · 10 nov/)).toBeVisible()
  await expect(page.getByRole('heading', { name: '¿Cómo llegas hoy?' })).toHaveCount(0)
  const ex1 = page.locator('section.wk-ex').first()
  await ex1.getByRole('textbox', { name: 'kg de la máquina, serie 1' }).fill('40')
  await ex1.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('12')
  await ex1.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await expect(page.getByRole('timer', { name: 'Descanso' })).toHaveCount(0) // sin descanso en registros a posteriori
  await finishAll(page)
  await expect(page.getByText('Registrada después')).toBeVisible()
  await expect(page.getByText(/10 de noviembre.*19:30 · 55 min/)).toBeVisible()
  await expect(page.getByText('240–340 kcal')).toBeVisible() // 3,5–5 MET × 75 kg × 55 min

  // Cambiar la fecha al día 8
  await page.getByRole('button', { name: 'Editar sesión' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-08')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText(/8 de noviembre/)).toBeVisible()
  await page.getByText(/Registro de cambios/).click()
  await expect(page.getByText(/fecha cambiada de 10 nov a 8 nov/)).toBeVisible()
  expect(await countSessions(page)).toBe(1)
  expect(errors).toEqual([])
})

test('Discos, calentamiento, medidas y ajustes de sonido', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page)
  await acceptProposal(page)
  await page.getByRole('button', { name: 'Sesión libre' }).click()
  await page.getByRole('button', { name: 'Añadir ejercicio' }).click()
  await page.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('Press de banca con barra')
  await page.getByRole('dialog').getByRole('button').filter({ hasText: 'Press de banca con barra' }).first().click()
  const ex = page.locator('section.wk-ex').first()
  await ex.getByRole('textbox', { name: /serie 1$/ }).first().fill('62,5')
  await ex.getByRole('button', { name: 'Discos' }).click()
  const dlg = page.getByRole('dialog')
  await expect(dlg.getByText('20 + 1,25 por lado')).toBeVisible()
  await expect(dlg.getByText('Calentamiento sugerido')).toBeVisible()
  await dlg.getByRole('textbox', { name: 'Peso total en kg' }).fill('100')
  await expect(dlg.getByText(/por lado/).first()).toBeVisible()
  await page.keyboard.press('Escape')

  // Medidas
  await page.goto('/#/progreso')
  await page.getByRole('textbox', { name: 'Cintura en centímetros' }).fill('82,5')
  await page.getByRole('button', { name: 'Anotar' }).nth(1).click()
  await expect(page.getByText('82,5 cm').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Último entrenamiento por músculo' })).toHaveCount(0) // sin sesiones aún
  await expect(page.getByRole('button', { name: 'Activar fotos de progreso' })).toBeVisible()

  // Ajustes de sonido y pantalla
  await page.goto('/#/ajustes/apariencia')
  await page.getByRole('group', { name: 'Aviso al terminar el descanso' }).getByRole('button', { name: 'Con música' }).click()
  await expect(page.getByText(/no suenan si el iPhone está en modo silencio/)).toBeVisible()
  await page.getByRole('button', { name: 'Probar sonido' }).click()
  await page.reload()
  await expect(page.getByRole('group', { name: 'Aviso al terminar el descanso' }).getByRole('button', { name: 'Con música' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Pantalla encendida durante el entrenamiento')).toBeVisible()
  expect(errors).toEqual([])
})
