/** Signed percent, e.g. +19.8% */
export const pct = (x: number | null, d = 1): string =>
  x === null ? "—" : `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;

/** Unsigned percent, e.g. 76% */
export const pctAbs = (x: number | null, d = 0): string =>
  x === null ? "—" : `${(x * 100).toFixed(d)}%`;

/** Compact IDR with T/B/M suffix for big aggregate figures. */
export const idr = (x: number | null): string => {
  if (x === null) return "—";
  const a = Math.abs(x);
  if (a >= 1e12) return `Rp ${(x / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `Rp ${(x / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `Rp ${(x / 1e6).toFixed(1)}M`;
  return `Rp ${Math.round(x).toLocaleString("en-US")}`;
};

/** Exact rupiah price, e.g. Rp 1.250 */
export const idrPrice = (x: number | null): string =>
  x === null ? "—" : `Rp ${Math.round(x).toLocaleString("id-ID")}`;

export const intFmt = (x: number | null): string =>
  x === null ? "—" : Math.round(x).toLocaleString("en-US");

/** Tailwind text-color class for a signed value. */
export const signClass = (x: number | null): string =>
  x === null || x === 0 ? "text-muted-foreground" : x > 0 ? "text-pos" : "text-neg";
