/** Aviso de fin de descanso: sonido corto (Web Audio) y vibración si el sistema lo permite. Solo con la app abierta. */
let ctx: AudioContext | null = null

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem('forja-sound') !== 'off'
  } catch {
    return true
  }
}
export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem('forja-sound', on ? 'on' : 'off')
  } catch {
    /* sin almacenamiento */
  }
}

/** Debe llamarse en un gesto del usuario (iOS solo permite audio tras una interacción). */
export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

export function restDoneAlert(): void {
  if (soundEnabled() && ctx) {
    try {
      const t = ctx.currentTime
      for (const [i, f] of [880, 1175].entries()) {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.value = f
        g.gain.setValueAtTime(0.0001, t + i * 0.18)
        g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16)
        o.connect(g).connect(ctx.destination)
        o.start(t + i * 0.18)
        o.stop(t + i * 0.18 + 0.17)
      }
    } catch {
      /* el sistema no permite sonido */
    }
  }
  try {
    navigator.vibrate?.([120, 80, 120])
  } catch {
    /* sin vibración (p. ej. iPhone) */
  }
}
