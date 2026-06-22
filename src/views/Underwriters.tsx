import { useMemo, useState } from "react";
import type { IPO } from "@/lib/types";
import { leadVsMember, soloVsSyndicated, participationTable, type PartRow, type PartRoleStat } from "@/lib/compute";
import { StatStrip } from "@/components/stat-strip";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LeadMemberBars, ProceedsBars, ActivityScatter } from "@/components/charts";
import { pct, pctAbs, idr, signClass } from "@/lib/format";
import { brokerColor } from "@/lib/colors";
import { cn } from "@/lib/utils";

type Role = "all" | "lead" | "member";
type SortKey = "led" | "member" | "raised" | "d1" | "d3" | "d5" | "d7" | "pctGreen";

const roleVal = (s: PartRoleStat, key: SortKey): number => {
  switch (key) {
    case "raised": return s.raised;
    case "pctGreen": return s.pctGreen ?? -Infinity;
    case "d1": return s.d1 ?? -Infinity;
    case "d3": return s.d3 ?? -Infinity;
    case "d5": return s.d5 ?? -Infinity;
    case "d7": return s.d7 ?? -Infinity;
    default: return -Infinity;
  }
};

const ACTIVE_WORD: Record<Role, string> = { all: "Underwriters", lead: "Leads", member: "Members" };
const PROCEEDS_DESC: Record<Role, string> = {
  all: "top 12 by proceeds of deals participated in",
  lead: "top 12 by total IPO proceeds led (IDR)",
  member: "top 12 by proceeds of deals co-underwritten",
};

