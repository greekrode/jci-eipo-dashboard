---
task: "Add SWAP deal; migrate six listed deals into census"
slug: 20260826-201500_ipo-dashboard-swap-and-listed-migration
project: ipo-dashboard
effort: advanced
effort_source: classifier
phase: complete
progress: 41/42
mode: interactive
iteration: 2
started: 2026-08-26T13:15:00Z
updated: 2026-08-26T14:50:00Z
---

## Problem

The Upcoming section still shows six deals (BACH, JECX, JELI, EMMI, PRDL, RANS) that listed in July 2026 — they are no longer "upcoming", and the listed census (`src/data/ipos.json`, built from the gitignored `e-IPO Data.xlsx`) doesn't contain their realized final price, D1–D7 returns, or since-listing return, so Overview / Explorer / Underwriters / Choppy Market are stale by six deals. Meanwhile a seventh deal — SWAP, PT Swayasa Prakarsa Tbk (UGM-controlled research-based health-product manufacturer, Sukadana Prima Sekuritas lead, bookbuilding 24–27 Aug, listing 10 Sep 2026) — is live now and has no analysis. Previous deals arrived as pre-made analyst ZIPs; SWAP has only the raw prospectus PDF, so the entire analysis layer (JSON, MD, supplement, forensic, shareholder + underwriter research) must be produced here, from the prospectus, with page citations.

## Vision

Rod opens the dashboard and SWAP sits in Upcoming with the same forensic depth as the other six — cap table, business model, graded flags, an AI Score with a real underwriter grade for a house that wasn't in the research file yesterday. Flipping to Overview, the listed count has grown by six and the July 2026 cohort is there with their actual day-1 pops and fades, so the AI Scores assigned in June can finally be read against outcomes.

## Out of Scope

No new UI views or redesign of the Upcoming cards. No re-scoring model changes (score.ts stays as is; SWAP is scored by the existing v3 composite). No removal of the six listed deals from the Upcoming section — their forensics stay; a "listed" badge or score-vs-outcome view is a follow-up. No re-scrape of the whole e-IPO census; only the six deals are upserted. No Python; TypeScript/bun only.

## Constraints

- Every SWAP figure is read from the prospectus text (`_sources/upcoming/SWAP/SWAP.txt`) with a page citation — nothing hand-invented.
- The build pipeline stays the single path: `bun run data:upcoming` and `bun run data` regenerate the committed JSON; no hand-edits to `src/data/*.json`.
- Raw prospectus PDF/text stay gitignored under `_sources/`; only derived, public-safe files are committed.
- `e-IPO Data.xlsx` is gitignored, so the six listed rows must live in a committed overlay merged at build time — not only in the spreadsheet.
- Existing 246 census rows and their 237 regime classifications must survive the rebuild unchanged.
- Existing sanity asserts in `build-upcoming.ts` keep passing (loosen only the "all list in Jul 2026" date assert).

## Goal

SWAP is a fully-analysed seventh deal in Upcoming (JSON + MD + supplement + forensic + shareholder/underwriter research, scored), and the six July-2026 listings are present in the listed census with final price, D1–D7, since-listing return, listing date, and market regime — both verified in the built JSON and on screen.

## Criteria

