import { useEffect } from 'react'

type Sentinel = { release: () => Promise<void>; released?: boolean }
type WakeLockApi = { request: (t: 'screen') => Promise<Sentinel> }

/**
 * Mantiene la pantalla encendida mientras `active` (Screen Wake Lock API). Si el sistema no lo permite,
 * no hace nada. El navegador libera el bloqueo al ocultar la app, así que se vuelve a pedir al volver.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const api = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock
    if (!active || !api) return
    let sentinel: Sentinel | null = null
    let cancelled = false
    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await api.request('screen')
        if (cancelled) await sentinel.release()
      } catch {
        /* no permitido (batería baja, ajustes del sistema…) */
      }
    }
    void request()
    const onVis = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void request()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      void sentinel?.release().catch(() => undefined)
    }
  }, [active])
}

export function wakeLockSupported(): boolean {
  return 'wakeLock' in navigator
}
