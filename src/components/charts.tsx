import { useState, useEffect } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, ComposedChart,
  ScatterChart, Scatter, ZAxis, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, Legend,
} from "recharts";
import type { Bucket, FadePoint, SectorRow, YearRow, RoleRow, RegimeFadePoint, RegimeScatterPoint, RegimeDistBin } from "@/lib/compute";
import { sectorColor, brokerColor } from "@/lib/colors";
import { idr } from "@/lib/format";

// Chart colors are sourced from the live theme tokens so they adapt to light/dark.
// Structural axis text + grid lines are already token-driven via index.css; this covers
// the series/line/legend colors recharts needs as explicit values.
type ChartColors = { grid: string; blue: string; pos: string; neg: string; neutral: string; text: string };
function readChartColors(): ChartColors {
  if (typeof window === "undefined")
    return { grid: "hsl(208 9% 22%)", blue: "#3bbcb4", pos: "#3fc88a", neg: "#ef6a60", neutral: "#9aa3ab", text: "#e9ecef" };
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => `hsl(${s.getPropertyValue(n).trim()})`;
  return { grid: v("--border"), blue: v("--primary"), pos: v("--pos"), neg: v("--neg"), neutral: v("--muted-foreground"), text: v("--foreground") };
}
function useChartColors(): ChartColors {
  const [c, setC] = useState<ChartColors>(readChartColors);
  useEffect(() => {
    const obs = new MutationObserver(() => setC(readChartColors()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return c;
}
// Tracks a viewport breakpoint so charts can thin out labels on small screens.
function useMediaQuery(query: string): boolean {
  const [m, setM] = useState<boolean>(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    setM(mq.matches);
    return () => mq.removeEventListener("change", h);
  }, [query]);
  return m;
}

const kindColor = (c: ChartColors): Record<Bucket["kind"], string> => ({ neg: c.neg, flat: c.neutral, pos: c.pos, ara: c.blue });
const legendStyle = (c: ChartColors) => ({ fontSize: 13, color: c.neutral });

const pctTick = (v: number) => `${(v * 100).toFixed(0)}%`;
const pctVal = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`);

interface TPayload { name?: string; value?: number; color?: string; dataKey?: string | number; }
function Tip({
  active, payload, label, fmt,
}: { active?: boolean; payload?: TPayload[]; label?: string | number; fmt: (v: number | null) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-[11.5px] shadow-lg">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4 text-muted-foreground">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="tabnum font-medium text-foreground">{fmt(p.value ?? null)}</span>
        </div>
      ))}
    </div>
  );
}

export function ReturnHistogram({ data }: { data: Bucket[] }) {
  const c = useChartColors();
  const kc = kindColor(c);
  return (
    <ResponsiveContainer width="100%" height={270}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={34} />
        <Tooltip cursor={{ fill: "rgba(128,128,128,0.15)" }} content={<Tip fmt={(v) => `${v ?? 0} IPOs`} />} />
        <Bar dataKey="count" radius={[0, 0, 0, 0]} name="IPOs" isAnimationActive animationDuration={650} animationEasing="ease-out">
          {data.map((d, i) => (
            <Cell key={i} fill={kc[d.kind]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FadeCurveChart({ data }: { data: FadePoint[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={290}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -12, bottom: 2 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <ReferenceLine y={0} stroke={c.grid} />
        <Tooltip content={<Tip fmt={pctVal} />} />
        <Legend wrapperStyle={legendStyle(c)} />
        <Line type="monotone" dataKey="mean" name="Mean" stroke={c.blue} strokeWidth={1.75} strokeDasharray="5 4" dot={{ r: 2.5, fill: c.blue }} isAnimationActive animationDuration={650} animationEasing="ease-out" />
        <Line type="monotone" dataKey="median" name="Median" stroke={c.text} strokeWidth={2.5} dot={{ r: 3, fill: c.text }} isAnimationActive animationDuration={650} animationEasing="ease-out" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SectorBars({ data }: { data: SectorRow[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, left: 6, bottom: 2 }}>
        <CartesianGrid stroke={c.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={pctTick} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="sector" width={172} tickLine={false} axisLine={false} tick={{ fontSize: 12.5 }} />
        <Tooltip cursor={{ fill: "rgba(128,128,128,0.15)" }} content={<Tip fmt={pctVal} />} />
        <Bar dataKey="d1" name="Median D1" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={650} animationEasing="ease-out">
          {data.map((d, i) => (
            <Cell key={i} fill={sectorColor(d.sector)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function YoYChart({ data }: { data: YearRow[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={290}>
      <ComposedChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 2 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tickLine={false} axisLine={false} allowDecimals={false} width={34} />
        <YAxis yAxisId="r" orientation="right" tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          cursor={{ fill: "rgba(128,128,128,0.15)" }}
          content={<Tip fmt={(v) => (v === null ? "—" : Math.abs(v) < 5 ? pctVal(v) : `${v} IPOs`)} />}
        />
        <Legend wrapperStyle={legendStyle(c)} />
        <Bar yAxisId="l" dataKey="count" name="IPOs listed" radius={[0, 0, 0, 0]} fill={c.neutral} isAnimationActive animationDuration={650} animationEasing="ease-out" />
        <Line yAxisId="r" type="monotone" dataKey="d1" name="Median D1" stroke={c.blue} strokeWidth={2.5} dot={{ r: 3, fill: c.blue }} isAnimationActive animationDuration={650} animationEasing="ease-out" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function LeadMemberBars({ data }: { data: RoleRow[] }) {
  const c = useChartColors();
  const rows = data.map((r) => ({ code: r.code, leadMed: r.leadMed, memberMed: r.memberMed }));
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={rows} margin={{ top: 8, right: 6, left: -14, bottom: 2 }} barGap={2}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="code" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <Tooltip cursor={{ fill: "rgba(128,128,128,0.15)" }} content={<Tip fmt={pctVal} />} />
        <Legend wrapperStyle={legendStyle(c)} />
        <Bar dataKey="leadMed" name="As lead" radius={[0, 0, 0, 0]} fill={c.blue} isAnimationActive animationDuration={650} animationEasing="ease-out" />
        <Bar dataKey="memberMed" name="As member" radius={[0, 0, 0, 0]} fill={c.neutral} isAnimationActive animationDuration={650} animationEasing="ease-out" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProceedsBars({ data }: { data: Array<{ code: string; raised: number }> }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={Math.max(340, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 6, bottom: 2 }}>
        <CartesianGrid stroke={c.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => idr(v)} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="code" width={44} interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(128,128,128,0.15)" }} content={<Tip fmt={(v) => (v === null ? "—" : idr(v))} />} />
        <Bar dataKey="raised" name="Raised" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={650} animationEasing="ease-out">
          {data.map((d, i) => (
            <Cell key={i} fill={brokerColor(d.code)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ScatterTip({
  active, payload,
}: { active?: boolean; payload?: Array<{ payload?: { code: string; led: number; d1: number; raised: number } }> }) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-[11.5px] shadow-lg">
      <div className="mb-1 font-semibold text-foreground">{d.code}</div>
      <div className="flex justify-between gap-4 text-muted-foreground">
        <span>Deals led</span>
        <span className="tabnum font-medium text-foreground">{d.led}</span>
      </div>
      <div className="flex justify-between gap-4 text-muted-foreground">
        <span>Median D1</span>
        <span className="tabnum font-medium text-foreground">{pctVal(d.d1)}</span>
      </div>
      <div className="flex justify-between gap-4 text-muted-foreground">
        <span>Raised</span>
        <span className="tabnum font-medium text-foreground">{idr(d.raised)}</span>
      </div>
    </div>
  );
}

export function ActivityScatter({ data }: { data: Array<{ code: string; deals: number; d1: number | null; raised: number }> }) {
  const c = useChartColors();
  const pts = data
    .filter((r) => r.deals >= 3 && r.d1 !== null)
    .map((r) => ({ code: r.code, led: r.deals, d1: r.d1 as number, raised: r.raised, label: r.deals >= 6 ? r.code : "" }));
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ScatterChart margin={{ top: 12, right: 16, left: -6, bottom: 12 }}>
        <CartesianGrid stroke={c.grid} />
        <XAxis
          type="number"
          dataKey="led"
          name="Deals led"
          tickLine={false}
          axisLine={false}
          label={{ value: "deals", position: "insideBottom", offset: -4, fill: c.neutral, fontSize: 12 }}
        />
        <YAxis type="number" dataKey="d1" name="Median D1" tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <ZAxis type="number" dataKey="raised" range={[30, 300]} name="Raised" />
        <ReferenceLine y={0} stroke={c.grid} />
        <Tooltip cursor={{ strokeDasharray: "3 3", stroke: c.grid }} content={<ScatterTip />} />
        <Scatter data={pts} isAnimationActive animationDuration={650} animationEasing="ease-out">
          {pts.map((p, i) => (
            <Cell key={i} fill={brokerColor(p.code)} fillOpacity={0.6} stroke={brokerColor(p.code)} />
          ))}
          <LabelList dataKey="label" position="top" style={{ fill: c.text, fontSize: 11 }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// Median 7-day fade, choppy vs performing markets, on one axis for direct comparison.
export function RegimeFadeChart({ data }: { data: RegimeFadePoint[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={290}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -12, bottom: 2 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <ReferenceLine y={0} stroke={c.grid} />
        <Tooltip content={<Tip fmt={pctVal} />} />
        <Legend wrapperStyle={legendStyle(c)} />
        <Line type="monotone" dataKey="performing" name="Performing (JCI ≥ MA200)" stroke={c.pos} strokeWidth={2.25} dot={{ r: 2.5, fill: c.pos }} isAnimationActive animationDuration={650} animationEasing="ease-out" />
        <Line type="monotone" dataKey="choppy" name="Choppy (JCI < MA200)" stroke={c.neg} strokeWidth={2.5} dot={{ r: 3, fill: c.neg }} isAnimationActive animationDuration={650} animationEasing="ease-out" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Share of each regime cohort by D+7 outcome bucket — choppy (red) vs performing (green).
// Reads as a risk profile: which markets produce more tail outcomes vs steady gains.
function DistTip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: RegimeDistBin; name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const b = payload[0]?.payload;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-[11.5px] shadow-lg">
      <div className="mb-1 font-semibold text-foreground">D7 {label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4 text-muted-foreground">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="tabnum font-medium text-foreground">
            {((p.value ?? 0) * 100).toFixed(0)}%
            {b ? ` · ${p.name === "Choppy" ? b.choppyN : b.performingN}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RegimeDistChart({ data }: { data: RegimeDistBin[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 2 }} barGap={2}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis dataKey="bucket" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={pctTick} tickLine={false} axisLine={false} width={40} />
        <Tooltip cursor={{ fill: "rgba(128,128,128,0.15)" }} content={<DistTip />} />
        <Legend wrapperStyle={legendStyle(c)} />
        <Bar dataKey="performing" name="Performing" radius={[0, 0, 0, 0]} fill={c.pos} isAnimationActive animationDuration={650} animationEasing="ease-out" />
        <Bar dataKey="choppy" name="Choppy" radius={[0, 0, 0, 0]} fill={c.neg} isAnimationActive animationDuration={650} animationEasing="ease-out" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Three-way bucket on the D+7 cumulative return, matching the house palette/legend.
// Green/red tuned to the brand teal; amber kept warm to read on both cream and near-black.
export const CHOPPY_BUCKETS = { over: "#2eb87d", mid: "#e8a23a", neg: "#e85c50" } as const;
const d7Bucket = (v: number): keyof typeof CHOPPY_BUCKETS => (v > 0.5 ? "over" : v >= 0 ? "mid" : "neg");

type ChoppyPoint = RegimeScatterPoint & { x: number; label: string };

function ChoppyScatterTip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChoppyPoint }> }) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-[11.5px] shadow-lg">
      <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHOPPY_BUCKETS[d7Bucket(d.d7)] }} />
        {d.ticker}
        <span className="font-mono text-[10.5px] font-normal text-muted-foreground">{d.listingDate ?? "n/a"}</span>
      </div>
      <div className="flex justify-between gap-4 text-muted-foreground"><span>{d.sector}</span></div>
      <div className="flex justify-between gap-4 text-muted-foreground"><span>D7 return</span><span className="tabnum font-semibold text-foreground">{pctVal(d.d7)}</span></div>
      <div className="flex justify-between gap-4 text-muted-foreground"><span>D1 pop</span><span className="tabnum font-medium text-foreground">{pctVal(d.d1)}</span></div>
      <div className="flex justify-between gap-4 text-muted-foreground"><span>Raised</span><span className="tabnum font-medium text-foreground">{idr(d.raised)}</span></div>
    </div>
  );
}

