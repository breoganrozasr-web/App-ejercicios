/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// BASE: '/' en local; para GitHub Pages se pasa BASE=/nombre-repo/ en el build.
const base = process.env.BASE ?? '/'

// Commit de la build (para comprobar que la web publicada es la versión correcta).
function buildCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'local'
  } catch {
    return 'local'
  }
}

export default defineConfig({
  base,
  define: { __BUILD_COMMIT__: JSON.stringify(buildCommit()) },
  build: {
    rollupOptions: {
      output: {
        // Librerías en ficheros aparte: cambian poco y se reaprovechan entre actualizaciones.
        manualChunks: { react: ['react', 'react-dom'], dexie: ['dexie', 'dexie-react-hooks'], icons: ['lucide-react'] },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg', 'LICENSES/*'],
      manifest: {
        name: 'Forja · Cuaderno de entrenamiento',
        short_name: 'Forja',
        description: 'Rutinas, demostraciones y registro de entrenamiento. Funciona sin conexión y sin cuentas.',
        lang: 'es-ES',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#16130f',
        theme_color: '#16130f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo la app (código, estilos, iconos, fuentes). Las demostraciones se descargan aparte, bajo demanda.
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,webmanifest}'],
        globIgnores: ['media/**'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/media/ek/') || url.pathname.includes('/media/wc/'),
            handler: 'CacheFirst',
            options: { cacheName: 'forja-demos-v1', expiration: { maxEntries: 400 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: ['tests/unit/setup.ts'],
  },
})
