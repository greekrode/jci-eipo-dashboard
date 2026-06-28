// Data pipeline: e-IPO Data.xlsx -> src/data/ipos.json + src/data/brokers.json
// Run with: bun run scripts/build-data.ts
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SRC = resolve(ROOT, "e-IPO Data.xlsx");
const OUT = resolve(ROOT, "src", "data");

const COLS = [
  "status", "ticker", "company", "sector", "subsector", "board", "finalPrice",
  "d1", "d2", "d3", "d4", "d5", "d6", "d7", "retListing", "lob", "address", "website",
  "sharesOffered", "pctTotal", "participantAdmin", "underwriters",
  "bbOpen", "bbClose", "bbLow", "bbHigh", "offerOpen", "offerClose", "closingDate",
  "distDate", "listingDate", "warrantRatio", "exercisePrice",
] as const;

// Taxonomy fixes: stray singletons that are typos of the canonical sector names.
const SECTOR_FIX: Record<string, string> = {
  "Materials": "Basic Materials",
  "Consumer Discretionary": "Consumer Cyclicals",
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const toISO = (v: unknown): string | null => {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
};

const wb = XLSX.readFile(SRC, { cellDates: true });
// Master sheet is "e-IPO Data" in the original export and "IPO History" in the
// choppy-market workbook; accept either so the pipeline tracks whichever file is present.
const masterSheet = wb.Sheets["e-IPO Data"] ?? wb.Sheets["IPO History"];
if (!masterSheet) throw new Error('No master sheet ("e-IPO Data" or "IPO History") found in workbook.');
const aoa = XLSX.utils.sheet_to_json<unknown[]>(masterSheet, { header: 1, raw: true, defval: null });
const rows = aoa.slice(1).filter((r) => r && r.some((c) => c !== null));

// --- Market regime: JCI close vs its own 200-day MA, as of each IPO's listing date. ---
// The "JCI Trend" sheet carries Date / Close / MA200. A listing is "choppy" when the
// index closed below its MA200 on (or just before) the listing date, else "performing".
// jciGap is close/MA200 - 1 (how far above/below the trend the index sat that day).
interface JciPoint { t: number; close: number; ma200: number }
const jciSheet = wb.Sheets["JCI Trend"];
const jci: JciPoint[] = [];
if (jciSheet) {
  const jrows = XLSX.utils.sheet_to_json<unknown[]>(jciSheet, { header: 1, raw: true, defval: null }).slice(1);
  for (const r of jrows) {
    const d = r[0];
    const close = num(r[1]);
    const ma200 = num(r[2]);
    const t = d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : null;
    if (t !== null && close !== null && ma200 !== null) jci.push({ t, close, ma200 });
  }
  jci.sort((a, b) => a.t - b.t);
}
type Regime = "choppy" | "performing";
const regimeAt = (iso: string | null): { regime: Regime | null; gap: number | null } => {
  if (!iso || !jci.length) return { regime: null, gap: null };
  const t = new Date(iso + "T00:00:00Z").getTime();
  let hit: JciPoint | null = null;
  for (const p of jci) {
    if (p.t <= t) hit = p;
    else break;
  }
  if (!hit) return { regime: null, gap: null };
  return { regime: hit.close < hit.ma200 ? "choppy" : "performing", gap: hit.close / hit.ma200 - 1 };
};

const codeName: Record<string, string> = {};
for (const r of rows) {
  const pa = r[COLS.indexOf("participantAdmin")];
  if (typeof pa === "string" && pa.includes(" - ")) {
    const [code, ...rest] = pa.split(" - ");
    codeName[code.trim()] = rest.join(" - ").trim();
  }
}

const ipos = rows.map((r) => {
  const get = (k: (typeof COLS)[number]) => r[COLS.indexOf(k)] ?? null;
  const status = String(get("status") ?? "").trim();
  const listed = status === "Closed";
  const ticker = String(get("ticker") ?? "").trim();

  const daily = (["d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const).map((k) => num(get(k)));
  // Cumulative compounded return if held N days (null until a day's return is missing).
  const cum: (number | null)[] = [];
  let acc = 1;
  let broke = false;
  for (const d of daily) {
    if (d === null || broke) { cum.push(null); broke = true; continue; }
    acc *= 1 + d;
    cum.push(acc - 1);
  }

  const uwRaw = String(get("underwriters") ?? "").trim();
  const codes = uwRaw ? uwRaw.split(",").map((c) => c.trim()).filter(Boolean) : [];
  const leadCode = codes[0] ?? "";
  const members = codes.slice(1);

  const finalPrice = num(get("finalPrice"));
  const sharesOffered = num(get("sharesOffered"));
  const raised = finalPrice !== null && sharesOffered !== null ? finalPrice * sharesOffered : null;

  const bbLow = num(get("bbLow"));
  const bbHigh = num(get("bbHigh"));
  const pricePos =
    finalPrice !== null && bbLow !== null && bbHigh !== null && bbHigh > bbLow
      ? Math.max(0, Math.min(1, (finalPrice - bbLow) / (bbHigh - bbLow)))
      : null;

  const rawSector = String(get("sector") ?? "").trim() || "Unknown";
  const sector = SECTOR_FIX[rawSector] ?? rawSector;
  const listingDate = toISO(get("listingDate"));
  const warrantRatio = num(get("warrantRatio"));
  // Classify on the listing date; if that cell is corrupt (e.g. WBSA's is the string "I"),
  // fall back to the distribution date — the index regime is the same a day either side.
  const regimeDate = listingDate ?? toISO(get("distDate"));
  const { regime, gap } = listed ? regimeAt(regimeDate) : { regime: null, gap: null };

  return {
    status,
    listed,
    ticker,
    company: String(get("company") ?? "").trim(),
    sector,
    subsector: (String(get("subsector") ?? "").trim() || null),
    finalPrice,
    sharesOffered,
    pctTotal: num(get("pctTotal")),
    raised,
    daily,
    cum,
    retListing: num(get("retListing")),
    leadCode,
    leadName: codeName[leadCode] ?? leadCode,
    members,
    syndicateSize: codes.length,
    bbLow,
    bbHigh,
    pricePos,
    listingDate,
    listingYear: listingDate ? Number(listingDate.slice(0, 4)) : null,
    warrant: warrantRatio !== null && warrantRatio > 0,
    marketRegime: regime,
    jciGap: gap,
  };
});

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "ipos.json"), JSON.stringify(ipos, null, 0));
writeFileSync(resolve(OUT, "brokers.json"), JSON.stringify(codeName, null, 2));

const listed = ipos.filter((i) => i.listed).length;
const choppy = ipos.filter((i) => i.marketRegime === "choppy").length;
const performing = ipos.filter((i) => i.marketRegime === "performing").length;
console.log(`Wrote ${ipos.length} IPOs (${listed} listed) and ${Object.keys(codeName).length} brokers.`);
console.log(`Regime: ${choppy} choppy + ${performing} performing = ${choppy + performing} classified (of ${listed} listed).`);
// Sanity asserts (ISC-1, ISC-3)
const leadOk = ipos.every((i) => !i.leadCode || codeName[i.leadCode] !== undefined);
console.log(`ISC-1 count==246: ${ipos.length === 246}  |  ISC-3 every lead resolvable: ${leadOk}`);

// ISC-4: computed regime must match the workbook's own Choppy/Perform ticker split (when present).
const sheetTickers = (name: string) =>
  wb.Sheets[name]
    ? new Set(
        XLSX.utils
          .sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null })
          .slice(1)
          .map((r) => String(r[1] ?? "").trim())
          .filter(Boolean)
      )
    : null;
const choppySheet = sheetTickers("Choppy Market");
if (choppySheet) {
  const mismatches = ipos.filter(
    (i) => i.listed && i.marketRegime !== null && choppySheet.has(i.ticker) !== (i.marketRegime === "choppy")
  );
  console.log(`ISC-4 regime matches workbook split: ${mismatches.length === 0}${mismatches.length ? ` (${mismatches.map((m) => m.ticker).join(", ")})` : ""}`);
}