// D+7 cumulative return per choppy-market deal. Deals run left→right in listing order (x is
// chronological rank, not a dated axis), y is the D7 return, color buckets at 0% and +50%, and
// the dashed line marks the cohort median. Winners (green) are labelled above their dot and
// losers (red) below theirs, so the spread-out extremes don't collide; the dense middle band is
// left to the hover tooltip. Labels thin out on mobile. Every dot is hoverable/tappable.
export function ChoppyScatter({ data, median }: { data: RegimeScatterPoint[]; median: number | null }) {
  const c = useChartColors();
  const mobile = useMediaQuery("(max-width: 640px)");
  // Chronological order; deals with no listing date (corrupt source cell) sort last as most-recent.
  const ordered = [...data].sort((a, b) => (a.listingDate ?? "9999").localeCompare(b.listingDate ?? "9999"));
  const byD7 = [...ordered].sort((a, b) => b.d7 - a.d7);
  // On phones the biggest winners cluster at the right edge and labels pile up, so drop inline
  // labels there entirely and rely on tap-to-show-tooltip (every deal is also in the table below).
  const topN = mobile ? 0 : 14;
  const botN = mobile ? 0 : 9;
  // Guard botN===0: slice(-0) is slice(0) and would flag every point, not none.
  const extremes = [...byD7.slice(0, topN), ...(botN ? byD7.slice(-botN) : [])];
  const flagged = new Set<string>(extremes.map((p) => p.ticker));
  const pts: ChoppyPoint[] = ordered.map((p, i) => ({
    ...p,
    x: i,
    label: flagged.has(p.ticker) ? `${p.ticker} ${pctTick(p.d7)}` : "",
  }));
  // Three series so winner labels sit above and loser labels below, in their own empty space.
  const winners = pts.filter((p) => p.d7 > 0.5);
  const mids = pts.filter((p) => p.d7 <= 0.5 && p.d7 >= 0);
  const losers = pts.filter((p) => p.d7 < 0);
  const ys = pts.map((p) => p.d7);
  const lo = Math.min(0, ...ys);
  const hi = Math.max(0, ...ys);
  const m = (hi - lo) * 0.1;
  const r = mobile ? 4 : 5;
  const labelStyle = { fontSize: mobile ? 8.5 : 9.5 } as const;
  return (
    <ResponsiveContainer width="100%" height={mobile ? 380 : 470}>
      <ScatterChart margin={{ top: 18, right: 14, left: -6, bottom: 8 }}>
        <CartesianGrid stroke={c.grid} vertical={false} />
        <XAxis
          type="number"
          dataKey="x"
          domain={[-1, pts.length]}
          tick={false}
          tickLine={false}
          axisLine={false}
          label={{ value: "earliest → most recent listing", position: "insideBottom", offset: 0, fill: c.neutral, fontSize: 11 }}
        />
        <YAxis type="number" dataKey="d7" name="D7 return" domain={[lo - m, hi + m]} tickFormatter={pctTick} tickLine={false} axisLine={false} width={46} />
        <ReferenceLine y={0} stroke={c.grid} />
        {median !== null && (
          <ReferenceLine
            y={median}
            stroke={c.blue}
            strokeDasharray="6 4"
            label={{ value: `median ${pctTick(median)}`, position: "insideTopLeft", fill: c.blue, fontSize: 11 }}
          />
        )}
        <Tooltip cursor={{ strokeDasharray: "3 3", stroke: c.grid }} content={<ChoppyScatterTip />} />
        <Scatter data={losers} fill={CHOPPY_BUCKETS.neg} shape="circle" isAnimationActive={false}>
          {losers.map((_, i) => <Cell key={i} r={r} fillOpacity={0.9} stroke="none" />)}
          <LabelList dataKey="label" position="bottom" offset={9} fill={c.text} style={labelStyle} />
        </Scatter>
        <Scatter data={mids} fill={CHOPPY_BUCKETS.mid} shape="circle" isAnimationActive={false}>
          {mids.map((_, i) => <Cell key={i} r={r} fillOpacity={0.9} stroke="none" />)}
        </Scatter>
        <Scatter data={winners} fill={CHOPPY_BUCKETS.over} shape="circle" isAnimationActive={false}>
          {winners.map((_, i) => <Cell key={i} r={r} fillOpacity={0.9} stroke="none" />)}
          <LabelList dataKey="label" position="top" offset={9} fill={c.text} style={labelStyle} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
