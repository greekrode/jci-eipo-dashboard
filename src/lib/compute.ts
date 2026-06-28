import type { IPO } from "./types";
import { mean, median, pctPositive, stddev } from "./stats";

export const listedOnly = (ipos: IPO[]) => ipos.filter((i) => i.listed && i.daily[0] !== null);

const d1Of = (ipos: IPO[]) => ipos.map((i) => i.daily[0]).filter((x): x is number => x !== null);

export type Regime = "choppy" | "performing";

/** Listed deals filtered to one market regime (JCI below / above its 200-day MA at listing). */
export const byRegime = (ipos: IPO[], regime: Regime) =>
  listedOnly(ipos).filter((i) => i.marketRegime === regime);

export interface RegimeScatterPoint {
  ticker: string;
  sector: string;
  listingDate: string | null;
  d1: number;
  d7: number;
  raised: number;
  gap: number | null;
}

/** One point per listed deal in a regime: day-1 pop (x) vs day-7 cumulative (y), bubble = proceeds. */
export function regimeScatter(ipos: IPO[], regime: Regime): RegimeScatterPoint[] {
  return byRegime(ipos, regime)
    .map((i) => ({
      ticker: i.ticker,
      sector: i.sector,
      listingDate: i.listingDate,
      d1: i.daily[0],
      d7: i.cum[6],
      raised: i.raised ?? 0,
      gap: i.jciGap,
    }))
    .filter((p): p is RegimeScatterPoint => p.d1 !== null && p.d7 !== null);
}

export interface RegimeFadePoint {
  day: string;
  choppy: number | null;
  performing: number | null;
}

/** Median cumulative-return fade curve, choppy vs performing, side by side for D1..D7. */
export function regimeFade(ipos: IPO[]): RegimeFadePoint[] {
  const ch = byRegime(ipos, "choppy");
  const pf = byRegime(ipos, "performing");
  return Array.from({ length: 7 }, (_, n) => ({
    day: `D${n + 1}`,
    choppy: medAtDay(ch, n),
    performing: medAtDay(pf, n),
  }));
}

/** Median cumulative return across a set of deals at a given hold-day index (0=D1, 2=D3, ...). */
const medAtDay = (deals: IPO[], dayIdx: number) =>
  median(deals.map((d) => d.cum[dayIdx]).filter((x): x is number => x !== null));

export interface Kpis {
  total: number;
  listed: number;
  canceled: number;
  medianD1: number | null;
  pctGreenD1: number | null;
  totalRaised: number | null;
  medianLifetime: number | null;
  bestPop: { ticker: string; value: number } | null;
  worstPop: { ticker: string; value: number } | null;
}

export function overviewKpis(ipos: IPO[]): Kpis {
  const L = listedOnly(ipos);
  const d1 = d1Of(L);
  const raised = ipos.filter((i) => i.listed && i.raised !== null).map((i) => i.raised!);
  const life = L.map((i) => i.retListing).filter((x): x is number => x !== null);
  let best: { ticker: string; value: number } | null = null;
  let worst: { ticker: string; value: number } | null = null;
  for (const i of L) {
    const v = i.daily[0];
    if (v === null) continue;
    if (!best || v > best.value) best = { ticker: i.ticker, value: v };
    if (!worst || v < worst.value) worst = { ticker: i.ticker, value: v };
  }
  return {
    total: ipos.length,
    listed: L.length,
    canceled: ipos.filter((i) => i.status === "Canceled").length,
    medianD1: median(d1),
    pctGreenD1: pctPositive(d1),
    totalRaised: raised.length ? raised.reduce((a, b) => a + b, 0) : null,
    medianLifetime: median(life),
    bestPop: best,
    worstPop: worst,
  };
}

export interface MilestoneRow {
  day: string;
  n: number;
  median: number | null;
  mean: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
  pctPos: number | null;
}

/** Cumulative-return statistics at hold-day milestones (D1, D3, D5, D7 by default). */
export function milestoneStats(ipos: IPO[], days = [1, 3, 5, 7]): MilestoneRow[] {
  const L = listedOnly(ipos);
  return days.map((d) => {
    const xs = L.map((i) => i.cum[d - 1]).filter((x): x is number => x !== null);
    return {
      day: `D${d}`,
      n: xs.length,
      median: median(xs),
      mean: mean(xs),
      sd: stddev(xs),
      min: xs.length ? Math.min(...xs) : null,
      max: xs.length ? Math.max(...xs) : null,
      pctPos: pctPositive(xs),
    };
  });
}

