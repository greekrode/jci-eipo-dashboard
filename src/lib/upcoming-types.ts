// Shape of one entry in src/data/upcoming-ipos.json, produced by scripts/build-upcoming.ts.
// All monetary financials are normalized to IDR **billions**; offering/market-cap figures
// (priceLow/grossLow/mcapLow…) stay in raw rupiah. Percentages are 0–100 (not 0–1 decimals).

export interface ShareRow {
  name: string;
  shares: number | null;
  pct: number | null;
  role: string | null;
}

export interface UseOfProceedsItem {
  purpose: string;
  type: string | null;
  pct: number | null; // share of proceeds (basis varies by deal)
  amountRp: number | null; // raw rupiah, where disclosed
  affiliated: boolean | null;
  note: string | null;
}

export interface RedFlag {
  text: string;
  severity: string | null; // "High" | "Med-High" | "Med" | "Low-Med" | "Low"
}

/** Positive / mitigating factor — the green-flag mirror of RedFlag. */
export interface GreenFlag {
  text: string;
  strength: string; // "Strong" | "Moderate" | "Minor"
}

export interface RevenueSeg {
  label: string;
  pct: number | null;
  year: number | null;
  rpBn: number | null;
}

/** Shareholder background research (scripts/shareholder-research.json), reduced at build time
 *  to public-safe structural facts: conglomerate / PEP / listed-affiliate / foreign-strategic.
 *  Holders carry only those structural tags; unproven reputational items are dropped pre-bundle. */
export interface OwnershipExposure {
  level: string; // "clean" | "family-controlled" | "conglomerate-linked" | "pep-linked" | "mixed"
  summary: string;
  flags: string[];
  holders: { name: string; tags: string[] }[]; // only holders carrying >=1 structural tag
  /** Unverified / unproven items (dated allegations, possible namesakes, media noise) — surfaced
   *  for transparency, explicitly NOT findings of wrongdoing. Rendered in a distinct caveat block. */
  caveats: string[];
}

/** AI Score — a transparent, deterministic composite (scripts/score.ts) computed at build time
 *  from the criteria above. Headline 0–100 = weighted mean of four axes; every axis carries its
 *  named inputs so the number is auditable, not a black box. The "Governance & sponsor" axis folds
 *  in the underwriter's IDX IPO track record (scripts/underwriter-research.json). */
export interface ScoreInput {
  label: string;
  value: string; // human-readable input value, e.g. "P/E 24×", "Trimegah (A)"
  score: number | null; // 0–100 contribution, or null when the input is n/d
}
export interface ScoreAxis {
  key: string; // "fundamentals" | "valuation" | "balance" | "governance"
  label: string;
  score: number | null; // 0–100
  weight: number; // share of the headline (0–1)
  inputs: ScoreInput[];
}
export interface UnderwriterScore {
  leadName: string;
  leadGrade: string; // "A" | "B" | "C" | "D"
  jointName: string | null;
  jointGrade: string | null;
  score: number; // 0–100 (lead, or 0.8·lead + 0.2·joint)
  tier: string; // "large" | "established-mid" | "small"
  summary: string; // post-listing track-record summary
}
export interface DealScore {
  overall: number; // 0–100 weighted composite
  grade: string; // "A" | "B+" | "B" | "C+" | "C" | "D+" | "D" | "E"
  axes: ScoreAxis[]; // Fundamentals / Valuation / Balance sheet / Governance & sponsor
  underwriter: UnderwriterScore;
  version: string;
}

/** Business-model breakdown extracted from the prospectus (scripts/upcoming-supplement.json). */
export interface BusinessModel {
  summary: string;
  revenueBreakdown: RevenueSeg[];
  breakdownBasis: string; // "by business segment" | "by product" | "by customer" | …
  model: string;
  keyCustomersOrChannel: string | null;
  moatOrEdge: string | null;
  sourcePages: string | null;
}

export interface UpcomingIPO {
  ticker: string;
  legalName: string;
  brand: string | null;
  sector: string;
  sectorGroup: string; // coarse group for the color swatch
  listingISO: string | null;
  underwriter: string | null;
  underwriterJoint: string | null;
  issueType: string | null;
  hasSecondary: boolean;

  offering: {
    priceLow: number | null;
    priceHigh: number | null;
    par: number | null;
    sharesOffered: number | null;
    pctPost: number | null;
    grossLow: number | null; // raw rupiah
    grossHigh: number | null;
    postShares: number | null;
  };
  freeFloat: number | null;

  timeline: {
    bookbuilding: string | null;
    ojkEffective: string | null;
    publicOffering: string | null;
    allotment: string | null;
    distribution: string | null;
    listing: string | null;
  };

  shareholdersPre: ShareRow[] | null;
  shareholdersPost: ShareRow[] | null;
  /** Extra ownership state after a disclosed post-listing transfer (e.g. BACH's GTP option). */
  shareholdersPostOption: ShareRow[] | null;
  controllerPost: string | null;
  /** Curated controller/UBO bullet points for the comparison matrix (more legible than the one-liner). */
  controllerLines: string[] | null;
  ubo: string | null;
  businessModel: BusinessModel | null;
  /** Shareholder background research, reduced to public-safe structural flags. */
  ownership: OwnershipExposure | null;
  /** Transparent composite "AI Score" over all criteria, incl. underwriter track record. */
  score: DealScore | null;

  useOfProceeds: UseOfProceedsItem[];
  debtAlloc: {
    pct: number | null; // single % (net-proceeds basis) when the deal gives one
    low: number | null; // price-dependent range (gross/company basis) otherwise
    high: number | null;
    basis: string;
    rupiah: number | null;
    facility: string | null;
  };

  lockup: { hard: boolean; strength: string; summary: string; short: string | null };
  esa: { exists: boolean; summary: string };

  financials: {
    unit: "IDR_bn";
    years: number[];
    revenue: (number | null)[];
    grossProfit: (number | null)[];
    netProfitParent: (number | null)[];
    netProfitTotal: (number | null)[];
    totalAssets: (number | null)[];
    totalLiabilities: (number | null)[];
    totalEquity: (number | null)[];
  };

  metrics: {
    revGrowth2025: number | null;
    netGrowth2025: number | null;
    grossMargin2025: number | null;
    netMargin2025: number | null;
    roe2025: number | null;
    der: (number | null)[]; // total liabilities / equity, FY23–25
    derPost: number | null; // analyst post-IPO pro-forma estimate
  };

  valuation: {
    peLow: number | null;
    peHigh: number | null;
    pbLow: number | null;
    pbHigh: number | null;
    mcapLow: number | null; // raw rupiah
    mcapHigh: number | null;
    roePost: number | null;
    verdict: string | null;
  };

  dividendPolicy: string | null;
  primaryRisk: string | null;
  industryTailwind: string | null;
  redFlags: RedFlag[];
  counterweights: GreenFlag[] | null; // "green flags" — positives, graded like red flags
  openQuestions: string[];

  /** Full source JSON, kept non-lossy for the detail view's deal-specific sections. */
  raw: Record<string, any>;
  /** Verbatim original analyst markdown writeup (fallback / provenance). */
  narrativeMd: string;
  /** Curated forensic writeup — consistent 7-heading template, prose only, card-covered
   *  tables/lists removed. Rendered in place of narrativeMd when present. */
  forensicMd: string | null;
}
