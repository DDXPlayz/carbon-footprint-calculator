/**
 * UI layer. Renders three views (calculate → lock → offset) from a single
 * state object and delegates all events from #app. No framework, no build.
 */
import { CATEGORIES, COMPARISONS, FACTORS_VERSION } from './data/emission-factors.js'
import { PATHWAYS } from './data/offset-options.js'
import { computeActivity, computeTotals, defaultInputs, getType, fmtKg, fmtNum, fmtDate, num } from './engine.js'
import * as store from './storage.js'

const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const state = store.load()
const app = $('#app')
let view = viewFromHash()

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function viewFromHash() {
  const h = location.hash.replace('#', '')
  return ['calculate', 'lock', 'offset'].includes(h) ? h : 'calculate'
}

function go(v) {
  view = v
  if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v)
  render()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function toast(msg) {
  const t = $('#toast')
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(toast._t)
  toast._t = setTimeout(() => t.classList.remove('show'), 2600)
}

function draftCount() {
  return Object.values(state.draft.activities).reduce((n, arr) => n + arr.length, 0)
}

function activeLock() {
  return state.locks.find(l => l.id === state.activeLockId) || state.locks[0] || null
}

function copy(cat) {
  return cat[state.mode] || cat.team
}

function kgSplit(kg) {
  // returns [value, unit] using tonnes above 10 t
  if (kg >= 10000) return [(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 }), 't CO₂e']
  return [Math.round(kg).toLocaleString('en-IN'), 'kg CO₂e']
}

function compareLine(kg) {
  if (kg <= 0) return 'Add an activity to see what drives the number.'
  const km = kg * COMPARISONS.carKmPerKg
  const treeYears = kg / COMPARISONS.treeKgPerYear
  return `About ${fmtNum(km)} km in an average car, or what ${fmtNum(Math.ceil(treeYears))} mature trees absorb in a year.`
}

/* ------------------------------------------------------------------ */
/* render                                                             */
/* ------------------------------------------------------------------ */