export interface Bucket {
  label: string;
  count: number;
  kind: "neg" | "flat" | "pos" | "ara";
}

export function d1Histogram(ipos: IPO[]): Bucket[] {
  const d1 = d1Of(listedOnly(ipos));
  const defs: Array<{ label: string; kind: Bucket["kind"]; test: (x: number) => boolean }> = [
    { label: "≤ −20%", kind: "neg", test: (x) => x <= -0.2 },
    { label: "−20–0%", kind: "neg", test: (x) => x > -0.2 && x < 0 },
    { label: "flat", kind: "flat", test: (x) => x === 0 },
    { label: "0–10%", kind: "pos", test: (x) => x > 0 && x < 0.1 },
    { label: "10–25%", kind: "pos", test: (x) => x >= 0.1 && x < 0.25 },
    { label: "25–35%", kind: "ara", test: (x) => x >= 0.25 && x < 0.35 },
    { label: "≥ 35%", kind: "ara", test: (x) => x >= 0.35 },
  ];
  return defs.map((d) => ({ label: d.label, kind: d.kind, count: d1.filter(d.test).length }));
}

export interface FadePoint {
  day: string;
  median: number | null;
  mean: number | null;
  pctGreen: number | null;
}

export function fadeCurve(ipos: IPO[]): FadePoint[] {
  const L = listedOnly(ipos);
  const out: FadePoint[] = [];
  for (let n = 0; n < 7; n++) {
    const xs = L.map((i) => i.cum[n]).filter((x): x is number => x !== null);
    out.push({ day: `D${n + 1}`, median: median(xs), mean: mean(xs), pctGreen: pctPositive(xs) });
  }
  return out;
}

export interface LeagueRow {
  code: string;
  name: string;
  led: number;
  d1: number | null;
  d3: number | null;
  d5: number | null;
  d7: number | null;
  pctGreen: number | null;
  raised: number;
  sharePct: number | null;
  sdD1: number | null;
  best: { ticker: string; value: number } | null;
}

export function leagueTable(ipos: IPO[]): LeagueRow[] {
  const L = listedOnly(ipos);
  const total = L.reduce((a, i) => a + (i.raised ?? 0), 0);
  const byLead = new Map<string, IPO[]>();
  for (const i of L) {
    if (!i.leadCode) continue;
    (byLead.get(i.leadCode) ?? byLead.set(i.leadCode, []).get(i.leadCode)!).push(i);
  }
  const rows: LeagueRow[] = [];
  for (const [code, deals] of byLead) {
    const d1 = deals.map((i) => i.daily[0]).filter((x): x is number => x !== null);
    const raised = deals.reduce((a, d) => a + (d.raised ?? 0), 0);
    let best: { ticker: string; value: number } | null = null;
    for (const d of deals) {
      const v = d.daily[0];
      if (v !== null && (!best || v > best.value)) best = { ticker: d.ticker, value: v };
    }
    rows.push({
      code,
      name: deals[0].leadName,
      led: deals.length,
      d1: medAtDay(deals, 0),
      d3: medAtDay(deals, 2),
      d5: medAtDay(deals, 4),
      d7: medAtDay(deals, 6),
      pctGreen: pctPositive(d1),
      raised,
      sharePct: total ? raised / total : null,
      sdD1: stddev(d1),
      best,
    });
  }
  return rows.sort((a, b) => b.led - a.led);
}

/** Code -> display name for every broker (leads + member-only, with overrides, uppercase). */
export function brokerNames(ipos: IPO[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of participationTable(ipos)) out[p.code] = p.name;
  return out;
}

export interface UwMarket {
  activeLeads: number;
  mostActive: { code: string; name: string; led: number } | null;
  topProceeds: { code: string; name: string; raised: number } | null;
  top5Share: number | null;
  medianSyndicate: number | null;
  soloShare: number | null;
}

export interface PartRoleStat {
  n: number;
  d1: number | null;
  d3: number | null;
  d5: number | null;
  d7: number | null;
  pctGreen: number | null;
  raised: number;
}

export interface PartRow {
  code: string;
  name: string;
  ledCount: number;
  memberCount: number;
  lead: PartRoleStat;
  member: PartRoleStat;
  all: PartRoleStat;
}

