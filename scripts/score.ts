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

const VERSION = "v2";
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
/** Compact rupiah for score labels: Rp1.8T / Rp640bn / Rp90m. */
const rpShort = (x: number | null | undefined): string =>
  !isNum(x) ? "n/d" : x >= 1e12 ? `Rp${(x / 1e12).toFixed(1)}T` : x >= 1e9 ? `Rp${Math.round(x / 1e9)}bn` : `Rp${Math.round(x / 1e6)}m`;

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
  // 3-year quality: trajectory + consistency (so a one-year spike doesn't carry the score)
  const f = o.financials ?? {};
  const rev: (number | null)[] = f.revenue ?? [], npt: (number | null)[] = f.netProfitTotal ?? [], npp: (number | null)[] = f.netProfitParent ?? [];
  const nm = (i: number) => (isNum(npt[i]) && isNum(rev[i]) && rev[i] !== 0 ? (npt[i]! / rev[i]!) * 100 : null);
  const nm0 = nm(0), nm2 = nm(2);
  const mDelta = isNum(nm0) && isNum(nm2) ? nm2! - nm0! : null;
  inputs.push({
    label: "Net-margin trend (3-yr)",
    value: isNum(nm0) && isNum(nm2) ? `${nm0!.toFixed(0)}%→${nm2!.toFixed(0)}%` : "n/d",
    score: band(mDelta, [[-15, 28], [-6, 42], [0, 56], [5, 70], [12, 86], [20, 94]]),
  });
  const yrsPos = [0, 1, 2].filter((i) => isNum(npp[i]) && npp[i]! > 0).length;
  const yrsData = [0, 1, 2].filter((i) => isNum(npp[i])).length;
  inputs.push({
    label: "Profit consistency (3-yr)",
    value: yrsData ? `${yrsPos}/${yrsData} yrs profitable` : "n/d",
    score: yrsData ? band(yrsPos / yrsData, [[0, 20], [0.34, 40], [0.67, 64], [1, 90]]) : null,
  });
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

  // --- shareholder composition: exposure level + concentration + diversity + quality backing ---
  const own = o.ownership ?? {};
  const post: any[] = Array.isArray(o.shareholdersPost) ? o.shareholdersPost : [];
  const pcts = post.map((p) => (isNum(p.pct) ? p.pct : 0));
  const topStake = pcts.length ? Math.max(...pcts) : null; // largest post-IPO holder
  const subst = post.filter((p) => isNum(p.pct) && p.pct >= 5).length; // substantial holders
  const ownTags = new Set<string>((own.holders ?? []).flatMap((h: any) => h.tags ?? []));
  let comp = LEVEL_BASE[own.level] ?? 60;
  if (isNum(topStake)) { if (topStake >= 85) comp -= 6; else if (topStake >= 70) comp -= 2; else if (topStake >= 45) comp += 3; } // a clear (not absolute) controller is healthy
  if (subst >= 4) comp += 3; else if (subst <= 1 && post.length > 0) comp -= 3; // diversity vs one-holder concentration
  if (ownTags.has("foreign-strategic") || ownTags.has("affiliated-listed")) comp += 4; // strategic / institutional anchor
  comp -= 3 * (own.flags?.length ?? 0) + 2 * (own.caveats?.length ?? 0);
  const compScore = Math.round(clamp(comp, 32, 92));
  const compValue = `${own.level ?? "n/d"}` + (subst ? ` · ${subst} holders ≥5%` : "") + (isNum(topStake) && topStake > 0 ? ` · top ${num(topStake, 0)}%` : "");

  // --- liquidity & deal size: post-IPO market cap + free float (IDX small-cap illiquidity risk) ---
  const mcap = mid(o.valuation?.mcapLow, o.valuation?.mcapHigh);
  const ff = o.freeFloat;
  const sizeScore = band(mcap, [[2e11, 34], [5e11, 50], [1e12, 64], [2e12, 77], [5e12, 90]]);
  const floatScore = band(ff, [[5, 38], [10, 55], [20, 74], [35, 82], [55, 74]]); // too thin or unusually high both shade down
  const liqParts = [sizeScore, floatScore].filter(isNum) as number[];
  const liqScore = liqParts.length ? Math.round(liqParts.reduce((a, b) => a + b, 0) / liqParts.length) : 50;
  const liqValue = `${rpShort(mcap)} mcap` + (isNum(ff) ? ` · ${num(ff, 0)}% float` : "");

  // --- deal structure: lock-up + secondary + ESA (free float now scored under liquidity) ---
  const lk = o.lockup?.strength;
  let st = lk === "Hard lock" ? 78 : lk === "Control only" ? 58 : 42;
  if (o.hasSecondary) st -= 8;
  if (o.esa?.exists) st += 4;
  const structScore = Math.round(clamp(st, 30, 90));
  const structValue = `${lk ?? "n/d"}` + (o.hasSecondary ? " · secondary sale" : "") + (o.esa?.exists ? " · ESA" : "");

  // --- net red-vs-green flag balance ---
  const greens = o.counterweights ?? [], reds = o.redFlags ?? [];
  const credit = Math.min(greens.reduce((a: number, c: any) => a + greenWeight(c.strength), 0), 26);
  const penalty = Math.min(reds.reduce((a: number, r: any) => a + redWeight(r.severity), 0), 32);
  const flagScore = Math.round(clamp(50 + credit - penalty, 8, 95));
  const flagValue = `${greens.length} green / ${reds.length} red`;

  const inputs: ScoreInput[] = [
    { label: "Underwriter track record", value: uwValue, score: uwScore },
    { label: "Shareholder composition", value: compValue, score: compScore },
    { label: "Liquidity & deal size", value: liqValue, score: liqScore },
    { label: "Deal structure", value: structValue, score: structScore },
    { label: "Red / green flag balance", value: flagValue, score: flagScore },
  ];
  const axisScore = Math.round(0.26 * uwScore + 0.24 * compScore + 0.16 * liqScore + 0.14 * structScore + 0.20 * flagScore);
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
  // headline from the precise axis means, THEN round each axis for display/storage
  const overall = Math.round(present.reduce((a, x) => a + (x.score as number) * x.weight, 0) / totalW);
  for (const a of axes) if (isNum(a.score)) a.score = Math.round(a.score as number);
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
    financials: { revenue: [800, 1100, 1700], netProfitTotal: [120, 180, 300], netProfitParent: [120, 180, 300] },
    valuation: { peLow: 8, peHigh: 11, pbLow: 1.1, pbHigh: 1.4, verdict: "Attractive vs peers", mcapLow: 1.5e12, mcapHigh: 1.8e12 },
    debtAlloc: { pct: 10 }, lockup: { strength: "Hard lock" }, freeFloat: 22, hasSecondary: false, esa: { exists: true },
    shareholdersPost: [{ name: "Founder", pct: 52 }, { name: "Public", pct: 22 }, { name: "Strategic", pct: 14 }, { name: "ESA", pct: 12 }],
    ownership: { level: "clean", flags: [], caveats: [], holders: [] },
    counterweights: [{ strength: "Strong" }, { strength: "Strong" }, { strength: "Moderate" }],
    redFlags: [{ severity: "Low" }, { severity: "Med" }],
  };
  const weak = {
    ticker: "WEAK",
    metrics: { revGrowth2025: -10, netGrowth2025: -25, grossMargin2025: 14, netMargin2025: 3, roe2025: 6, der: [3.2, 3.5, 3.8], derPost: 2.8 },
    financials: { revenue: [900, 820, 760], netProfitTotal: [40, 10, 8], netProfitParent: [40, -5, 8] },
    valuation: { peLow: 45, peHigh: 65, pbLow: 5, pbHigh: 7, verdict: "Premium / stretched", mcapLow: 1.5e11, mcapHigh: 2e11 },
    debtAlloc: { pct: 70 }, lockup: { strength: "None" }, freeFloat: 6, hasSecondary: true, esa: { exists: false },
    shareholdersPost: [{ name: "Controller", pct: 90 }, { name: "Public", pct: 6 }, { name: "Other", pct: 4 }],
    ownership: { level: "pep-linked", flags: ["a", "b"], caveats: ["c"], holders: [{ name: "X", tags: ["pep"] }] },
    counterweights: [{ strength: "Minor" }],
    redFlags: [{ severity: "High" }, { severity: "High" }, { severity: "Med-High" }, { severity: "Med" }, { severity: "Med" }],
  };
  const a = scoreDeal(strong, uw), b = scoreDeal(weak, uw);
  const assert = (c: boolean, m: string) => { if (!c) throw new Error("self-check FAILED: " + m); };
  assert(a.overall > b.overall, "strong must outscore weak");
  assert(a.overall >= 72 && b.overall <= 52, `spread sane (${a.overall} vs ${b.overall})`);
  assert(a.axes.every((x) => isNum(x.score) && x.score! >= 0 && x.score! <= 100), "all axes 0-100");
  assert(Number.isInteger(a.axes[0].score), "axis scores are integers");
  assert(a.axes[0].inputs.some((i) => /trend/i.test(i.label)) && a.axes[0].inputs.some((i) => /consistency/i.test(i.label)), "fundamentals has 3-yr trend + consistency");
  const ga = a.axes.find((x) => x.key === "governance")!;
  assert(ga.inputs.some((i) => /Liquidity/i.test(i.label)) && ga.inputs.some((i) => /composition/i.test(i.label)), "governance has liquidity + shareholder composition");
  assert(a.underwriter.leadGrade === "A" && b.underwriter.jointGrade === "C", "underwriter grades wired");
  assert(b.underwriter.score === Math.round(50 * 0.8 + 50 * 0.2), "joint blend 0.8/0.2");
  assert(gradeFromScore(a.overall) === a.grade, "grade matches band");
  console.log(`score.ts self-check OK (v2) — strong ${a.overall}/${a.grade}, weak ${b.overall}/${b.grade}`);
}
