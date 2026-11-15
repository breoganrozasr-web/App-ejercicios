import { expect, test, type Page } from '@playwright/test'
import { acceptProposal, collectErrors, markDone } from './helpers'

async function readActive(page: Page): Promise<{ exercises: { exerciseId: string; plannedIndex?: number; movedLater?: boolean; equipmentContext?: string; sets: { completed: boolean; weightKg: number | null; reps: number | null; groupId?: string }[] }[] }> {
  return page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('forja')
    r.onsuccess = () => { const t = r.result.transaction(['sessions'], 'readonly').objectStore('sessions').getAll(); t.onsuccess = () => res((t.result as { status: string }[]).find((s) => s.status === 'active')) }
  })) as never
}

async function onboardWith(page: Page, exp: 'Principiante' | 'Intermedio' | 'Avanzado', cont: 'Entreno con regularidad' | 'Vuelvo tras una pausa' | 'Aún no he empezado') {
  await page.goto('/')
  await page.getByRole('button', { name: /Empezar \(2 minutos\)/ }).click()
  await page.getByRole('group', { name: 'Tu experiencia' }).getByRole('button', { name: new RegExp(`^${exp}`) }).click()
  await page.getByRole('group', { name: 'Ahora mismo' }).getByRole('button', { name: cont }).click()
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Ver mi propuesta' }).click()
  await expect(page.locator('header .title', { hasText: 'Propuesta' })).toBeVisible()
}

test('D01–D03 · avanzado que vuelve: experiencia y situación separadas, plantilla intermedia con vuelta gradual sin historial', async ({ page }) => {
  const errors = collectErrors(page)
  await onboardWith(page, 'Avanzado', 'Vuelvo tras una pausa')
  await page.goto('/#/rutinas/plantillas/sh4')
  await expect(page.getByRole('heading', { name: 'Fuerza + hipertrofia · 4 días' })).toBeVisible()
  await page.getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  // La receta conserva su dosis; la vuelta gradual se aplica como dosis temporal.
  await expect(page.getByTestId('adaptation-line')).toContainText('Plan base después: 16 series de trabajo')
  await page.goto('/#/ajustes')
  await expect(page.getByText(/Avanzado · vuelvo tras una pausa/)).toBeVisible()
  await page.goto('/#/progreso/fase')
  await expect(page.getByText(/Experiencia declarada en tu perfil: avanzado · ahora mismo: vuelvo tras una pausa/)).toBeVisible()
  expect(errors).toEqual([])
})

test('D03 · «Preparar mi vuelta» sin historial compara hoy con el plan base y no cambia la plantilla', async ({ page }) => {
  await onboardWith(page, 'Intermedio', 'Entreno con regularidad')
  await page.goto('/#/rutinas/plantillas/sh4')
  await page.getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  await page.goto('/#/progreso/fase')
  await page.getByRole('button', { name: 'Preparar mi vuelta' }).click()
  await expect(page.getByText(/hoy 9 series de trabajo, RIR 3–4, .* · plan base 16 series/)).toBeVisible()
  await page.getByRole('button', { name: 'Aceptar la vuelta gradual' }).click()
  await expect(page.getByText(/Vuelta gradual: día válido 1 de 4/)).toBeVisible()
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await expect(page.locator('header.wk-head')).toContainText('readaptación 1/4')
  const s = await readActive(page)
  expect(s.exercises[0].sets.filter((x) => (x as { kind?: string }).kind === 'work').length).toBe(2)
})

test('D10–D13 · registro: valores preparados sin completar, borrador tras recargar, «Hacer después» y material', async ({ page }) => {
  await onboardWith(page, 'Principiante', 'Aún no he empezado')
  await acceptProposal(page)
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  await page.getByRole('button', { name: 'Omitir' }).click().catch(() => {})
  const first = page.locator('section.wk-ex').first()
  // Un toque sin datos solo PREPARA (no completa)
  await first.getByRole('button', { name: 'Marcar serie 1 como hecha' }).click()
  await expect(first.getByRole('button', { name: 'Marcar serie 1 como hecha' })).toBeVisible()
  let s = await readActive(page)
  expect(s.exercises[0].sets.some((x) => x.completed)).toBe(false)
  // Borrador con coma decimal que sobrevive a la recarga, sin completar
  await first.getByRole('textbox', { name: /, serie 1$/ }).first().fill('42,5')
  await page.reload()
  await expect(page.locator('section.wk-ex').first().getByRole('textbox', { name: /, serie 1$/ }).first()).toHaveValue('42,5')
  s = await readActive(page)
  expect(s.exercises[0].sets.filter((x) => x.completed)).toHaveLength(0)
  await markDone(page.locator('section.wk-ex').first(), 1)
  // Con todo hecho, «Hacer después» no se ofrece (solo reordena trabajo pendiente)
  s = await readActive(page)
  await page.locator('section.wk-ex').first().getByRole('button', { name: /^Opciones de / }).first().click()
  await expect(page.getByRole('button', { name: /Hacer después/ })).toHaveCount(0)
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
  // «Hacer después» sobre el segundo (pendiente): pasa al final, conserva su orden planificado y lo hecho no se toca
  const name1 = s.exercises[1].exerciseId
  await page.locator('section.wk-ex').nth(1).getByRole('button', { name: /^Opciones de / }).first().click()
  await page.getByRole('button', { name: /Hacer después/ }).click()
  s = await readActive(page)
  const last = s.exercises[s.exercises.length - 1]
  expect(last.exerciseId).toBe(name1)
  expect(last.plannedIndex).toBe(1)
  expect(last.movedLater).toBe(true)
  expect(s.exercises[0].sets.some((x) => x.completed && x.weightKg === 42.5)).toBe(true)
  // Material con nombre libre
  const second = page.locator('section.wk-ex').first()
  await second.getByRole('button', { name: /^Opciones de / }).first().click()
  await page.getByRole('button', { name: /^Material:/ }).click()
  await page.getByRole('textbox', { name: 'Nombre del material' }).fill('Prensa del fondo')
  await page.getByRole('button', { name: 'Usar', exact: true }).click()
  await expect.poll(async () => (await readActive(page)).exercises[0].equipmentContext).toBe('Prensa del fondo')
})

