// Data pipeline: _sources/upcoming/<TICKER>/*.{json,md} -> src/data/upcoming-ipos.json
//
// The ZIPs and the extracted _sources/ tree are gitignored (raw analyst output, two
// different schema "families"). This script normalizes them into ONE committed JSON the
// app reads. Financials arrive in three different units (raw Rp / millions / billions);
// we detect the unit per file and convert everything to IDR **billions** so the five deals
// are comparable. No figure is hand-typed — every number is read from source and scaled
// programmatically. Run: bun run scripts/build-upcoming.ts
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SRC = resolve(ROOT, "_sources", "upcoming");
const OUT = resolve(ROOT, "src", "data");
const SUPP = resolve(ROOT, "scripts", "upcoming-supplement.json"); // prospectus-PDF-derived overrides (committed)
const TICKERS = ["BACH", "EMMI", "JECX", "JELI", "PRDL"];

type Obj = Record<string, any>;
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const n = (x: unknown): number | null => (isNum(x) ? x : null);

/** First defined value among dot-path lookups (schema families disagree on paths). */
function pick(o: Obj, ...paths: string[]): any {
  for (const p of paths) {
    let cur: any = o;
    let ok = true;
    for (const k of p.split(".")) {
      if (cur != null && typeof cur === "object" && k in cur) cur = cur[k];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined) return cur;
  }
  return undefined;
}

const YEARS = ["2023", "2024", "2025"] as const;
/** {2023,2024,2025} object -> [n,n,n], each divided by `div` (unit -> IDR billions). */
function series(o: Obj | undefined, div: number): (number | null)[] {
  if (!o || typeof o !== "object") return [null, null, null];
  return YEARS.map((y) => (isNum(o[y]) ? +(o[y] / div).toFixed(3) : null)); // IDR bn, 0.001bn = 1m precision
}

/** Detect financial unit by which key is present; return the block + divisor to billions. */
function financialsBlock(raw: Obj): { fin: Obj; div: number } {
  if (raw.financials_rp) return { fin: raw.financials_rp, div: 1e9 };
  if (raw.financials_rp_million) return { fin: raw.financials_rp_million, div: 1e3 };
  if (raw.financials_rp_billion) return { fin: raw.financials_rp_billion, div: 1 };
  throw new Error("no financials_* block found");
}

/** Pull a {low,high} range from either {low,high} or {at_X,at_Y} valuation shapes. */
function rangeOf(o: any): { low: number | null; high: number | null } {
  if (!o || typeof o !== "object") return { low: null, high: null };
  if (isNum(o.low) || isNum(o.high)) return { low: n(o.low), high: n(o.high) };
  const at = Object.keys(o).filter((k) => /^at_/.test(k)).map((k) => o[k]).filter(isNum) as number[];
  if (at.length) return { low: Math.min(...at), high: Math.max(...at) };
  return { low: null, high: null };
}

const growth = (s: (number | null)[], i: number) =>
  isNum(s[i]) && isNum(s[i - 1]) && s[i - 1] !== 0 ? (s[i]! / s[i - 1]! - 1) * 100 : null;
