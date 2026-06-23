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
  severity: string | null; // "High" | "Med" | … | null (string-style sources have no severity)
}

export interface RevenueSeg {
  label: string;
  pct: number | null;
  year: number | null;
  rpBn: number | null;
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
  counterweights: string[] | null;
  openQuestions: string[];

  /** Full source JSON, kept non-lossy for the detail view's deal-specific sections. */
  raw: Record<string, any>;
  /** Verbatim original analyst markdown writeup (fallback / provenance). */
  narrativeMd: string;
  /** Curated forensic writeup — consistent 7-heading template, prose only, card-covered
   *  tables/lists removed. Rendered in place of narrativeMd when present. */
  forensicMd: string | null;
}