test('D05 · D12 · ficha en capas con esquema muscular; desde la sesión, la hoja conserva el registro', async ({ page }) => {
  await onboardWith(page, 'Principiante', 'Aún no he empezado')
  await page.goto('/#/ejercicios/press_banca_barra')
  await expect(page.getByText('Qué anotar:')).toBeVisible()
  await expect(page.getByRole('img', { name: /Músculos de Press de banca con barra: Pecho \(principal\)/ })).toBeVisible()
  await page.getByRole('button', { name: 'Qué trabaja' }).click()
  await page.getByRole('list', { name: /: lista$/ }).getByRole('button', { name: /Tríceps/ }).click()
  await expect(page.getByText('Cómo se calcula en el panel de series')).toBeVisible()
  await page.getByRole('button', { name: 'Historial' }).click()
  await expect(page.getByText(/Aún no hay registros|Tu historial/).first()).toBeVisible()
  // Enlace externo V01 en el convencional, sin carga automática de terceros
  await page.goto('/#/ejercicios/peso_muerto_convencional')
  await expect(page.getByText(/NASM .*Barbell Deadlift.*V01/)).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.getByText(/sin revisión visual cuadro a cuadro/)).toBeVisible()
})

test('D16 · «Personalizar series»: principal 1×4–6 + complementarias 2×6–8 crea versión y la sesión usa grupos', async ({ page }) => {
  await onboardWith(page, 'Intermedio', 'Entreno con regularidad')
  await page.goto('/#/rutinas/plantillas/sh4')
  await page.getByRole('button', { name: 'Usar esta plantilla' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  await page.goto('/#/rutinas')
  await page.locator('a.card').first().click()
  await page.getByRole('link', { name: 'Editar' }).click()
  const card = page.locator('.card.flat.tight').first()
  await card.getByText('Personalizar series').click()
  await card.getByRole('button', { name: 'Usar objetivos por serie' }).click()
  const g1 = card.locator('[aria-label="Grupo 1"]')
  await g1.getByRole('combobox', { name: 'Etiqueta del grupo 1' }).selectOption('principal')
  await g1.getByRole('textbox', { name: 'Series' }).fill('1')
  await card.getByRole('button', { name: 'Duplicar' }).click()
  const g2 = card.locator('[aria-label="Grupo 2"]')
  await g2.getByRole('combobox', { name: 'Etiqueta del grupo 2' }).selectOption('complementaria')
  await g2.getByRole('textbox', { name: 'Series' }).fill('2')
  await g2.getByRole('textbox', { name: 'Rep. mín.' }).fill('6')
  await g2.getByRole('textbox', { name: 'Rep. máx.' }).fill('8')
  await expect(card).toContainText('1×4–6 principal + 2×6–8 complementaria')
  await page.getByRole('button', { name: 'Guardar versión' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('v2', { exact: true })).toBeVisible()
  await page.goto('/#/hoy')
  await page.getByRole('button', { name: /^Empezar$/ }).click()
  const s = await readActive(page)
  const groups = s.exercises[0].sets.filter((x) => x.groupId).map((x) => x.groupId)
  expect(groups).toHaveLength(3)
  expect(new Set(groups).size).toBe(2)
  await expect(page.locator('section.wk-ex').first().getByLabel(/Sugerencia del grupo Principal 1×4–6/)).toBeVisible()
})

test('D18 · D24 · Ajustes agrupados con estado sin conexión real; Progreso en tres vistas conserva cuerpo y medidas', async ({ page }) => {
  await onboardWith(page, 'Principiante', 'Aún no he empezado')
  await acceptProposal(page)
  await page.goto('/#/ajustes')
  for (const h of ['Perfil y programa', 'Material', 'Durante el entrenamiento', 'Apariencia', 'Sin conexión y datos', 'Ayuda y versión']) await expect(page.locator('h2.section-title', { hasText: h }).first()).toBeVisible()
  const st = page.getByRole('list', { name: 'Estado sin conexión de tu rutina' })
  await expect(st).toContainText(/Demostraciones locales: \d+ de \d+ preparadas/)
  await expect(st).toContainText('Vídeos o páginas externas que necesitan internet')
  await page.goto('/#/progreso')
  await expect(page.getByRole('region', { name: 'Reparto muscular' })).toBeVisible()
  await page.getByRole('button', { name: 'Planificado' }).click()
  await expect(page.getByRole('list', { name: /Planificado en tu rutina: por grupo/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cuerpo' }).click()
  await expect(page.getByRole('textbox', { name: 'Peso corporal de hoy en kg' })).toBeVisible()
  await page.getByRole('button', { name: 'Ejercicios' }).click()
  await expect(page.getByText(/Cuando registres ejercicios|Evolución de un ejercicio/).first()).toBeVisible()
})

test('D23 · texto al 200 % sin desplazamiento horizontal en las pantallas nuevas', async ({ page }) => {
  await onboardWith(page, 'Principiante', 'Aún no he empezado')
  await acceptProposal(page)
  for (const r of ['ejercicios/press_banca_barra', 'progreso', 'ajustes', 'rutinas/plantillas', 'perfil']) {
    await page.goto(`/#/${r}`)
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await page.waitForTimeout(150)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(over, r).toBeLessThanOrEqual(2)
  }
})
