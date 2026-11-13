import { useEffect, useState } from 'react'

/** Enrutado por hash: funciona en cualquier subruta (GitHub Pages) y sin servidor. */
export interface Route {
  path: string[]
  query: URLSearchParams
}

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [p, q] = h.split('?')
  return { path: p ? p.split('/').map(decodeURIComponent) : [], query: new URLSearchParams(q ?? '') }
}

export function useRoute(): Route {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => setR(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export function go(path: string, replace = false): void {
  const target = `#/${path.replace(/^\//, '')}`
  if (replace) window.location.replace(target)
  else window.location.hash = target
}

export function back(fallback = 'hoy'): void {
  if (window.history.length > 1) window.history.back()
  else go(fallback, true)
}

export function href(path: string): string {
  return `#/${path.replace(/^\//, '')}`
}
