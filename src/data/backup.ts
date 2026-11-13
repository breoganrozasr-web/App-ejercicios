import { getExercise } from '../domain/catalog'
import { LOAD_LABEL } from '../domain/catalog/exercises'
import type { Session } from '../domain/types'
import { formatNumber, toLocalDate } from '../domain/util'
import { SCHEMA_VERSION, TABLES, db, type TableName } from './db'
import { loadCustomExercises, log, setMeta } from './repo'

/**
 * Formato de copia (documentado en docs/FORMATO_COPIA.md):
 * { format: "forja-backup", formatVersion: 1, schemaVersion, appVersion, exportedAt, tables: { <tabla>: [...] } }
 * Incluye imágenes propias (data URL) de ejercicios creados por la persona. No incluye demostraciones de terceros.
 */
export const BACKUP_FORMAT = 'forja-backup'
export const BACKUP_FORMAT_VERSION = 1
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024
export const APP_VERSION = '1.0.0'

export interface BackupFile {
  format: string
  formatVersion: number
  schemaVersion: number
  appVersion: string
  exportedAt: string
  tables: Partial<Record<TableName, unknown[]>>
}

const KEY_OF: Record<TableName, string> = {
  meta: 'key', profile: 'id', routines: 'id', routineVersions: 'id', overrides: 'id', sessions: 'id', bodyweight: 'id', changelog: 'id', customExercises: 'id', exerciseSettings: 'exerciseId', userMedia: 'id',
}

/** Claves de meta que NO se exportan (son del dispositivo). */
const LOCAL_META = new Set(['persistRequested', 'lastBackupAt', 'sessionsSinceBackup', 'installHintDismissed'])

export async function exportBackup(opts: { includeDemo?: boolean } = {}): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {}
  await db().transaction('r', TABLES.map((t) => db().table(t)), async () => {
    for (const t of TABLES) {
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
  if (text.length > MAX_BACKUP_BYTES) throw new BackupError('El archivo es demasiado grande (máx. 25 MB).')
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
    if (mode === 'replace') for (const t of TABLES) await db().table(t).clear()
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

/** CSV con separador «;» y coma decimal (abre bien en hojas de cálculo en español). Una fila por serie. */
export function sessionsToCsv(sessions: Session[]): string {
  const head = ['fecha', 'sesion', 'estado', 'ejercicio', 'id_ejercicio', 'tipo_carga', 'significado_peso', 'tipo_serie', 'n_serie', 'peso_kg', 'repeticiones', 'rir', 'segundos', 'distancia_m', 'asistencia_kg', 'lastre_kg', 'banda', 'lado', 'completada', 'molestia', 'notas_ejercicio']
  const lines = [head.join(';')]
  const sorted = [...sessions].filter((s) => s.status === 'completed' || s.status === 'partial').sort((a, b) => a.startedAt - b.startedAt)
  for (const s of sorted) {
    for (const e of s.exercises) {
      let n = 0
      for (const set of e.sets) {
        if (set.kind === 'work') n++
        lines.push([
          s.date, s.title, s.status === 'partial' ? 'parcial' : 'completada', e.nameSnapshot, e.exerciseId, e.loadTypeSnapshot, LOAD_LABEL[e.loadTypeSnapshot]?.field ?? '',
          set.kind === 'warmup' ? 'calentamiento' : 'trabajo', set.kind === 'work' ? n : '', set.weightKg, set.reps, set.rir, set.durationSec, set.distanceM, set.assistKg, set.addedKg, set.bandLabel,
          set.side === 'both' ? '' : set.side === 'left' ? 'izquierdo' : 'derecho', set.completed ? 'sí' : 'no', e.painFlag ? 'sí' : '', e.notes,
        ].map(csvCell).join(';'))
      }
    }
  }
  return '﻿' + lines.join('\r\n')
}

export function exerciseNameForCsv(id: string): string {
  return getExercise(id)?.name ?? id
}