export default function Underwriters({ ipos }: { ipos: IPO[] }) {
  const part = useMemo(() => participationTable(ipos), [ipos]);
  const roles = useMemo(() => leadVsMember(ipos), [ipos]);
  const ss = useMemo(() => soloVsSyndicated(ipos), [ipos]);

  const [role, setRole] = useState<Role>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "led", dir: -1 });

  const pickRole = (r: Role) => {
    setRole(r);
    setSort({ key: r === "member" ? "member" : "led", dir: -1 });
  };

  // Role-scoped derivations for the stat strip and the two role-aware charts.
  const { stats, proceeds, scatter } = useMemo(() => {
    const active = part.filter((p) => p[role].n > 0);
    const byDeals = [...active].sort((a, b) => b[role].n - a[role].n);
    const byRaised = [...active].sort((a, b) => b[role].raised - a[role].raised);
    const totalPart = active.reduce((a, p) => a + p[role].n, 0);
    const top5 = byDeals.slice(0, 5).reduce((a, p) => a + p[role].n, 0);
    return {
      stats: [
        { label: `Active ${ACTIVE_WORD[role]}`, value: active.length, sub: "distinct brokers" },
        { label: "Most Active", value: byDeals[0]?.[role].n ?? "—", sub: byDeals[0]?.name },
        { label: "Top by Proceeds", value: idr(byRaised[0]?.[role].raised ?? null), sub: byRaised[0]?.name },
        { label: "Top-5 Share", value: pctAbs(totalPart ? top5 / totalPart : null), sub: "of role participations" },
      ],
      proceeds: byRaised.slice(0, 12).map((p) => ({ code: p.code, raised: p[role].raised })),
      scatter: active.map((p) => ({ code: p.code, deals: p[role].n, d1: p[role].d1, raised: p[role].raised })),
    };
  }, [part, role]);

  const val = (r: PartRow, key: SortKey): number =>
    key === "led" ? r.ledCount : key === "member" ? r.memberCount : roleVal(r[role], key);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let r = part.filter((p) => p[role].n > 0);
    if (q) r = r.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    return [...r].sort((a, b) => {
      const av = val(a, sort.key);
      const bv = val(b, sort.key);
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, role, search, sort]);

  const sortable = (key: SortKey, label: string) => (
    <TableHead
      onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : -1 }))}
      className="cursor-pointer hover:text-foreground"
    >
      {label}
      {sort.key === key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Global role control: drives the stat strip, capital-raised chart, scatter, and league table. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">View underwriters as</div>
        <div className="inline-flex overflow-hidden rounded-[2px] border border-border">
          {(["all", "lead", "member"] as const).map((r) => (
            <button
              key={r}
              onClick={() => pickRole(r)}
              className={cn(
                "border-r border-border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors last:border-r-0 hover:text-foreground",
                role === r ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <StatStrip items={stats} cols={4} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Capital raised</CardTitle>
            <CardDescription>{PROCEEDS_DESC[role]}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProceedsBars data={proceeds} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity vs performance</CardTitle>
            <CardDescription>deals vs median D1 · bubble = capital raised · brokers with 3+ deals</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityScatter data={scatter} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Underwriter league table</CardTitle>
          <CardDescription>metrics reflect the selected role · Led + Member counts always shown</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <Input
              placeholder="Search underwriter name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <span className="tabnum ml-auto font-mono text-[11px] text-muted-foreground">{rows.length} underwriters</span>
          </div>

          <Table containerClassName="max-h-[480px]">
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
              <TableRow>
                <TableHead className="static">Underwriter</TableHead>
                {sortable("led", "Led")}
                {sortable("member", "Member")}
                {sortable("raised", "Raised")}
                {sortable("d1", "D1")}
                {sortable("d3", "D3")}
                {sortable("d5", "D5")}
                {sortable("d7", "D7")}
                {sortable("pctGreen", "% Up")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const s = r[role];
                return (
                  <TableRow key={r.code}>
                    <TableCell className="text-foreground">
                      <span
                        className="mr-2 inline-block h-2.5 w-2.5 align-[-1px]"
                        style={{ background: brokerColor(r.code) }}
                      />
                      <span className="font-medium">{r.name}</span> <span className="text-muted-foreground">{r.code}</span>
                      {s.n < 3 && (
                        <Badge variant="outline" className="ml-2">
                          low n
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={r.ledCount ? "" : "text-muted-foreground"}>{r.ledCount}</TableCell>
                    <TableCell className={r.memberCount ? "" : "text-muted-foreground"}>{r.memberCount}</TableCell>
                    <TableCell className="text-foreground">{idr(s.raised)}</TableCell>
                    <TableCell className={signClass(s.d1)}>{pct(s.d1)}</TableCell>
                    <TableCell className={signClass(s.d3)}>{pct(s.d3)}</TableCell>
                    <TableCell className={signClass(s.d5)}>{pct(s.d5)}</TableCell>
                    <TableCell className={signClass(s.d7)}>{pct(s.d7)}</TableCell>
                    <TableCell className="text-muted-foreground">{pctAbs(s.pctGreen)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role-independent reference: lead-vs-member comparison and deal structure. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead vs syndicate-member pop</CardTitle>
            <CardDescription>same broker, day-1 median, both roles</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadMemberBars data={roles} />
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Brokers active in both roles tend to show a larger day-1 pop when they lead the book than when they join as a
              member.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solo vs syndicated deals</CardTitle>
            <CardDescription>by deal structure · median cumulative return</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="static">Structure</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>D1</TableHead>
                  <TableHead>D3</TableHead>
                  <TableHead>D5</TableHead>
                  <TableHead>D7</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-foreground">Solo (1 underwriter)</TableCell>
                  <TableCell>{ss.solo.n}</TableCell>
                  <TableCell className={signClass(ss.solo.d1)}>{pct(ss.solo.d1)}</TableCell>
                  <TableCell className={signClass(ss.solo.d3)}>{pct(ss.solo.d3)}</TableCell>
                  <TableCell className={signClass(ss.solo.d5)}>{pct(ss.solo.d5)}</TableCell>
                  <TableCell className={signClass(ss.solo.d7)}>{pct(ss.solo.d7)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Syndicated (2+)</TableCell>
                  <TableCell>{ss.synd.n}</TableCell>
                  <TableCell className={signClass(ss.synd.d1)}>{pct(ss.synd.d1)}</TableCell>
                  <TableCell className={signClass(ss.synd.d3)}>{pct(ss.synd.d3)}</TableCell>
                  <TableCell className={signClass(ss.synd.d5)}>{pct(ss.synd.d5)}</TableCell>
                  <TableCell className={signClass(ss.synd.d7)}>{pct(ss.synd.d7)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
