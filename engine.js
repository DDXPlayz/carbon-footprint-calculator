/**
 * Pure calculation engine. No DOM, no storage.
 * quantity = product of every numeric input × (roundTrip ? 2 : 1)
 * kg       = quantity × factor
 */
import { CATEGORIES, FACTORS_VERSION } from './data/emission-factors.js'

const typeIndex = new Map()
for (const cat of CATEGORIES) {
  for (const t of cat.types) typeIndex.set(t.id, { type: t, category: cat })
}

export function getCategory(id) {
  return CATEGORIES.find(c => c.id === id) || null
}

export function getType(typeId) {
  return typeIndex.get(typeId) || null
}

export function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Default inputs for a type, honouring team/individual defaults. */
export function defaultInputs(type, mode) {
  const out = {}
  for (const f of type.inputs) {
    out[f.key] = mode === 'team' && f.teamDefault != null ? f.teamDefault : f.default
  }
  if (type.roundTrip) out.roundTrip = true
  return out
}

/** kg CO₂e for one activity row. */
export function computeActivity(activity) {
  const hit = typeIndex.get(activity.typeId)
  if (!hit) return { quantity: 0, kg: 0, factor: 0, unit: '' }
  const { type } = hit
  let quantity = 1
  for (const f of type.inputs) quantity *= num(activity.inputs?.[f.key])
  if (type.roundTrip && activity.inputs?.roundTrip) quantity *= 2
  return { quantity, kg: quantity * type.factor, factor: type.factor, unit: type.unit }
}

/**
 * Totals for a whole draft: { total, byCategory: {catId: kg}, rows: [...] }
 * `activities` is { [categoryId]: Activity[] }.
 */
export function computeTotals(activities) {
  const byCategory = {}
  const rows = []
  let total = 0
  for (const cat of CATEGORIES) {
    let sub = 0
    for (const a of activities[cat.id] || []) {
      const r = computeActivity(a)
      rows.push({ categoryId: cat.id, activityId: a.id, typeId: a.typeId, ...r })
      sub += r.kg
    }
    byCategory[cat.id] = sub
    total += sub
  }
  return { total, byCategory, rows, factorsVersion: FACTORS_VERSION }
}

/** Deep, plain-object snapshot of activities (what a lock freezes). */
export function snapshot(activities) {
  return JSON.parse(JSON.stringify(activities))
}

/** Stable JSON: keys sorted so the same data always hashes the same. */
export function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}'
  }
  return JSON.stringify(value)
}

/** FNV-1a 32-bit fingerprint, rendered as 8 hex chars. Tamper-evidence, not security. */
export function fingerprint(value) {
  const s = stableStringify(value)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/* ---------- formatting helpers (shared by UI) ---------- */

export function fmtKg(kg, opts = {}) {
  const { unit = true } = opts
  if (kg <= 0) return '0' + (unit ? ' kg' : '')
  if (kg >= 10000) return (kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + (unit ? ' t' : '')
  if (kg >= 100) return Math.round(kg).toLocaleString('en-IN') + (unit ? ' kg' : '')
  if (kg >= 10) return kg.toFixed(1) + (unit ? ' kg' : '')
  return kg.toFixed(2) + (unit ? ' kg' : '')
}

export function fmtNum(n, digits = 0) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: digits })
}

export function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
