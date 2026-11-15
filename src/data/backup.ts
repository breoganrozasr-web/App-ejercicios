import { getExercise } from '../domain/catalog'
import { LOAD_LABEL } from '../domain/catalog/exercises'
import { supersetPartner } from '../domain/sessions'
import { isBlock } from '../domain/techniques'
import type { Session } from '../domain/types'
import { formatNumber, toLocalDate } from '../domain/util'
import { SCHEMA_VERSION, TABLES, db, type TableName } from './db'
import { loadCustomExercises, log, setMeta } from './repo'

/**
 * Formato de copia (documentado en docs/FORMATO_COPIA.md):
 * { format: "forja-backup", formatVersion: 2, schemaVersion, appVersion, exportedAt, tables: { <tabla>: [...] } }
 * Versión 2 (app 1.3): bloques especiales en las series (method + block con tramos) y estado del programa (meta «program»).
 * Es aditiva: las copias de versión 1 se restauran igual (sin bloques = series convencionales).
 * Una app anterior rechaza las copias de versión 2 en lugar de malinterpretar los bloques.
 * Versión 3 (app 1.4): ejercicios nuevos del catálogo (peso muerto convencional, hip thrust, remos), origen de la dosis
 * por ejercicio (receta base y adaptaciones), plantilla y mapa muscular de cada versión de rutina, correcciones de
 * sesiones guardadas (con valores anteriores) y tolerancia declarada. Aditiva: las copias 1 y 2 se restauran igual.
 * Una app 1.3 o anterior rechaza la versión 3 (no conoce esos ejercicios ni el mapa muscular 2).
 * Incluye imágenes propias (data URL) de ejercicios creados por la persona. No incluye demostraciones de terceros.
 * Las fotos de progreso solo se incluyen si se pide expresamente (tabla «photos» ausente = la copia no las lleva).
 */
export const BACKUP_FORMAT = 'forja-backup'
export const BACKUP_FORMAT_VERSION = 3
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024
export const APP_VERSION = '1.4.0'

export interface BackupFile {
  format: string
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  tables: Partial<Record<TableName, unknown[]>>
}

const KEY_OF: Record<TableName, string> = {
  meta: 'key', profile: 'id', routines: 'id', routineVersions: 'id', overrides: 'id', sessions: 'id', bodyweight: 'id', changelog: 'id', customExercises: 'id', exerciseSettings: 'exerciseId', userMedia: 'id', measurements: 'id', photos: 'id',
}

/** Claves de meta que NO se exportan (son del dispositivo). */
const LOCAL_META = new Set(['persistRequested', 'lastBackupAt', 'sessionsSinceBackup', 'installHintDismissed'])

export async function exportBackup(opts: { includeDemo?: boolean; includePhotos?: boolean } = {}): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {}
  await db().transaction('r', TABLES.map((t) => db().table(t)), async () => {
    for (const t of TABLES) {
      if (t === 'photos' && !opts.includePhotos) continue
      let rows = await db().table(t).toArray()
      if (t === 'meta') rows = rows.filter((r: { key: string }) => !LOCAL_META.has(r.key))
      if (!opts.includeDemo) rows = rows.filter((r: { isDemo?: boolean }) => !r.isDemo)
      tables[t] = rows
    }
  })
  return { format: BACKUP_FORMAT, formatVersion: BACKUP_FORMAT_VERSION, schemaVersion: SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), tables }
}

export async function markBackupDone(): Promise<void> {
  await setMeta('lastBackupAt', Date.now())
  await setMeta('sessionsSinceBackup', 0)
}

export function backupFileName(): string {
  return `forja-copia-${toLocalDate()}.json`
}

// ───────────────────────── Validación ─────────────────────────