const ratio = (a: number | null, b: number | null) =>
  isNum(a) && isNum(b) && b !== 0 ? (a! / b!) * 100 : null;

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};
/** Normalize "2026-07-08" | "7 July 2026" | "7 Jul" (year assumed 2026) -> ISO. */
function toISO(s: any): string | null {
  if (typeof s !== "string") return null;
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `${m[3]}-${MONTHS[m[2].slice(0, 3).toLowerCase()]}-${m[1].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})\s+([A-Za-z]{3,})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) return `2026-${MONTHS[m[2].slice(0, 3).toLowerCase()]}-${m[1].padStart(2, "0")}`;
  return null;
}

function sectorGroup(s: string): string {
  const t = s.toLowerCase();
  if (/health|hospital|medical|diagnostic|pharma|clinic|ivd|eye-care|eye care/.test(t)) return "Healthcare";
  if (/food|consumer|beverage|f&b|dessert|nata/.test(t)) return "Consumer Non-Cyclicals";
  return "Industrials"; // genset / telecom-infra / construction
}

function shList(arr: any) {
  if (!Array.isArray(arr)) return null;
  return arr.map((s) => ({ name: String(s.name ?? ""), shares: n(s.shares), pct: n(s.pct), role: s.role ?? null }));
}

function useOfProceeds(raw: Obj) {
  const up = raw.use_of_proceeds;
  let items: any[] = [];
  if (Array.isArray(up)) items = up;
  else if (up && Array.isArray(up.allocation_at_ceiling_rp)) items = up.allocation_at_ceiling_rp;
  else if (up && Array.isArray(up.allocation_rp)) items = up.allocation_rp;
  return items.map((it) => ({
    purpose: String(it.purpose ?? it.use ?? ""),
    type: it.type ?? null,
    pct: n(it.pct ?? it.pct_of_net),
    amountRp: n(it.amount ?? it.amount_rp ?? it.amount_rp_ceiling ?? it.approx_rp_top),
    affiliated: typeof it.affiliated === "boolean" ? it.affiliated : null,
    note: it.note ?? null,
  }));
}

/** % of IPO proceeds going to debt repayment. Denominators differ across the two families,
 *  so we keep the basis label honest rather than forcing a false apples-to-apples number. */
function debtAlloc(raw: Obj) {
  const csm = pick(raw, "capital_structure_metrics.pct_proceeds_to_debt");
  if (csm) return {
    pct: n(csm.pct_of_net), low: null as number | null, high: null as number | null,
    basis: "of net proceeds",
    rupiah: isNum(csm.rupiah) ? csm.rupiah : null,
    facility: csm.facility ?? null,
  };
  const b = pick(raw, "use_of_proceeds.pct_of_proceeds_to_debt"); // BACH (% of gross)
  if (b) {
    const v = Object.values(b).filter(isNum) as number[];
    return { pct: null, low: Math.min(...v), high: Math.max(...v), basis: "of gross proceeds (floor→ceiling price)", rupiah: n(pick(raw, "use_of_proceeds.allocation_at_ceiling_rp.0.amount")), facility: null };
  }
  const j = pick(raw, "use_of_proceeds.pct_of_company_proceeds_to_debt"); // JECX (% of company proceeds)
  if (j) {
    const v = Object.values(j).filter(isNum) as number[];
    return { pct: null, low: Math.min(...v), high: Math.max(...v), basis: "of company (primary) proceeds (floor→ceiling price)", rupiah: n(pick(raw, "use_of_proceeds.bank_debt_repayment_total_rp")), facility: null };
  }
  return { pct: null, low: null, high: null, basis: "n/d", rupiah: null, facility: null };
}

function lockup(raw: Obj) {
  const lk = raw.lockup ?? {};
  const statutory = pick(raw, "lockup.statutory_lockup", "lockup.statutory_lockup_applies", "lockup.pojk_25_2017_8_month");
  let hard = false;
  if (statutory === true) hard = true;
  else if (typeof statutory === "string") {
    const s = statutory.toUpperCase();
    hard = /\b8[- ]MONTH\b/.test(s) && !/\bNOT\b|\bNONE\b/.test(s);
  }
  const strength = hard ? "Hard lock" : (pick(raw, "lockup.controller_12_month", "lockup.control_commitment", "lockup.voluntary_commitment") ? "Control only" : "None");
  const summary = Object.values(lk).filter((v) => typeof v === "string").join(" · ");
  return { hard, strength, summary, short: null as string | null };
}

function esa(raw: Obj) {
  const e = pick(raw, "esa", "esa_esop", "esop_esa");
  if (!e || typeof e === "string" || e.exists === false) return { exists: false, summary: typeof e === "string" ? e : "None" };
  const shares = n(e.shares);
  const parts = [
    shares ? `${shares.toLocaleString("en-US")} shares` : null,
    isNum(e.pct_of_offered) ? `${e.pct_of_offered}% of offer` : isNum(e.pct_of_offering) ? `${e.pct_of_offering}% of offer` : null,
    e.structure ?? e.note ?? e.vesting ?? null,
  ].filter(Boolean);
  return { exists: true, summary: parts.join(" · ") };
}

function redFlags(raw: Obj) {
  const rf = raw.red_flags ?? [];
  return rf.map((f: any) => (typeof f === "string" ? { text: f, severity: null } : { text: String(f.flag ?? f.text ?? ""), severity: f.severity ?? null }));
}

function dividendPolicy(raw: Obj): string | null {
  const d = pick(raw, "dividend_policy");
  if (typeof d === "string") return d;
  const o = pick(raw, "dividend");
  if (o && typeof o === "object") {
    const p = n(o.policy_max_payout_pct);
    if (p != null) return `Up to ${p}% payout${o.ever_paid === false ? " (never paid yet)" : ""}${o.note ? " · " + o.note : ""}`;
    if (o.note) return String(o.note);
  }
  return null;
}

function normalize(raw: Obj, narrativeMd: string, ticker: string) {
  const issuer = raw.issuer ?? {};
  const off = raw.offering ?? {};
  const { fin, div } = financialsBlock(raw);
  const is = fin.income_statement ?? {};
  const bs = fin.balance_sheet ?? {};

  const revenue = series(is.revenue ?? is.net_sales, div);
  const grossProfit = series(is.gross_profit, div);
  const netParent = series(is.net_profit_attrib_parent ?? is.net_profit_attributable_to_parent ?? is.net_profit, div);
  const netTotal = series(is.net_profit_total ?? is.net_profit, div);
  const totalAssets = series(bs.total_assets, div);
  const totalLiab = series(bs.total_liabilities, div);
  const totalEquity = series(bs.total_equity, div);

  const der = YEARS.map((_, i) => (isNum(totalLiab[i]) && isNum(totalEquity[i]) && totalEquity[i] !== 0 ? +(totalLiab[i]! / totalEquity[i]!).toFixed(2) : null));
  const derPost = n(pick(raw,
    "der_analysis.post_ipo_proforma_est.der",
    "capital_structure_metrics.der_total_liabilities_over_equity.post_ipo_proforma",
    "capital_structure_metrics.der_total_liabilities_over_equity.post_ipo_proforma_reported",
  ));

  const pe = rangeOf(pick(raw, "valuation_post_money.trailing_pe_fy2025", "valuation_post_money.trailing_pe_fy2025_attrib", "valuation.trailing_pe_2025_parent", "valuation.trailing_pe_post_money", "valuation.trailing_pe_2025"));
  const pb = rangeOf(pick(raw, "valuation_post_money.pb_post_money", "valuation_post_money.pb_total_equity_post_money", "valuation.pbv_post_money", "valuation.pbv_post_money_price_consistent"));
  const mcap = rangeOf(pick(raw, "offering.post_ipo_market_cap_rp", "valuation.post_ipo_market_cap_rp"));

  const shPre = shList(pick(raw, "shareholders_pre_ipo", "shareholders.pre_ipo"));
  let shPost = shList(pick(raw, "shareholders_post_ipo", "shareholders.post_ipo"));
  const postMap = pick(raw, "shareholders.post_ipo_pct");
  if (!shPost && postMap && typeof postMap === "object") {
    shPost = Object.entries(postMap).map(([name, pct]) => ({ name, shares: null, pct: n(pct), role: null }));
  }

  const tl = pick(raw, "timeline_2026", "offering.timeline") ?? {};
  const sector = String(issuer.sector ?? "");

  return {
    ticker,
    legalName: String(issuer.legal_name ?? ticker),
    brand: issuer.brand ?? null,
    sector,
    sectorGroup: sectorGroup(sector),
    listingISO: toISO(pick(raw, "capital_structure_metrics.listing_date", "listing_date", "offering.timeline.listing", "timeline_2026.listing_bei")),
    underwriter: pick(raw, "issuer.lead_underwriter", "offering.underwriters.lead", "offering.underwriter.name") ?? null,
    underwriterJoint: pick(raw, "offering.underwriters.joint") ?? null,
    issueType: pick(off, "issue_type", "share_type") ?? (off.all_primary ? "100% primary" : null),
    hasSecondary: !!pick(off, "secondary_divestment_shares") || off.secondary_in_ipo === true,
    offering: {
      priceLow: n(pick(off, "price_range_rp.low")),
      priceHigh: n(pick(off, "price_range_rp.high")),
      par: n(pick(off, "nominal_value_rp", "par_value_rp")),
      sharesOffered: n(pick(off, "total_shares_offered", "shares_offered")),
      pctPost: n(pick(off, "offered_pct_of_post_ipo", "pct_of_post_ipo_capital")),
      grossLow: n(pick(off, "gross_raise_rp.low", "gross_proceeds_rp.low", "gross_proceeds_excl_cost_rp.low.total", "gross_proceeds_excl_cost_rp.low")),
      grossHigh: n(pick(off, "gross_raise_rp.high", "gross_proceeds_rp.high", "gross_proceeds_excl_cost_rp.high.total", "gross_proceeds_excl_cost_rp.high")),
      postShares: n(pick(off, "post_ipo_total_shares", "total_shares_post_ipo")) ?? n(pick(raw, "shareholders.total_shares_post_ipo")),
    },
    freeFloat: n(pick(raw, "capital_structure_metrics.free_float_pct", "offering.free_float_pct_public_only", "offering.offered_pct_of_post_ipo")) ?? n(pick(off, "pct_of_post_ipo_capital")),
    timeline: {
      bookbuilding: tl.bookbuilding ?? null,
      ojkEffective: tl.ojk_effective ?? null,
      publicOffering: tl.public_offering ?? null,
      allotment: tl.allotment ?? null,
      distribution: tl.electronic_distribution ?? tl.distribution ?? null,
      listing: tl.listing_bei ?? tl.listing ?? null,
    },
    shareholdersPre: shPre,
    shareholdersPost: shPost,
    controllerPost: pick(raw, "capital_structure_metrics.controller_post_ipo", "control.controller") ?? null,
    controllerLines: null, // curated bullets from supplement
    ubo: pick(raw, "shareholders.ubo", "control.ultimate_beneficial_owner", "control_transfer_option.ubo_group") ?? null,
    useOfProceeds: useOfProceeds(raw),
    debtAlloc: debtAlloc(raw),
    lockup: lockup(raw),
    esa: esa(raw),
    financials: {
      unit: "IDR_bn",
      years: YEARS.map(Number),
      revenue, grossProfit, netProfitParent: netParent, netProfitTotal: netTotal,
      totalAssets, totalLiabilities: totalLiab, totalEquity,
    },
    metrics: {
      revGrowth2025: growth(revenue, 2),
      netGrowth2025: growth(netParent, 2),
      grossMargin2025: grossMargin(grossProfit, revenue),
      netMargin2025: ratio(netTotal[2], revenue[2]),
      roe2025: ratio(netTotal[2], totalEquity[2]),
      der,
      derPost,
    },
    valuation: {
      peLow: pe.low, peHigh: pe.high, pbLow: pb.low, pbHigh: pb.high,
      mcapLow: mcap.low, mcapHigh: mcap.high,
      roePost: n(pick(raw, "valuation.roe_post_money_pct")),
      verdict: pick(raw, "valuation.verdict", "valuation_post_money.flag") ?? null,
    },
    dividendPolicy: dividendPolicy(raw),
    primaryRisk: pick(raw, "primary_business_risk") ?? null,
    industryTailwind: pick(raw, "industry_tailwind", "demand_backdrop") ?? null,
    redFlags: redFlags(raw),
    counterweights: pick(raw, "counterweights", "positives_vs_jeli") ?? null,
    openQuestions: raw.open_questions ?? [],
    shareholdersPostOption: null, // filled from supplement (BACH only)
    businessModel: null, // filled from supplement (prospectus-PDF extraction)
    forensicMd: null, // filled from scripts/forensic/<TICKER>.md
    raw,
    narrativeMd,
  };
}
const grossMargin = (gp: (number | null)[], rev: (number | null)[]) => ratio(gp[2], rev[2]);

// ---- build -------------------------------------------------------------------
const out = TICKERS.map((t) => {
  const dir = resolve(SRC, t);
  const files = readdirSync(dir);
  const jsonFile = files.find((f) => f.endsWith(".json"));
  const mdFile = files.find((f) => f.endsWith(".md"));
  if (!jsonFile || !mdFile) throw new Error(`${t}: missing json or md (found ${files.join(", ")})`);
  const raw = JSON.parse(readFileSync(resolve(dir, jsonFile), "utf8"));
  const md = readFileSync(resolve(dir, mdFile), "utf8");
  return normalize(raw, md, t);
});

// listing order
out.sort((a, b) => String(a.listingISO).localeCompare(String(b.listingISO)) || a.ticker.localeCompare(b.ticker));

// merge prospectus-PDF-derived supplement (business model; BACH post-IPO + post-option cap tables)
let supp: Record<string, any> = {};
try { supp = JSON.parse(readFileSync(SUPP, "utf8")); } catch { /* supplement optional */ }
for (const o of out as any[]) {
  const s = supp[o.ticker];
  if (s) {
    if (Array.isArray(s.shareholdersPost)) o.shareholdersPost = s.shareholdersPost;
    if (Array.isArray(s.shareholdersPostOption)) o.shareholdersPostOption = s.shareholdersPostOption;
    if (s.businessModel) o.businessModel = s.businessModel;
    if (Array.isArray(s.controllerLines)) o.controllerLines = s.controllerLines;
    if (typeof s.controllerPost === "string") o.controllerPost = s.controllerPost;
    if (typeof s.lockupShort === "string") o.lockup.short = s.lockupShort;
  }
  // curated forensic writeup (consistent 7-heading template), one .md per ticker
  try { o.forensicMd = readFileSync(resolve(ROOT, "scripts", "forensic", `${o.ticker}.md`), "utf8").trim(); } catch { /* optional */ }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "upcoming-ipos.json"), JSON.stringify(out, null, 0));

// ---- sanity asserts (unit/mapping regressions fail loudly) -------------------
const check = (cond: boolean, msg: string) => { if (!cond) throw new Error("ASSERT FAILED: " + msg); };
const T = Object.fromEntries(out.map((o) => [o.ticker, o]));
check(out.length === 5, "exactly 5 IPOs");
check(out.every((o) => o.listingISO?.startsWith("2026-07")), "all list in Jul 2026");
check(out.every((o) => isNum(o.financials.revenue[2]) && o.financials.revenue[2]! > 0), "all have 2025 revenue > 0");
check(out.every((o) => o.metrics.der[2] != null && o.metrics.der[2]! > 0 && o.metrics.der[2]! < 10), "all DER in (0,10)");
// known-value cross-checks vs source (catch unit scaling errors)
check(Math.abs(T.BACH.metrics.roe2025! - 29.0) < 1, `BACH ROE ~29 (got ${T.BACH.metrics.roe2025})`);
check(Math.abs(T.BACH.financials.revenue[2]! - 1732.9) < 1, `BACH rev2025 ~1732.9bn (got ${T.BACH.financials.revenue[2]})`);
check(Math.abs(T.JECX.financials.revenue[2]! - 926.76) < 1, `JECX rev2025 ~926.76bn (got ${T.JECX.financials.revenue[2]})`);
check(Math.abs(T.JELI.financials.revenue[2]! - 753.05) < 1, `JELI rev2025 ~753.05bn (got ${T.JELI.financials.revenue[2]})`);
check(Math.abs(T.EMMI.metrics.netGrowth2025! - 210) < 6, `EMMI net growth ~210% (got ${T.EMMI.metrics.netGrowth2025})`);
check(Math.abs(T.PRDL.metrics.revGrowth2025! - 26.8) < 1, `PRDL rev growth ~26.8% (got ${T.PRDL.metrics.revGrowth2025})`);
check(Math.abs(T.PRDL.metrics.netGrowth2025! - 69.9) < 1, `PRDL net growth ~69.9% (got ${T.PRDL.metrics.netGrowth2025})`);
check(T.PRDL.lockup.hard === true && T.JELI.lockup.hard === false, "PRDL hard-lock, JELI not");
check(isNum(T.JECX.valuation.peHigh) && T.JECX.valuation.peHigh! > 50, `JECX P/E high >50 (got ${T.JECX.valuation.peHigh})`);
// supplement merged: BACH post-IPO cap table + post-option, and every deal has a business model
check((T.BACH as any).shareholdersPost?.length === 8, "BACH post-IPO cap table merged (8 holders)");
check((T.BACH as any).shareholdersPostOption?.find((s: any) => /Global Telekom/.test(s.name))?.pct === 51.0, "BACH post-option GTP = 51%");
check(out.every((o: any) => o.businessModel && o.businessModel.revenueBreakdown?.length > 0), "every deal has a business-model breakdown");
check(out.every((o: any) => o.forensicMd?.startsWith("## Thesis")), "every deal has a curated forensic writeup (7-heading template)");
for (const o of out as any[]) {
  const seg = o.businessModel.revenueBreakdown.filter((r: any) => r.year === 2025 && typeof r.pct === "number");
  const sum = seg.reduce((s: number, r: any) => s + r.pct, 0);
  check(Math.abs(sum - 100) < 1.5, `${o.ticker} FY25 revenue mix sums ~100% (got ${sum.toFixed(1)})`);
}

console.log(`Wrote ${out.length} upcoming IPOs -> src/data/upcoming-ipos.json`);
for (const o of out) {
  console.log(`  ${o.ticker}  list ${o.listingISO}  float ${o.freeFloat}%  rev25 Rp${o.financials.revenue[2]}bn  P/E ${o.valuation.peLow}-${o.valuation.peHigh}  DER ${o.metrics.der[2]}  →debt ${o.debtAlloc.pct ?? `${o.debtAlloc.low}-${o.debtAlloc.high}`}% ${o.debtAlloc.basis}  lock:${o.lockup.strength}`);
}
console.log("All sanity asserts passed ✓");
