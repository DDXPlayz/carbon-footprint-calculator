# Anantam Sustain — Carbon Calculator

A standalone tool under the **Anantam Sustain** sub-brand. It lets Team Anantam
Racing (and, later, other teams or individuals) do three things in order:

1. **Calculate** a carbon footprint from activity inputs, itemised by category.
2. **Lock** that total as an immutable, timestamped baseline.
3. **Offset** it: see sized, credible pathways and track progress toward covering
   the locked figure.

## Intentionally unlinked

Nothing on the main site links here. There is no nav entry, footer link, sitemap
entry or cross-reference, and the page carries `noindex, nofollow`. It is reachable
only by direct URL:

```
https://anantamracing.com/carbon-calculator/
```

Remove the `robots` meta tag in `index.html` (and, if wanted, add the URL to the
root `sitemap.xml`) when it is ready to be public.

## Isolation

- No build step and no dependencies. Plain HTML, CSS and ES modules.
- Own stylesheet and own favicon copies. Nothing is imported from the root site's
  `style.css`, `main.js` or `assets/`.
- Deleting this folder removes the tool entirely and changes nothing else.

The root site is a plain static site served by GitHub Pages from the repository
root, so this folder is served as-is at `/carbon-calculator/` with no CI change.
The React sub-brand sites (`sustain/`, `rise/`, `inspire/`) are Vite apps deployed
to their own subdomains; this tool deliberately does not follow that pattern so it
can ship without a build pipeline or a separate deployment.

**Independent deployment.** If you ever want this on its own host, point a Vercel or
Netlify project at this folder as the root directory with no build command and the
output directory set to `.`.

## Preview locally

ES modules need an HTTP server (opening `index.html` from disk will not work).

```bash
cd carbon-calculator && python3 -m http.server 4322
```

Then open <http://localhost:4322/>. Any static server works; there is nothing to
build.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell, header, stepper, lock dialog, footer |
| `styles.css` | Brand system: dark base like the main site, red accents, Anton / Orbitron / Gram |
| `app.js` | Renders the three views and handles all events |
| `engine.js` | Pure calculation, snapshots, fingerprint, formatting |
| `storage.js` | localStorage persistence, append-only locks, export/import |
| `data/emission-factors.js` | Every emission factor, with unit, source and caveat |
| `data/offset-options.js` | Offset pathways, conversion factors and copy |
| `fonts/` | Drop the licensed Gram font files here (see below) |

## Emission factors

All factors live in `data/emission-factors.js`. Each activity type declares its
inputs, the factor in kg CO₂e per unit, and the source. The engine multiplies every
numeric input together (× 2 for round trips) and then by the factor. Change a
number, bump `FACTORS_VERSION`, and note the source. Locked footprints record the
factor version that produced them, so old locks remain reproducible.

Sources are abbreviated at the top of that file (UK DESNZ 2024 conversion factors,
India CEA grid intensity, ICE v3 material database, Poore & Nemecek 2018). Factors
marked `EST` are estimates assembled from public studies and should be treated as
±50%.

## Modes

**Team** mode aggregates many activities into one campaign total and uses team-sized
defaults (for example eight passengers per flight). **Individual** mode uses the same
engine with personal framing and single-person defaults. The mode is recorded on
each lock.

## Locking

A lock stores the total, the per-category breakdown, a deep copy of every input,
the mode, the factor version, an ISO timestamp and an FNV-1a fingerprint of all of
the above. The object is frozen in memory and nothing in `storage.js` mutates a lock
after it is written. "Start new version" copies a lock's inputs into a fresh draft
that, when locked, becomes v2 with a `parentId` pointing at v1. The fingerprint is
re-checked on render and any mismatch shows a "Tampered" badge. It is
tamper-evidence, not security.

## Offsetting

`data/offset-options.js` defines four pathways: verified carbon credits (Gold
Standard / Verra), tree planting, renewable energy certificates (I-REC), and logged
reduction commitments. Each converts a logged quantity into kg CO₂e. Certificates
are sized against the electricity portion of the lock only. Logged entries are
stored per lock and drive the progress bar. This is informational; there is no
payment or purchase flow.

## Data and portability

Everything is stored in the browser under one `localStorage` key. Use **Export
data** in the footer to download a JSON file and **Import data** on another
device to merge it. Imports add locks that are not already present and never
overwrite existing ones.

## Fonts

Anton and Orbitron load from Google Fonts. **Gram** is not a Google Font: put the
licensed `.woff2` files in `fonts/` and uncomment the `@font-face` block at the top
of `styles.css`. Until then body copy falls back to the system sans-serif stack.
Display and data elements use Anton and Orbitron only.

## Decisions made during setup

- Folder name `carbon-calculator/` at the repository root, matching the existing
  one-folder-per-property convention (`speed-of-light/`, `hackathon/`, `store/`).
- No framework, because the root site is plain HTML and a no-build folder is the
  only pattern here that deploys with zero CI changes.
- `noindex` added so the page is not discoverable while unlinked.
- The `.claude/launch.json` preview config is git-ignored, so the preview command
  above is the canonical way to run it.