// Names for brokers the source map can't resolve (member-only codes never in the lead/admin map).
// Researched from IDX broker-code lists; the five alphanumeric foreign codes confirmed by the user.
const NAME_OVERRIDES: Record<string, string> = {
  AK: "UBS SEKURITAS INDONESIA",
  AR: "BINAARTHA SEKURITAS",
  BK: "J.P. MORGAN SEKURITAS INDONESIA",
  C3: "CIMB NIAGA SEKURITAS",
  C4: "CITIGROUP SEKURITAS INDONESIA",
  CD: "MEGA CAPITAL SEKURITAS",
  CS: "CREDIT SUISSE (SUSPENDED)",
  D4: "DEUTSCHE SEKURITAS INDONESIA",
  DH: "SINARMAS SEKURITAS",
  DX: "BAHANA SEKURITAS",
  FS: "YUANTA SEKURITAS INDONESIA",
  FZ: "WATERFRONT SEKURITAS INDONESIA",
  GW: "HSBC SEKURITAS INDONESIA",
  IP: "YUGEN BERTUMBUH SEKURITAS",
  KK: "PHILLIP SEKURITAS INDONESIA",
  KZ: "CLSA SEKURITAS INDONESIA",
  PF: "DANASAKTI SEKURITAS INDONESIA",
  PP: "ALDIRACITA SEKURITAS INDONESIA",
  RO: "PLUANG MAJU SEKURITAS",
  RS: "YULIE SEKURITAS INDONESIA",
  RX: "MACQUARIE SEKURITAS INDONESIA",
  S0: "MORGAN STANLEY SEKURITAS INDONESIA",
  Y0: "BNP PARIBAS SEKURITAS INDONESIA",
  YO: "AMANTARA SEKURITAS INDONESIA",
  YU: "CGS INTERNATIONAL SEKURITAS INDONESIA",
  ZP: "MAYBANK SEKURITAS INDONESIA",
};

/** Per-broker stats split by role: as lead, as non-lead member, and across all participations. */
export function participationTable(ipos: IPO[]): PartRow[] {
  const L = listedOnly(ipos);
  const nameOf = new Map<string, string>();
  for (const i of L) if (i.leadCode) nameOf.set(i.leadCode, i.leadName);

  const leadDeals = new Map<string, IPO[]>();
  const memberDeals = new Map<string, IPO[]>();
  const allDeals = new Map<string, IPO[]>();
  for (const i of L) {
    const codes = [i.leadCode, ...i.members].filter(Boolean);
    codes.forEach((c, idx) => {
      (allDeals.get(c) ?? allDeals.set(c, []).get(c)!).push(i);
      const bucket = idx === 0 ? leadDeals : memberDeals;
      (bucket.get(c) ?? bucket.set(c, []).get(c)!).push(i);
    });
  }

  const stat = (deals: IPO[] | undefined): PartRoleStat => {
    const ds = deals ?? [];
    const d1 = ds.map((d) => d.daily[0]).filter((x): x is number => x !== null);
    return {
      n: ds.length,
      d1: medAtDay(ds, 0),
      d3: medAtDay(ds, 2),
      d5: medAtDay(ds, 4),
      d7: medAtDay(ds, 6),
      pctGreen: pctPositive(d1),
      raised: ds.reduce((a, d) => a + (d.raised ?? 0), 0),
    };
  };

  const rows: PartRow[] = [];
  for (const c of allDeals.keys()) {
    rows.push({
      code: c,
      name: (NAME_OVERRIDES[c] ?? nameOf.get(c) ?? c).toUpperCase(),
      ledCount: leadDeals.get(c)?.length ?? 0,
      memberCount: memberDeals.get(c)?.length ?? 0,
      lead: stat(leadDeals.get(c)),
      member: stat(memberDeals.get(c)),
      all: stat(allDeals.get(c)),
    });
  }
  return rows.sort((a, b) => b.all.n - a.all.n);
}

export function underwriterMarket(ipos: IPO[]): UwMarket {
  const L = listedOnly(ipos);
  const byLead = new Map<string, { name: string; led: number; raised: number }>();
  const syndSizes: number[] = [];
  let solo = 0;
  let totalLed = 0;
  for (const i of L) {
    syndSizes.push(i.syndicateSize);
    if (i.syndicateSize <= 1) solo++;
    if (!i.leadCode) continue;
    totalLed++;
    const e = byLead.get(i.leadCode) ?? { name: i.leadName, led: 0, raised: 0 };
    e.led++;
    e.raised += i.raised ?? 0;
    byLead.set(i.leadCode, e);
  }
  const arr = [...byLead.entries()];
  const byLed = [...arr].sort((a, b) => b[1].led - a[1].led);
  const byRaised = [...arr].sort((a, b) => b[1].raised - a[1].raised);
  const top5 = byLed.slice(0, 5).reduce((a, [, v]) => a + v.led, 0);
  return {
    activeLeads: byLead.size,
    mostActive: byLed[0] ? { code: byLed[0][0], name: byLed[0][1].name, led: byLed[0][1].led } : null,
    topProceeds: byRaised[0] ? { code: byRaised[0][0], name: byRaised[0][1].name, raised: byRaised[0][1].raised } : null,
    top5Share: totalLed ? top5 / totalLed : null,
    medianSyndicate: median(syndSizes),
    soloShare: L.length ? solo / L.length : null,
  };
}