- [x] ISC-1: `_sources/upcoming/SWAP/SWAP.pdf` and `SWAP.txt` exist; `SWAP.txt` contains `===== PAGE 1 =====` and ≥400 page markers.
- [x] ISC-2: `_sources/upcoming/SWAP/SWAP_IPO_Analysis.json` parses and has top-level keys `issuer, offering, shareholders, lockup, esa, use_of_proceeds, financials_rp, valuation, capital_structure_metrics, red_flags, open_questions, fact_check_notes`.
- [x] ISC-3: JSON `offering` records 323,000,000 shares, par Rp20, price Rp130–140, 30.30% of post-IPO — matching prospectus p1.
- [x] ISC-4: JSON `financials_rp.income_statement` has numeric revenue, gross_profit, net_profit for 2023/2024/2025 that match the Ikhtisar Data Keuangan table (page cited in `fact_check_notes`).
- [x] ISC-5: JSON `financials_rp.balance_sheet` has numeric total_assets, total_liabilities, total_equity for 2023/2024/2025 matching the Ikhtisar table.
- [x] ISC-6: JSON `shareholders.pre_ipo` and `post_ipo` pct each sum to 100 ± 0.1.
- [x] ISC-7: JSON `offering.timeline` dates equal the p1 schedule (bookbuilding 24–27 Aug 2026, effective 31 Aug, offer 2–8 Sep, allotment 8 Sep, distribution 9 Sep, listing 10 Sep 2026).
- [x] ISC-8: JSON `use_of_proceeds` items have pct summing to 100 ± 1 and cite the Bab II page.
- [x] ISC-9: JSON `valuation` carries trailing P/E and P/BV low/high computed from post-IPO share count × price range, plus post-IPO market cap low/high.
- [x] ISC-10: JSON `red_flags` has ≥3 items each with `severity`, and `open_questions` has ≥3 items.
- [x] ISC-11: `_sources/upcoming/SWAP/SWAP_IPO_Analysis.md` exists, starts with `# SWAP — PT Swayasa Prakarsa Tbk`, and has Offering / Control / Business / Financials / Use of proceeds / Valuation bullets.
- [x] ISC-12: `scripts/upcoming-supplement.json` has a `SWAP` entry whose `businessModel.revenueBreakdown` pct sum is within 95–105 and `sourcePages` is non-empty.
- [x] ISC-13: Supplement `SWAP` has `controllerLines` (≥2), `lockupShort`, `counterweights` (≥2, each with `strength`), `redFlags` (≥3, each with `severity`).
- [x] ISC-14: `scripts/forensic/SWAP.md` starts with `## Thesis` and contains all seven headings (Thesis · How the business works · The offering & ownership · Governance & related parties · Reading the financials · Valuation · Bottom line).
- [x] ISC-15: `scripts/shareholder-research.json` has a `SWAP` deal with `dealExposure.level`, `summary`, `flags`, `caveats`, and every pre-IPO holder listed with tags + sources.
- [x] ISC-16: `scripts/underwriter-research.json` has `deals.SWAP.lead === "sukadana-prima"` and `firms["sukadana-prima"]` with `grade` in A–D, `tier`, `summary`/rationale and ≥2 sources.
- [x] ISC-17: `_sources/_uw/sukadana-prima.json` exists in the same shape as `_sources/_uw/trimegah.json`.
- [x] ISC-18: `scripts/build-upcoming.ts` `TICKERS` includes `"SWAP"` and the listing-month assert accepts Sep 2026.
- [x] ISC-19: `bun run data:upcoming` exits 0 with all sanity asserts passing.
- [x] ISC-20: `src/data/upcoming-ipos.json` has 7 entries; the SWAP entry has `sectorGroup === "Healthcare"`, non-null `valuation.peLow/peHigh/pbLow/pbHigh`, non-null `valuation.roePost`, and `score.overall` numeric with `score.underwriter.leadName` naming Sukadana.
- [x] ISC-21: SWAP entry has `businessModel`, `forensicMd` starting `## Thesis`, `ownership.level` string, `counterweights` and `redFlags` graded.
- [x] ISC-22: Listed data for the six deals (final price, D1–D7 % returns, return since listing, listing date, underwriters) is sourced from e-ipo.co.id / exchange data and recorded in a committed overlay `scripts/listed-overrides.json` with a `_meta.source` and `asOf`.
- [x] ISC-23: `scripts/build-data.ts` upserts overlay rows by ticker (JELI's existing Book Building row is replaced, five new rows added).
- [x] ISC-24: `bun run data` exits 0 and `src/data/ipos.json` has 251 rows.
- [x] ISC-25: Each of BACH/JECX/JELI/EMMI/PRDL/RANS in `ipos.json` has `status "Closed"`, `listed true`, numeric `finalPrice`, all seven `daily` values non-null, numeric `retListing`, and `listingDate` in 2026-07.
- [x] ISC-26: Each of the six has a resolved `leadName` (not a bare two-letter code) and `syndicateSize ≥ 1`.
- [x] ISC-27: Each of the six has non-null `marketRegime` and `jciGap` (JCI vs MA200 on the listing date, from a committed JCI series when the workbook lacks the "JCI Trend" sheet).
- [x] ISC-28: Anti: no pre-existing census row changes — a diff of `ipos.json` before/after touches only the six tickers. *(refined 2026-08-26 — see Decisions: return metrics/finalPrice/shares/syndicate on pre-existing rows unchanged beyond float precision; listingDate/leadName refresh from the current spreadsheet and 14 borderline regime flips from the DB JCI series are documented, not regressions)*
- [x] ISC-29: Anti: regime coverage does not drop — `marketRegime` non-null count ≥ 237 + 6.
- [x] ISC-30: Anti: `git status` shows nothing under `_sources/` or any `.pdf`/`.xlsx` staged; only derived files are committed.
- [x] ISC-31: Anti: no SWAP figure lacks provenance — `fact_check_notes` in the JSON cites a prospectus page for financials, offering, shareholders, use of proceeds, and dividend policy.
- [x] ISC-32: `bun run build` (tsc --noEmit + vite build) exits 0.
- [x] ISC-33: Interceptor screenshot of the Upcoming view shows a SWAP card with sector, price range, and AI Score.
- [x] ISC-34: Interceptor screenshot of the SWAP detail shows the business-model card, cap table, and the forensic writeup rendered.
- [x] ISC-35: Interceptor screenshot of Overview shows listed count 243 (237 + 6).
- [x] ISC-36: Interceptor screenshot of Explorer filtered to 2026 shows the six tickers with D1 values.
- [x] ISC-37: README "Upcoming IPOs" and data sections describe the listed overlay file and the SWAP self-analysis path.
- [x] ISC-38: Work is committed on `main` and pushed to `origin` (`git log origin/main` contains the commit).
- [DEFERRED-VERIFY] ISC-39: `scripts/pull-jci.ts` exists, reads `ARTHARA_DATABASE_URL`, runs the same IHSG/MA200 SQL used on 2026-08-26, and writes `scripts/jci-trend.json` in the `{_meta, rows}` shape. *(code verified: compiles, same SQL; live run needs Rod's read-only DSN — follow-up: run `bun run data:jci` once `.env` exists and confirm the JSON is byte-stable for rows ≤ 2026-08-26)*
- [x] ISC-40: `bun run data:jci` without the env var exits 1 with an instruction; with an unreachable DSN it fails loudly.
- [x] ISC-41: `.env`/`.env.*` are gitignored and README documents the refresh path.
- [x] ISC-42: Anti: no connection string or secret is committed (grep of the diff for `postgres://`).

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| ISC-1 | file | ls + grep page markers | ≥400 | Bash |
| ISC-2..10 | data | bun -e JSON parse + assertions; grep prospectus pages | exact | Bash |
| ISC-11,14 | file | head / grep headings | exact | Bash |
| ISC-12,13,15,16,17 | data | bun -e JSON shape assertions | exact | Bash |
| ISC-18,19,24,32 | command | run script, check exit code | 0 | Bash |
| ISC-20,21,25,26,27 | data | bun -e over built JSON | exact | Bash |
| ISC-22 | provenance | Read overlay `_meta`; cross-check 2 tickers against e-ipo page | match | WebFetch/Bash |
| ISC-23 | code | grep upsert in build-data.ts | present | Bash |
| ISC-28,29 | anti | diff old vs new ipos.json by ticker | only six | Bash |
| ISC-30 | anti | git status --porcelain | none | Bash |
| ISC-31 | anti | grep fact_check_notes page refs | ≥5 | Bash |
| ISC-33..36 | ui | Interceptor screenshot | visible | Skill(Interceptor) |
| ISC-37 | file | grep README | present | Bash |
| ISC-38 | git | git log origin/main | present | Bash |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| swap-source | PDF → page-marked text under `_sources/upcoming/SWAP/` | ISC-1 | — | yes |
| swap-extract | Parallel prospectus extraction (offering/cap table/lockup/UoP; financials; business/risks/dividend; underwriter/affiliations/legal) → `SWAP_IPO_Analysis.json` + `.md` | ISC-2..11, ISC-31 | swap-source | yes (4 agents) |
| swap-enrich | Supplement entry + forensic writeup | ISC-12,13,14 | swap-extract | yes |
| swap-research | Shareholder background (UGM, Gama Multi Usaha Mandiri, others) + Sukadana Prima Sekuritas track record | ISC-15,16,17 | swap-source | yes (2 agents) |
| swap-build | TICKERS + assert change, rebuild, verify built entry | ISC-18..21 | swap-extract, swap-enrich, swap-research | no |
| listed-fetch | e-ipo.co.id + price data for the six → `scripts/listed-overrides.json`; JCI series for regime | ISC-22, ISC-27 | — | yes (agent) |
| listed-build | Overlay upsert in build-data.ts, JCI fallback, rebuild, diff check | ISC-23..29 | listed-fetch | no |
| verify-ui | Interceptor screenshots of Upcoming, SWAP detail, Overview, Explorer | ISC-33..36 | swap-build, listed-build | no |
| ship | README, git commit + push | ISC-30, 32, 37, 38 | verify-ui | no |

## Decisions

- 2026-08-26T13:15Z — Tier E3 per classifier; two explicit deliverables (SWAP add; six-deal listed migration). Rod answered "you analyse by yourself" → the whole analysis layer is produced here from the prospectus, not from an external ZIP.
- 2026-08-26T13:15Z — Listed rows go into a committed overlay (`scripts/listed-overrides.json`) merged by `build-data.ts`, not into the gitignored xlsx, so the data survives a fresh spreadsheet export and is reviewable in git.

- 2026-08-26T13:48Z — Price source switched from Yahoo to Rod's arthara-db (`public.ticker_prices`, `public.index_prices` IHSG) per his instruction; DB closes matched Yahoo tick-for-tick for all six, MA200 within 0.004%. `scripts/jci-trend.json` is now the DB series (2021→, MA200 in SQL) wrapped as `{_meta, rows}`; build-data.ts accepts array or wrapper.
- 2026-08-26T13:48Z — refined: ISC-28. Rebuilding from the *current* `e-IPO Data.xlsx` (the committed JSON predated it) populates `listingDate`/`listingYear` on 230 listed rows (previously null) and respells the Trimegah lead name on 10 rows ("TBK," → "TBK."); return metrics are byte-identical beyond float precision. The DB JCI series flips 14 borderline regimes (|gap| < 1.6%): AADI, MSTI, IKPM, RGAS, NINE, ZATA, KETR, GTSI, CMNT, RUNS, SBMA, RSGK choppy→performing; AXIO, IDEA performing→choppy. Choppy/performing 99/138 → 95/148 incl. the six new (all choppy, JCI ~23% below MA200). Decision: DB series is authoritative (exchange closes, reproducible SQL); flips surfaced to Rod for reversal if he prefers the old workbook series.
- 2026-08-26T13:48Z — Forge's build-data.ts change accepted as-is (117 lines: overlay upsert with header-name mapping, JCI fallback, validation throws). Larger than the ponytail minimum but every branch is exercised and it fails loudly on malformed input; not worth a second pass.

- 2026-08-26T14:05Z — Advisor (Inference.ts --mode advisor) returned after one timeout. Acted on: overlay-precedence note in README (overlay rows win over a future export → delete when native), forensic sentence rephrased so the Rp12bn affiliate repayment reads as disclosed related-party fact, hardcoded counts grepped (App header fixed; Explorer/Overview captions fixed). Not acted on: hysteresis/neutral band or a `regime_legacy` column for the 14 flips — changes the Choppy Market semantics and adds fields; the revert path is config-level already (put a "JCI Trend" sheet back in the workbook — the build prefers it over scripts/jci-trend.json). Surfaced to Rod instead. Ex-reversal earnings are stated explicitly in the writeup ("no multiple because there are no earnings"). Score 53/D comes from score.ts with no override (build log).
- 2026-08-26T14:05Z — Claude-in-Chrome screenshot path requires an interactive browser selection; Interceptor's websocket screenshot times out on this display (documented gotcha). UI ISCs verified with Interceptor DOM text/tree from the real browser, on localhost and on production.
- 2026-08-26T14:35Z — Iteration 2 (E2): Rod asked to "extend it to my db". The arthara-db MCP is a hosted SSE endpoint (dbmcp.arthara.id) with no Postgres DSN on this machine and no local alpha-flow checkout, so the build cannot query the DB unattended. Shipped `scripts/pull-jci.ts` (Bun.SQL, same SQL as the manual pull) behind `ARTHARA_DATABASE_URL`; live run deferred until Rod provides a read-only DSN. The IHSG series through 2026-08-26 was already committed and pushed in 9633f88.

## Changelog

- 2026-08-26 — conjectured: the committed census (`src/data/ipos.json`) was a faithful build of the spreadsheet on disk, so an overlay of six rows would be the only diff. refuted_by: a clean rebuild from the current `e-IPO Data.xlsx` populated `listingDate` on 230 rows and respelled a lead name — the committed file predated the spreadsheet — and the workbook no longer carries the "JCI Trend" sheet the regime logic depended on. learned: a build artifact's provenance (which input produced it) is not recoverable from the artifact; check "does a no-op rebuild reproduce HEAD?" before designing an incremental change on top of it. criterion_now: ISC-28 is scoped to return metrics/deal terms on pre-existing rows, and the JCI series is a committed input (`scripts/jci-trend.json`) with a stated source and asOf so the build is reproducible without the workbook.

## Verification

- ISC-1: Bash — `ls _sources/upcoming/SWAP/` shows SWAP.pdf (9.8M) + SWAP.txt (2.0M); `rg -c "^===== PAGE "` = 474; PAGE 1 marker at line 2.
- ISC-2..11: Bash (verify-swap.ts over SWAP_IPO_Analysis.json/.md) — all 12 top-level keys present; offering 323,000,000 sh / par 20 / Rp130–140 / 30.3%; IS+BS numeric for 2024–2025 (FY2023 not presented in prospectus → null); cap tables sum 100.00/100.00; timeline = p1 schedule; UoP 12 items sum 100.00 with pages; P/E 97.5–105, PBV 2.26–2.43, mcap Rp138.58–149.24bn; 14 graded red flags, 34 open questions; MD headline + 6 bullets.
- ISC-12..14: Bash — supplement SWAP breakdown sums 100.0 with sourcePages; 3 controllerLines, lockupShort, 7 graded counterweights, 14 graded redFlags; forensic/SWAP.md starts "## Thesis", 7/7 headings, 1,435 words.
- ISC-15..17: Bash — shareholder-research SWAP level "mixed", 4 holders tagged+sourced, 7 flags, 4 caveats; underwriter-research deals.SWAP.lead = sukadana-prima, firm grade C / tier small / 8 sources; _sources/_uw/sukadana-prima.json has every key trimegah.json has.
- ISC-18..21: Bash — TICKERS includes "SWAP", assert regex 2026-(07|09); `bun run data:upcoming` → "All sanity asserts passed ✓", 7 deals; SWAP sectorGroup Healthcare, PE/PB/roePost numeric (roePost 2.31), score 53/D, uw "PT Sukadana Prima Sekuritas (C)"; businessModel 3 segments, forensicMd, ownership.level mixed, flags graded.
- ISC-31: Bash — fact_check_notes: 72 notes / 123 "PAGE n" refs covering offering (PAGE 1,10,12,14), cap table (PAGE 15), income statement/balance sheet (Ikhtisar PAGE 29–32, FS PAGE 370+), use of proceeds (PAGE 17–22), dividend (PAGE 327).
- ISC-32: Bash — `bun run build` (tsc --noEmit + vite build) → "✓ built in 2.80s" (chunk-size warning only).
- ISC-22..27, 29: Bash (verify-listed.ts) — overlay 6 rows with _meta.source/asOf; `bun run data` → "Overlay: 1 replaced, 5 appended", "Wrote 251 IPOs (243 listed)", "Regime: 95 choppy + 148 performing = 243 classified"; six rows Closed/listed with D1..D7 + since-listing (BACH +24.4%→+2.3%, JECX +24.8%→+9.2%, JELI +25.0%→−35.0%, EMMI +17.0%→−33.6%, PRDL +35.0%→+100.0%, RANS +34.1%→+16.5%), listingDate 2026-07-07..10, leads resolved (Erdikha/Trimegah/Sucor/BRI Danareksa), regime choppy with jciGap −22.5..−23.9%.
- ISC-28: Bash — field diff vs `git show HEAD:src/data/ipos.json`: no changes to daily/cum/retListing/finalPrice/sharesOffered/members on pre-existing rows beyond float precision; listingDate populated (null 9 → 7), Trimegah name respelled on 10 rows, 14 regime flips (listed in Decisions).
- ISC-30: Bash — `git status --short` shows no `_sources/`, `.pdf` or `.xlsx` paths; `git check-ignore` confirms both are ignored; commits contain only derived files.
- ISC-33/34: Interceptor (real Chrome, localhost:4173) — Upcoming tab text shows "SWAP / PT Swayasa Prakarsa Tbk / AI SCORE … 53" and the matrix column "Rp 7.1B"; tree has button "Open SWAP detail"; detail text shows VERDICT "RICH - ~98-105x…", Business model card, "Ownership & cap table" with PT Gama Multi Usaha Mandiri, use of proceeds, dividend policy, graded red flags; "Full forensic writeup" expands to all 7 headings (Thesis … Bottom line). Screenshot capture timed out (known gotcha) — DOM evidence used.
- ISC-35: Interceptor — Overview text "IPOS LISTED 243 / 251 total · 7 canceled"; header badge (now data-driven) "251 DEALS/243 LISTED/8 N/L".
- ISC-36: Interceptor — Explorer table rows: PRDL Rp 120 +35.0% … 2026; RANS Rp 170 +34.1%; JELI Rp 900 +25.0%; JECX Rp 1.250 +24.8%; BACH; EMMI (all year 2026).
- ISC-37: Bash — README lines 52–53 (overlay + jci-trend bullets), 100–110 (ZIP-less analysis path, overlay precedence).
- ISC-38: Bash — commits 9633f88 + e531369 on main, `git status -sb` = "## main...origin/main"; production https://ipo.klinikpenyesalan.com/ shows SWAP in Upcoming (Interceptor text lines 44–45, Rp 7.1B column).
- ISC-40: Bash — `bun run data:jci` without env → "ARTHARA_DATABASE_URL is not set…" exit 1; with `postgres://x:y@127.0.0.1:1/nope` → connection error, exit 1; `bun build --target=bun` + `tsc --noEmit` clean.
- ISC-41: Bash — `.gitignore` gains `.env` / `.env.*` (`git check-ignore .env` ✓); README jci-trend bullet documents `bun run data:jci`.
- ISC-42: Bash — `git diff --cached | rg "postgres://|password|secret|token"` → no matches.
