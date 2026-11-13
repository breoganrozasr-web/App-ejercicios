import { demoUrls } from '../domain/catalog/media'

/** Caché de demostraciones descargadas (contenido con licencia que permite uso offline). Nunca incluye vídeos de YouTube. */
export const DEMO_CACHE = 'forja-demos-v1'

function cachesAvailable(): boolean {
  return typeof caches !== 'undefined'
}

export async function downloadDemos(exerciseIds: string[], onProgress?: (done: number, total: number) => void): Promise<{ ok: number; failed: number }> {
  if (!cachesAvailable()) throw new Error('Este navegador no permite guardar archivos para usar sin conexión.')
  const cache = await caches.open(DEMO_CACHE)
  const urls = demoUrls(exerciseIds)
  let ok = 0
  let failed = 0
  let i = 0
  for (const url of urls) {
    try {
      const hit = await cache.match(url)
      if (!hit) {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) throw new Error(String(res.status))
        await cache.put(url, res)
      }
      ok++
    } catch {
      failed++
    }
    onProgress?.(++i, urls.length)
  }
  return { ok, failed }
}

export async function demoCacheInfo(): Promise<{ files: number; bytes: number }> {
  if (!cachesAvailable()) return { files: 0, bytes: 0 }
  const cache = await caches.open(DEMO_CACHE)
  const keys = await cache.keys()
  let bytes = 0
  for (const k of keys) {
    const r = await cache.match(k)
    if (r) bytes += (await r.clone().blob()).size
  }
  return { files: keys.length, bytes }
}

export async function cachedUrls(): Promise<Set<string>> {
  if (!cachesAvailable()) return new Set()
  const cache = await caches.open(DEMO_CACHE)
  return new Set((await cache.keys()).map((k) => new URL(k.url).pathname))
}

export async function clearDemos(): Promise<void> {
  if (!cachesAvailable()) return
  await caches.delete(DEMO_CACHE)
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