function render() {
  $$('#mode-switch button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)))
  $$('#stepper .step').forEach(b => {
    b.toggleAttribute('aria-current', b.dataset.view === view)
    if (b.dataset.view === view) b.setAttribute('aria-current', 'step')
    b.disabled = b.dataset.view === 'offset' && state.locks.length === 0
  })
  if (view === 'calculate') renderCalculate()
  else if (view === 'lock') renderLock()
  else renderOffset()
  $('#mobile-total').hidden = view !== 'calculate'
}

/* ---------- 01 calculate ---------- */

function renderCalculate() {
  const team = state.mode === 'team'
  const totals = computeTotals(state.draft.activities)
  const basedOn = state.draft.basedOn ? state.locks.find(l => l.id === state.draft.basedOn) : null

  app.innerHTML = `
    <div class="view-head">
      <div class="kicker">${team ? 'Team / campaign mode' : 'Individual mode'}</div>
      <h1>${team ? 'What did the season cost the air?' : 'What did your year cost the air?'}</h1>
      <p class="lede">${team
        ? 'Add every activity the campaign produced: travel, the car, merchandise, events, printing. The total updates as you go. Nothing is final until you lock it.'
        : 'Add what you did this year. The total updates as you go. Nothing is final until you lock it.'}</p>
      ${basedOn ? `<p class="muted" style="margin-top:12px">Editing a new version based on <strong>${esc(basedOn.label)}</strong> (v${basedOn.version}). Locking will create v${basedOn.version + 1}.</p>` : ''}
    </div>
    <div class="calc-grid">
      <div class="calc-form">
        ${CATEGORIES.map(cat => renderCategory(cat, totals)).join('')}
      </div>
      <aside class="summary" aria-label="Running total">
        <div class="kicker">Running total</div>
        <div class="big" id="sum-total"></div>
        <div class="compare" id="sum-compare"></div>
        <div class="bars" id="sum-bars"></div>
        <div class="actions">
          <button type="button" class="btn btn-primary" data-action="goto" data-view="lock" ${totals.total > 0 ? '' : 'disabled'}>Review &amp; lock</button>
          <button type="button" class="btn btn-on-dark" data-action="clear-draft" ${draftCount() ? '' : 'disabled'}>Clear draft</button>
        </div>
        <p class="fine">Factors v${FACTORS_VERSION}. Every number is documented in <code>data/emission-factors.js</code>.</p>
      </aside>
    </div>`
  updateTotals()
}

function renderCategory(cat, totals) {
  const c = copy(cat)
  const rows = state.draft.activities[cat.id] || []
  const [v, u] = kgSplit(totals.byCategory[cat.id] || 0)
  return `
    <section class="cat" id="cat-${cat.id}" aria-labelledby="cat-${cat.id}-title">
      <div class="cat-head">
        <div>
          <h3 id="cat-${cat.id}-title">${esc(c.title)}</h3>
          <p class="hint">${esc(c.hint)}</p>
        </div>
        <div class="cat-total">
          <div class="num" data-cat-total="${cat.id}">${v}</div>
          <div class="lbl">${u}</div>
        </div>
      </div>
      <div class="cat-body">
        ${rows.length ? rows.map(a => renderRow(cat, a)).join('') : `<p class="empty-cat">Nothing added yet.</p>`}
        <div class="add-row">
          <label class="sr-only" for="add-${cat.id}">Add an activity to ${esc(c.title)}</label>
          <select id="add-${cat.id}" data-add="${cat.id}">
            <option value="">+ Add an activity…</option>
            ${cat.types.map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('')}
          </select>
        </div>
      </div>
    </section>`
}

function renderRow(cat, a) {
  const hit = getType(a.typeId)
  if (!hit) return ''
  const t = hit.type
  const r = computeActivity(a)
  return `
    <div class="row" data-row="${a.id}">
      <div class="row-main">
        <div class="field wide">
          <label for="type-${a.id}">Activity</label>
          <div class="with-unit">
            <select id="type-${a.id}" data-cat="${cat.id}" data-act="${a.id}" data-type-select>
              ${cat.types.map(x => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="row-fields">
          ${t.inputs.map(f => `
            <div class="field">
              <label for="in-${a.id}-${f.key}">${esc(f.label)}</label>
              <div class="with-unit">
                <input type="number" id="in-${a.id}-${f.key}" inputmode="decimal" min="${f.min ?? 0}" step="${f.step ?? 'any'}"
                       value="${esc(a.inputs[f.key] ?? '')}" data-cat="${cat.id}" data-act="${a.id}" data-key="${f.key}" />
                <span class="unit">${esc(f.unit)}</span>
              </div>
            </div>`).join('')}
          ${t.roundTrip ? `
            <label class="check"><input type="checkbox" data-cat="${cat.id}" data-act="${a.id}" data-key="roundTrip" ${a.inputs.roundTrip ? 'checked' : ''} /> Round trip</label>` : ''}
        </div>
        <p class="note">${fmtNum(t.factor, 3)} kg CO₂e per ${esc(t.unit)} · ${esc(t.source)}${t.note ? ' · ' + esc(t.note) : ''}</p>
      </div>
      <div class="row-result">
        <div class="num" data-row-kg="${a.id}">${fmtKg(r.kg)}</div>
        <div class="lbl">CO₂e</div>
        <button type="button" class="btn-link rm" data-action="remove" data-cat="${cat.id}" data-act="${a.id}">Remove</button>
      </div>
    </div>`
}

/** Cheap update of every number on the calculate view without touching inputs. */
function updateTotals() {
  const totals = computeTotals(state.draft.activities)
  for (const r of totals.rows) {
    const el = $(`[data-row-kg="${r.activityId}"]`)
    if (el) el.textContent = fmtKg(r.kg)
  }
  for (const cat of CATEGORIES) {
    const el = $(`[data-cat-total="${cat.id}"]`)
    if (!el) continue
    const [v, u] = kgSplit(totals.byCategory[cat.id] || 0)
    el.textContent = v
    el.nextElementSibling.textContent = u
  }
  const [tv, tu] = kgSplit(totals.total)
  const sumTotal = $('#sum-total')
  if (sumTotal) sumTotal.innerHTML = `${tv}<small>${tu}</small>`
  const cmp = $('#sum-compare')
  if (cmp) cmp.textContent = compareLine(totals.total)
  const bars = $('#sum-bars')
  if (bars) {
    const max = Math.max(...Object.values(totals.byCategory), 1)
    bars.innerHTML = CATEGORIES.map(cat => {
      const kg = totals.byCategory[cat.id] || 0
      const pct = totals.total ? Math.round((kg / totals.total) * 100) : 0
      return `<div class="bar" title="${esc(cat.name)}: ${fmtKg(kg)} (${pct}%)">
        <span>${esc(cat.short)}</span>
        <span class="track"><span class="fill" style="width:${(kg / max) * 100}%"></span></span>
        <span class="v">${totals.total ? pct + '%' : '—'}</span>
      </div>`
    }).join('')
  }
  const lockBtn = $('.summary [data-action="goto"]')
  if (lockBtn) lockBtn.disabled = totals.total <= 0
  const clearBtn = $('.summary [data-action="clear-draft"]')
  if (clearBtn) clearBtn.disabled = draftCount() === 0
  $('#mobile-total-num').textContent = fmtKg(totals.total)
}

/* ---------- 02 lock ---------- */

function renderLock() {
  const totals = computeTotals(state.draft.activities)
  const hasDraft = totals.total > 0
  const basedOn = state.draft.basedOn ? state.locks.find(l => l.id === state.draft.basedOn) : null
  const [tv, tu] = kgSplit(totals.total)

  app.innerHTML = `
    <div class="view-head">
      <div class="kicker">Step 02</div>
      <h1>Lock the number.</h1>
      <p class="lede">Locking freezes the total, its inputs and the factor version with a timestamp. The locked figure becomes the target the offset plan works against. It cannot be edited afterwards, only superseded by a new dated version.</p>
    </div>
    <div class="lock-grid">
      <section class="panel dark" aria-labelledby="review-title">
        <div class="kicker">${hasDraft ? 'Ready to lock' : 'Nothing to lock yet'}</div>
        <h3 id="review-title">${hasDraft ? (state.mode === 'team' ? 'Campaign total' : 'Your total') : 'Draft is empty'}</h3>
        ${hasDraft ? `
          <div class="review-total">${tv}<small>${tu}</small></div>
          <p class="muted">${compareLine(totals.total)}</p>
          <ul class="review-list">
            ${CATEGORIES.map(cat => {
              const kg = totals.byCategory[cat.id] || 0
              const pct = totals.total ? Math.round((kg / totals.total) * 100) : 0
              return `<li><span class="cn">${esc(cat.name)}</span><span class="ck">${fmtKg(kg)}</span><span class="cp">${pct}%</span></li>`
            }).join('')}
          </ul>
          <form class="lock-form" id="lock-open-form">
            ${basedOn ? `<p class="muted">This will become <strong>v${basedOn.version + 1}</strong> of “${esc(basedOn.label)}”. v${basedOn.version} stays exactly as it was.</p>` : ''}
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button type="submit" class="btn btn-primary btn-lg">Lock this footprint</button>
              <button type="button" class="btn btn-on-dark" data-action="goto" data-view="calculate">Back to inputs</button>
            </div>
          </form>` : `
          <p class="muted" style="margin:12px 0 22px">Add at least one activity in the calculator before locking a figure.</p>
          <button type="button" class="btn btn-primary" data-action="goto" data-view="calculate">Go to calculator</button>`}
      </section>

      <section class="panel" aria-labelledby="locks-title">
        <div class="kicker">Locked footprints</div>
        <h3 id="locks-title">${state.locks.length ? `${state.locks.length} on record` : 'None yet'}</h3>
        <p class="muted">${state.locks.length
          ? 'Each entry is frozen. Choose which one the offset plan targets, or start a new version from it.'
          : 'Once you lock a footprint it appears here with its timestamp, version and fingerprint.'}</p>
        <ul class="locks">${state.locks.map(renderLockCard).join('')}</ul>
      </section>
    </div>`
}

function renderLockCard(lock) {
  const isActive = activeLock()?.id === lock.id
  const ok = store.verifyLock(lock)
  const offset = store.offsetTotal(state, lock.id)
  const pct = lock.totalKg ? Math.min(100, Math.round((offset / lock.totalKg) * 100)) : 0
  const rows = Object.entries(lock.activities).flatMap(([catId, arr]) => arr.map(a => ({ catId, a })))
  return `
    <li class="lock-card" data-active="${isActive}">
      <div>
        <div class="lk-label">${esc(lock.label)} <span class="badge">v${lock.version}</span></div>
        <div class="lk-meta">
          <span>${fmtDate(lock.lockedAt)}</span>
          <span>${lock.mode === 'team' ? 'Team' : 'Individual'}</span>
          <span>Factors ${esc(lock.factorsVersion)}</span>
          <span>FP ${esc(lock.fingerprint)}</span>
          <span class="badge ${ok ? 'ok' : 'warn'}">${ok ? 'Verified' : 'Tampered'}</span>
          ${isActive ? '<span class="badge red">Offsetting this</span>' : ''}
        </div>
      </div>
      <div class="lk-total">${fmtKg(lock.totalKg)}</div>
      <div class="lk-actions">
        ${isActive ? `<button type="button" class="btn btn-primary btn-sm" data-action="goto" data-view="offset">Offset plan · ${pct}%</button>`
                   : `<button type="button" class="btn btn-sm" data-action="activate" data-lock="${lock.id}">Use for offsetting</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-action="new-version" data-lock="${lock.id}">Start new version</button>
        <button type="button" class="btn-link" data-action="toggle-inputs" data-lock="${lock.id}" aria-expanded="false">Show inputs</button>
      </div>
      <div class="lk-inputs" data-lock-inputs="${lock.id}" hidden style="grid-column:1/-1">
        <ul class="review-list" style="margin:8px 0 0">
          ${rows.length ? rows.map(({ catId, a }) => {
            const hit = getType(a.typeId)
            const r = computeActivity(a)
            const cat = CATEGORIES.find(c => c.id === catId)
            const ins = hit ? hit.type.inputs.map(f => `${fmtNum(num(a.inputs[f.key]), 2)} ${f.unit}`).join(' × ') + (a.inputs.roundTrip ? ' × 2 (round trip)' : '') : ''
            return `<li><span><span class="cn">${esc(cat?.short || catId)}</span><br>${esc(hit?.type.label || a.typeId)}<br><span class="muted" style="font-size:.9rem">${esc(ins)}</span></span><span class="ck">${fmtKg(r.kg)}</span><span></span></li>`
          }).join('') : '<li><span class="muted">No inputs recorded.</span></li>'}
        </ul>
      </div>
    </li>`
}

/* ---------- 03 offset ---------- */

function renderOffset() {
  const lock = activeLock()
  if (!lock) {
    app.innerHTML = `
      <div class="view-head"><div class="kicker">Step 03</div><h1>Offset.</h1></div>
      <div class="gate">
        <h2>Lock a footprint first</h2>
        <p>The offset plan is sized against a locked figure so the target cannot drift while you work on it.</p>
        <button type="button" class="btn btn-primary" data-action="goto" data-view="calculate">Start calculating</button>
      </div>`
    return
  }
  const offset = store.offsetTotal(state, lock.id)
  const remaining = Math.max(0, lock.totalKg - offset)
  const pct = lock.totalKg ? Math.min(100, (offset / lock.totalKg) * 100) : 0
  const done = remaining <= 0
  const [tv, tu] = kgSplit(lock.totalKg)
  const electricityKg = Object.values(lock.activities).flat().reduce((s, a) => {
    const hit = getType(a.typeId)
    return hit && hit.type.unit === 'kWh' ? s + computeActivity(a).kg : s
  }, 0)
  const log = state.offsetLog[lock.id] || []

  app.innerHTML = `
    <div class="view-head">
      <div class="kicker">Step 03</div>
      <h1>${done ? 'Fully offset.' : 'Offset the locked figure.'}</h1>
      <p class="lede">Four credible ways to cover the number, sized to it. Log what you actually do and the bar fills in. Mix pathways: credits for the bulk, certificates for electricity, trees for the long term, reductions for next season.</p>
      ${state.locks.length > 1 ? `
        <div class="field" style="margin-top:20px;max-width:520px">
          <label for="active-lock">Footprint being offset</label>
          <div class="with-unit"><select id="active-lock" data-active-select>
            ${state.locks.map(l => `<option value="${l.id}" ${l.id === lock.id ? 'selected' : ''}>${esc(l.label)} · v${l.version} · ${fmtKg(l.totalKg)}</option>`).join('')}
          </select></div>
        </div>` : ''}
    </div>

    <section class="offset-hero" aria-label="Locked footprint and progress">
      <div>
        <div class="kicker">Locked footprint</div>
        <div class="big">${tv}<small>${tu}</small></div>
        <div class="meta">
          <span>${esc(lock.label)}</span><span>v${lock.version}</span><span>Locked ${fmtDate(lock.lockedAt)}</span><span>FP ${esc(lock.fingerprint)}</span>
        </div>
      </div>
      <div class="progress" role="group" aria-label="Offset progress">
        <div class="pl"><span>Offset so far</span><span><span class="num">${fmtKg(offset)}</span> / ${fmtKg(lock.totalKg)}</span></div>
        <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="${Math.round(lock.totalKg)}" aria-valuenow="${Math.round(Math.min(offset, lock.totalKg))}">
          <div class="fill ${done ? 'done' : ''}" style="width:${pct}%"></div>
        </div>
        <p class="remaining">${done
          ? `Covered, with <strong>${fmtKg(offset - lock.totalKg)}</strong> to spare. Keep the records for each entry.`
          : `<strong>${fmtKg(remaining)}</strong> still to offset · ${Math.round(pct)}% done`}</p>
      </div>
    </section>

    <div class="kicker" style="margin-bottom:14px">Ways to cover it · ranked by credibility</div>
    <div class="pathways">
      ${PATHWAYS.slice().sort((a, b) => a.rank - b.rank).map(p => renderPathway(p, remaining, lock, electricityKg)).join('')}
    </div>

    <div class="log-grid">
      <section class="panel" aria-labelledby="log-title">
        <div class="kicker">Track progress</div>
        <h3 id="log-title">Log an offset action</h3>
        <p class="muted" style="margin-bottom:18px">Record what was actually done. Each entry converts to kg CO₂e using the pathway factor and counts toward the bar.</p>
        <form class="log-form" id="offset-form">
          <div class="field wide">
            <label for="log-pathway">Pathway</label>
            <div class="with-unit"><select id="log-pathway" name="pathwayId">
              ${PATHWAYS.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
            </select></div>
          </div>
          <div class="row-fields">
            <div class="field">
              <label for="log-qty" id="log-qty-label">${esc(PATHWAYS[0].inputLabel)}</label>
              <div class="with-unit"><input type="number" id="log-qty" name="quantity" inputmode="decimal" min="0" step="${PATHWAYS[0].step}" value="1" required /><span class="unit" id="log-unit">${esc(PATHWAYS[0].unitPlural)}</span></div>
            </div>
            <div class="field">
              <label for="log-date">Date</label>
              <div class="with-unit"><input type="date" id="log-date" name="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
            </div>
          </div>
          <div class="conv" id="log-conv"></div>
          <div class="field wide">
            <label for="log-note">Note / evidence reference</label>
            <div class="with-unit"><input type="text" id="log-note" name="note" maxlength="140" placeholder="e.g. Gold Standard retirement #GS-1234, invoice 88" /></div>
          </div>
          <button type="submit" class="btn btn-primary">Add to progress</button>
        </form>
      </section>

      <section class="panel" aria-labelledby="entries-title">
        <div class="kicker">Logged so far</div>
        <h3 id="entries-title">${log.length ? `${log.length} ${log.length === 1 ? 'entry' : 'entries'}` : 'No entries yet'}</h3>
        <ul class="log-list">
          ${log.map(e => {
            const p = PATHWAYS.find(x => x.id === e.pathwayId)
            return `<li>
              <span class="ld">${esc(e.date)}</span>
              <span class="lp">${esc(p?.name || e.pathwayId)} · ${fmtNum(e.quantity, 2)} ${esc(p?.unitPlural || '')}${e.note ? `<span class="ln">${esc(e.note)}</span>` : ''}</span>
              <span class="lk">${fmtKg(e.kg)}</span>
              <button type="button" class="btn-link" data-action="remove-offset" data-entry="${e.id}">Remove</button>
            </li>`
          }).join('')}
        </ul>
      </section>
    </div>`
  updateLogConversion()
}

function renderPathway(p, remaining, lock, electricityKg) {
  let sizeHtml, sizeLbl
  if (p.id === 'recs') {
    const mwh = electricityKg / p.kgPerUnit
    sizeHtml = `${fmtNum(mwh, 2)}<small> MWh</small>`
    sizeLbl = electricityKg > 0 ? `covers the ${fmtKg(electricityKg)} from electricity in this footprint` : 'no electricity recorded in this footprint'
  } else if (p.id === 'reduction') {
    sizeHtml = `${fmtKg(remaining, { unit: false })}<small> ${remaining >= 10000 ? 't' : 'kg'} to find</small>`
    sizeLbl = remaining > 0 ? 'log each avoided-emission change as you make it' : 'nothing left to cover'
  } else {
    const n = remaining / p.kgPerUnit
    const shown = p.id === 'trees' ? Math.ceil(n) : Math.ceil(n * 10) / 10
    sizeHtml = `${fmtNum(shown, 1)}<small> ${shown === 1 ? p.unit : p.unitPlural}</small>`
    sizeLbl = remaining > 0 ? `to cover the remaining ${fmtKg(remaining)}` : 'nothing left to cover'
  }
  return `
    <article class="pathway" aria-labelledby="pw-${p.id}">
      <div class="pw-head">
        <div>
          <div class="rank">${String(p.rank).padStart(2, '0')}</div>
          <h3 id="pw-${p.id}">${esc(p.name)}</h3>
        </div>
        <span class="badge red">${esc(p.tag)}</span>
      </div>
      <div>
        <div class="size">${sizeHtml}</div>
        <div class="size-lbl">${esc(sizeLbl)}</div>
      </div>
      <dl>
        <div><dt>What it is</dt><dd>${esc(p.what)}</dd></div>
        <div><dt>How it works</dt><dd>${esc(p.how)}</dd></div>
        <div><dt>Why it's credible</dt><dd>${esc(p.why)}</dd></div>
      </dl>
      ${p.presets ? `<details><summary>Worked examples</summary><ul class="presets">
        ${p.presets.map(x => `<li><span>${esc(x.label)}<br><span class="muted" style="font-size:.88rem">${esc(x.note)}</span></span><span class="pv">${fmtNum(x.kgPer, 1)} kg / ${esc(x.per)}</span></li>`).join('')}
      </ul></details>` : ''}
      <div class="price">${esc(p.priceHint)} · ${fmtNum(p.kgPerUnit)} kg CO₂e per ${esc(p.unit)}</div>
      <button type="button" class="btn btn-dark btn-sm" data-action="prefill" data-pathway="${p.id}">Log ${esc(p.unitPlural)}</button>
    </article>`
}

function updateLogConversion() {
  const sel = $('#log-pathway')
  if (!sel) return
  const p = PATHWAYS.find(x => x.id === sel.value) || PATHWAYS[0]
  const qty = num($('#log-qty').value)
  $('#log-qty-label').textContent = p.inputLabel
  $('#log-unit').textContent = p.unitPlural
  $('#log-qty').step = p.step
  $('#log-conv').innerHTML = `<strong>${fmtKg(qty * p.kgPerUnit)}</strong> CO₂e offset`
}

/* ------------------------------------------------------------------ */
/* events                                                             */
/* ------------------------------------------------------------------ */

$('#mode-switch').addEventListener('click', e => {
  const b = e.target.closest('button[data-mode]')
  if (!b || b.dataset.mode === state.mode) return
  state.mode = b.dataset.mode
  store.save(state)
  render()
})

$('#stepper').addEventListener('click', e => {
  const b = e.target.closest('.step')
  if (b && !b.disabled) go(b.dataset.view)
})

window.addEventListener('hashchange', () => { view = viewFromHash(); render() })

document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]')
  if (!b) return
  const a = b.dataset.action

  if (a === 'goto') go(b.dataset.view)

  else if (a === 'remove') {
    const arr = state.draft.activities[b.dataset.cat] || []
    state.draft.activities[b.dataset.cat] = arr.filter(x => x.id !== b.dataset.act)
    store.save(state); renderCalculate()
  }

  else if (a === 'clear-draft') {
    if (!draftCount() || !confirm('Clear every activity in the current draft? Locked footprints are not affected.')) return
    state.draft = { label: '', activities: {}, basedOn: null }
    store.save(state); renderCalculate(); toast('Draft cleared')
  }

  else if (a === 'close-dialog') $('#lock-dialog').close()

  else if (a === 'activate') {
    state.activeLockId = b.dataset.lock; store.save(state); render(); toast('Offset plan now targets this footprint')
  }

  else if (a === 'new-version') {
    const lock = state.locks.find(l => l.id === b.dataset.lock)
    if (!lock) return
    if (draftCount() && !confirm('The current draft has unsaved activities. Replace it with a copy of this locked footprint?')) return
    store.newVersionFrom(state, lock); go('calculate'); toast(`Editing v${lock.version + 1} draft`)
  }

  else if (a === 'toggle-inputs') {
    const box = $(`[data-lock-inputs="${b.dataset.lock}"]`)
    box.hidden = !box.hidden
    b.setAttribute('aria-expanded', String(!box.hidden))
    b.textContent = box.hidden ? 'Show inputs' : 'Hide inputs'
  }

  else if (a === 'prefill') {
    $('#log-pathway').value = b.dataset.pathway
    updateLogConversion()
    $('#log-qty').focus()
    $('#offset-form').scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  else if (a === 'remove-offset') {
    const lock = activeLock()
    store.removeOffset(state, lock.id, b.dataset.entry); renderOffset()
  }

  else if (a === 'export') {
    const blob = new Blob([store.exportJSON(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = Object.assign(document.createElement('a'), { href: url, download: `anantam-carbon-${new Date().toISOString().slice(0, 10)}.json` })
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  else if (a === 'import') $('#import-file').click()
})

$('#import-file').addEventListener('change', async e => {
  const f = e.target.files[0]
  if (!f) return
  try {
    const added = store.importJSON(state, await f.text())
    render(); toast(`Imported ${added} locked ${added === 1 ? 'footprint' : 'footprints'}`)
  } catch (err) {
    alert('Could not import: ' + err.message)
  }
  e.target.value = ''
})

// calculate-view inputs (delegated)
app.addEventListener('input', e => {
  const el = e.target
  if (el.dataset.key && el.dataset.act) {
    const arr = state.draft.activities[el.dataset.cat] || []
    const act = arr.find(x => x.id === el.dataset.act)
    if (!act) return
    act.inputs[el.dataset.key] = el.type === 'checkbox' ? el.checked : el.value
    store.save(state); updateTotals()
  } else if (el.id === 'log-qty') updateLogConversion()
})

app.addEventListener('change', e => {
  const el = e.target
  if (el.dataset.add) {
    if (!el.value) return
    const hit = getType(el.value)
    const arr = (state.draft.activities[el.dataset.add] ||= [])
    arr.push({ id: store.uid(), typeId: el.value, inputs: defaultInputs(hit.type, state.mode) })
    store.save(state); renderCalculate()
    const last = $$(`#cat-${el.dataset.add} .row`).pop()
    last?.querySelector('input[type="number"]')?.focus()
  } else if (el.hasAttribute('data-type-select')) {
    const arr = state.draft.activities[el.dataset.cat] || []
    const act = arr.find(x => x.id === el.dataset.act)
    const hit = getType(el.value)
    if (!act || !hit) return
    act.typeId = el.value
    act.inputs = defaultInputs(hit.type, state.mode)
    store.save(state); renderCalculate()
  } else if (el.id === 'log-pathway') updateLogConversion()
  else if (el.hasAttribute('data-active-select')) {
    state.activeLockId = el.value; store.save(state); renderOffset()
  }
})

