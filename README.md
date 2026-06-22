# IDX e-IPO Analytics

A static dashboard over a census of Indonesian (IDX) IPOs, 2021–2026 (246 deals, 237 listed):
day-1 → day-7 return behavior, underwriter performance (lead vs syndicate member), sector and time trends.

**Stack:** React + TypeScript + Vite · Tailwind CSS + shadcn-style components · Recharts. TradingView-style dark theme, Inter with tabular figures.

## Run

```bash
bun install
bun run data      # regenerate src/data/*.json from "e-IPO Data.xlsx" (only when the sheet changes)
bun run dev       # dev server (http://localhost:5173)
bun run build     # typecheck + production build -> dist/
bun run preview   # serve the production build
```

## Data pipeline

`scripts/build-data.ts` parses `e-IPO Data.xlsx` into `src/data/ipos.json` (typed) and `brokers.json`
(broker code → name). Returns D1–D7 are **daily**; the per-IPO cumulative series is compounded from them.
Lifetime = offer price → latest price. Median is the headline statistic (returns are right-skewed) and
sample size `n` is shown on every cut. Non-listed deals (canceled / postponed / book-building) are excluded
from return stats.

See `PRODUCT.md` for the design brief and `ISA.md` for the full spec, criteria, and decision log.
