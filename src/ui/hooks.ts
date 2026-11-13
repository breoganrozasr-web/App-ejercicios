import { useEffect, useState } from 'react'

export function useOnline(): boolean {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true)
    const b = () => setOn(false)
    window.addEventListener('online', a)
    window.addEventListener('offline', b)
    return () => {
      window.removeEventListener('online', a)
      window.removeEventListener('offline', b)
    }
  }, [])
  return on
}

export function useReducedMotion(): boolean {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const [r, setR] = useState(q?.matches ?? false)
  useEffect(() => {
    if (!q) return
    const on = () => setR(q.matches)
    q.addEventListener?.('change', on)
    return () => q.removeEventListener?.('change', on)
  }, [q])
  return r
}

/** Reloj que se actualiza cada `ms` y al volver a la app (los temporizadores se calculan con marcas de tiempo). */
export function useNow(ms = 1000, active = true): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), ms)
    const vis = () => setNow(Date.now())
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('focus', vis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('focus', vis)
    }
  }, [ms, active])
  return now
}