// lock: open dialog
app.addEventListener('submit', e => {
  if (e.target.id === 'lock-open-form') {
    e.preventDefault()
    const totals = computeTotals(state.draft.activities)
    const [tv, tu] = kgSplit(totals.total)
    $('#lock-dialog-total').innerHTML = `${tv}<small>${tu}</small>`
    $('#lock-dialog-sub').textContent = `${state.mode === 'team' ? 'Team' : 'Individual'} mode · ${draftCount()} activities · factors v${FACTORS_VERSION}`
    $('#lock-label').value = state.draft.label || ''
    $('#lock-confirm').checked = false
    $('#lock-submit').disabled = true
    $('#lock-dialog').showModal()
  } else if (e.target.id === 'offset-form') {
    e.preventDefault()
    const lock = activeLock()
    const fd = new FormData(e.target)
    const quantity = num(fd.get('quantity'))
    if (quantity <= 0) return
    store.addOffset(state, lock.id, { pathwayId: fd.get('pathwayId'), quantity, date: fd.get('date'), note: fd.get('note') })
    renderOffset(); toast('Logged')
  }
})

$('#lock-confirm').addEventListener('change', e => { $('#lock-submit').disabled = !e.target.checked })
$('#lock-form').addEventListener('submit', e => {
  e.preventDefault()
  if (!$('#lock-confirm').checked) return
  const lock = store.createLock(state, $('#lock-label').value.trim())
  $('#lock-dialog').close()
  go('offset')
  toast(`Locked ${fmtKg(lock.totalKg)} · v${lock.version}`)
})

render()