export class BackupError extends Error {}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Limpia cadenas: quita caracteres de control y limita longitud. data URLs de imagen se validan aparte. */
function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 12) throw new BackupError('Estructura demasiado profunda.')
  if (typeof value === 'string') {
    if (value.startsWith('data:')) {
      if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return ''
      return value.length > 3_000_000 ? '' : value
    }
    return value.replace(CONTROL, '').slice(0, 5000)
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean' || value === null) return value
  if (Array.isArray(value)) return value.slice(0, 50000).map((v) => sanitize(v, depth + 1))
  if (typeof value === 'object' && value) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
      out[k.slice(0, 100)] = sanitize(v, depth + 1)
    }
    return out
  }
  return null
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

function validateRow(table: TableName, row: unknown): string | null {
  if (!row || typeof row !== 'object') return 'registro no válido'
  const r = row as Record<string, unknown>
  if (!isStr(r[KEY_OF[table]])) return `falta el identificador (${KEY_OF[table]})`
  if (table === 'sessions') {
    if (!Array.isArray(r.exercises)) return 'sesión sin lista de ejercicios'
    if (!isStr(r.date) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date as string)) return 'sesión con fecha no válida'
    if (!['active', 'completed', 'partial', 'discarded'].includes(r.status as string)) return 'sesión con estado desconocido'
    for (const e of r.exercises as unknown[]) {
      const ex = e as Record<string, unknown>
      if (!isStr(ex?.exerciseId) || !Array.isArray(ex?.sets)) return 'ejercicio de sesión no válido'
    }
  }
  if (table === 'routineVersions' && (!Array.isArray(r.days) || !Array.isArray(r.schedule))) return 'versión de rutina no válida'
  if (table === 'routines' && !isStr(r.currentVersionId)) return 'rutina sin versión'
  if (table === 'profile' && r.id !== 'me') return 'perfil no válido'
  if (table === 'bodyweight' && typeof r.kg !== 'number') return 'peso corporal no válido'
  if (table === 'measurements' && (typeof r.cm !== 'number' || !isStr(r.site) || !isStr(r.date))) return 'medida no válida'
  if (table === 'photos' && (!isStr(r.dataUrl) || !isStr(r.date))) return 'foto no válida'
  return null
}

export interface BackupPreview {
  file: BackupFile
  counts: Partial<Record<TableName, number>>
  sessionRange: { from: string; to: string } | null
  existingIds: number
  warnings: string[]
}

export function parseBackupText(text: string): BackupFile {
  if (text.length > MAX_BACKUP_BYTES) throw new BackupError('El archivo es demasiado grande (máx. 100 MB).')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('El archivo no es un JSON válido o está dañado.')
  }
  const clean = sanitize(raw) as Record<string, unknown>
  if (!clean || clean.format !== BACKUP_FORMAT) throw new BackupError('No es una copia de Forja.')
  if (typeof clean.formatVersion !== 'number' || clean.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError('La copia es de una versión más nueva de la app. Actualiza la app antes de restaurarla.')
  }
  if (typeof clean.schemaVersion !== 'number' || clean.schemaVersion > SCHEMA_VERSION) throw new BackupError('Esquema de datos incompatible (más nuevo que esta app).')
  const tables = clean.tables as Record<string, unknown>
  if (!tables || typeof tables !== 'object') throw new BackupError('La copia no contiene datos.')
  const out: BackupFile['tables'] = {}
  for (const t of TABLES) {
    const rows = tables[t]
    if (rows === undefined) continue
    if (!Array.isArray(rows)) throw new BackupError(`La tabla «${t}» no es una lista.`)
    for (const [i, row] of rows.entries()) {
      const err = validateRow(t, row)
      if (err) throw new BackupError(`Registro ${i + 1} de «${t}»: ${err}.`)
    }
    out[t] = rows
  }
  return { format: BACKUP_FORMAT, formatVersion: clean.formatVersion as number, schemaVersion: clean.schemaVersion as number, appVersion: String(clean.appVersion ?? ''), exportedAt: String(clean.exportedAt ?? ''), tables: out }
}

