import { useMemo } from "react";
import type { IPO } from "@/lib/types";
import { overviewKpis, d1Histogram, fadeCurve, milestoneStats } from "@/lib/compute";
import { StatStrip } from "@/components/stat-strip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ReturnHistogram, FadeCurveChart } from "@/components/charts";
import { pct, pctAbs, idr, signClass } from "@/lib/format";

export default function Overview({ ipos }: { ipos: IPO[] }) {
  const k = useMemo(() => overviewKpis(ipos), [ipos]);
  const hist = useMemo(() => d1Histogram(ipos), [ipos]);
  const fade = useMemo(() => fadeCurve(ipos), [ipos]);
  const ms = useMemo(() => milestoneStats(ipos), [ipos]);

  const d1med = fade[0]?.median ?? null;
  const d7med = fade[6]?.median ?? null;
  const d7mean = fade[6]?.mean ?? null;

  return (
    <div className="space-y-4">
      <StatStrip
        items={[
          { label: "IPOs Listed", value: k.listed, sub: `${k.total} total · ${k.canceled} canceled` },
          { label: "Median D1", value: pct(k.medianD1), valueClass: "text-pos", sub: "typical first day" },
          { label: "Win Rate D1", value: pctAbs(k.pctGreenD1), sub: "closed up on day 1" },
          { label: "Capital Raised", value: idr(k.totalRaised), sub: "total proceeds, IDR" },
          { label: "Best D1", value: pct(k.bestPop?.value ?? null), valueClass: "text-pos", sub: k.bestPop?.ticker },
          { label: "Worst D1", value: pct(k.worstPop?.value ?? null), valueClass: "text-neg", sub: k.worstPop?.ticker },
        ]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Return milestones</CardTitle>
            <CardDescription>cumulative, held N days · n={ms[0]?.n}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="static">Hold</TableHead>
                  <TableHead>Median</TableHead>
                  <TableHead>Mean</TableHead>
                  <TableHead>Std Dev</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>% Up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ms.map((m) => (
                  <TableRow key={m.day}>
                    <TableCell className="font-medium text-foreground">{m.day}</TableCell>
                    <TableCell className={signClass(m.median)}>{pct(m.median)}</TableCell>
                    <TableCell className={signClass(m.mean)}>{pct(m.mean)}</TableCell>
                    <TableCell className="text-muted-foreground">{pctAbs(m.sd, 1)}</TableCell>
                    <TableCell className={signClass(m.min)}>{pct(m.min)}</TableCell>
                    <TableCell className={signClass(m.max)}>{pct(m.max)}</TableCell>
                    <TableCell className="text-muted-foreground">{pctAbs(m.pctPos)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>The 7-day fade</CardTitle>
            <CardDescription>median vs mean, cumulative</CardDescription>
          </CardHeader>
          <CardContent>
            <FadeCurveChart data={fade} />
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              Median holds near <span className="font-medium text-foreground">{pct(d1med)}</span> on D1 and eases to{" "}
              <span className="font-medium text-foreground">{pct(d7med)}</span> by D7, while the mean rises to{" "}
              <span className="font-medium text-foreground">{pct(d7mean)}</span>, lifted by a few large outliers.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Day-1 return distribution</CardTitle>
          <CardDescription>
            237 listings · blue marks the auto-reject (ARA) ceiling · best {k.bestPop?.ticker} {pct(k.bestPop?.value ?? null)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReturnHistogram data={hist} />
        </CardContent>
      </Card>
    </div>
  );
}