export interface RoleRow {
  code: string;
  name: string;
  leadMed: number | null;
  leadN: number;
  memberMed: number | null;
  memberN: number;
}

/** Same broker's day-1 pop when LEAD vs when a non-lead syndicate MEMBER. */
export function leadVsMember(ipos: IPO[], minEach = 5): RoleRow[] {
  const lead = new Map<string, number[]>();
  const member = new Map<string, number[]>();
  const names = new Map<string, string>();
  for (const i of listedOnly(ipos)) {
    const d1 = i.daily[0];
    if (d1 === null) continue;
    const codes = [i.leadCode, ...i.members].filter(Boolean);
    codes.forEach((c, idx) => {
      names.set(c, c === i.leadCode ? i.leadName : c);
      const m = idx === 0 ? lead : member;
      (m.get(c) ?? m.set(c, []).get(c)!).push(d1);
    });
  }
  const rows: RoleRow[] = [];
  for (const [code, ld] of lead) {
    const mb = member.get(code) ?? [];
    if (ld.length >= minEach && mb.length >= minEach) {
      rows.push({
        code,
        name: names.get(code) ?? code,
        leadMed: median(ld),
        leadN: ld.length,
        memberMed: median(mb),
        memberN: mb.length,
      });
    }
  }
  return rows.sort((a, b) => b.leadN + b.memberN - (a.leadN + a.memberN));
}

export interface RoleStat {
  n: number;
  d1: number | null;
  d3: number | null;
  d5: number | null;
  d7: number | null;
}

export function soloVsSyndicated(ipos: IPO[]): { solo: RoleStat; synd: RoleStat } {
  const solo: IPO[] = [];
  const synd: IPO[] = [];
  for (const i of listedOnly(ipos)) (i.syndicateSize > 1 ? synd : solo).push(i);
  const stat = (deals: IPO[]): RoleStat => ({
    n: deals.length,
    d1: medAtDay(deals, 0),
    d3: medAtDay(deals, 2),
    d5: medAtDay(deals, 4),
    d7: medAtDay(deals, 6),
  });
  return { solo: stat(solo), synd: stat(synd) };
}

export interface SectorRow {
  sector: string;
  count: number;
  d1: number | null;
  d3: number | null;
  d5: number | null;
  d7: number | null;
}

export function sectorAgg(ipos: IPO[]): SectorRow[] {
  const by = new Map<string, IPO[]>();
  for (const i of listedOnly(ipos)) {
    (by.get(i.sector) ?? by.set(i.sector, []).get(i.sector)!).push(i);
  }
  return [...by.entries()]
    .map(([sector, deals]) => ({
      sector,
      count: deals.length,
      d1: medAtDay(deals, 0),
      d3: medAtDay(deals, 2),
      d5: medAtDay(deals, 4),
      d7: medAtDay(deals, 6),
    }))
    .sort((a, b) => (b.d1 ?? -Infinity) - (a.d1 ?? -Infinity));
}

export interface YearRow {
  year: number;
  count: number;
  d1: number | null;
  d3: number | null;
  d5: number | null;
  d7: number | null;
}

export function yearAgg(ipos: IPO[]): YearRow[] {
  const by = new Map<number, IPO[]>();
  for (const i of listedOnly(ipos)) {
    if (i.listingYear === null) continue;
    (by.get(i.listingYear) ?? by.set(i.listingYear, []).get(i.listingYear)!).push(i);
  }
  return [...by.entries()]
    .map(([year, deals]) => ({
      year,
      count: deals.length,
      d1: medAtDay(deals, 0),
      d3: medAtDay(deals, 2),
      d5: medAtDay(deals, 4),
      d7: medAtDay(deals, 6),
    }))
    .sort((a, b) => a.year - b.year);
}