export async function previewBackup(file: BackupFile): Promise<BackupPreview> {
  const counts: BackupPreview['counts'] = {}
  let existingIds = 0
  for (const t of TABLES) {
    const rows = (file.tables[t] ?? []) as Record<string, string>[]
    counts[t] = rows.length
    if (!rows.length) continue
    const keys = rows.map((r) => r[KEY_OF[t]])
    const found = await db().table(t).bulkGet(keys)
    existingIds += found.filter(Boolean).length
  }
  const sessions = (file.tables.sessions ?? []) as Session[]
  const dates = sessions.map((s) => s.date).sort()
  const warnings: string[] = []
  if (!sessions.length) warnings.push('La copia no contiene sesiones registradas.')
  if (file.tables.photos === undefined) warnings.push('La copia no incluye fotos de progreso: las que tengas en este dispositivo se conservan.')
  return { file, counts, sessionRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null, existingIds, warnings }
}

/**
 * Restaura una copia en una única transacción: si algo falla, la base queda como estaba.
 * - replace: borra los datos actuales y carga los de la copia.
 * - merge: añade lo que no existe; si un registro existe en ambos, se queda el más reciente (updatedAt) o el local.
 *   No duplica: las claves son estables.
 */
export async function restoreBackup(file: BackupFile, mode: 'replace' | 'merge'): Promise<{ added: number; updated: number; kept: number }> {
  let added = 0
  let updated = 0
  let kept = 0
  await db().transaction('rw', TABLES.map((t) => db().table(t)), async () => {
    // Reemplazo: se borra todo salvo las fotos cuando la copia no las incluye (se exportan solo si se pide).
    if (mode === 'replace') for (const t of TABLES) if (!(t === 'photos' && file.tables.photos === undefined)) await db().table(t).clear()
    for (const t of TABLES) {
      const rows = (file.tables[t] ?? []) as Record<string, unknown>[]
      if (!rows.length) continue
      if (mode === 'replace') {
        await db().table(t).bulkPut(rows)
        added += rows.length
        continue
      }
      const keys = rows.map((r) => r[KEY_OF[t]] as string)
      const existing = await db().table(t).bulkGet(keys)
      const toPut: Record<string, unknown>[] = []
      rows.forEach((row, i) => {
        const cur = existing[i] as Record<string, unknown> | undefined
        if (!cur) {
          toPut.push(row)
          added++
        } else if (typeof row.updatedAt === 'number' && typeof cur.updatedAt === 'number' && row.updatedAt > cur.updatedAt && cur.status !== 'active') {
          toPut.push(row)
          updated++
        } else kept++
      })
      if (toPut.length) await db().table(t).bulkPut(toPut)
    }
    await log('backup', 'restore', `Copia restaurada (${mode === 'replace' ? 'reemplazo' : 'fusión'}): ${added} añadidos, ${updated} actualizados`)
  })
  await loadCustomExercises()
  return { added, updated, kept }
}

// ───────────────────────── CSV ─────────────────────────

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'number' ? formatNumber(v) : String(v)
  // Evita inyección de fórmulas al abrir en hojas de cálculo.
  const safe = /^[=+\-@]/.test(s) && typeof v !== 'number' ? `'${s}` : s
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const METHOD_CSV = { drop: 'descendente', rest_pause: 'rest-pause' } as const
const DIFF_CSV = { easy: 'fácil', normal: 'normal', hard: 'dura', very_hard: 'muy dura' } as const
const BLOCK_STATE_CSV = { complete: 'completo', early: 'terminado antes de tiempo' } as const

/**
 * CSV con separador «;» y coma decimal (abre bien en hojas de cálculo en español). Una fila por serie y, en los bloques
 * especiales, una fila por TRAMO (mismo id_bloque; tramo 0 = inicial), con su carga, repeticiones, RIR y pausa reales.
 * Las columnas nuevas van al final para no romper hojas existentes.
 */
