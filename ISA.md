---
project: ipo-dashboard
task: IDX e-IPO analytics dashboard (React web app)
effort: E3
phase: verify
progress: built — all four views shipped, verified visually
mode: algorithm
started: 2026-06-22
updated: 2026-06-23
---

# IDX e-IPO Analytics Dashboard

> Status: **PROPOSAL / pre-build.** Data validated; awaiting scope sign-off before BUILD.

## Problem

Roderick has a near-complete census of Indonesian (IDX) IPOs 2021–2026 (246 deals) trapped in a 33-column spreadsheet. Raw, it answers nothing: which underwriters actually deliver day-1 pops, whether to sell on day 1 or hold the week, which sectors run hot, how the IPO market's temperature shifts year to year. This is the exact information-asymmetry problem alpha-flow exists to solve — institutional-grade IPO read, made legible for a retail investor — but the numbers are unreadable as a sheet.

## Vision

A clean, fast, single-page web app where the headline truth of IDX IPOs is obvious in five seconds and explorable in five minutes. The euphoric-surprise moment: seeing that the *typical* IPO gives back part of its day-1 pop over the following week (median fades 19.8% → 12.0%) while the *average* balloons (15.9% → 43.7%) — a textbook right-skew that proves, visually, why you trade IPOs on the median and never the mean. Plus a broker league table that names which underwriters' deals actually pop.

## Out of Scope (v1)

- No live/real-time data feed — this is a static, bundled snapshot (246 rows) refreshed by re-importing the sheet.
- No user accounts, auth, backend, or database.
- No predictive model / "will this IPO pop" scoring — descriptive analytics only.
- No individual price charts per stock (dataset has returns, not full OHLC series).
- Not a general alpha-flow rebuild — a focused, self-contained dashboard that could later fold in.

## Constraints

