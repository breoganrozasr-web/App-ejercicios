/**
 * Aviso de fin de descanso: pitidos con Web Audio (y vibración donde exista; el iPhone no la ofrece a las webs).
 *
 * iPhone: por defecto Safari trata el audio web como «ambiente» y lo SILENCIA con el interruptor de silencio,
 * aunque lleves cascos. Con `navigator.audioSession.type = 'playback'` suena igualmente, pero iOS puede pausar
 * la música de otras apps. Por eso hay tres modos:
 *  - 'always': mezcla durante el entrenamiento y cambia a 'playback' solo para el pitido (suena en modo silencio).
 *  - 'mix': siempre 'ambient' (no interrumpe tu música, pero no suena si el iPhone está en silencio).
 *  - 'off': sin sonido.
 * Solo funciona con la app abierta en primer plano; por eso, durante el entrenamiento se mantiene la pantalla encendida.
 */
export type SoundMode = 'always' | 'mix' | 'off'

const MODE_KEY = 'forja-sound-mode'
const AWAKE_KEY = 'forja-keep-awake'
let ctx: AudioContext | null = null

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, v: string): void {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* sin almacenamiento: se usa el valor por defecto */
  }
}

export function getSoundMode(): SoundMode {
  const v = read(MODE_KEY)
  if (v === 'always' || v === 'mix' || v === 'off') return v
  return read('forja-sound') === 'off' ? 'off' : 'always' // compatibilidad con la versión anterior
}
export function setSoundMode(m: SoundMode): void {
  write(MODE_KEY, m)
}
/** Compatibilidad con código antiguo. */
export function soundEnabled(): boolean {
  return getSoundMode() !== 'off'
}

export function getKeepAwake(): boolean {
  return read(AWAKE_KEY) !== 'off'
}
export function setKeepAwake(on: boolean): void {
  write(AWAKE_KEY, on ? 'on' : 'off')
}

type AudioSessionLike = { type: string }
function audioSession(): AudioSessionLike | null {
  const s = (navigator as unknown as { audioSession?: AudioSessionLike }).audioSession
  return s ?? null
}
function setSessionType(t: 'ambient' | 'playback'): void {
  const s = audioSession()
  if (!s) return
  try {
    if (s.type !== t) s.type = t
  } catch {
    /* navegador sin soporte */
  }
}
export function hasAudioSessionApi(): boolean {
  return !!audioSession()
}

/** Debe llamarse en un gesto del usuario (iOS solo permite audio tras una interacción). */
export function unlockAudio(): void {
  if (getSoundMode() === 'off') return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    setSessionType('ambient')
    ctx ??= new AC()
    if (ctx.state !== 'running') void ctx.resume()
    // Un búfer silencioso dentro del gesto termina de desbloquear el audio en iOS.
    const b = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = b
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    ctx = null
  }
}

function beeps(pattern: { f: number; t: number; d: number }[], gain: number): number {
  if (!ctx) return 0
  const t0 = ctx.currentTime + 0.05
  for (const { f, t, d } of pattern) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t0 + t)
    g.gain.exponentialRampToValueAtTime(gain, t0 + t + 0.015)
    g.gain.setValueAtTime(gain, t0 + t + d - 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d)
    o.connect(g).connect(ctx.destination)
    o.start(t0 + t)
    o.stop(t0 + t + d + 0.02)
  }
  return Math.max(...pattern.map((p) => p.t + p.d)) * 1000 + 150
}

const END_PATTERN = [
  { f: 880, t: 0, d: 0.16 },
  { f: 880, t: 0.24, d: 0.16 },
  { f: 1320, t: 0.48, d: 0.42 },
]

function withTimeout(p: Promise<unknown>, ms: number): Promise<unknown> {
  return Promise.race([p.catch(() => undefined), new Promise((r) => window.setTimeout(r, ms))])
}

async function play(pattern: typeof END_PATTERN): Promise<void> {
  const mode = getSoundMode()
  const c = ctx
  if (mode === 'off' || !c) return
  try {
    const s = audioSession()
    if (mode === 'always' && s && s.type !== 'playback') {
      // Cambiar a 'playback' y reanudar el contexto para que Safari aplique la categoría nueva (suena en modo silencio).
      setSessionType('playback')
      if (c.state === 'running') await withTimeout(c.suspend(), 300)
    }
    if (c.state !== 'running') await withTimeout(c.resume(), 600)
    const ms = beeps(pattern, 0.85)
    if (mode === 'always' && s) window.setTimeout(() => setSessionType('ambient'), ms + 400)
  } catch {
    /* el sistema no permite sonido */
  }
}

export function restDoneAlert(): void {
  void play(END_PATTERN)
  try {
    navigator.vibrate?.([160, 80, 160, 80, 300])
  } catch {
    /* sin vibración (p. ej. iPhone) */
  }
}

/** Botón «Probar sonido» (se llama desde un gesto). */
export function testSound(): void {
  unlockAudio()
  window.setTimeout(() => void play(END_PATTERN), 60)
}