export function sessionsToCsv(sessions: Session[]): string {
  const head = [
    'fecha', 'sesion', 'estado', 'ejercicio', 'id_ejercicio', 'tipo_carga', 'significado_peso', 'tipo_serie', 'n_serie', 'peso_kg', 'repeticiones', 'rir', 'segundos', 'distancia_m', 'asistencia_kg', 'lastre_kg', 'banda', 'lado', 'completada', 'molestia', 'notas_ejercicio',
    'metodo', 'id_bloque', 'tramo', 'pausa_s', 'estado_bloque', 'superserie',
    'rango_prescrito', 'corregida', 'dificultad_sesion',
  ]
  const lines = [head.join(';')]
  const sorted = [...sessions].filter((s) => s.status === 'completed' || s.status === 'partial').sort((a, b) => a.startedAt - b.startedAt)
  const side = (v: Session['exercises'][number]['sets'][number]['side']) => (v === 'both' ? '' : v === 'left' ? 'izquierdo' : 'derecho')
  for (const s of sorted) {
    for (const e of s.exercises) {
      let n = 0
      const ss = supersetPartner(s.exercises, e.uid) >= 0 ? e.superset ?? '' : ''
      const rx = e.prescription ? (e.prescription.unit === 'time' ? `${e.prescription.timeMinSec ?? ''}–${e.prescription.timeMaxSec ?? ''} s` : `${e.prescription.repMin}–${e.prescription.repMax}`) : ''
      const corrected = (id: string) => ((s.corrections ?? []).some((c) => !c.undoneAt && c.changes.some((ch) => ch.setId === id)) ? 'sí' : '')
      const diff = s.tolerance?.difficulty ? DIFF_CSV[s.tolerance.difficulty] : ''
      const common = [s.date, s.title, s.status === 'partial' ? 'parcial' : 'completada', e.nameSnapshot, e.exerciseId, e.loadTypeSnapshot, LOAD_LABEL[e.loadTypeSnapshot]?.field ?? '']
      for (const set of e.sets) {
        if (set.kind === 'work') n++
        if (isBlock(set) && set.block) {
          const b = set.block
          const state = b.ended ? BLOCK_STATE_CSV[b.ended] : 'sin terminar'
          const method = METHOD_CSV[set.method as keyof typeof METHOD_CSV]
          if (!b.segments.length) {
            lines.push([...common, 'trabajo', n, null, null, null, null, null, null, null, null, side(set.side), 'no', e.painFlag ? 'sí' : '', e.notes, method, set.id, null, null, state, ss, rx, corrected(set.id), diff].map(csvCell).join(';'))
            continue
          }
          b.segments.forEach((seg, i) => {
            lines.push([...common, 'trabajo', n, seg.weightKg, seg.reps, seg.rir, null, null, seg.assistKg ?? null, seg.addedKg ?? null, null, side(set.side), 'sí', e.painFlag ? 'sí' : '', e.notes, method, set.id, i, seg.pauseSec, state, ss, rx, corrected(set.id), diff].map(csvCell).join(';'))
          })
          continue
        }
        lines.push([
          ...common,
          set.kind === 'warmup' ? 'calentamiento' : 'trabajo', set.kind === 'work' ? n : '', set.weightKg, set.reps, set.rir, set.durationSec, set.distanceM, set.assistKg, set.addedKg, set.bandLabel,
          side(set.side), set.completed ? 'sí' : 'no', e.painFlag ? 'sí' : '', e.notes,
          set.kind === 'work' ? 'convencional' : '', '', '', '', '', ss, set.kind === 'work' ? rx : '', corrected(set.id), diff,
        ].map(csvCell).join(';'))
      }
    }
  }
  return '﻿' + lines.join('\r\n')
}

export function exerciseNameForCsv(id: string): string {
  return getExercise(id)?.name ?? id
}
