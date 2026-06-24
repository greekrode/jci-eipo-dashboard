import { Fragment, useMemo, useState } from "react";
import type { IPO } from "@/lib/types";
import { brokerNames } from "@/lib/compute";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { pct, idrPrice, signClass } from "@/lib/format";
import { median } from "@/lib/stats";

interface Row {
  ticker: string;
  company: string;
  sector: string;
  leadCode: string;
  lead: string;
  members: string[];
  listed: boolean;
  finalPrice: number | null;
  d1: number | null;
  d3: number | null;
  d5: number | null;
  d7: number | null;
  year: number | null;
}
type Key = keyof Row;
type GroupBy = "none" | "lead" | "sector" | "year";

const COL_COUNT = 11;
const selectCls =
  "h-9 rounded-[2px] border border-input bg-secondary px-2 text-[14px] text-foreground focus-visible:border-primary focus-visible:outline-none";

export default function Explorer({ ipos }: { ipos: IPO[] }) {
  const names = useMemo(() => brokerNames(ipos), [ipos]);
  const base: Row[] = useMemo(
    () =>
      ipos.map((i) => ({
        ticker: i.ticker,
        company: i.company,
        sector: i.sector,
        leadCode: i.leadCode,
        lead: i.leadName,
        members: i.members,
        listed: i.listed,
        finalPrice: i.finalPrice,
        d1: i.cum[0],
        d3: i.cum[2],
        d5: i.cum[4],
        d7: i.cum[6],
        year: i.listingYear,
      })),
    [ipos]
  );
  const sectors = useMemo(() => [...new Set(ipos.map((i) => i.sector))].sort(), [ipos]);
  // every underwriter that appears as a lead OR a syndicate member, code · name, sorted by code
  const underwriters = useMemo(() => {
    const codes = new Set<string>();
    for (const r of base) { if (r.leadCode) codes.add(r.leadCode); for (const c of r.members) codes.add(c); }
    return [...codes].filter(Boolean).sort().map((c) => ({ code: c, name: names[c] ?? c }));
  }, [base, names]);

  const [q, setQ] = useState("");
  const [sec, setSec] = useState("all");
  const [uw, setUw] = useState("all");
  const [listedOnly, setListedOnly] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "d1", dir: -1 });

  const rows = useMemo(() => {
    let r = base.filter(
      (x) =>
        (!listedOnly || x.listed) &&
        (sec === "all" || x.sector === sec) &&
        (uw === "all" || x.leadCode === uw || x.members.includes(uw)) // lead or syndicate member
    );
    const s = q.trim().toLowerCase();
    if (s) r = r.filter((x) => x.ticker.toLowerCase().includes(s) || x.company.toLowerCase().includes(s));
    return r.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "string" || typeof bv === "string") {
        return String(av ?? "").localeCompare(String(bv ?? "")) * sort.dir;
      }
      const an = av === null || av === undefined ? -Infinity : (av as number);
      const bn = bv === null || bv === undefined ? -Infinity : (bv as number);
      return an < bn ? -sort.dir : an > bn ? sort.dir : 0;
    });
  }, [base, q, sec, uw, listedOnly, sort]);

  // median D1 of the visible set — handy when filtered to one underwriter (their listing-day track record)
  const medD1 = useMemo(
    () => (uw === "all" ? null : median(rows.map((r) => r.d1).filter((x): x is number => x !== null))),
    [rows, uw]
  );

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const keyOf = (r: Row) =>
      groupBy === "lead" ? `${r.leadCode} · ${r.lead}` : groupBy === "sector" ? r.sector : String(r.year ?? "—");
    const m = new Map<string, Row[]>();
    for (const r of rows) (m.get(keyOf(r)) ?? m.set(keyOf(r), []).get(keyOf(r))!).push(r);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rows, groupBy]);

  const legend = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      if (r.leadCode) m.set(r.leadCode, r.lead);
      for (const c of r.members) m.set(c, names[c] ?? c);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, names]);

  const sortable = (key: Key, label: string, cls = "") => (
    <TableHead
      onClick={() => setSort((p) => ({ key, dir: p.key === key ? ((-p.dir) as 1 | -1) : -1 }))}
      className={`cursor-pointer hover:text-foreground ${cls}`}
    >
      {label}
      {sort.key === key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
    </TableHead>
  );

  const renderRow = (r: Row) => (
    <TableRow key={r.ticker}>
      <TableCell className="font-medium text-foreground">
        {r.ticker}
        {!r.listed && (
          <Badge variant="outline" className="ml-1.5">
            n/l
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-[240px] truncate text-left text-muted-foreground">{r.company}</TableCell>
      <TableCell className="text-left text-muted-foreground">{r.sector}</TableCell>
      <TableCell className="text-left">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
              {r.leadCode}
            </span>
          </TooltipTrigger>
          <TooltipContent>{r.lead}</TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="max-w-[170px] text-left text-muted-foreground">
        {r.members.length === 0 ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block cursor-default truncate underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                {r.members.join(", ")}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px]">
              <div className="space-y-1">
                {r.members.map((c) => (
                  <div key={c}>
                    <span className="text-foreground">{c}</span>{" "}
                    <span className="text-muted-foreground">{names[c] ?? c}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell>{idrPrice(r.finalPrice)}</TableCell>
      <TableCell className={signClass(r.d1)}>{pct(r.d1)}</TableCell>
      <TableCell className={signClass(r.d3)}>{pct(r.d3)}</TableCell>
      <TableCell className={signClass(r.d5)}>{pct(r.d5)}</TableCell>
      <TableCell className={signClass(r.d7)}>{pct(r.d7)}</TableCell>
      <TableCell className="text-muted-foreground">{r.year ?? "—"}</TableCell>
    </TableRow>
  );

  const groupHeader = (label: string, grp: Row[]) => {
    const med = median(grp.map((r) => r.d1).filter((x): x is number => x !== null));
    return (
      <TableRow key={`g-${label}`} className="bg-secondary/70 hover:bg-secondary/70">
        <TableCell colSpan={COL_COUNT} className="text-left">
          <span className="font-semibold text-foreground">{label}</span>
          <span className="ml-2 text-muted-foreground">
            {grp.length} {grp.length === 1 ? "deal" : "deals"} · median D1{" "}
          </span>
          <span className={signClass(med)}>{pct(med)}</span>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <TooltipProvider delayDuration={120}>
      <Card>
        <CardHeader>
          <CardTitle>IPO explorer</CardTitle>
          <CardDescription>all 246 deals · D1–D7 cumulative · filter or group by underwriter · hover a code for the broker name</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-4 py-3.5">
            <Input
              placeholder="Search ticker or company"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-60"
            />
            <select value={sec} onChange={(e) => setSec(e.target.value)} className={selectCls}>
              <option value="all">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select value={uw} onChange={(e) => setUw(e.target.value)} className={`${selectCls} max-w-[230px]`} title="Filter by underwriter (lead or syndicate member)">
              <option value="all">All underwriters</option>
              {underwriters.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code} · {u.name}
                </option>
              ))}
            </select>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className={selectCls}>
              <option value="none">No grouping</option>
              <option value="lead">Group by lead</option>
              <option value="sector">Group by sector</option>
              <option value="year">Group by year</option>
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] uppercase tracking-wider text-muted-foreground">
              <input type="checkbox" checked={listedOnly} onChange={(e) => setListedOnly(e.target.checked)} className="accent-primary" />
              Listed only
            </label>
            <span className="tabnum ml-auto text-[12.5px] text-muted-foreground">
              {rows.length} deals
              {uw !== "all" && medD1 !== null && (
                <>
                  {" · median D1 "}
                  <span className={signClass(medD1)}>{pct(medD1)}</span>
                </>
              )}
              {groups ? ` · ${groups.length} groups` : ""}
            </span>
          </div>

          <Table containerClassName="max-h-[640px]">
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
              <TableRow>
                {sortable("ticker", "Ticker", "static")}
                {sortable("company", "Company", "text-left")}
                {sortable("sector", "Sector", "text-left")}
                {sortable("leadCode", "Lead", "text-left")}
                <TableHead className="static text-left">Members</TableHead>
                {sortable("finalPrice", "Offer")}
                {sortable("d1", "D1")}
                {sortable("d3", "D3")}
                {sortable("d5", "D5")}
                {sortable("d7", "D7")}
                {sortable("year", "Year")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups
                ? groups.map(([label, grp]) => (
                    <Fragment key={label}>
                      {groupHeader(label, grp)}
                      {grp.map(renderRow)}
                    </Fragment>
                  ))
                : rows.map(renderRow)}
            </TableBody>
          </Table>

          <div className="border-t border-border px-4 py-3.5">
            <div className="mb-2 text-[11.5px] uppercase tracking-wider text-muted-foreground">
              Underwriter codes ({legend.length})
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[12.5px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {legend.map(([code, name]) => (
                <div key={code} className="truncate">
                  <span className="text-foreground">{code}</span> <span className="text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
