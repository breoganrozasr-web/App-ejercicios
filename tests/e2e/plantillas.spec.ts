import { expect, test, type Page } from '@playwright/test'
import { acceptProposal, collectErrors, onboard, markDone } from './helpers'

async function count(page: Page, store: string): Promise<number> {
  return page.evaluate((st) => new Promise<number>((resolve) => {
    const r = indexedDB.open('forja')
    r.onsuccess = () => { const t = r.result.transaction([st], 'readonly').objectStore(st).count(); t.onsuccess = () => resolve(t.result) }
  }), store)
}

async function noHScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
}

test('C01 · C04 · C20 · catálogo: búsqueda por alias, filtros, conflicto de frecuencia visible y sin desbordes', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page, { freq: '2' })
  await page.goto('/#/rutinas')
  await page.getByRole('link', { name: 'Buscar plantilla (26)' }).click()
  await expect(page.getByRole('heading', { name: /Encajan con tu perfil/ })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar plantilla' }).fill('push pull legs')
  await expect(page.getByRole('heading', { name: '3 resultados' })).toBeVisible()
  const ppl3 = page.getByRole('region', { name: 'Empuje / tirón / pierna (PPL) · 3 días' })
  await expect(ppl3).toContainText('Pecho, espalda, cuádriceps, isquios y glúteos: 1 día/semana')
  await expect(ppl3).toContainText('No encaja con frecuencia 2')
  await page.getByRole('searchbox', { name: 'Buscar plantilla' }).fill('SBD')
  await expect(page.getByRole('heading', { name: /5 resultados/ })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar plantilla' }).fill('')
  await page.getByRole('button', { name: /^Filtros/ }).click()
  await page.getByRole('group', { name: 'Días' }).getByRole('button', { name: '4' }).click()
  await page.getByRole('group', { name: 'Objetivo' }).getByRole('button', { name: 'Fuerza + músculo' }).click()
  await expect(page.getByRole('region', { name: 'Fuerza + hipertrofia · 4 días' })).toBeVisible()
  expect(await noHScroll(page)).toBe(true)
  // Todos los botones de la tarjeta tienen al menos 44 px de alto.
  const heights = await page.getByRole('region', { name: 'Fuerza + hipertrofia · 4 días' }).locator('button, a.btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44)
  expect(errors).toEqual([])
})

test('C14 · comparar hasta tres y previsualizar no cambia nada; aceptar guarda; no durante un entrenamiento', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  const routines = await count(page, 'routines')
  await page.goto('/#/rutinas/plantillas')
  await page.getByRole('button', { name: 'Ver todas (26)' }).click()
  for (const name of ['Torso / pierna · 4 días', 'Fuerza + hipertrofia · 4 días', 'Anterior / posterior · 4 días']) {
    await page.getByRole('region', { name }).first().getByRole('button', { name: 'Comparar' }).click()
  }
  await page.getByRole('button', { name: 'Comparar', exact: true }).first().click()
  await expect(page.locator('header .title', { hasText: 'Comparar plantillas' })).toBeVisible()
  await expect(page.getByText('Peso muerto convencional 1')).toBeVisible()
  expect(await noHScroll(page)).toBe(true)
  await page.getByRole('link', { name: 'Elegir y revisar la 2' }).click()
  await expect(page.getByRole('heading', { name: 'Fuerza + hipertrofia · 4 días' })).toBeVisible()
  await expect(page.getByText('Vista previa sin cambiar tu rutina.')).toBeVisible()
  await expect(page.getByText(/\(plan base\) ·.*durante el aprendizaje/).first()).toBeVisible()
  // «Por qué estas series»: explicación calculada
  await page.getByRole('button', { name: 'Por qué estas series' }).first().click()
  await expect(page.getByText(/Este ejercicio aporta 3 series esta sesión\. En tu calendario hay 10 directas semanales para pecho/)).toBeVisible()
  await expect(page.getByText(/dosis base de la plantilla A15/)).toBeVisible()
  await page.getByRole('button', { name: 'Comparar añadir una serie' }).first().click()
  await expect(page.getByText(/Con una serie más: 11 directas semanales para pecho/)).toBeVisible()
  await page.goBack()
  await page.goBack()
  expect(await count(page, 'routines')).toBe(routines)
  // Con un entrenamiento en curso no se acepta.
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await page.getByRole('button', { name: 'Omitir' }).click().catch(() => {})
  await expect(page.getByRole('button', { name: 'Terminar', exact: true })).toBeVisible()
  await page.goto('/#/rutinas/plantillas/sh4')
  await expect(page.getByText(/Tienes un entrenamiento en curso/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Usar esta plantilla' })).toBeDisabled()
  expect(await count(page, 'routines')).toBe(routines)
})

test('C02 · Hoy explica la adaptación con días válidos; la receta conserva 3 series', async ({ page }) => {
  await onboard(page)
  await page.goto('/#/rutinas/plantillas/fb3_gym')
  await page.getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(page.getByTestId('adaptation-line')).toContainText('Hoy: adaptación · 10 series de trabajo. Plan base después: 16 series de trabajo. Te quedan 4 días válidos')
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await expect(page.locator('section.wk-ex').first().getByText('Adaptación', { exact: true })).toBeVisible()
})

test('C16 · corregir una sesión guardada con vista previa y deshacer; tolerancia opcional', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const ex = page.locator('section.wk-ex').first()
  await ex.getByRole('textbox', { name: /, serie 1$/ }).first().fill('40')
  await ex.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('10')
  await markDone(ex, 1)
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar como parcial' }).click()
  await page.getByRole('button', { name: 'Cerrar y pasar a la siguiente' }).click().catch(() => {})
  await page.goto('/#/progreso')
  await page.locator('a[href^="#/progreso/sesion/"]').first().click()
  await page.getByRole('group', { name: 'Dificultad percibida' }).getByRole('button', { name: 'Muy dura' }).click()
  await expect(page.getByRole('group', { name: 'Dificultad percibida' }).getByRole('button', { name: 'Muy dura' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Editar sesión' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('textbox', { name: 'Peso Serie 1' }).first().fill('42,5')
  await page.getByRole('textbox', { name: 'RIR Serie 1' }).first().fill('2')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  const dlg = page.getByRole('alertdialog')
  await expect(dlg).toContainText('serie 1: 40 → 42,5 kg')
  await expect(dlg).toContainText('— → 2 RIR')
  await dlg.getByRole('button', { name: 'Guardar corrección' }).click()
  await expect(page.getByText(/42,5 kg/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer la última corrección' }).click()
  await expect(page.getByText(/^40 kg/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Deshacer la última corrección' })).toHaveCount(0)
})

test('6.1 · rutina de un motor anterior: tarjeta discreta, comparar y mantener', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  // Simula una rutina guardada por un motor anterior (como las del navegador de revisión).
  await page.evaluate(() => new Promise<void>((resolve) => {
    const r = indexedDB.open('forja')
    r.onsuccess = () => {
      const tx = r.result.transaction(['routineVersions'], 'readwrite')
      const os = tx.objectStore('routineVersions')
      os.getAll().onsuccess = (e) => {
        for (const v of (e.target as IDBRequest).result) { v.engineVersion = '1.0.0'; delete v.plan; os.put(v) }
      }
      tx.oncomplete = () => resolve()
    }
  }))
  await page.goto('/#/hoy')
  await page.reload()
  await page.getByRole('link', { name: 'Hay nuevas opciones para revisar tu rutina' }).click()
  const card = page.getByRole('region', { name: 'Nuevas opciones para revisar tu rutina' })
  await expect(card).toContainText('motor 1.0.0')
  await card.getByRole('button', { name: 'Comparar con una propuesta actualizada' }).click()
  await expect(card.getByRole('table')).toContainText('Sesión más larga')
  const versions = await count(page, 'routineVersions')
  await card.getByRole('button', { name: 'Mantener' }).click()
  await expect(card).toHaveCount(0)
  expect(await count(page, 'routineVersions')).toBe(versions)
})

test('C18 · catálogo, plantillas, artículos y fichas nuevas funcionan sin conexión', async ({ page, context }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.goto('/#/rutinas/plantillas')
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 15000 }).catch(() => {})
  await page.reload()
  await context.setOffline(true)
  await page.goto('/#/rutinas/plantillas/sh4')
  await expect(page.getByRole('heading', { name: 'Fuerza + hipertrofia · 4 días' })).toBeVisible()
  await page.goto('/#/aprender/dos-o-tres-series')
  await expect(page.getByText(/Dos series pueden ser suficientes para progresar/)).toBeVisible()
  await expect(page.getByText(/Certeza:/)).toBeVisible()
  await page.goto('/#/ejercicios/peso_muerto_convencional')
  await expect(page.getByRole('heading', { name: 'Peso muerto convencional con barra' })).toBeVisible()
  await expect(page.getByText('Qué aporta')).toBeVisible()
  await page.goto('/#/aprender/fuentes?f=F01')
  await expect(page.getByText(/Misma publicación que/).first()).toBeVisible()
  await context.setOffline(false)
})
