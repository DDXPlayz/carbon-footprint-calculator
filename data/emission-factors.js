/**
 * Emission factors for the Anantam Sustain carbon calculator.
 *
 * Every number the calculator multiplies by lives in this file. Nothing in the
 * UI or engine hardcodes a factor. To update a factor, change it here, bump
 * FACTORS_VERSION, and note the source. Locked footprints record which
 * FACTORS_VERSION produced them, so old locks stay reproducible.
 *
 * Units: every factor is kg CO₂e per one `unit` of the activity.
 *
 * Sources (abbreviated in `source` fields):
 *   DESNZ 2024   UK Government GHG Conversion Factors for Company Reporting, 2024
 *                (flights include radiative forcing uplift).
 *   CEA 2023     Central Electricity Authority of India, CO₂ Baseline Database v19
 *                (all-India grid average, ~0.716 kg CO₂/kWh).
 *   Ember 2024   Ember Global Electricity Review, world average intensity.
 *   ICE v3       Inventory of Carbon & Energy v3 (Univ. of Bath), cradle-to-gate.
 *   P&N 2018     Poore & Nemecek, Science 2018 (food footprints).
 *   EST          Estimate assembled from several public studies; treat as ±50%.
 */

export const FACTORS_VERSION = '2026.09-1'

/**
 * Each activity type declares:
 *   id        stable key (locked footprints reference it)
 *   label     what the user sees
 *   factor    kg CO₂e per unit
 *   unit      what one unit of `quantity` is (documentation only)
 *   inputs    the fields the user fills in; quantity = product of all numeric inputs
 *   roundTrip optional: adds a "round trip" toggle that doubles the quantity
 *   source    where the factor came from
 *   note      plain-language caveat
 */
