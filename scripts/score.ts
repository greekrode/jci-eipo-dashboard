// AI Score — a transparent, deterministic composite computed from the criteria the
// dashboard already carries. No black box: every point traces to an axis, and every axis
// to named inputs. Branded "AI Score"; the engine underneath is plain, auditable math so a
// signal can be verified (and back-tested) rather than trusted on faith.
//
// Headline (0-100) = weighted mean of four axes:
//   Fundamentals 0.30 · Valuation 0.22 · Balance sheet 0.16 · Governance & sponsor 0.32
// Governance bundles the two things that matter most for IDX small-caps — who brings the
// deal (underwriter track record) and who owns it (shareholder exposure) — plus deal
// structure (lock-up / float / secondary) and the net red-vs-green flag balance.

export interface ScoreInput { label: string; value: string; score: number | null; }
export interface ScoreAxis { key: string; label: string; score: number | null; weight: number; inputs: ScoreInput[]; }
export interface UnderwriterScore {
  leadName: string; leadGrade: string;
  jointName: string | null; jointGrade: string | null;
  score: number; tier: string; summary: string;
}
export interface DealScore {
  overall: number;
  grade: string;
  axes: ScoreAxis[];
  underwriter: UnderwriterScore;
  version: string;
}

const VERSION = "v1";
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** Piecewise-linear map. `pts` = [threshold, score] ascending by threshold; score may rise
 *  (higher-is-better) or fall (lower-is-better). Clamps to the end scores outside the range. */
function band(x: number | null | undefined, pts: [number, number][]): number | null {
  if (!isNum(x)) return null;
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [t0, s0] = pts[i - 1], [t1, s1] = pts[i];
      return s0 + ((s1 - s0) * (x - t0)) / (t1 - t0);
    }
  }
  return pts[pts.length - 1][1];
}

const mid = (lo: number | null, hi: number | null): number | null =>
  isNum(lo) && isNum(hi) ? (lo + hi) / 2 : isNum(lo) ? lo : isNum(hi) ? hi : null;

