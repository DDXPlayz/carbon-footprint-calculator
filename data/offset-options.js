/**
 * Offset pathways for the Anantam Sustain carbon calculator.
 *
 * Each pathway converts a logged quantity (trees, credits, MWh, kg avoided)
 * into kg CO₂e offset. Numbers are deliberately conservative and documented
 * so they can be swapped as better sources are found. Bump OFFSETS_VERSION
 * when you change a factor.
 */

export const OFFSETS_VERSION = '2026.09-1'

export const PATHWAYS = [
  {
    id: 'credits',
    rank: 1,
    name: 'Verified carbon credits',
    unit: 'credit',
    unitPlural: 'credits',
    kgPerUnit: 1000,
    tag: 'Most credible',
    what: 'One credit represents one tonne of CO₂e that a registered project has reduced or removed, verified by an independent auditor and then retired in your name so nobody else can claim it.',
    how: 'Buy through a registry-listed project on Gold Standard or Verra (VCS), or through a reseller that shows you the retirement certificate and serial numbers. Ask for the project ID and the retirement record.',
    why: 'Third-party verification, public registries and serialised retirement make credits the most auditable offset available. Favour projects with co-benefits (clean cookstoves, biogas, reforestation with community ownership) and avoid anything without a registry record.',
    priceHint: 'Roughly ₹800–₹2,500 (US$10–30) per credit for nature-based projects; engineered removals cost far more.',
    inputLabel: 'Credits retired',
    step: 0.1
  },
  {
    id: 'trees',
    rank: 2,
    name: 'Tree planting',
    unit: 'tree',
    unitPlural: 'trees',
    kgPerUnit: 220,
    tag: 'Tangible, slow',
    what: 'A planted native tree absorbs about 22 kg CO₂e a year once established. This calculator counts ten years of growth per tree, so one tree is taken as 220 kg.',
    how: 'Plant with a local organisation that tracks survival and geo-tags saplings, or through Anantam Sustain’s own plantation drives. Plant 20–30% more than the number shown to allow for saplings that do not survive.',
    why: 'Planting is visible and local, but it is slow and only counts if the trees survive. Treat it as a long-term commitment rather than an instant offset, and pair it with credits for the near term.',
    priceHint: 'Roughly ₹50–₹300 per sapling including care, depending on the organisation.',
    inputLabel: 'Trees planted',
    step: 1
  },
  {
    id: 'recs',
    rank: 3,
    name: 'Renewable energy certificates',
    unit: 'MWh',
    unitPlural: 'MWh',
    kgPerUnit: 716,
    tag: 'Best for electricity',
    what: 'A renewable energy certificate (I-REC in India) proves that one megawatt-hour of electricity was generated from wind, solar or hydro and fed into the grid on your behalf.',
    how: 'Buy I-RECs through a registered participant, or through a school or sponsor that already procures them. Ask for the redemption statement showing the volume and the generator.',
    why: 'Certificates are traceable and cheap, but they only make sense against the electricity part of your footprint (machine time, venue energy, digital use). Do not use them to cover flights.',
    priceHint: 'Roughly ₹100–₹400 per MWh in India.',
    inputLabel: 'MWh redeemed',
    step: 0.1
  },
  {
    id: 'reduction',
    rank: 4,
    name: 'Reduction commitments',
    unit: 'kg avoided',
    unitPlural: 'kg avoided',
    kgPerUnit: 1,
    tag: 'Cuts the next footprint',
    what: 'A logged, measurable change that avoids emissions you would otherwise have produced: switching to recycled aluminium, going digital-only for the portfolio, taking the train instead of a domestic flight, reusing packaging.',
    how: 'Run the calculator twice, once with the old choice and once with the new one, and log the difference here with a short note. Keep the evidence (invoice, booking) alongside the note.',
    why: 'Reductions are the only option that actually shrinks the next campaign’s number. They count toward this campaign only where the change was made after the footprint was locked and can be shown to have happened.',
    priceHint: 'Usually free or cheaper than the original choice.',
    inputLabel: 'kg CO₂e avoided',
    step: 1,
    presets: [
      { label: 'Recycled instead of virgin aluminium', note: 'Saves ~6.5 kg per kg of aluminium', kgPer: 6.5, per: 'kg' },
      { label: 'Digital portfolio instead of 5 colour copies of 40 pages', note: 'Saves ~2.4 kg per set', kgPer: 2.4, per: 'set' },
      { label: 'Train instead of a 800 km domestic flight, per person round trip', note: 'Saves ~340 kg per person', kgPer: 340, per: 'person' },
      { label: 'Fabric banner reused instead of new PVC flex', note: 'Saves ~3 kg per m²', kgPer: 3, per: 'm²' }
    ]
  }
]
