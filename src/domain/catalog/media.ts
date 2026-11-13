import type { MediaItem } from '../types'
import manifest from './media-manifest.json'
import commons from './media-manifest-commons.json'

export const MEDIA_MANIFEST = manifest as unknown as {
  generatedAt: string
  source: { repo: string; commit: string; license: string; licenseUrl: string; author: string }
  excluded: Record<string, string>
  items: MediaItem[]
}

/** Demostraciones de Wikimedia Commons (licencia por archivo; ver docs/CONTENIDOS_Y_LICENCIAS.md). */
export const COMMONS_MANIFEST = commons as unknown as { generatedAt: string; items: MediaItem[] }

/** Todas las demostraciones incluidas en la app. */
export const ALL_MEDIA: MediaItem[] = [...MEDIA_MANIFEST.items, ...COMMONS_MANIFEST.items]

export const MEDIA_BY_ID: Record<string, MediaItem> = Object.fromEntries(ALL_MEDIA.map((m) => [m.id, m]))
const MEDIA_BY_EXERCISE: Record<string, MediaItem> = Object.fromEntries(ALL_MEDIA.map((m) => [m.exerciseId, m]))

export function mediaForExercise(exerciseId: string): MediaItem | undefined {
  return MEDIA_BY_EXERCISE[exerciseId]
}

/** URL absoluta de un recurso de /public respetando la base de despliegue. */
export function assetUrl(path: string): string {
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? '/'
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export function demoUrls(exerciseIds: string[]): string[] {
  const out: string[] = []
  for (const id of exerciseIds) {
    const m = mediaForExercise(id)
    if (m?.frames) out.push(...m.frames.map(assetUrl))
  }
  return [...new Set(out)]
}

export function demoBytes(exerciseIds: string[]): number {
  return [...new Set(exerciseIds)].reduce((s, id) => s + (mediaForExercise(id)?.bytes ?? 0), 0)
}

/** Extrae el ID de un enlace de YouTube (11 caracteres) o null. No inventa IDs. */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\.|^m\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else {
        const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/)
        id = m ? m[2] : null
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export function youTubeEmbedUrl(id: string): string {
  // Modo de privacidad mejorada y reproducción dentro de la página en iPhone.
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`
}
