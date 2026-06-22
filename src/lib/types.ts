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
}
