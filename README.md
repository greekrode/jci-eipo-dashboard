# IDX e-IPO Analytics

A single-page analytics dashboard over a near-complete census of Indonesian (IDX) IPOs,
**2021–2026 (246 deals, 237 listed)**. It turns the raw e-IPO spreadsheet into legible signal:
day-1 → day-7 return behavior, underwriter performance (lead and non-lead), and sector / time trends.

**Stack:** React + TypeScript + Vite · Tailwind CSS + shadcn-style components (Radix) · Recharts.
Dark, semi-brutalist theme; Inter throughout with tabular figures.

## Views

- **Overview** — KPI strip (listed count, median D1, win rate, capital raised, best / worst D1),
  a return-milestone table (D1/D3/D5/D7 with median, mean, std dev, min, max, % up), the
  median-vs-mean 7-day fade curve, and the day-1 return distribution.
- **Choppy Market** — D1→D7 behavior for deals that listed while the JCI sat **below its 200-day MA**
  ("choppy" tape), set against deals that listed into a rising market. A KPI strip (incl. best / worst D7),
  a choppy-vs-performing median fade curve, a side-by-side milestone table, a per-deal D+7 return scatter
  (chronological, bucketed at 0% / +50%, median line, standouts labelled, hover/tap for detail), a
  choppy-vs-performing **outcome-distribution** histogram, a per-sector breakdown, and the full
  choppy-market listing table covering every deal.
- **Underwriters** — a global **All / Lead / Member** toggle drives a market stat strip, a
  capital-raised ranking, an activity-vs-performance scatter (deals × median D1, bubble = proceeds),
  and a searchable league table (proceeds, D1–D7 fade, win rate). Lead-vs-member and solo-vs-syndicated
  panels are shown as cross-role reference. Each broker has a consistent color across scatter, bars, and table.
- **Sectors & Time** — median day-1 pop by sector (colored per sector), per-sector and per-year
  D1/D3/D5/D7 fade tables, and a year-by-year market-temperature chart.
- **Explorer** — every deal, searchable / filterable / sortable, groupable by lead, sector, or year.
  Shows D1/D3/D5/D7 cumulative returns, the lead and member underwriters (hover a code for the firm name).
- **Upcoming** — forensic side-by-side of the current crop of *unlisted* IDX deals (prospectus stage).
  A transposed comparison matrix (offering, float, valuation, leverage, FY-performance, ownership/risk)
  with directional ● highlights, drilling into a per-deal detail: cap table (pre → post + economic blocs),
  use of proceeds, 3-year financials, valuation & leverage, red flags, counterweights, and the full
  verbatim analyst writeup. See **Data** below.

## Run

```bash
bun install
bun run data           # regenerate src/data/ipos.json + brokers.json from "e-IPO Data.xlsx"
bun run data:upcoming  # regenerate src/data/upcoming-ipos.json from _sources/upcoming/ (gitignored)
bun run dev            # dev server (http://localhost:5173)
bun run build     # typecheck + production build -> dist/
bun run preview   # serve the production build
```

## Data

`scripts/build-data.ts` parses `e-IPO Data.xlsx` into `src/data/ipos.json` (typed) and
`src/data/brokers.json` (broker code → name). The master sheet is read as either `e-IPO Data` or
`IPO History` (whichever the workbook exposes).

- **Final price** is the final IPO offer price (post book-building).
- **D1–D7** are *daily* returns; the per-IPO cumulative series is compounded from them.
- **Median** is the headline statistic (returns are right-skewed); sample size `n` is shown on every cut.
- Non-listed deals (canceled / postponed / book-building) are excluded from return stats.
- **Market regime** (`marketRegime` / `jciGap`) is derived from the workbook's `JCI Trend` sheet
  (Date / Close / MA200): each listing is tagged `choppy` when the index closed below its 200-day MA
  on (or just before) the listing date, else `performing`. `jciGap` is `close / MA200 − 1`. The build
  cross-checks this split against the workbook's own `Choppy Market` / `Perform Market` tabs (assert ISC-4).
- Underwriter names that the source can't resolve (member-only and foreign joint-venture codes such as
  C3 CIMB Niaga, C4 Citigroup, D4 Deutsche, S0 Morgan Stanley, Y0 BNP Paribas) are filled in
  `NAME_OVERRIDES` in `src/lib/compute.ts`.

Source: [e-ipo.co.id](https://e-ipo.co.id).

### Upcoming IPOs

`scripts/build-upcoming.ts` normalizes per-deal prospectus analyses into a single committed
`src/data/upcoming-ipos.json`. The raw inputs (one markdown + one JSON per ticker, shipped as ZIPs)
live under `_sources/upcoming/<TICKER>/` and are **gitignored** — only the built JSON is committed.

- Two source schema *families* (`kupas_prospektus` and `IPO_Analysis`) are reconciled via multi-path
  field lookup; nothing is hand-typed.
- Financials arrive in **three different units** (raw Rp / millions / billions). The unit is detected
  per file and everything is converted to **IDR billions** so the deals are comparable. Growth, margins,
  ROE and DER are then computed uniformly from the normalized series.
- `% of proceeds → debt` keeps an honest **basis label** (net vs gross vs company proceeds) rather than
  forcing a false apples-to-apples number.
- The full analyst markdown is embedded verbatim per deal (rendered in the detail view); the complete
  source JSON is retained under `raw` so deal-specific sections aren't lost.
- The script ends with **sanity asserts** cross-checking computed values against the source (e.g. BACH
  ROE ≈ 29%, PRDL net-profit growth ≈ 70%) so a unit/mapping regression fails loudly.

Two committed inputs enrich the normalized base (both merged by the build script):

- **`scripts/upcoming-supplement.json`** — prospectus-PDF-derived data the ZIP JSON lacks: the
  business-model revenue breakdown per deal (one clean ~100%-summing cut) and BACH's post-IPO and
  post-option cap tables. Hand-curated from cited prospectus figures; the PDFs themselves stay gitignored.
- **`scripts/forensic/<TICKER>.md`** — a curated forensic writeup per deal in one consistent 7-heading
  template (Thesis · How the business works · The offering & ownership · Governance & related parties ·
  Reading the financials · Valuation · Bottom line), prose-only with the card-covered tables removed.
  Rendered in the detail view in place of the original `narrativeMd`.

To add a deal: drop its ZIP in the project root, `unzip` it into `_sources/upcoming/<TICKER>/`, add the
ticker to `TICKERS` in the script, optionally add a supplement entry and a `scripts/forensic/<TICKER>.md`,
and run `bun run data:upcoming`.

## Structure

```
scripts/build-data.ts        data pipeline (xlsx -> json)
scripts/build-upcoming.ts    upcoming-IPO normalizer (_sources/upcoming + supplement + forensic -> json)
scripts/upcoming-supplement.json   prospectus-PDF-derived business models + BACH cap tables (committed)
scripts/forensic/<TICKER>.md curated forensic writeups, one per deal (committed)
src/
  data/                      generated ipos.json + brokers.json + upcoming-ipos.json
  lib/                       types, upcoming-types, stats, formatters, colors, aggregation (compute.ts)
  components/ui/             shadcn-style primitives (card, table, tabs, badge, input, tooltip)
  components/                charts.tsx, stat-strip.tsx
  views/                     Overview, Underwriters, SectorsTime, Explorer, Upcoming
  views/upcoming/            Detail.tsx (business-model, ownership, financials… cards + forensic), shared.tsx
  App.tsx                    shell + tabs
```
