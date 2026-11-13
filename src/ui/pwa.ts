import { useEffect, useState } from 'react'

/**
 * Registro del service worker con actualización SEGURA:
 *  - registerType 'prompt': la nueva versión espera; nunca se recarga sola.
 *  - Si hay un entrenamiento activo, el aviso pide terminarlo antes (los datos ya están guardados en IndexedDB).
 *  - Actualizar no borra IndexedDB: solo cambia los archivos de la app.
 */
let updateFn: ((reload?: boolean) => Promise<void>) | null = null
const listeners = new Set<(v: boolean) => void>()
let needRefresh = false

export async function registerPWA(): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  const { registerSW } = await import('virtual:pwa-register')
  updateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true
      listeners.forEach((l) => l(true))
    },
    onRegisteredSW(_url, reg) {
      // Comprobación periódica de actualizaciones (cada 6 h) sin interrumpir.
      if (reg) setInterval(() => reg.update().catch(() => undefined), 6 * 3600 * 1000)
    },
  })
}

export function useNeedRefresh(): [boolean, () => Promise<void>] {
  const [v, setV] = useState(needRefresh)
  useEffect(() => {
    listeners.add(setV)
    return () => void listeners.delete(setV)
  }, [])
  return [v, async () => updateFn?.(true)]
}

export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function persistenceStatus(): Promise<boolean | null> {
  if (!navigator.storage?.persisted) return null
  try {
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
