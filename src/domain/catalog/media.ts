import type { MediaItem } from '../types'
import manifest from './media-manifest.json'

export const MEDIA_MANIFEST = manifest as unknown as {
  generatedAt: string
  source: { repo: string; commit: string; license: string; licenseUrl: string; author: string }
  excluded: Record<string, string>
  items: MediaItem[]
}

export const MEDIA_BY_ID: Record<string, MediaItem> = Object.fromEntries(MEDIA_MANIFEST.items.map((m) => [m.id, m]))

export function mediaForExercise(exerciseId: string): MediaItem | undefined {
  return MEDIA_BY_ID[`ek-${exerciseId}`]
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