- React (Roderick's explicit choice). Build tooling: Vite. Package manager: **bun** (never npm/npx).
- TypeScript throughout.
- Static deploy target (no server) — data precomputed to a bundled JSON.
- All money in IDR; returns shown as %; metric units.
- Median + dispersion are the primary statistics; mean shown only alongside median, never alone (data is heavily right-skewed).
- Every broker/sector stat must display its sample size `n`; thin samples flagged, not silently ranked.

## Goal

Ship a static React+TS dashboard that turns the validated 246-row e-IPO dataset into an explorable analytics view covering (1) day-1 → day-7 return behavior with median/dispersion, (2) a lead-vs-non-lead underwriter league table, and (3) sector + time-trend breakdowns — each statistic correct, sample-size-aware, and verifiable against the source sheet.

## Criteria

Data layer
- [ ] ISC-1: A build step parses `e-IPO Data.xlsx` and emits a typed `ipos.json` with 246 records.
- [ ] ISC-2: Returns D1–D7 are stored as daily returns; a derived cumulative-by-day series is computed per IPO.
- [ ] ISC-3: Underwriter(s) parsed into `lead` (first code) + `members[]`; lead validated == Participant Admin code for 246/246 rows.
- [ ] ISC-4: Broker code→name map built from Participant Admin (≥40 codes resolved).
- [ ] ISC-5: Non-listed rows (Canceled/Postpone/Book Building, n=9) excluded from return stats but counted in a pipeline funnel.
- [ ] ISC-6: Sector taxonomy normalized (merge "Materials"→"Basic Materials", "Consumer Discretionary"→"Consumer Cyclicals").
- [ ] ISC-7: Anti: no statistic is computed over a mean where the spec requires median; mean never displayed without its median.
- [ ] ISC-8: Anti: no broker/sector is ranked in a headline table with n<3 without an explicit low-sample flag.

Views
- [ ] ISC-9: Overview KPIs: # IPOs, % positive D1, median D1, IDR raised — match the analysis script values.
- [ ] ISC-10: D1 distribution histogram with ARA-ceiling band highlighted.
- [ ] ISC-11: "Fade curve": median vs mean cumulative return across hold-days 1–7, on one chart.
- [ ] ISC-12: Underwriter league table sortable by deals-led, median D1, with n shown.
- [ ] ISC-13: Lead-vs-non-lead comparison for brokers active in both roles.
- [ ] ISC-14: Sector breakdown (count + median D1) and a year-over-year temperature line.
- [ ] ISC-15: Searchable per-IPO table (ticker, company, sector, lead UW, final price, D1, D7-cumulative, lifetime return).

App quality
- [ ] ISC-16: `bun run build` succeeds; TypeScript typecheck clean.
- [ ] ISC-17: Loads as a static site (no network calls beyond the bundled JSON).
- [ ] ISC-18: Responsive at desktop + mobile widths; verified via Interceptor screenshot.
- [ ] ISC-19: Every displayed aggregate reproducible from the source sheet (spot-checked ≥5 figures).

## Test Strategy

| isc | type | check | tool |
|-----|------|-------|------|
| ISC-1 | build | record count == 246 | bun script assert |
| ISC-3 | data | lead==admin 246/246 | bun script assert |
| ISC-9 | ui+data | KPI values == analyze.ts output | Read + Interceptor |
| ISC-11 | ui | fade curve shows median<mean divergence | Interceptor screenshot |
| ISC-12 | ui | table sorts, n visible | Interceptor |
| ISC-16 | build | exit 0, no TS errors | bun run build |
| ISC-18 | ui | renders at 375px + 1440px | Interceptor screenshot |
| ISC-19 | data | 5 spot-checks match sheet | manual + Read |

## Features

| name | satisfies | depends_on | parallelizable |
|------|-----------|-----------|----------------|
| data-pipeline (xlsx→json + derived metrics) | ISC-1..8 | — | no (foundation) |
| app-shell (Vite+React+TS+router/tabs) | ISC-16,17 | data-pipeline | no |
| overview-view (KPIs + D1 histogram + fade curve) | ISC-9,10,11 | app-shell | yes |
| underwriter-view (league + lead/non-lead) | ISC-12,13 | app-shell | yes |
| sector-time-view (sector + YoY) | ISC-14 | app-shell | yes |
| explorer-table (searchable per-IPO) | ISC-15 | app-shell | yes |

## Decisions

- 2026-06-22: Classifier set ALGORITHM/E3. Treated this turn as PLAN-and-STOP per user's "talk to me what we can produce" — research + proposal delivered, BUILD gated on scope approval.
- 2026-06-22: Single-author analysis chosen over delegation (soft floor). Show-your-math: dataset is one 246-row file; a coherent single investigation beats fan-out, which would add coordination noise with no coverage gain.
- 2026-06-22 (refined): Validated data semantics empirically — Final Price = final offer price (sits within book-building band for 237/237 listed); D1–D7 = DAILY returns (D2+ medians hover ~0, confirming incremental not cumulative); "Return from Listing" = offer→latest price (long horizon, mean +98%, corr only 0.35 vs 7d-compounded), a distinct metric.
- 2026-06-22: Static-bundle architecture (no backend) — 246 rows is tiny; precompute to JSON, deploy as static site. Matches "simple web app."
- 2026-06-23: Added D1/D3/D5/D7 milestone stats (median, mean, std dev, min, max, %up) + best/worst-D1 stat tiles, per user request.
- 2026-06-23 (refined): First build shipped "bold colorful" per the initial pick; user rejected it as AI-slop. Pivoted to a minimalist dark-gray direction, then — on explicit request — to **Tailwind + shadcn-style components with a TradingView dark theme** (#131722 canvas, #2962ff primary, #26a69a/#ef5350 up/down, Inter with tabular figures). Charts restyled to monochrome + semantic color. Removed all banned slop (gradients, glows, glassmorphism, side-stripes, emoji).
- 2026-06-23: Single-author build over Forge delegation (soft floor) — taste-critical UI converging through fast visual iteration; a single coherent vision beat a hand-off, which would have diluted the specific TradingView target.
- 2026-06-23 (refined): Polished to a **semi-brutalist** system per user request — concrete-dark tokens, strong structural borders, near-square corners (radius 2px), JetBrains Mono added for all data/labels/tickers (Inter retained for headings), boxed segmented tab control, square chart bars, mono axis ticks, and a seamless `tabin` content reveal (reduced-motion safe). All four tabs re-verified via headless screenshots.
- 2026-06-23 (refined): Sector & year breakdowns extended to median cumulative at D1/D3/D5/D7 (fade per sector and per year); added a categorical color per sector (bars + table swatches, `lib/colors.ts`); Explorer lead-underwriter column switched to broker code with a filter-aware code→name legend and full name on hover.
- 2026-06-23 (refined): Underwriter view given the same D1/D3/D5/D7 median-fade treatment — league table and solo-vs-syndicated now show cumulative return across holds, revealing which leads' deals keep running (KGI, Lotus, Ciptadana climb through D7) vs fade flat/negative (Indo Capital, Shinhan).
- 2026-06-23 (refined): Enhanced Underwriters into a full analytics surface — market stat strip (active leads, most active, top-by-proceeds, top-5 share, median syndicate, solo share), a capital-raised-by-lead ranking (the industry bookrunner metric), an activity-vs-performance scatter (deals led × median D1, bubble = proceeds, leads with 3+ deals), and an enriched league table (proceeds, market share, D1–D7 fade, win rate, best-deal on hover). Surfaces the deal-count vs proceeds split: UOB Kay Hian leads by volume (23), Mandiri by proceeds (Rp 83.2T).
- 2026-06-23 (refined): Underwriter league table made searchable (name/code) and role-aware via an All / Lead / Member toggle — non-lead (syndicate member) participation now included. Added `participationTable()` splitting each broker's stats by role; table lists 65 distinct underwriters (39 ever lead, 58 ever member) with Led + Member counts per row, instead of leads only.
- 2026-06-23 (fix): Chart axis bugs. ProceedsBars dropped every other Y-axis code (Recharts auto-interval) and clipped the top bar — fixed with `interval={0}`, taller height, top margin. YoYChart and ReturnHistogram left-axis numbers were clipped by a negative left margin — fixed to non-negative margins with wider axes. Both verified via screenshot (all 12 proceeds codes shown; year axis reads 80/60/40/20/0).
- 2026-06-23 (refined): Made the All/Lead/Member toggle GLOBAL — moved to the top of the Underwriters view; it now drives the stat strip, capital-raised chart, activity scatter, AND league table together (previously those four were lead-only while only the table filtered). Strip labels + chart descriptions update with role (verified: All=65 Underwriters, Lead=39 Leads / "proceeds led", Member=58 Members / "co-underwritten"). Lead-vs-member and solo-vs-syndicated kept as role-independent reference. ProceedsBars/ActivityScatter decoupled from LeagueRow to take role-scoped data.
- 2026-06-23 (refined): Typography switched from JetBrains Mono to Inter sans throughout (Tailwind `mono` aliased to Inter; tabular alignment kept via `tabnum`); JetBrains dropped from the bundle. Fixed transparent chart tooltips — they used an undefined `bg-popover` utility (never added to the Tailwind theme); now solid `bg-secondary` + shadow-lg. Lightened low-contrast grays: --muted-foreground 64%→75%, chart neutral bars #3a3a42→#8b93a8, legend + scatter-label text lightened, header separators de-grayed.
- 2026-06-23 (refined): Removed the Explorer Lifetime column and its footer definition. Footer source now links to e-ipo.co.id (verified live in the a11y tree). Explorer Lead column upgraded from a native `title` to a styled Radix tooltip (portaled so it escapes the table's scroll clip, solid `bg-secondary`) showing the full broker name on hover, with a dotted-underline affordance.
- 2026-06-23 (refined): Explorer grouping added (None / Lead / Sector / Year) — group header rows show count + median D1, deals nested beneath. Activity-vs-performance scatter overlap reduced (bubble range 40→[30,300], taller, outlined bubbles, labels only on 6+ deal points) and bubbles colored per broker via a stable hashed palette (`brokerColor`). CS relabeled "Credit Suisse (suspended)" via NAME_OVERRIDES in participationTable (CS is member-only: 6 deals incl. GOTO/PGEO/BELI, Rp 49.3T).
- 2026-06-23 (refined): Filled all 26 previously-unnamed broker codes with IDX firm names (researched from public broker-code lists; the 5 foreign JV alphanumeric codes — C3 CIMB Niaga, C4 Citigroup, D4 Deutsche, S0 Morgan Stanley, Y0 BNP Paribas — confirmed by the user since they're absent from current public lists). All broker names forced UPPERCASE incl. CREDIT SUISSE (SUSPENDED), via NAME_OVERRIDES + `.toUpperCase()`. Per-broker color (`brokerColor` hash) now consistent across the scatter, the capital-raised bar chart (per-bar Cells), and league-table swatches.

## Verification

- ISC-1 (246 records): build-data asserts `ipos.length === 246` true; 237 listed, 40 brokers.
- ISC-3 (lead = Participant Admin): validated 246/246 in the original analysis pass.
- ISC-9 (KPIs match analysis): live render shows median D1 +19.8%, win rate 76%, 237 listed, Rp 155.7T raised, best BMHS +191.2% — identical to analyze.ts.
- ISC-11 (fade curve): renders median (white) vs mean (blue) divergence; D1 +19.8% → D7 +12.0% median, mean +43.7%.
- ISC-12/13 (underwriter league + lead-vs-member): both render; lead pop > member pop for all 4 dual-role brokers.
- ISC-16 (build): `bun run build` exits 0, tsc --noEmit clean.
- ISC-18 (renders): headless-Chrome screenshots of all four tabs captured and inspected; Interceptor text probe confirms each tab mounts with no 4xx/5xx.
- Deferred: live mobile-width screenshot, full a11y/contrast audit.
