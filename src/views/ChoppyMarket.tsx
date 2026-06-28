import { useMemo } from "react";
import type { IPO } from "@/lib/types";
import { byRegime, milestoneStats, regimeFade, regimeScatter } from "@/lib/compute";
import { StatStrip } from "@/components/stat-strip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RegimeFadeChart, ChoppyScatter } from "@/components/charts";
import { sectorColor } from "@/lib/colors";
import { pct, pctAbs, idr } from "@/lib/format";
import { signClass } from "@/lib/format";

export default function ChoppyMarket({ ipos }: { ipos: IPO[] }) {
  const choppy = useMemo(() => byRegime(ipos, "choppy"), [ipos]);
  const performing = useMemo(() => byRegime(ipos, "performing"), [ipos]);
  const msC = useMemo(() => milestoneStats(choppy), [choppy]);
  const msP = useMemo(() => milestoneStats(performing), [performing]);
  const fade = useMemo(() => regimeFade(ipos), [ipos]);
  const scatter = useMemo(() => regimeScatter(ipos, "choppy"), [ipos]);

  // Milestone rows keyed by hold-day for the choppy-vs-performing comparison table.
  const rows = msC.map((c, i) => ({ day: c.day, c, p: msP[i] }));

  const d1C = msC[0]?.median ?? null;
  const d7C = msC[3]?.median ?? null;
  const d7P = msP[3]?.median ?? null;
  const winD7 = msC[3]?.pctPos ?? null;
  const raised = choppy.reduce((a, i) => a + (i.raised ?? 0), 0);

  // Sectors present, ordered by deal count, for the scatter legend.
  const legend = useMemo(() => {
    const n = new Map<string, number>();
    for (const p of scatter) n.set(p.sector, (n.get(p.sector) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([sector, count]) => ({ sector, count }));
  }, [scatter]);

  // Full choppy table, best D7 first.
  const table = useMemo(
    () => [...choppy].sort((a, b) => (b.cum[6] ?? -Infinity) - (a.cum[6] ?? -Infinity)),
    [choppy]
  );

  return (
    <div className="stagger space-y-4">
      <StatStrip
        items={[
          { label: "Choppy IPOs", value: choppy.length, sub: `JCI < MA200 at listing · ${choppy.length + performing.length} listed` },
          { label: "Median D1", value: pct(d1C), valueClass: signClass(d1C), sub: "first-day pop" },
          { label: "Median D7", value: pct(d7C), valueClass: signClass(d7C), sub: "held 7 days" },
          { label: "Win Rate D7", value: pctAbs(winD7), sub: "green after 7 days" },
          { label: "Performing D7", value: pct(d7P), valueClass: signClass(d7P), sub: "median, for contrast" },
          { label: "Capital Raised", value: idr(raised), sub: "choppy-tape proceeds" },
        ]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Choppy vs performing — the 7-day fade</CardTitle>
            <CardDescription>median cumulative · n={choppy.length} choppy / {performing.length} performing</CardDescription>
          </CardHeader>
          <CardContent>
            <RegimeFadeChart data={fade} />
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              In choppy tape the median deal pops <span className="font-medium text-foreground">{pct(d1C)}</span> on D1 and sits at{" "}
              <span className="font-medium text-foreground">{pct(d7C)}</span> by D7, versus{" "}
              <span className="font-medium text-foreground">{pct(d7P)}</span> for listings into a rising market —{" "}
              a {d7C !== null && d7P !== null ? <span className="font-medium text-foreground">{pctAbs(d7P - d7C, 1)}</span> : "—"} gap at the one-week mark.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Return milestones by regime</CardTitle>
            <CardDescription>median cumulative · % up</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="static">Hold</TableHead>
                  <TableHead>Choppy med</TableHead>
                  <TableHead>Choppy %up</TableHead>
                  <TableHead>Perform med</TableHead>
                  <TableHead>Perform %up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.day}>
                    <TableCell className="font-medium text-foreground">{r.day}</TableCell>
                    <TableCell className={signClass(r.c.median)}>{pct(r.c.median)}</TableCell>
                    <TableCell className="text-muted-foreground">{pctAbs(r.c.pctPos)}</TableCell>
                    <TableCell className={signClass(r.p.median)}>{pct(r.p.median)}</TableCell>
                    <TableCell className="text-muted-foreground">{pctAbs(r.p.pctPos)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Day-1 pop vs day-7 hold</CardTitle>
          <CardDescription>each bubble a choppy-tape deal · size = proceeds · above the zero line = still green at D7</CardDescription>
        </CardHeader>
        <CardContent>
          <ChoppyScatter data={scatter} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {legend.map((l) => (
              <span key={l.sector} className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ background: sectorColor(l.sector) }} />
                {l.sector} <span className="text-foreground">{l.count}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Every choppy-market listing</CardTitle>
          <CardDescription>{table.length} deals · best D7 first</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table containerClassName="max-h-[640px]">
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="static">Ticker</TableHead>
                <TableHead className="text-left">Sector</TableHead>
                <TableHead>Listed</TableHead>
                <TableHead>D1</TableHead>
                <TableHead>D3</TableHead>
                <TableHead>D5</TableHead>
                <TableHead>D7</TableHead>
                <TableHead>Raised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.map((i) => (
                <TableRow key={i.ticker}>
                  <TableCell className="font-medium text-foreground">{i.ticker}</TableCell>
                  <TableCell className="text-left">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: sectorColor(i.sector) }} />
                      <span className="truncate text-muted-foreground">{i.sector}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.listingDate ?? "—"}</TableCell>
                  <TableCell className={signClass(i.cum[0])}>{pct(i.cum[0])}</TableCell>
                  <TableCell className={signClass(i.cum[2])}>{pct(i.cum[2])}</TableCell>
                  <TableCell className={signClass(i.cum[4])}>{pct(i.cum[4])}</TableCell>
                  <TableCell className={signClass(i.cum[6])}>{pct(i.cum[6])}</TableCell>
                  <TableCell className="text-muted-foreground">{idr(i.raised)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
