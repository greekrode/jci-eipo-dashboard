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
- **Underwriters** — a global **All / Lead / Member** toggle drives a market stat strip, a
  capital-raised ranking, an activity-vs-performance scatter (deals × median D1, bubble = proceeds),
  and a searchable league table (proceeds, D1–D7 fade, win rate). Lead-vs-member and solo-vs-syndicated
  panels are shown as cross-role reference. Each broker has a consistent color across scatter, bars, and table.
- **Sectors & Time** — median day-1 pop by sector (colored per sector), per-sector and per-year
  D1/D3/D5/D7 fade tables, and a year-by-year market-temperature chart.
- **Explorer** — every deal, searchable / filterable / sortable, groupable by lead, sector, or year.
  Shows D1/D3/D5/D7 cumulative returns, the lead and member underwriters (hover a code for the firm name).

## Run

```bash
bun install
bun run data      # regenerate src/data/*.json from "e-IPO Data.xlsx" (only when the sheet changes)
bun run dev       # dev server (http://localhost:5173)
bun run build     # typecheck + production build -> dist/
bun run preview   # serve the production build
```

## Data

`scripts/build-data.ts` parses `e-IPO Data.xlsx` into `src/data/ipos.json` (typed) and
`src/data/brokers.json` (broker code → name).

- **Final price** is the final IPO offer price (post book-building).
- **D1–D7** are *daily* returns; the per-IPO cumulative series is compounded from them.
- **Median** is the headline statistic (returns are right-skewed); sample size `n` is shown on every cut.
- Non-listed deals (canceled / postponed / book-building) are excluded from return stats.
- Underwriter names that the source can't resolve (member-only and foreign joint-venture codes such as
  C3 CIMB Niaga, C4 Citigroup, D4 Deutsche, S0 Morgan Stanley, Y0 BNP Paribas) are filled in
  `NAME_OVERRIDES` in `src/lib/compute.ts`.

Source: [e-ipo.co.id](https://e-ipo.co.id).

## Structure

```
scripts/build-data.ts     data pipeline (xlsx -> json)
src/
  data/                   generated ipos.json + brokers.json
  lib/                    types, stats, formatters, colors, aggregation (compute.ts)
  components/ui/          shadcn-style primitives (card, table, tabs, badge, input, tooltip)
  components/             charts.tsx, stat-strip.tsx
  views/                  Overview, Underwriters, SectorsTime, Explorer
  App.tsx                 shell + tabs
```
