import { expect, test, type Page } from '@playwright/test'
import { acceptProposal, collectErrors, countSessions, onboard } from './helpers'

/** Lee una sesión de IndexedDB (la activa o la indicada). */
async function readSession(page: Page, status = 'active'): Promise<{ id: string; exercises: { exerciseId: string; sets: { kind: string; method?: string; weightKg: number | null; reps: number | null; completed: boolean; block?: { segments: { weightKg: number | null; reps: number | null; pauseSec: number | null }[]; ended: string | null; plannedSegments: number } }[] }[]; rest: { kind?: string; durationSec: number } | null }> {
  return page.evaluate((st) => new Promise((resolve, reject) => {
    const req = indexedDB.open('forja')
    req.onsuccess = () => {
      const all = req.result.transaction('sessions', 'readonly').objectStore('sessions').getAll()
      all.onsuccess = () => resolve((all.result as { status: string }[]).filter((s) => s.status === st)[0] as never)
      all.onerror = () => reject(all.error)
    }
  }), status)
}

/**
 * Siembra historial real (no de ejemplo) de la rutina actual: una sesión completa por fecha, con todas las series de trabajo
 * hechas. Se escribe directamente en IndexedDB y después se recarga la página.
 */
async function seedHistory(page: Page, dates: string[]): Promise<void> {
  await page.evaluate((ds) => new Promise<void>((resolve, reject) => {
    const req = indexedDB.open('forja')
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(['meta', 'routines', 'routineVersions', 'sessions'], 'readwrite')
      const meta = tx.objectStore('meta').get('currentRoutineId')
      meta.onsuccess = () => {
        const rid = (meta.result as { value: string }).value
        const r = tx.objectStore('routines').get(rid)
        r.onsuccess = () => {
          const v = tx.objectStore('routineVersions').get((r.result as { currentVersionId: string }).currentVersionId)
          v.onsuccess = () => {
            const version = v.result as { id: string; days: { id: string; name: string; exercises: { exerciseId: string; prescription: { sets: number } }[] }[] }
            ds.forEach((date, i) => {
              const day = version.days[i % version.days.length]
              const t = new Date(`${date}T18:00:00`).getTime()
              tx.objectStore('sessions').put({
                id: `seed-${date}-${i}`, status: 'completed', routineId: rid, routineVersionId: version.id, dayId: day.id, title: day.name, date, startedAt: t, endedAt: t + 3600000, pausedAt: null, pausedTotalMs: 0,
                exercises: day.exercises.map((e, j) => ({
                  uid: `u${i}-${j}`, exerciseId: e.exerciseId, nameSnapshot: e.exerciseId, loadTypeSnapshot: 'machine', unilateralSnapshot: false, prescription: e.prescription, notes: '', painFlag: false,
                  sets: Array.from({ length: e.prescription.sets }, (_, k) => ({ id: `s${i}-${j}-${k}`, kind: 'work', weightKg: 40, reps: 10, rir: 2, durationSec: null, distanceM: null, assistKg: null, addedKg: null, bandLabel: null, side: 'both', completed: true, completedAt: t })),
                })),
                notes: '', rampApplied: false, engineVersion: 'seed', updatedAt: t, rest: null,
              })
            })
          }
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
  }), dates)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Primer ejercicio de la sesión con carga numérica (admite descendente). */
async function firstMachine(page: Page) {
  const sections = page.locator('section.wk-ex')
  const n = await sections.count()
  for (let i = 0; i < n; i++) {
    const sec = sections.nth(i)
    if (await sec.getByRole('textbox', { name: /^(kg de la máquina|kg de la polea|kg por mancuerna|kg totales), serie 1$/ }).count()) return sec
  }
  return sections.first()
}

test('B11 · B14 · descendente tramo a tramo: 40 × 10 → 30 × 8, recarga en medio, doble toque y deshacer', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page, { level: 'Intermedio' })
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const ex = await firstMachine(page)
  const name = (await ex.getAttribute('aria-label'))!.replace(/^\d+\. /, '')
  await ex.getByRole('button', { name: 'Opciones de serie 2' }).click()
  await page.getByRole('button', { name: 'Como bloque descendente: añade una bajada' }).click()
  const block = page.getByRole('group', { name: `Descendente, bloque 2 de ${name}` })
  await expect(block).toBeVisible()
  await block.getByRole('textbox', { name: /tramo inicial del bloque 2/ }).first().fill('40')
  await block.getByRole('textbox', { name: 'Repeticiones, tramo inicial del bloque 2' }).fill('10')
  await block.getByRole('button', { name: 'Registrar tramo' }).dblclick()
  await expect(block.getByText(/Siguiente: baja a \d/)).toBeVisible()
  // Recarga con el bloque a medias: vuelve en el tramo correcto
  await page.reload()
  const block2 = page.getByRole('group', { name: `Descendente, bloque 2 de ${name}` })
  await expect(block2.getByRole('button', { name: 'Continuar bajada' })).toBeVisible()
  let s = await readSession(page)
  let set = s.exercises.flatMap((e) => e.sets).find((x) => x.method === 'drop')!
  expect(set.block!.segments.map((x) => [x.weightKg, x.reps])).toEqual([[40, 10]])
  await block2.getByRole('button', { name: 'Continuar bajada' }).click()
  await page.waitForTimeout(750)
  await block2.getByRole('textbox', { name: /bajada 1 del bloque 2/ }).first().fill('30')
  await block2.getByRole('textbox', { name: 'Repeticiones, bajada 1 del bloque 2' }).fill('8')
  await block2.getByRole('button', { name: 'Registrar tramo' }).click()
  await expect(block2.getByText('Bloque completo.')).toBeVisible()
  await expect(page.getByRole('timer', { name: 'Descanso' })).toBeVisible()
  await page.waitForTimeout(750)
  s = await readSession(page)
  set = s.exercises.flatMap((e) => e.sets).find((x) => x.method === 'drop')!
  expect(set.block!.segments.map((x) => [x.weightKg, x.reps])).toEqual([[40, 10], [30, 8]])
  expect(set.block!.segments[1].pauseSec).not.toBeNull()
  expect(set.weightKg).toBeNull()
  expect(set.reps).toBeNull()
  // Deshacer el último tramo conserva el anterior
  await block2.getByRole('button', { name: 'Deshacer último tramo' }).click()
  s = await readSession(page)
  set = s.exercises.flatMap((e) => e.sets).find((x) => x.method === 'drop')!
  expect(set.block!.segments).toHaveLength(1)
  expect(await countSessions(page)).toBe(1)
  expect(errors).toEqual([])
})

test('B13 · B15 · rest-pause: pausa breve que sobrevive a la recarga, misma carga y terminar antes', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page, { level: 'Intermedio' })
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const ex = await firstMachine(page)
  const name = (await ex.getAttribute('aria-label'))!.replace(/^\d+\. /, '')
  await ex.getByRole('button', { name: 'Opciones de serie 1' }).click()
  await page.getByRole('button', { name: 'Como bloque rest-pause: añade una miniserie' }).click()
  const block = page.getByRole('group', { name: `Rest-pause, bloque 1 de ${name}` })
  await block.getByRole('textbox', { name: /tramo inicial del bloque 1/ }).first().fill('20')
  await block.getByRole('textbox', { name: 'Repeticiones, tramo inicial del bloque 1' }).fill('12')
  await block.getByRole('button', { name: 'Registrar tramo' }).click()
  await expect(page.getByRole('timer', { name: 'Pausa breve' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('timer', { name: 'Pausa breve' })).toBeVisible()
  const b2 = page.getByRole('group', { name: `Rest-pause, bloque 1 de ${name}` })
  await b2.getByRole('button', { name: 'Empezar miniserie' }).click()
  await page.waitForTimeout(750)
  await expect(page.getByRole('timer', { name: 'Pausa breve' })).toHaveCount(0)
  await expect(b2.getByText(/misma carga/)).toBeVisible()
  await b2.getByRole('textbox', { name: 'Repeticiones, miniserie 1 del bloque 1' }).fill('4')
  await b2.getByRole('button', { name: 'Registrar tramo' }).click()
  await expect(b2.getByText('Bloque completo.')).toBeVisible()
  const s = await readSession(page)
  const set = s.exercises.flatMap((e) => e.sets).find((x) => x.method === 'rest_pause')!
  expect(set.block!.segments.map((x) => [x.weightKg, x.reps])).toEqual([[20, 12], [20, 4]])
  // Otra miniserie solo si se elige; luego terminar antes conserva lo hecho
  await page.waitForTimeout(750)
  await b2.getByRole('button', { name: /Otra miniserie/ }).click()
  await page.waitForTimeout(750)
  await b2.getByRole('button', { name: 'Terminar bloque' }).click()
  await expect(b2.getByText(/terminado antes de tiempo/).first()).toBeVisible()
  const s2 = await readSession(page)
  const set2 = s2.exercises.flatMap((e) => e.sets).find((x) => x.method === 'rest_pause')!
  expect(set2.block!.ended).toBe('early')
  expect(set2.block!.segments).toHaveLength(2)
  expect(errors).toEqual([])
})

test('B16 · reorganizar dos series pendientes con antes/después; lo hecho no se toca', async ({ page }) => {
  await onboard(page, { level: 'Intermedio' })
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const ex = await firstMachine(page)
  const field = ex.getByRole('textbox', { name: /, serie 1$/ }).first()
  await field.fill('35')
  await ex.getByRole('textbox', { name: 'Repeticiones, serie 1' }).fill('10')
  await ex.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await ex.getByRole('button', { name: /^Opciones de / }).first().click()
  await page.getByRole('button', { name: 'Reorganizar 2 series pendientes en un bloque…' }).click()
  await expect(page.getByText(/no se garantiza que el estímulo sea equivalente/)).toBeVisible()
  await page.getByRole('button', { name: /^Reorganizar en un bloque/ }).click()
  const s = await readSession(page)
  const sets = s.exercises.find((e) => e.sets.some((x) => x.method))!.sets.filter((x) => x.kind === 'work')
  expect(sets[0]).toMatchObject({ weightKg: 35, reps: 10, completed: true })
  expect(sets.filter((x) => x.method === 'drop')).toHaveLength(1)
  // Volver a series normales mientras no ha empezado
  await page.getByRole('button', { name: /^Opciones del bloque/ }).click()
  await page.getByRole('button', { name: /^Hacer series normales/ }).click()
  const s2 = await readSession(page)
  expect(s2.exercises.flatMap((e) => e.sets).some((x) => x.method)).toBe(false)
})

test('B18 · superserie: A1 → transición → A2 → descanso de la ronda; separar conserva lo registrado', async ({ page }) => {
  await onboard(page, { level: 'Intermedio' })
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const all = page.locator('section.wk-ex')
  const n = await all.count()
  const a1 = all.nth(n - 2)
  const a2 = all.nth(n - 1)
  await a1.getByRole('button', { name: /^Opciones de / }).first().click()
  await page.getByRole('button', { name: /^Superserie con el siguiente/ }).click()
  await expect(a1.getByRole('button', { name: /^Superserie A1/ })).toBeVisible()
  await expect(a2.getByRole('button', { name: /^Superserie A2/ })).toBeVisible()
  const a2name = (await a2.getAttribute('aria-label'))!.replace(/^\d+\. /, '')
  await a1.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  const transition = page.getByRole('timer', { name: 'Transición de superserie' })
  await expect(transition).toBeVisible()
  await expect(transition).toContainText(`Ahora: ${a2name}`)
  await a2.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await expect(page.getByRole('timer', { name: 'Descanso de la ronda' })).toBeVisible()
  const s = await readSession(page)
  expect(s.rest?.kind).toBe('round')
  await a1.getByRole('button', { name: /^Opciones de / }).first().click()
  await page.getByRole('button', { name: /^Separar la superserie/ }).click()
  await expect(a1.getByRole('button', { name: /^Superserie A1/ })).toHaveCount(0)
  await expect(a1.getByRole('button', { name: 'Desmarcar serie 1' })).toBeVisible()
  await expect(a2.getByRole('button', { name: 'Desmarcar serie 1' })).toBeVisible()
})

test('B05 · B06 · B07 · revisión de fase: tarjeta discreta, posponer, aceptar sin cambiar la experiencia declarada', async ({ page }) => {
  const errors = collectErrors(page)
  await onboard(page)
  await acceptProposal(page)
  await seedHistory(page, Array.from({ length: 14 }, (_, i) => daysAgo(56 - i * 4)))
  await page.reload()
  const card = page.getByRole('region', { name: 'Revisión del programa' })
  await expect(card.getByText('Ya tienes constancia suficiente para revisar tu programa.')).toBeVisible()
  await expect(card.getByText(/14 días válidos en \d+ semanas/)).toBeVisible()
  await card.getByRole('button', { name: 'Más adelante' }).click()
  await expect(page.getByRole('region', { name: 'Revisión del programa' })).toHaveCount(0)
  await page.goto('/#/progreso/fase')
  await expect(page.getByText(/Revisión pospuesta: se volverá a ofrecer a partir del/)).toBeVisible()
  // Se puede revisar igualmente desde aquí: autorregistro y propuesta comparada
  await page.getByRole('group', { name: '¿Manejas los ejercicios con control?' }).getByRole('button', { name: 'Sí' }).click()
  await page.getByRole('group', { name: /¿Toleras bien la rutina/ }).getByRole('button', { name: 'Sí' }).click()
  await page.getByRole('group', { name: '¿Tu tiempo disponible sigue siendo adecuado?' }).getByRole('button', { name: 'Sí' }).click()
  await expect(page.getByText(/mantener la rutina actual\. Subir de fase no obliga/)).toBeVisible()
  await page.getByRole('button', { name: 'Aceptar y pasar a Progresión' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Aceptar' }).click()
  await expect(page.getByRole('list', { name: 'Fases' }).getByText('Progresión')).toHaveAttribute('aria-current', 'step')
  await expect(page.getByText(/Experiencia declarada en tu perfil: desde cero/)).toBeVisible()
  // Aceptar sin cambios no crea versión nueva
  expect(await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('forja'); r.onsuccess = () => { const g = r.result.transaction('routineVersions', 'readonly').objectStore('routineVersions').count(); g.onsuccess = () => res(g.result) } }))).toBe(1)
  // B10: la nueva fase no activa técnicas sin consentimiento específico
  await page.goto('/#/rutinas')
  await page.locator('a.card').first().click()
  await expect(page.getByText(/Técnicas opcionales \(series descendentes, rest-pause, superseries\): desactivadas/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Añadir a la rutina' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('B08 · tras 21 días o más sin entrenar se ofrece readaptación; aceptarla reduce la dosis sin borrar nada', async ({ page }) => {
  await onboard(page, { level: 'Intermedio' })
  await acceptProposal(page)
  await seedHistory(page, [daysAgo(40), daysAgo(37), daysAgo(34), daysAgo(30)])
  await page.reload()
  const card = page.getByRole('region', { name: 'Vuelta tras una pausa' })
  await expect(card.getByText('Llevas 30 días sin entrenar.')).toBeVisible()
  await card.getByRole('button', { name: 'Sí, con readaptación' }).click()
  await expect(page.getByText(/Readaptación: sesión 1 de 4/)).toBeVisible()
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await expect(page.locator('header.wk-head')).toContainText('readaptación 1/4')
  expect(await countSessions(page)).toBe(5)
})

test('B09 · B10 · técnicas: sin consentimiento no se proponen; en familiarización tampoco aunque se activen', async ({ page }) => {
  await onboard(page)
  await acceptProposal(page)
  await page.goto('/#/rutinas')
  await page.locator('a.card').first().click()
  await expect(page.getByText(/Técnicas opcionales \(series descendentes, rest-pause, superseries\): desactivadas/)).toBeVisible()
  await page.goto('/#/ajustes/tecnicas')
  await page.getByText('Quiero usar técnicas para ahorrar tiempo o variar').click()
  await page.goto('/#/rutinas')
  await page.locator('a.card').first().click()
  const sec = page.getByRole('region', { name: 'Técnicas opcionales' })
  await expect(sec.getByText('No se proponen durante la familiarización.')).toBeVisible()
  await expect(sec.getByRole('button', { name: 'Añadir a la rutina' })).toHaveCount(0)
})
