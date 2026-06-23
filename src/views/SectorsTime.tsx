import { useMemo } from "react";
import type { IPO } from "@/lib/types";
import { sectorAgg, yearAgg } from "@/lib/compute";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SectorBars, YoYChart } from "@/components/charts";
import { sectorColor } from "@/lib/colors";
import { pct, signClass } from "@/lib/format";

export default function SectorsTime({ ipos }: { ipos: IPO[] }) {
  const sectors = useMemo(() => sectorAgg(ipos), [ipos]);
  const years = useMemo(() => yearAgg(ipos), [ipos]);
  const hot = sectors[0];
  const cold = sectors[sectors.length - 1];

  return (
    <div className="stagger space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Day-1 pop by sector</CardTitle>
            <CardDescription>median first-day return, colored by sector</CardDescription>
          </CardHeader>
          <CardContent>
            <SectorBars data={sectors} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market temperature by year</CardTitle>
            <CardDescription>bars: IPOs listed · line: median D1</CardDescription>
          </CardHeader>
          <CardContent>
            <YoYChart data={years} />
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sector detail</CardTitle>
            <CardDescription>
              median cumulative return at each hold · hottest {hot?.sector}, coldest {cold?.sector}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="static">Sector</TableHead>
                  <TableHead>IPOs</TableHead>
                  <TableHead>D1</TableHead>
                  <TableHead>D3</TableHead>
                  <TableHead>D5</TableHead>
                  <TableHead>D7</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectors.map((s) => (
                  <TableRow key={s.sector}>
                    <TableCell className="text-foreground">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 align-[-1px]"
                        style={{ background: sectorColor(s.sector) }}
                      />
                      {s.sector}
                    </TableCell>
                    <TableCell>{s.count}</TableCell>
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

        <Card>
          <CardHeader>
            <CardTitle>By year</CardTitle>
            <CardDescription>median cumulative return at each hold</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="static">Year</TableHead>
                  <TableHead>IPOs</TableHead>
                  <TableHead>D1</TableHead>
                  <TableHead>D3</TableHead>
                  <TableHead>D5</TableHead>
                  <TableHead>D7</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.year}>
                    <TableCell className="text-foreground">{y.year}</TableCell>
                    <TableCell>{y.count}</TableCell>
                    <TableCell className={signClass(y.d1)}>{pct(y.d1)}</TableCell>
                    <TableCell className={signClass(y.d3)}>{pct(y.d3)}</TableCell>
                    <TableCell className={signClass(y.d5)}>{pct(y.d5)}</TableCell>
                    <TableCell className={signClass(y.d7)}>{pct(y.d7)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
