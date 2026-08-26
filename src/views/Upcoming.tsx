import { useMemo, useState, type ReactNode } from "react";
import type { IPO } from "@/lib/types";
import type { UpcomingIPO } from "@/lib/upcoming-types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { idr, idrBn, idrPrice, pct, pctN, pctNSigned, intFmt, signClass } from "@/lib/format";
import { sectorColor } from "@/lib/colors";
import { fmtDate, priceRange, lockBadge, severityCount, strengthCount, Disclaimer, exposureMeta, distinctTags, TagChip, gradeVariant, uwGradeVariant } from "@/views/upcoming/shared";
import Detail from "@/views/upcoming/Detail";
import { trackUserAction } from "@/lib/analytics";

/** A metric row in the transposed comparison matrix. `dir` marks which extreme to highlight. */
interface Metric {
  group: string;
  label: string;
  hint?: string;
  dir?: "low" | "high";
  /** left-align + top-align the cell (for multi-line / bulleted text rows) */
  align?: "left";
  /** numeric value used only for the directional highlight (null = not ranked) */
  rank?: (i: UpcomingIPO) => number | null;
  cell: (i: UpcomingIPO, best: boolean) => ReactNode;
}

const mid = (a: number | null, b: number | null) =>
  a != null && b != null ? (a + b) / 2 : a ?? b ?? null;

const rangeCell = (a: number | null, b: number | null, fmt: (x: number | null) => string, suffix = "") =>
  a == null && b == null ? "—" : a === b ? `${fmt(a)}${suffix}` : `${fmt(a)}–${fmt(b)}${suffix}`;

