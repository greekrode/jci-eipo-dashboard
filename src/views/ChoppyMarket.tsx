import { useMemo } from "react";
import type { IPO } from "@/lib/types";
import { byRegime, milestoneStats, regimeD7Distribution, regimeFade, regimeScatter, sectorAgg } from "@/lib/compute";
import { StatStrip } from "@/components/stat-strip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RegimeFadeChart, RegimeDistChart, ChoppyScatter, CHOPPY_BUCKETS } from "@/components/charts";
import { sectorColor } from "@/lib/colors";
import { pct, pctAbs, idr, signClass } from "@/lib/format";

export default function ChoppyMarket({ ipos }: { ipos: IPO[] }) {
  const choppy = useMemo(() => byRegime(ipos, "choppy"), [ipos]);
  const performing = useMemo(() => byRegime(ipos, "performing"), [ipos]);
  const msC = useMemo(() => milestoneStats(choppy), [choppy]);
  const msP = useMemo(() => milestoneStats(performing), [performing]);
  const fade = useMemo(() => regimeFade(ipos), [ipos]);
  const scatter = useMemo(() => regimeScatter(ipos, "choppy"), [ipos]);
  const dist = useMemo(() => regimeD7Distribution(ipos), [ipos]);

  // Tail vs middle shares, for the distribution caption.
  const choppyLossBig = dist[0]?.choppy ?? null; // ≤ −25%
  const performLossBig = dist[0]?.performing ?? null;
  const choppyDouble = (dist[5]?.choppy ?? 0) + (dist[6]?.choppy ?? 0); // ≥ 100%
  const performDouble = (dist[5]?.performing ?? 0) + (dist[6]?.performing ?? 0);

  // Milestone rows keyed by hold-day for the choppy-vs-performing comparison table.
  const rows = msC.map((c, i) => ({ day: c.day, c, p: msP[i] }));

  const d1C = msC[0]?.median ?? null;
  const d7C = msC[3]?.median ?? null;
  const d7P = msP[3]?.median ?? null;
  const winD7 = msC[3]?.pctPos ?? null;

  // Best / worst single deal by D7, for the KPI strip.
  const rankedD7 = useMemo(
    () => choppy.filter((i) => i.cum[6] !== null).sort((a, b) => (b.cum[6] as number) - (a.cum[6] as number)),
    [choppy]
  );
  const best = rankedD7[0] ?? null;
  const worst = rankedD7[rankedD7.length - 1] ?? null;

  // Per-sector medians within the choppy cohort, strongest D7 first.
  const sectors = useMemo(
    () => sectorAgg(choppy).sort((a, b) => (b.d7 ?? -Infinity) - (a.d7 ?? -Infinity)),
    [choppy]
  );

  // D7-return buckets for the scatter legend, matching the chart palette.
  const buckets = useMemo(() => {
    let over = 0, mid = 0, neg = 0;
    for (const p of scatter) (p.d7 > 0.5 ? (over++) : p.d7 >= 0 ? (mid++) : (neg++));
    return [
      { key: "over", label: "Over +50%", color: CHOPPY_BUCKETS.over, count: over },
      { key: "mid", label: "0% to +50%", color: CHOPPY_BUCKETS.mid, count: mid },
      { key: "neg", label: "Below 0%", color: CHOPPY_BUCKETS.neg, count: neg },
    ];
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
          { label: "Best D7", value: pct(best?.cum[6] ?? null), valueClass: "text-pos", sub: best?.ticker },
          { label: "Worst D7", value: pct(worst?.cum[6] ?? null), valueClass: "text-neg", sub: worst?.ticker },
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
          <CardTitle>D+7 return, every choppy-market deal</CardTitle>
          <CardDescription>listed earliest → most recent · dashed line: cohort median {pct(d7C)} · hover or tap a dot for detail</CardDescription>
        </CardHeader>
        <CardContent>
          <ChoppyScatter data={scatter} median={d7C} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {buckets.map((b) => (
              <span key={b.key} className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                {b.label} <span className="text-foreground">{b.count}</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outcome distribution by regime</CardTitle>
            <CardDescription>share of each cohort by D7 return · choppy vs performing</CardDescription>
          </CardHeader>
          <CardContent>
            <RegimeDistChart data={dist} />
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Choppy markets are more polarized: <span className="font-medium text-foreground">{pctAbs(choppyLossBig)}</span> of deals
              fell 25%+ by D7 (vs <span className="font-medium text-foreground">{pctAbs(performLossBig)}</span> in a rising market) and{" "}
              <span className="font-medium text-foreground">{pctAbs(choppyDouble)}</span> more than doubled (vs{" "}
              <span className="font-medium text-foreground">{pctAbs(performDouble)}</span>) — fewer land in the safe middle.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By sector — choppy tape</CardTitle>
            <CardDescription>median cumulative · strongest D7 first · n per sector</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="static">Sector</TableHead>
                  <TableHead>n</TableHead>
                  <TableHead>Med D1</TableHead>
                  <TableHead>Med D3</TableHead>
                  <TableHead>Med D5</TableHead>
                  <TableHead>Med D7</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((s) => (
                  <TableRow key={s.sector}>
                    <TableCell className="text-left">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: sectorColor(s.sector) }} />
                        <span className="text-foreground">{s.sector}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.count}</TableCell>
                    <TableCell className={signClass(s.d1)}>{pct(s.d1)}</TableCell>
                    <TableCell className={signClass(s.d3)}>{pct(s.d3)}</TableCell>
                    <TableCell className={signClass(s.d5)}>{pct(s.d5)}</TableCell>
                    <TableCell className={signClass(s.d7)}>{pct(s.d7)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
