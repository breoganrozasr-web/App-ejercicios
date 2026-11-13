import { expect, type Page } from '@playwright/test'

export async function onboard(page: Page, opts: { days?: string[]; freq?: string; home?: boolean } = {}) {
  await page.goto('/')
  await page.getByRole('button', { name: /Empezar \(2 minutos\)/ }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  if (opts.days) {
    for (const d of ['lunes', 'miércoles', 'viernes']) await page.getByRole('button', { name: d, exact: true }).click()
    for (const d of opts.days) await page.getByRole('button', { name: d, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  if (opts.home) {
    await page.getByRole('button', { name: 'Gimnasio' }).click()
    await page.getByRole('button', { name: 'Casa' }).click()
  }
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  if (opts.freq) await page.getByRole('group', { name: 'Frecuencia' }).getByRole('button', { name: opts.freq }).click()
  await page.getByRole('button', { name: 'Ver mi propuesta' }).click()
  await expect(page.locator('header .title', { hasText: 'Propuesta' })).toBeVisible()
}

export async function acceptProposal(page: Page) {
  await page.getByRole('button', { name: 'Usar esta rutina' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
}

export async function countSessions(page: Page, status?: string): Promise<number> {
  return page.evaluate(async (st) => {
    return await new Promise<number>((resolve, reject) => {
      const req = indexedDB.open('forja')
      req.onsuccess = () => {
        const tx = req.result.transaction('sessions', 'readonly')
        const all = tx.objectStore('sessions').getAll()
        all.onsuccess = () => resolve((all.result as { status: string }[]).filter((s) => !st || s.status === st).length)
        all.onerror = () => reject(all.error)
      }
      req.onerror = () => reject(req.error)
    })
  }, status)
}

export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR/.test(m.text())) errors.push(m.text()) })
  return errors
}