/** mean of the non-null scores; null if none present */
function meanScore(inputs: ScoreInput[]): number | null {
  const vals = inputs.map((i) => i.score).filter(isNum) as number[];
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

const pct = (x: number | null | undefined, d = 1) => (isNum(x) ? `${x.toFixed(d)}%` : "n/d");
const num = (x: number | null | undefined, d = 1) => (isNum(x) ? x.toFixed(d) : "n/d");

function verdictScore(v: string | null | undefined): number | null {
  if (typeof v !== "string") return null;
  if (/cheap|attractive|undervalued|discount|inexpensive|compelling|below peers/i.test(v)) return 85;
  if (/premium|expensive|rich|stretched|\bfull\b|overvalued|pricey|above peers|demanding|aggressive/i.test(v)) return 35;
  if (/fair|reasonable|in[- ]?line|moderate|justified|sensible/i.test(v)) return 60;
  return null;
}

function redWeight(sev: string | null | undefined): number {
  const s = (sev || "").toLowerCase().trim();
  if (s === "high") return 7.5;
  if (s === "med-high" || s === "medium-high" || s === "high-med") return 5.5;
  if (s === "med" || s === "medium") return 3.5;
  if (s === "low-med" || s === "med-low" || s === "low-medium") return 2;
  if (s === "low") return 1;
  return 3; // unknown severity → medium-ish, never zero
}
function greenWeight(str: string | null | undefined): number {
  const s = (str || "").toLowerCase().trim();
  if (s === "strong") return 6;
  if (s === "moderate") return 3.5;
  if (s === "minor") return 1.5;
  return 2.5;
}

const shortFirm = (name: string) =>
  (name || "").replace(/^PT\s+/i, "").replace(/\s+Tbk\b.*/i, "").split(/[(,]/)[0].trim();

// ---- axes --------------------------------------------------------------------

function fundamentals(o: any): ScoreAxis {
  const m = o.metrics ?? {};
  const inputs: ScoreInput[] = [
    { label: "Revenue growth (FY25)", value: pct(m.revGrowth2025), score: band(m.revGrowth2025, [[-20, 25], [0, 45], [15, 65], [30, 78], [60, 90], [120, 100]]) },
    { label: "Net-profit growth (FY25)", value: pct(m.netGrowth2025), score: band(m.netGrowth2025, [[-30, 22], [0, 45], [20, 65], [50, 80], [120, 92], [250, 100]]) },
    { label: "Gross margin (FY25)", value: pct(m.grossMargin2025), score: band(m.grossMargin2025, [[10, 40], [20, 55], [35, 70], [50, 85], [70, 96]]) },
    { label: "Net margin (FY25)", value: pct(m.netMargin2025), score: band(m.netMargin2025, [[2, 38], [6, 55], [10, 68], [16, 82], [25, 95]]) },
    { label: "ROE (FY25)", value: pct(m.roe2025), score: band(m.roe2025, [[5, 38], [12, 58], [18, 70], [26, 84], [40, 96]]) },
  ];
  return { key: "fundamentals", label: "Fundamentals", weight: 0.30, score: meanScore(inputs), inputs };
}

function valuation(o: any): ScoreAxis {
  const v = o.valuation ?? {};
  const pe = mid(v.peLow, v.peHigh), pb = mid(v.pbLow, v.pbHigh);
  const inputs: ScoreInput[] = [
    { label: "P/E (post-money)", value: isNum(pe) ? `${num(pe)}×` : "n/d", score: band(pe, [[6, 95], [10, 84], [14, 72], [20, 56], [28, 42], [45, 25], [70, 12]]) },
    { label: "P/B (post-money)", value: isNum(pb) ? `${num(pb, 2)}×` : "n/d", score: band(pb, [[0.8, 92], [1.2, 82], [2, 68], [3, 54], [4.5, 40], [7, 24]]) },
    { label: "Analyst verdict", value: typeof v.verdict === "string" && v.verdict ? v.verdict : "n/d", score: verdictScore(v.verdict) },
  ];
  return { key: "valuation", label: "Valuation", weight: 0.22, score: meanScore(inputs), inputs };
}

function balanceSheet(o: any): ScoreAxis {
  const m = o.metrics ?? {}, der = Array.isArray(m.der) ? m.der[2] : null;
  const da = o.debtAlloc ?? {};
  const toDebt = isNum(da.pct) ? da.pct : mid(da.low, da.high);
  const inputs: ScoreInput[] = [
    { label: "Leverage (DER, FY25)", value: isNum(der) ? `${num(der, 2)}×` : "n/d", score: band(der, [[0.3, 92], [0.7, 80], [1.2, 66], [2, 52], [3, 40], [5, 24]]) },
    { label: "DER post-IPO (est.)", value: isNum(m.derPost) ? `${num(m.derPost, 2)}×` : "n/d", score: band(m.derPost, [[0.3, 94], [0.7, 82], [1.2, 68], [2, 54], [3, 42], [5, 26]]) },
    { label: "Proceeds to debt repay", value: isNum(toDebt) ? pct(toDebt, 0) : "n/d", score: band(toDebt, [[0, 88], [20, 72], [35, 60], [50, 50], [70, 36], [90, 25]]) },
  ];
  return { key: "balance", label: "Balance sheet", weight: 0.16, score: meanScore(inputs), inputs };
}

const LEVEL_BASE: Record<string, number> = {
  clean: 86, "family-controlled": 66, mixed: 60, "conglomerate-linked": 56, "pep-linked": 50,
};

function governance(o: any, uw: any): { axis: ScoreAxis; underwriter: UnderwriterScore } {
  // --- underwriter (sponsor) track record ---
  const dealUw = uw?.deals?.[o.ticker] ?? {};
  const gp: Record<string, number> = uw?._meta?.gradePoints ?? { A: 90, B: 72, C: 50, D: 28 };
  const leadFirm = dealUw.lead ? uw?.firms?.[dealUw.lead] : null;
  const jointFirm = dealUw.joint ? uw?.firms?.[dealUw.joint] : null;
  const leadPts = leadFirm ? (gp[leadFirm.grade] ?? 50) : 50;
  const jointPts = jointFirm ? (gp[jointFirm.grade] ?? 50) : null;
  const uwScore = Math.round(isNum(jointPts) ? leadPts * 0.8 + jointPts * 0.2 : leadPts);
  const underwriter: UnderwriterScore = {
    leadName: leadFirm?.legalName ?? dealUw.lead ?? "n/d",
    leadGrade: leadFirm?.grade ?? "n/d",
    jointName: jointFirm?.legalName ?? null,
    jointGrade: jointFirm?.grade ?? null,
    score: uwScore,
    tier: leadFirm?.tier ?? "",
    summary: leadFirm?.performanceSummary ?? "",
  };
  const uwValue = `${shortFirm(underwriter.leadName)} (${underwriter.leadGrade})` +
    (jointFirm ? ` + ${shortFirm(jointFirm.legalName)} (${jointFirm.grade})` : "");

  // --- ownership / shareholder exposure ---
  const own = o.ownership ?? {};
  const ownBase = LEVEL_BASE[own.level] ?? 60;
  const ownScore = Math.round(clamp(ownBase - 3 * (own.flags?.length ?? 0) - 2 * (own.caveats?.length ?? 0), 35, 90));
  const ownValue = `${own.level ?? "n/d"}` +
    ((own.holders?.length ?? 0) ? ` · ${own.holders.length} flagged holder${own.holders.length > 1 ? "s" : ""}` : "");

  // --- deal structure: lock-up + free float + secondary + ESA ---
  const lk = o.lockup?.strength;
  let s = lk === "Hard lock" ? 78 : lk === "Control only" ? 60 : 42;
  const ff = o.freeFloat;
  if (isNum(ff)) { if (ff < 8) s -= 8; else if (ff < 15) s -= 2; else if (ff <= 40) s += 4; }
  if (o.hasSecondary) s -= 6;
  if (o.esa?.exists) s += 3;
  const structScore = Math.round(clamp(s, 30, 92));
  const structValue = `${lk ?? "n/d"}` + (isNum(ff) ? `, ${num(ff, 0)}% float` : "") +
    (o.hasSecondary ? ", secondary sale" : "");

  // --- net red-vs-green flag balance ---
  const greens = o.counterweights ?? [], reds = o.redFlags ?? [];
  const credit = Math.min(greens.reduce((a: number, c: any) => a + greenWeight(c.strength), 0), 26);
  const penalty = Math.min(reds.reduce((a: number, r: any) => a + redWeight(r.severity), 0), 32);
  const flagScore = Math.round(clamp(50 + credit - penalty, 8, 95));
  const flagValue = `${greens.length} green / ${reds.length} red`;

  const inputs: ScoreInput[] = [
    { label: "Underwriter track record", value: uwValue, score: uwScore },
    { label: "Ownership exposure", value: ownValue, score: ownScore },
    { label: "Deal structure", value: structValue, score: structScore },
    { label: "Red / green flag balance", value: flagValue, score: flagScore },
  ];
  const axisScore = Math.round(0.30 * uwScore + 0.25 * ownScore + 0.20 * structScore + 0.25 * flagScore);
  return { axis: { key: "governance", label: "Governance & sponsor", weight: 0.32, score: axisScore, inputs }, underwriter };
}

export function gradeFromScore(x: number): string {
  if (x >= 80) return "A";
  if (x >= 75) return "B+";
  if (x >= 70) return "B";
  if (x >= 65) return "C+";
  if (x >= 60) return "C";
  if (x >= 55) return "D+";
  if (x >= 50) return "D";
  return "E";
}

export function scoreDeal(o: any, uw: any): DealScore {
  const gov = governance(o, uw);
  const axes: ScoreAxis[] = [fundamentals(o), valuation(o), balanceSheet(o), gov.axis];
  const present = axes.filter((a) => isNum(a.score));
  const totalW = present.reduce((a, x) => a + x.weight, 0) || 1;
  const overall = Math.round(present.reduce((a, x) => a + (x.score as number) * x.weight, 0) / totalW);
  return { overall, grade: gradeFromScore(overall), axes, underwriter: gov.underwriter, version: VERSION };
}

// ---- self-check (bun run scripts/score.ts) -----------------------------------
if (import.meta.main) {
  const uw = {
    _meta: { gradePoints: { A: 90, B: 72, C: 50, D: 28 } },
    deals: { STRONG: { lead: "trim" }, WEAK: { lead: "boutique", joint: "tiny" } },
    firms: {
      trim: { legalName: "PT Trimegah Sekuritas Indonesia Tbk", grade: "A", tier: "large", performanceSummary: "x" },
      boutique: { legalName: "PT Boutique Sekuritas", grade: "C", tier: "small", performanceSummary: "y" },
      tiny: { legalName: "PT Tiny Sekuritas", grade: "C", tier: "small", performanceSummary: "z" },
    },
  };
  const strong = {
    ticker: "STRONG",
    metrics: { revGrowth2025: 55, netGrowth2025: 70, grossMargin2025: 52, netMargin2025: 18, roe2025: 28, der: [0.4, 0.4, 0.5], derPost: 0.3 },
    valuation: { peLow: 8, peHigh: 11, pbLow: 1.1, pbHigh: 1.4, verdict: "Attractive vs peers" },
    debtAlloc: { pct: 10 }, lockup: { strength: "Hard lock" }, freeFloat: 22, hasSecondary: false, esa: { exists: true },
    ownership: { level: "clean", flags: [], caveats: [], holders: [] },
    counterweights: [{ strength: "Strong" }, { strength: "Strong" }, { strength: "Moderate" }],
    redFlags: [{ severity: "Low" }, { severity: "Med" }],
  };
  const weak = {
    ticker: "WEAK",
    metrics: { revGrowth2025: -10, netGrowth2025: -25, grossMargin2025: 14, netMargin2025: 3, roe2025: 6, der: [3.2, 3.5, 3.8], derPost: 2.8 },
    valuation: { peLow: 45, peHigh: 65, pbLow: 5, pbHigh: 7, verdict: "Premium / stretched" },
    debtAlloc: { pct: 70 }, lockup: { strength: "None" }, freeFloat: 6, hasSecondary: true, esa: { exists: false },
    ownership: { level: "pep-linked", flags: ["a", "b"], caveats: ["c"], holders: [{ name: "X", tags: ["pep"] }] },
    counterweights: [{ strength: "Minor" }],
    redFlags: [{ severity: "High" }, { severity: "High" }, { severity: "Med-High" }, { severity: "Med" }, { severity: "Med" }],
  };
  const a = scoreDeal(strong, uw), b = scoreDeal(weak, uw);
  const assert = (c: boolean, m: string) => { if (!c) throw new Error("self-check FAILED: " + m); };
  assert(a.overall > b.overall, "strong must outscore weak");
  assert(a.overall >= 75 && b.overall <= 50, `spread sane (${a.overall} vs ${b.overall})`);
  assert(a.axes.every((x) => isNum(x.score) && x.score! >= 0 && x.score! <= 100), "all axes 0-100");
  assert(a.underwriter.leadGrade === "A" && b.underwriter.jointGrade === "C", "underwriter grades wired");
  assert(b.underwriter.score === Math.round(50 * 0.8 + 50 * 0.2), "joint blend 0.8/0.2");
  assert(gradeFromScore(a.overall) === a.grade, "grade matches band");
  console.log(`score.ts self-check OK — strong ${a.overall}/${a.grade}, weak ${b.overall}/${b.grade}`);
}
