export interface IPO {
  status: string;
  listed: boolean;
  ticker: string;
  company: string;
  sector: string;
  subsector: string | null;
  finalPrice: number | null;
  sharesOffered: number | null;
  pctTotal: number | null;
  raised: number | null;
  /** Daily returns D1..D7 (decimal). null when not available. */
  daily: (number | null)[];
  /** Cumulative compounded return if held N days (decimal). */
  cum: (number | null)[];
  /** Lifetime return: offer price -> latest price (decimal). */
  retListing: number | null;
  leadCode: string;
  leadName: string;
  members: string[];
  syndicateSize: number;
  bbLow: number | null;
  bbHigh: number | null;
  pricePos: number | null;
  listingDate: string | null;
  listingYear: number | null;
  warrant: boolean;
  /** Market regime at listing: JCI below its 200-day MA ("choppy") or above ("performing"). null if unclassifiable. */
  marketRegime: "choppy" | "performing" | null;
  /** JCI close / MA200 − 1 on the listing date: how far above (+) or below (−) trend the index sat. */
  jciGap: number | null;
}
