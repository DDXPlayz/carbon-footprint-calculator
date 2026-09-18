/**
 * Persistence. Everything lives in localStorage under one key, so the subsite
 * needs no backend. Locks are append-only: nothing here can mutate a lock
 * after it is written. Export/import lets the team move data between browsers.
 */
import { snapshot, computeTotals, fingerprint } from './engine.js'
import { FACTORS_VERSION } from './data/emission-factors.js'
import { OFFSETS_VERSION, PATHWAYS } from './data/offset-options.js'

const KEY = 'anantam-sustain-carbon:v1'

export function emptyState() {
  return {
    mode: 'team',
    draft: { label: '', activities: {}, basedOn: null },
    locks: [],
    activeLockId: null,
    offsetLog: {}
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    return { ...emptyState(), ...parsed }
  } catch {
    return emptyState()
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Could not save state', e)
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

/**
 * Create an immutable lock from the current draft. Returns the new lock.
 * The lock stores a snapshot of inputs, the totals, the factor version and a
 * fingerprint over all of it. Nothing else ever writes to a lock object.
 */
export function createLock(state, label) {
  const activities = snapshot(state.draft.activities)
  const totals = computeTotals(activities)
  const parent = state.draft.basedOn ? state.locks.find(l => l.id === state.draft.basedOn) : null
  const version = parent ? parent.version + 1 : 1
  const body = {
    id: uid(),
    version,
    parentId: parent ? parent.id : null,
    label: label || (state.mode === 'team' ? 'Campaign footprint' : 'Personal footprint'),
    mode: state.mode,
    lockedAt: new Date().toISOString(),
    totalKg: totals.total,
    byCategory: totals.byCategory,
    activities,
    factorsVersion: FACTORS_VERSION
  }
  const lock = Object.freeze({ ...body, fingerprint: fingerprint(body) })
  state.locks = [lock, ...state.locks]
  state.activeLockId = lock.id
  // The draft becomes read-only for this lock; a new version starts from a copy.
  state.draft = { label: '', activities: {}, basedOn: null }
  save(state)
  return lock
}

/** Check a lock's fingerprint still matches its content. */
export function verifyLock(lock) {
  const { fingerprint: fp, ...body } = lock
  return fingerprint(body) === fp
}

/** Start a new draft version from an existing lock (copies the inputs). */
export function newVersionFrom(state, lock) {
  state.draft = {
    label: lock.label,
    activities: snapshot(lock.activities),
    basedOn: lock.id
  }
  state.mode = lock.mode
  save(state)
}

export function addOffset(state, lockId, entry) {
  const pathway = PATHWAYS.find(p => p.id === entry.pathwayId)
  if (!pathway) return null
  const rec = {
    id: uid(),
    pathwayId: pathway.id,
    quantity: entry.quantity,
    kg: entry.quantity * pathway.kgPerUnit,
    date: entry.date || new Date().toISOString().slice(0, 10),
    note: entry.note || '',
    offsetsVersion: OFFSETS_VERSION,
    loggedAt: new Date().toISOString()
  }
  state.offsetLog[lockId] = [rec, ...(state.offsetLog[lockId] || [])]
  save(state)
  return rec
}

export function removeOffset(state, lockId, entryId) {
  state.offsetLog[lockId] = (state.offsetLog[lockId] || []).filter(e => e.id !== entryId)
  save(state)
}

export function offsetTotal(state, lockId) {
  return (state.offsetLog[lockId] || []).reduce((s, e) => s + e.kg, 0)
}

export function exportJSON(state) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: KEY, ...state }, null, 2)
}

/** Merge an export into state. Locks are added if not present; never overwritten. */
export function importJSON(state, text) {
  const data = JSON.parse(text)
  if (!data || !Array.isArray(data.locks)) throw new Error('Not a carbon calculator export')
  const have = new Set(state.locks.map(l => l.id))
  let added = 0
  for (const l of data.locks) {
    if (!have.has(l.id)) { state.locks.push(Object.freeze(l)); added++ }
  }
  state.locks.sort((a, b) => b.lockedAt.localeCompare(a.lockedAt))
  for (const [lockId, entries] of Object.entries(data.offsetLog || {})) {
    const cur = state.offsetLog[lockId] || []
    const ids = new Set(cur.map(e => e.id))
    state.offsetLog[lockId] = [...cur, ...entries.filter(e => !ids.has(e.id))]
  }
  if (!state.activeLockId && state.locks[0]) state.activeLockId = state.locks[0].id
  save(state)
  return added
}