const METRICS: Metric[] = [
  // ── AI Score (headline synthesis) ─────────────────────────────────────────
  {
    group: "AI Score",
    label: "AI Score",
    hint: "Transparent composite (0–100) over the criteria below — fundamentals, valuation, balance sheet, and governance (incl. the underwriter's IDX IPO track record). Deterministic, auditable; educational only, not a recommendation.",
    dir: "high", rank: (i) => i.score?.overall ?? null,
    cell: (i, best) => {
      const s = i.score;
      if (!s) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="inline-flex items-center gap-1.5">
          <Strong on={best}>{s.overall}</Strong>
          <Badge variant={gradeVariant(s.grade)}>{s.grade}</Badge>
        </span>
      );
    },
  },

  // ── Deal ────────────────────────────────────────────────────────────────
  { group: "Deal", label: "Listing date", cell: (i) => fmtDate(i.listingISO) },
  {
    group: "Deal", label: "Sector",
    cell: (i) => (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0" style={{ background: sectorColor(i.sectorGroup) }} aria-hidden />
        {i.sectorGroup}
      </span>
    ),
  },
  {
    group: "Deal", label: "Lead underwriter",
    hint: "IDX IPO track-record grade for the lead underwriter (A best → D), from post-listing performance of their recent deals.",
    cell: (i) => {
      const g = i.score?.underwriter?.leadGrade;
      return (
        <span className="inline-flex items-center justify-center gap-1.5">
          <span className="text-muted-foreground">{shortUW(i.underwriter)}</span>
          {g && <Badge variant={uwGradeVariant(g)}>{g}</Badge>}
        </span>
      );
    },
  },
  { group: "Deal", label: "Offer price", cell: (i) => priceRange(i.offering.priceLow, i.offering.priceHigh) },
  {
    group: "Deal", label: "Structure",
    cell: (i) => (
      <span className="inline-flex items-center gap-1.5">
        {i.hasSecondary ? "Primary + secondary" : "100% primary"}
        {i.hasSecondary && <Badge variant="outline">exit</Badge>}
      </span>
    ),
  },

  // ── Size & float ────────────────────────────────────────────────────────
  { group: "Size & float", label: "Shares offered", cell: (i) => intFmt(i.offering.sharesOffered) },
  { group: "Size & float", label: "Gross raise", cell: (i) => rangeCell(i.offering.grossLow, i.offering.grossHigh, idr) },
  {
    group: "Size & float", label: "Free float", hint: "Public shares as % of post-IPO capital. Higher = more liquid.",
    dir: "high", rank: (i) => i.freeFloat,
    cell: (i, best) => <Strong on={best}>{pctN(i.freeFloat)}</Strong>,
  },
  { group: "Size & float", label: "Post-IPO mkt cap", cell: (i) => rangeCell(i.valuation.mcapLow, i.valuation.mcapHigh, idr) },

  // ── Valuation ───────────────────────────────────────────────────────────
  {
    group: "Valuation (post-money)", label: "Trailing P/E", hint: "FY2025 earnings (parent). Lower = cheaper.",
    dir: "low", rank: (i) => mid(i.valuation.peLow, i.valuation.peHigh),
    cell: (i, best) => <Strong on={best}>{rangeCell(i.valuation.peLow, i.valuation.peHigh, (x) => fx(x), "×")}</Strong>,
  },
  {
    group: "Valuation (post-money)", label: "P/BV", dir: "low", rank: (i) => mid(i.valuation.pbLow, i.valuation.pbHigh),
    cell: (i, best) => <Strong on={best}>{rangeCell(i.valuation.pbLow, i.valuation.pbHigh, (x) => fx(x), "×")}</Strong>,
  },
  {
    group: "Valuation (post-money)", label: "ROE post-money", hint: "Trailing ROE re-based on the enlarged post-raise equity.",
    dir: "high", rank: (i) => i.valuation.roePost,
    cell: (i, best) => <Strong on={best}>{pctN(i.valuation.roePost)}</Strong>,
  },

  // ── Leverage & proceeds ─────────────────────────────────────────────────
  {
    group: "Leverage & use of proceeds", label: "DER FY2025", hint: "Total liabilities / equity. Lower = less levered.",
    dir: "low", rank: (i) => i.metrics.der[2],
    cell: (i, best) => <Strong on={best}>{fx(i.metrics.der[2])}×</Strong>,
  },
  {
    group: "Leverage & use of proceeds", label: "DER post-IPO", hint: "Analyst pro-forma estimate after the raise.",
    dir: "low", rank: (i) => i.metrics.derPost,
    cell: (i, best) => <Strong on={best}>{i.metrics.derPost == null ? "n/d" : `${fx(i.metrics.derPost)}×`}</Strong>,
  },
  {
    group: "Leverage & use of proceeds", label: "Proceeds → debt", hint: "Share of IPO money repaying debt. Basis differs per deal — read the tag.",
    dir: "low", rank: (i) => i.debtAlloc.pct ?? mid(i.debtAlloc.low, i.debtAlloc.high),
    cell: (i, best) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">
            <Strong on={best}>
              {i.debtAlloc.pct != null ? pctN(i.debtAlloc.pct) : rangeCell(i.debtAlloc.low, i.debtAlloc.high, (x) => fx(x, 1), "%")}
            </Strong>
            <span className="ml-1 text-[12px] text-muted-foreground underline decoration-dotted">ⓘ</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px]">
          {pctN(i.debtAlloc.pct) !== "—" || i.debtAlloc.low != null ? `${i.debtAlloc.basis}.` : ""} {i.debtAlloc.rupiah ? `≈ ${idr(i.debtAlloc.rupiah)} to debt.` : ""} {i.debtAlloc.facility ?? ""}
        </TooltipContent>
      </Tooltip>
    ),
  },
  {
    group: "Leverage & use of proceeds", label: "ESA / ESOP",
    cell: (i) =>
      i.esa.exists ? (
        <Tooltip>
          <TooltipTrigger asChild><span className="cursor-default"><Badge variant="secondary">Yes</Badge></span></TooltipTrigger>
          <TooltipContent className="max-w-[260px]">{i.esa.summary}</TooltipContent>
        </Tooltip>
      ) : <span className="text-muted-foreground">—</span>,
  },

  // ── Performance ─────────────────────────────────────────────────────────
  { group: "Performance (FY2025)", label: "Revenue", cell: (i) => idrBn(i.financials.revenue[2]) },
  {
    group: "Performance (FY2025)", label: "Revenue growth", dir: "high", rank: (i) => i.metrics.revGrowth2025,
    cell: (i, best) => <Strong on={best} className={signClass(i.metrics.revGrowth2025)}>{pctNSigned(i.metrics.revGrowth2025)}</Strong>,
  },
  { group: "Performance (FY2025)", label: "Net profit", cell: (i) => idrBn(i.financials.netProfitParent[2]) },
  {
    group: "Performance (FY2025)", label: "Net profit growth", dir: "high", rank: (i) => i.metrics.netGrowth2025,
    cell: (i, best) => <Strong on={best} className={signClass(i.metrics.netGrowth2025)}>{pctNSigned(i.metrics.netGrowth2025)}</Strong>,
  },
  {
    group: "Performance (FY2025)", label: "Gross margin", dir: "high", rank: (i) => i.metrics.grossMargin2025,
    cell: (i, best) => <Strong on={best}>{pctN(i.metrics.grossMargin2025)}</Strong>,
  },
  {
    group: "Performance (FY2025)", label: "Net margin", dir: "high", rank: (i) => i.metrics.netMargin2025,
    cell: (i, best) => <Strong on={best}>{pctN(i.metrics.netMargin2025)}</Strong>,
  },
  {
    group: "Performance (FY2025)", label: "ROE (trailing)", dir: "high", rank: (i) => i.metrics.roe2025,
    cell: (i, best) => <Strong on={best}>{pctN(i.metrics.roe2025)}</Strong>,
  },

  // ── Ownership & risk ────────────────────────────────────────────────────
  {
    group: "Ownership & risk", label: "Ownership exposure", align: "left",
    hint: "Background check on the register from public-source research: conglomerate ties, PEP (politically exposed) holders, listed-company affiliates and foreign strategics. Structural facts only.",
    cell: (i) => {
      if (!i.ownership) return <span className="text-muted-foreground">—</span>;
      const e = exposureMeta(i.ownership.level);
      const tags = distinctTags(i.ownership.holders);
      return (
        <div className="space-y-1.5">
          <Badge variant={e.variant}>{e.label}</Badge>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">{tags.map((t) => <TagChip key={t} tag={t} />)}</div>
          )}
          {(i.ownership.caveats?.length ?? 0) > 0 && (
            <div className="font-mono text-[12px] leading-tight text-muted-foreground/70">
              {i.ownership.caveats.length} under review
            </div>
          )}
        </div>
      );
    },
  },
  {
    group: "Ownership & risk", label: "Controller (post)", align: "left",
    cell: (i) => {
      const lines = i.controllerLines ?? (i.controllerPost ? [i.controllerPost] : []);
      if (lines.length === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <ul className="space-y-1 text-[14px] leading-snug text-muted-foreground">
          {lines.map((l, idx) => (
            <li key={idx} className="flex gap-1.5">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
              <span className={idx === 0 ? "text-foreground" : ""}>{l}</span>
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    group: "Ownership & risk", label: "Lock-up", align: "left",
    hint: "Hard = statutory share lock on founders. Control-only = just a 12-mo control pledge.",
    cell: (i) => (
      <div className="space-y-1.5">
        <div>{lockBadge(i.lockup.strength)}</div>
        <div className="text-[14px] leading-snug text-muted-foreground">{i.lockup.short ?? i.lockup.summary}</div>
      </div>
    ),
  },
  {
    group: "Ownership & risk", label: "Red flags", dir: "low", rank: (i) => i.redFlags.length,
    cell: (i, best) => {
      const high = severityCount(i.redFlags, "High");
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge variant={best ? "outline" : "neg"}>{i.redFlags.length}</Badge>
          {high > 0 && <span className="font-mono text-[12.5px] text-neg/80">{high} high</span>}
        </span>
      );
    },
  },
  {
    group: "Ownership & risk", label: "Green flags", dir: "high", rank: (i) => i.counterweights?.length ?? 0,
    cell: (i) => {
      const g = i.counterweights ?? [];
      const strong = strengthCount(g, "strong");
      return (
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="pos">{g.length}</Badge>
          {strong > 0 && <span className="font-mono text-[12.5px] text-pos/80">{strong} strong</span>}
        </span>
      );
    },
  },
];

const GROUPS = [...new Set(METRICS.map((m) => m.group))];

export default function Upcoming({ ipos, census }: { ipos: UpcomingIPO[]; census: IPO[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const select = (t: string | null, source: string) => {
    setSelected(t);
    if (t) {
      const ipo = ipos.find((i) => i.ticker === t);
      trackUserAction("Upcoming Stock Opened", {
        ticker: t,
        source,
        sector: ipo?.sectorGroup,
        score: ipo?.score?.overall ?? null,
      });
    } else {
      trackUserAction("Upcoming Compare Opened", { source });
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { upcoming, listed, listedByTicker } = useMemo(() => {
    const listedByTicker = new Map(census.filter((c) => c.listed).map((c) => [c.ticker, c]));
    const upcoming = ipos.filter((i) => !listedByTicker.has(i.ticker));
    const listed = ipos.filter((i) => listedByTicker.has(i.ticker)).sort((a, b) => {
      const aDate = listedByTicker.get(a.ticker)?.listingDate ?? null;
      const bDate = listedByTicker.get(b.ticker)?.listingDate ?? null;
      if (aDate === null && bDate !== null) return 1;
      if (aDate !== null && bDate === null) return -1;
      if (aDate !== bDate) return (aDate ?? "").localeCompare(bDate ?? "");
      return a.ticker.localeCompare(b.ticker);
    });
    return { upcoming, listed, listedByTicker };
  }, [ipos, census]);

  // Per-row optimal value for the directional highlight.
  const bestByLabel = useMemo(() => {
    const m = new Map<string, number | null>();
    // A best-of-group marker has no meaning without at least two deals.
    if (upcoming.length < 2) return m;
    for (const met of METRICS) {
      if (!met.dir || !met.rank) continue;
      const vals = upcoming.map(met.rank).filter((x): x is number => x != null);
      m.set(met.label, vals.length ? (met.dir === "low" ? Math.min(...vals) : Math.max(...vals)) : null);
    }
    return m;
  }, [upcoming]);

  const range = listingRange(upcoming);

  if (selected) {
    const ipo = ipos.find((i) => i.ticker === selected);
    if (ipo) return <Detail ipo={ipo} all={ipos} onBack={() => select(null, "detail_back")} onSelect={(ticker) => select(ticker, "detail_switcher")} />;
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-4">
        <Disclaimer />
        <Card>
        <CardHeader>
          <CardTitle>Upcoming IPOs · side by side</CardTitle>
          <CardDescription>
            {upcoming.length} IDX {upcoming.length === 1 ? "deal" : "deals"}{range ? ` listing ${range}` : ""} · click a ticker to drill in{upcoming.length >= 2 ? " · ● = lowest leverage / cheapest / strongest growth per row (directional, not a buy signal)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-[16px] text-muted-foreground">No deals in bookbuilding right now — see Listed below.</p>
          ) : (
            <Table containerClassName="max-h-[78vh]">
              <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
                <TableRow>
                  <TableHead className="sticky left-0 top-0 z-20 min-w-[150px] border-r border-border bg-card text-left">Metric</TableHead>
                  {upcoming.map((i) => (
                    <TableHead
                      key={i.ticker}
                      role="button"
                      tabIndex={0}
                      aria-label={`Open ${i.ticker} detail`}
                      onClick={() => select(i.ticker, "comparison_table")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i.ticker, "comparison_table_keyboard"); }
                      }}
                      className="cursor-pointer text-center align-bottom hover:bg-muted/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
                    >
                      <div className="flex flex-col items-center gap-0.5 py-1">
                        <span className="text-[18px] font-semibold text-foreground">{i.ticker}</span>
                        <span className="line-clamp-2 max-w-[160px] text-[13px] font-normal leading-tight normal-case tracking-normal text-muted-foreground">
                          {i.legalName}
                        </span>
                        <span className="mt-0.5 text-[12px] font-normal normal-case tracking-normal text-primary">view ▸</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {GROUPS.map((g) => (
                  <GroupBlock key={g} group={g} ipos={upcoming} best={bestByLabel} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        </Card>
        {listed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Listed · how the calls played out</CardTitle>
              <CardDescription>AI Score at prospectus stage vs realized returns · click a ticker for the original forensic</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-left">Company</TableHead>
                    <TableHead>Listed</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Final price</TableHead>
                    <TableHead>D1</TableHead>
                    <TableHead>D7 cum</TableHead>
                    <TableHead>Since listing</TableHead>
                    <TableHead className="text-left">Regime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listed.map((i) => {
                    const c = listedByTicker.get(i.ticker);
                    if (!c) return null;
                    const d1 = c.daily[0] ?? null;
                    const d7 = c.cum[6] ?? null;
                    const s = i.score;
                    return (
                      <TableRow key={i.ticker}>
                        <TableCell
                          role="button"
                          tabIndex={0}
                          aria-label={`Open ${i.ticker} detail`}
                          onClick={() => select(i.ticker, "listed_table")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i.ticker, "listed_table"); }
                          }}
                          className="cursor-pointer font-medium text-foreground hover:bg-muted/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
                        >
                          {i.ticker}
                        </TableCell>
                        <TableCell className="max-w-[220px] text-left">
                          <span className="line-clamp-2 text-[13px] font-normal leading-tight normal-case tracking-normal text-muted-foreground">
                            {i.legalName}
                          </span>
                        </TableCell>
                        <TableCell>{fmtDate(c.listingDate)}</TableCell>
                        <TableCell>
                          {s ? (
                            <span className="inline-flex items-center gap-1.5">
                              {s.overall}
                              <Badge variant={gradeVariant(s.grade)}>{s.grade}</Badge>
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{idrPrice(c.finalPrice)}</TableCell>
                        <TableCell className={signClass(d1)}>{pct(d1)}</TableCell>
                        <TableCell className={signClass(d7)}>{pct(d7)}</TableCell>
                        <TableCell className={signClass(c.retListing)}>{pct(c.retListing)}</TableCell>
                        <TableCell className="text-left text-[12.5px] text-muted-foreground">{c.marketRegime ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

function GroupBlock({ group, ipos, best }: { group: string; ipos: UpcomingIPO[]; best: Map<string, number | null> }) {
  const rows = METRICS.filter((m) => m.group === group);
  return (
    <>
      <TableRow className="bg-secondary/70 hover:bg-secondary/70">
        <TableCell colSpan={ipos.length + 1} className="py-1.5 text-left text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {group}
        </TableCell>
      </TableRow>
      {rows.map((m) => {
        const b = best.get(m.label);
        return (
          <TableRow key={m.label}>
            <TableCell className="sticky left-0 z-[1] border-r border-border bg-card text-left text-muted-foreground">
              {m.hint ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2">{m.label}</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">{m.hint}</TooltipContent>
                </Tooltip>
              ) : m.label}
            </TableCell>
            {ipos.map((i) => {
              const isBest = !!m.dir && m.rank != null && b != null && m.rank(i) === b;
              return (
                <TableCell
                  key={i.ticker}
                  className={`text-foreground ${m.align === "left" ? "align-top text-left" : "text-center"}`}
                >
                  {m.cell(i, isBest)}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </>
  );
}

/** Highlights the directional best cell with the structural accent + a leading dot. */
function Strong({ on, className = "", children }: { on?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={`${on ? "font-semibold text-primary" : ""} ${className}`}>
      {on && <span className="mr-0.5 text-primary" aria-hidden>●</span>}
      {children}
    </span>
  );
}

const fx = (x: number | null, d = 1) => (x == null ? "—" : x.toFixed(d));
const shortUW = (s: string | null) =>
  !s ? "—" : s.replace(/^PT\s+/, "").replace(/\s+\(.*$/, "").replace(/\s+Sekuritas.*/i, " Sekuritas").replace(/\s+Tbk.*/, "");

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Compact month span for the upcoming-deal header. */
function listingRange(ipos: UpcomingIPO[]): string | null {
  const dates = ipos.map((i) => i.listingISO).filter((iso): iso is string => iso !== null).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (!first || !last) return null;
  const firstParts = first.match(/^(\d{4})-(\d{2})-/);
  const lastParts = last.match(/^(\d{4})-(\d{2})-/);
  if (!firstParts || !lastParts) return null;
  const firstMonth = MON[Number(firstParts[2]) - 1];
  const lastMonth = MON[Number(lastParts[2]) - 1];
  if (!firstMonth || !lastMonth) return null;
  const firstYear = firstParts[1];
  const lastYear = lastParts[1];
  if (firstYear === lastYear && firstMonth === lastMonth) return `${firstMonth} ${firstYear}`;
  if (firstYear === lastYear) return `${firstMonth}–${lastMonth} ${firstYear}`;
  return `${firstMonth} ${firstYear}–${lastMonth} ${lastYear}`;
}