export const CATEGORIES = [
  {
    id: 'travel',
    name: 'Travel',
    short: 'Travel',
    team: {
      title: 'Team travel',
      hint: 'Flights and ground transport for competitions, events and World Finals. Add one row per journey leg.'
    },
    individual: {
      title: 'Your travel',
      hint: 'Flights, trains, cars and buses you took. Add one row per journey.'
    },
    types: [
      {
        id: 'flight_domestic',
        label: 'Flight — domestic (under ~1,000 km)',
        factor: 0.246, unit: 'passenger-km', source: 'DESNZ 2024',
        note: 'Short hops burn disproportionate fuel on take-off and climb.',
        inputs: [
          { key: 'distance', label: 'Distance one way', unit: 'km', default: 800, min: 0, step: 10 },
          { key: 'passengers', label: 'Passengers', unit: 'people', default: 1, min: 1, step: 1, teamDefault: 8 }
        ],
        roundTrip: true
      },
      {
        id: 'flight_short',
        label: 'Flight — short-haul international (1,000–3,700 km)',
        factor: 0.151, unit: 'passenger-km', source: 'DESNZ 2024',
        note: 'Economy class, includes radiative forcing.',
        inputs: [
          { key: 'distance', label: 'Distance one way', unit: 'km', default: 2500, min: 0, step: 10 },
          { key: 'passengers', label: 'Passengers', unit: 'people', default: 1, min: 1, step: 1, teamDefault: 8 }
        ],
        roundTrip: true
      },
      {
        id: 'flight_long',
        label: 'Flight — long-haul international (over 3,700 km)',
        factor: 0.148, unit: 'passenger-km', source: 'DESNZ 2024',
        note: 'Economy class, includes radiative forcing. Premium cabins roughly double this.',
        inputs: [
          { key: 'distance', label: 'Distance one way', unit: 'km', default: 7000, min: 0, step: 10 },
          { key: 'passengers', label: 'Passengers', unit: 'people', default: 1, min: 1, step: 1, teamDefault: 8 }
        ],
        roundTrip: true
      },
      {
        id: 'car',
        label: 'Car or taxi (whole vehicle)',
        factor: 0.17, unit: 'vehicle-km', source: 'DESNZ 2024',
        note: 'Average petrol car. Count the vehicle once regardless of how many people are in it.',
        inputs: [
          { key: 'distance', label: 'Distance one way', unit: 'km', default: 30, min: 0, step: 1 },
          { key: 'vehicles', label: 'Vehicles', unit: 'cars', default: 1, min: 1, step: 1 }
        ],
        roundTrip: true
      },
      {
        id: 'train',
        label: 'Train or metro',
        factor: 0.035, unit: 'passenger-km', source: 'DESNZ 2024',
        note: 'National rail average. Metro is similar.',
        inputs: [
          { key: 'distance', label: 'Distance one way', unit: 'km', default: 200, min: 0, step: 1 },
          { key: 'passengers', label: 'Passengers', unit: 'people', default: 1, min: 1, step: 1, teamDefault: 8 }
        ],
        roundTrip: true
      },
      {
        id: 'bus',
        label: 'Bus or coach',
        factor: 0.027, unit: 'passenger-km', source: 'DESNZ 2024',
        note: 'Intercity coach. City buses are roughly 3× higher per passenger.',
        inputs: [
          { key: 'distance', label: 'Distance one way', unit: 'km', default: 50, min: 0, step: 1 },
          { key: 'passengers', label: 'Passengers', unit: 'people', default: 1, min: 1, step: 1, teamDefault: 8 }
        ],
        roundTrip: true
      }
    ]
  },

  {
    id: 'manufacturing',
    name: 'Manufacturing',
    short: 'Making',
    team: {
      title: 'Car manufacturing',
      hint: 'Raw material bought (including what becomes swarf and failed prints), machine energy, finishing and packaging.'
    },
    individual: {
      title: 'Things you made',
      hint: 'Material and machine time for prototypes, parts or projects you built yourself.'
    },
    types: [
      { id: 'mat_balsa', label: 'Balsa or other timber', factor: 0.45, unit: 'kg', source: 'ICE v3', note: 'Cradle-to-gate, excludes sequestered carbon.',
        inputs: [{ key: 'mass', label: 'Mass bought', unit: 'kg', default: 1, min: 0, step: 0.1 }] },
      { id: 'mat_pu_board', label: 'Polyurethane model board (tooling block)', factor: 4.0, unit: 'kg', source: 'EST', note: 'Common STEM Racing body blank material.',
        inputs: [{ key: 'mass', label: 'Mass bought', unit: 'kg', default: 1, min: 0, step: 0.1 }] },
      { id: 'mat_pla', label: '3D-print filament / resin (PLA, PETG, SLA)', factor: 3.0, unit: 'kg', source: 'EST', note: 'Includes failed prints and supports if you count the whole spool used.',
        inputs: [{ key: 'mass', label: 'Mass used', unit: 'kg', default: 0.5, min: 0, step: 0.05 }] },
      { id: 'mat_abs', label: 'ABS / nylon / engineering plastic', factor: 3.8, unit: 'kg', source: 'ICE v3', note: '',
        inputs: [{ key: 'mass', label: 'Mass used', unit: 'kg', default: 0.5, min: 0, step: 0.05 }] },
      { id: 'mat_aluminium', label: 'Aluminium (virgin)', factor: 8.2, unit: 'kg', source: 'ICE v3', note: 'Recycled aluminium is roughly 1.7 kg/kg — see the offset page for the reduction credit.',
        inputs: [{ key: 'mass', label: 'Mass bought', unit: 'kg', default: 0.5, min: 0, step: 0.05 }] },
      { id: 'mat_steel', label: 'Steel (axles, fasteners, tooling)', factor: 1.9, unit: 'kg', source: 'ICE v3', note: '',
        inputs: [{ key: 'mass', label: 'Mass bought', unit: 'kg', default: 0.5, min: 0, step: 0.05 }] },
      { id: 'mat_cfrp', label: 'Carbon-fibre composite', factor: 25, unit: 'kg', source: 'EST', note: 'Very energy-intensive to make; small masses matter.',
        inputs: [{ key: 'mass', label: 'Mass used', unit: 'kg', default: 0.2, min: 0, step: 0.01 }] },
      { id: 'mat_finish', label: 'Paint, primer, resin, adhesives', factor: 4.0, unit: 'kg', source: 'EST', note: 'Count the cans and bottles opened, not just what stuck to the car.',
        inputs: [{ key: 'mass', label: 'Mass used', unit: 'kg', default: 0.5, min: 0, step: 0.05 }] },
      { id: 'machine_energy', label: 'Machine electricity (CNC, printer, laser)', factor: 0.716, unit: 'kWh', source: 'CEA 2023', note: 'All-India grid average. A desktop 3D printer draws ~0.1 kW; a CNC router 1–3 kW.',
        inputs: [
          { key: 'hours', label: 'Machine hours', unit: 'h', default: 20, min: 0, step: 1 },
          { key: 'power', label: 'Average draw', unit: 'kW', default: 1, min: 0, step: 0.1 }
        ] },
      { id: 'pack_cardboard', label: 'Cardboard packaging & shipping boxes', factor: 0.9, unit: 'kg', source: 'ICE v3', note: '',
        inputs: [{ key: 'mass', label: 'Mass', unit: 'kg', default: 1, min: 0, step: 0.1 }] },
      { id: 'pack_plastic', label: 'Plastic packaging, foam, bubble wrap', factor: 2.5, unit: 'kg', source: 'ICE v3', note: '',
        inputs: [{ key: 'mass', label: 'Mass', unit: 'kg', default: 0.5, min: 0, step: 0.1 }] }
    ]
  },

  {
    id: 'merch',
    name: 'Merchandise',
    short: 'Merch',
    team: {
      title: 'Merchandise & apparel',
      hint: 'Team kit and items produced to sell or give away. Count items made, not items sold.'
    },
    individual: {
      title: 'Apparel & merch you bought',
      hint: 'Team kit and merchandise you personally received or bought this season.'
    },
    types: [
      { id: 'tshirt', label: 'T-shirt (cotton or blend)', factor: 6.0, unit: 'item', source: 'EST', note: 'Cotton growing and dyeing dominate. Organic or recycled cotton is ~30% lower.',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 10, min: 0, step: 1 }] },
      { id: 'jersey', label: 'Polyester race jersey / polo', factor: 5.5, unit: 'item', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 10, min: 0, step: 1 }] },
      { id: 'hoodie', label: 'Hoodie or jacket', factor: 12, unit: 'item', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 5, min: 0, step: 1 }] },
      { id: 'cap', label: 'Cap', factor: 2.5, unit: 'item', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 10, min: 0, step: 1 }] },
      { id: 'lanyard', label: 'Lanyard, badge, keyring, pin', factor: 0.3, unit: 'item', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 50, min: 0, step: 1 }] },
      { id: 'sticker', label: 'Sticker or small paper goods', factor: 0.05, unit: 'item', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 200, min: 0, step: 10 }] },
      { id: 'bottle', label: 'Water bottle / tote bag', factor: 1.5, unit: 'item', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Items', unit: 'pcs', default: 20, min: 0, step: 1 }] }
    ]
  },

  {
    id: 'events',
    name: 'Events',
    short: 'Events',
    team: {
      title: 'Event operations',
      hint: 'In-person fundraisers, school showcases, launches and stalls. Venue energy, catering, and printed displays.'
    },
    individual: {
      title: 'Events you ran or hosted',
      hint: 'Anything you organised in person: a workshop, a stall, a talk.'
    },
    types: [
      { id: 'venue_energy', label: 'Venue electricity (lighting, AV, air-con)', factor: 0.716, unit: 'kWh', source: 'CEA 2023', note: 'A school hall with AV and air-conditioning draws roughly 5–15 kW.',
        inputs: [
          { key: 'hours', label: 'Event hours', unit: 'h', default: 4, min: 0, step: 0.5 },
          { key: 'power', label: 'Average draw', unit: 'kW', default: 8, min: 0, step: 0.5 }
        ] },
      { id: 'meal_veg', label: 'Vegetarian meals served', factor: 0.8, unit: 'meal', source: 'P&N 2018', note: '',
        inputs: [{ key: 'count', label: 'Meals', unit: 'meals', default: 50, min: 0, step: 1 }] },
      { id: 'meal_nonveg', label: 'Non-vegetarian meals served', factor: 2.0, unit: 'meal', source: 'P&N 2018', note: 'Chicken-based. Red meat is ~3× higher.',
        inputs: [{ key: 'count', label: 'Meals', unit: 'meals', default: 0, min: 0, step: 1 }] },
      { id: 'snacks', label: 'Snacks & drinks per attendee', factor: 0.3, unit: 'attendee', source: 'EST', note: 'Packaged snacks, bottled or canned drinks.',
        inputs: [{ key: 'count', label: 'Attendees', unit: 'people', default: 100, min: 0, step: 1 }] },
      { id: 'banner', label: 'Printed banners, standees, backdrops', factor: 3.0, unit: 'm²', source: 'EST', note: 'PVC flex. Fabric banners are ~half and reusable.',
        inputs: [{ key: 'area', label: 'Printed area', unit: 'm²', default: 6, min: 0, step: 0.5 }] },
      { id: 'attendee_travel', label: 'Attendee local travel (average)', factor: 3.0, unit: 'attendee', source: 'EST', note: 'Rough average for a local round trip mixing cars, autos and public transport. Skip if the audience was already on site.',
        inputs: [{ key: 'count', label: 'Attendees travelling', unit: 'people', default: 0, min: 0, step: 1 }] }
    ]
  },

  {
    id: 'print',
    name: 'Print',
    short: 'Print',
    team: {
      title: 'Printed portfolio & materials',
      hint: 'Engineering and enterprise portfolios, pit-display boards, flyers and brochures.'
    },
    individual: {
      title: 'Printing',
      hint: 'Pages you printed for coursework, portfolios or handouts.'
    },
    types: [
      { id: 'page_colour', label: 'A4 pages, colour', factor: 0.012, unit: 'page', source: 'EST', note: 'Paper (~5 g), toner and printer energy per side.',
        inputs: [
          { key: 'pages', label: 'Pages per copy', unit: 'pages', default: 40, min: 0, step: 1 },
          { key: 'copies', label: 'Copies', unit: 'copies', default: 5, min: 0, step: 1 }
        ] },
      { id: 'page_mono', label: 'A4 pages, black & white', factor: 0.008, unit: 'page', source: 'EST', note: '',
        inputs: [
          { key: 'pages', label: 'Pages per copy', unit: 'pages', default: 20, min: 0, step: 1 },
          { key: 'copies', label: 'Copies', unit: 'copies', default: 5, min: 0, step: 1 }
        ] },
      { id: 'binding', label: 'Binding, lamination, hard covers', factor: 0.5, unit: 'document', source: 'EST', note: '',
        inputs: [{ key: 'count', label: 'Documents', unit: 'docs', default: 5, min: 0, step: 1 }] },
      { id: 'display_board', label: 'Foam or display boards', factor: 3.0, unit: 'm²', source: 'EST', note: 'Foam-core mounted prints for pit displays.',
        inputs: [{ key: 'area', label: 'Area', unit: 'm²', default: 2, min: 0, step: 0.25 }] }
    ]
  },

  {
    id: 'digital',
    name: 'Digital & office',
    short: 'Digital',
    team: {
      title: 'Digital & office use',
      hint: 'A small catch-all: laptop hours, video calls, cloud storage and any new devices bought for the campaign.'
    },
    individual: {
      title: 'Digital & office use',
      hint: 'Laptop hours, calls and storage for your part of the project.'
    },
    types: [
      { id: 'laptop_hours', label: 'Laptop / desktop use', factor: 0.035, unit: 'hour', source: 'CEA 2023', note: '~50 W average on the Indian grid.',
        inputs: [{ key: 'hours', label: 'Hours', unit: 'h', default: 200, min: 0, step: 10 }] },
      { id: 'video_calls', label: 'Video calls', factor: 0.15, unit: 'hour', source: 'EST', note: 'Per participant-hour with camera on. Camera off is ~90% lower.',
        inputs: [{ key: 'hours', label: 'Participant-hours', unit: 'h', default: 40, min: 0, step: 5 }] },
      { id: 'cloud', label: 'Cloud storage & website hosting', factor: 0.012, unit: 'GB-month', source: 'EST', note: '',
        inputs: [
          { key: 'gb', label: 'Storage', unit: 'GB', default: 50, min: 0, step: 5 },
          { key: 'months', label: 'Months', unit: 'months', default: 12, min: 0, step: 1 }
        ] },
      { id: 'new_device', label: 'New laptop or tablet bought', factor: 300, unit: 'device', source: 'EST', note: 'Embodied carbon of manufacture. Only count devices bought for this work.',
        inputs: [{ key: 'count', label: 'Devices', unit: 'pcs', default: 0, min: 0, step: 1 }] }
    ]
  }
]

/** Reference figures used for plain-language comparisons on screen. */
export const COMPARISONS = {
  carKmPerKg: 1 / 0.17,        // km an average petrol car drives per kg CO₂e
  treeKgPerYear: 22,           // kg CO₂e a mature tree absorbs per year (EST)
  indiaPerCapitaKgPerYear: 2000 // rough per-person annual footprint in India (EST)
}
