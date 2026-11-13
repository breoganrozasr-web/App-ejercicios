import { defineConfig, devices } from '@playwright/test'

// Nota: en este entorno solo hay Chromium. Se emula el viewport, la escala y el agente de iPhone,
// pero NO es WebKit/Safari real. Ver docs/PRUEBAS.md para la verificación pendiente en iPhone físico.
const iphone = (name: keyof typeof devices) => ({ ...devices[name], browserName: 'chromium' as const, defaultBrowserType: 'chromium' as const })

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', locale: 'es-ES', timezoneId: 'Europe/Madrid', trace: 'off' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'iphone-13', use: iphone('iPhone 13') },
    { name: 'iphone-se', use: iphone('iPhone SE'), testMatch: /layout\.spec\.ts/ },
    { name: 'iphone-15-pro-max', use: iphone('iPhone 15 Pro Max'), testMatch: /layout\.spec\.ts/ },
    // WebKit (motor de Safari en Linux; NO es iOS). Solo si está instalado: PW_WEBKIT=1 npm run e2e -- --project=webkit-iphone-13
    ...(process.env.PW_WEBKIT ? [{ name: 'webkit-iphone-13', use: { ...devices['iPhone 13'] } }] : []),
  ],
})
