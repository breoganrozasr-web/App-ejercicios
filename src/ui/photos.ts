/**
 * Comprime una foto en el propio dispositivo (canvas → JPEG). Nada sale del dispositivo.
 * El lado largo se limita a `maxSide` px para que cada foto ocupe ~100–400 KB.
 */
export async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<{ dataUrl: string; width: number; height: number; bytes: number }> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.')
  if (file.size > 40 * 1024 * 1024) throw new Error('La imagen es demasiado grande.')
  const src = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height))
  const width = Math.max(1, Math.round(src.width * scale))
  const height = Math.max(1, Math.round(src.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(src.source, 0, 0, width, height)
  src.close()
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  if (!dataUrl.startsWith('data:image/jpeg')) throw new Error('No se pudo comprimir la imagen.')
  const bytes = Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)
  return { dataUrl, width, height, bytes }
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  // createImageBitmap respeta la orientación EXIF por defecto ('from-image').
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      /* formato no soportado por createImageBitmap (p. ej. HEIC en algunos navegadores): se prueba con <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Este formato de imagen no se puede abrir aquí.'))
      img.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}
