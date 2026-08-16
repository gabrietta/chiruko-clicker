import type { GameState } from '../types/game'

export type DiagnosticLog = { timestamp: string; level: string; category: string; event: string; details?: unknown }
const KEY = 'chiruko-diagnostics-log-v1'
const MAX = 160
const MAX_BYTES = 192 * 1024
const truncate = (value: string, limit: number) => value.length > limit ? `${value.slice(0, limit)}...[truncated]` : value
const byteLength = (value: string) => typeof TextEncoder === 'undefined' ? value.length : new TextEncoder().encode(value).length

const safe = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
  if (depth > 3) return '[truncated]'
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return truncate(value, 2000)
  if (typeof value === 'bigint') return `${value.toString()}n`
  if (typeof value !== 'object') return truncate(String(value), 500)
  if (seen.has(value)) return '[circular]'
  seen.add(value)
  if (value instanceof Error) return { name: truncate(value.name, 100), message: truncate(value.message, 1000), stack: truncate(value.stack || '', 2000) }
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => safe(item, depth + 1, seen))
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([k, v]) => [truncate(k, 100), safe(v, depth + 1, seen)]))
}

export const readDiagnosticLogs = (): DiagnosticLog[] => {
  try { const parsed = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(parsed) ? parsed.slice(-MAX).map((item) => safe(item) as DiagnosticLog) : [] } catch { return [] }
}
export const logDiagnostic = (event: string, category: string, details?: unknown, level = 'info') => {
  try {
    const entries = [...readDiagnosticLogs(), { timestamp: new Date().toISOString(), level, category, event, details: safe(details) }].slice(-MAX)
    let serialized = JSON.stringify(entries)
    while (entries.length && byteLength(serialized) > MAX_BYTES) { entries.shift(); serialized = JSON.stringify(entries) }
    localStorage.setItem(KEY, serialized)
  } catch { /* diagnostics must never stop the game */ }
}
export const clearDiagnosticLogs = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }

export const makeDiagnostics = (game: GameState, derived: Record<string, unknown>) => ({
  schemaVersion: 1, generatedAt: new Date().toISOString(), appVersion: 'unknown',
  saveVersion: game.version,
  page: { origin: location.origin, path: location.pathname },
  environment: { userAgent: navigator.userAgent, language: navigator.language, platform: navigator.platform },
  game, derived, logs: readDiagnosticLogs(),
})

export const diagnosticsFilename = () => `chiruko-diagnostics-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('T', '-')}.json`
export const diagnosticsKey = KEY
