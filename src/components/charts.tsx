import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, ComposedChart,
  ScatterChart, Scatter, ZAxis, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, Legend,
} from "recharts";
import type { Bucket, FadePoint, SectorRow, YearRow, RoleRow } from "@/lib/compute";
import { sectorColor, brokerColor } from "@/lib/colors";
import { idr } from "@/lib/format";

const C = {
  grid: "hsl(240 4% 24%)",
  blue: "#3d75ff",
  pos: "#38c98a",
  neg: "#ef5b54",
  neutral: "#8b93a8",
  text: "#e8e8ea",
};

const pctTick = (v: number) => `${(v * 100).toFixed(0)}%`;
const pctVal = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`);

interface TPayload { name?: string; value?: number; color?: string; dataKey?: string | number; }
function Tip({
  active, payload, label, fmt,
}: { active?: boolean; payload?: TPayload[]; label?: string | number; fmt: (v: number | null) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-secondary px-2.5 py-2 text-[11.5px] shadow-lg">
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

const KIND_COLOR: Record<Bucket["kind"], string> = { neg: C.neg, flat: C.neutral, pos: C.pos, ara: C.blue };

export function ReturnHistogram({ data }: { data: Bucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={236}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={34} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<Tip fmt={(v) => `${v ?? 0} IPOs`} />} />
        <Bar dataKey="count" radius={[0, 0, 0, 0]} name="IPOs" isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={KIND_COLOR[d.kind]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FadeCurveChart({ data }: { data: FadePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -12, bottom: 2 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <ReferenceLine y={0} stroke={C.grid} />
        <Tooltip content={<Tip fmt={pctVal} />} />
        <Legend wrapperStyle={{ fontSize: 11.5, color: "#aab2c5" }} />
        <Line type="monotone" dataKey="mean" name="Mean" stroke={C.blue} strokeWidth={1.75} strokeDasharray="5 4" dot={{ r: 2.5, fill: C.blue }} isAnimationActive={false} />
        <Line type="monotone" dataKey="median" name="Median" stroke={C.text} strokeWidth={2.5} dot={{ r: 3, fill: C.text }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SectorBars({ data }: { data: SectorRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 20, left: 6, bottom: 2 }}>
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={pctTick} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="sector" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<Tip fmt={pctVal} />} />
        <Bar dataKey="d1" name="Median D1" radius={[0, 0, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={sectorColor(d.sector)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function YoYChart({ data }: { data: YearRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 8, right: 6, left: 6, bottom: 2 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="year" tickLine={false} axisLine={false} />
        <YAxis yAxisId="l" tickLine={false} axisLine={false} allowDecimals={false} width={34} />
        <YAxis yAxisId="r" orientation="right" tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={<Tip fmt={(v) => (v === null ? "—" : Math.abs(v) < 5 ? pctVal(v) : `${v} IPOs`)} />}
        />
        <Legend wrapperStyle={{ fontSize: 11.5, color: "#aab2c5" }} />
        <Bar yAxisId="l" dataKey="count" name="IPOs listed" radius={[0, 0, 0, 0]} fill={C.neutral} isAnimationActive={false} />
        <Line yAxisId="r" type="monotone" dataKey="d1" name="Median D1" stroke={C.blue} strokeWidth={2.5} dot={{ r: 3, fill: C.blue }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function LeadMemberBars({ data }: { data: RoleRow[] }) {
  const rows = data.map((r) => ({ code: r.code, leadMed: r.leadMed, memberMed: r.memberMed }));
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={rows} margin={{ top: 8, right: 6, left: -14, bottom: 2 }} barGap={2}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="code" tickLine={false} axisLine={false} />
        <YAxis tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<Tip fmt={pctVal} />} />
        <Legend wrapperStyle={{ fontSize: 11.5, color: "#aab2c5" }} />
        <Bar dataKey="leadMed" name="As lead" radius={[0, 0, 0, 0]} fill={C.blue} isAnimationActive={false} />
        <Bar dataKey="memberMed" name="As member" radius={[0, 0, 0, 0]} fill={C.neutral} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProceedsBars({ data }: { data: Array<{ code: string; raised: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 6, bottom: 2 }}>
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => idr(v)} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="code" width={44} interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<Tip fmt={(v) => (v === null ? "—" : idr(v))} />} />
        <Bar dataKey="raised" name="Raised" radius={[0, 0, 0, 0]} isAnimationActive={false}>
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
    <div className="rounded-md border border-border bg-secondary px-2.5 py-2 text-[11.5px] shadow-lg">
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
  const pts = data
    .filter((r) => r.deals >= 3 && r.d1 !== null)
    .map((r) => ({ code: r.code, led: r.deals, d1: r.d1 as number, raised: r.raised, label: r.deals >= 6 ? r.code : "" }));
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart margin={{ top: 12, right: 16, left: -6, bottom: 12 }}>
        <CartesianGrid stroke={C.grid} />
        <XAxis
          type="number"
          dataKey="led"
          name="Deals led"
          tickLine={false}
          axisLine={false}
          label={{ value: "deals", position: "insideBottom", offset: -4, fill: "#aab2c5", fontSize: 10 }}
        />
        <YAxis type="number" dataKey="d1" name="Median D1" tickFormatter={pctTick} tickLine={false} axisLine={false} width={42} />
        <ZAxis type="number" dataKey="raised" range={[30, 300]} name="Raised" />
        <ReferenceLine y={0} stroke={C.grid} />
        <Tooltip cursor={{ strokeDasharray: "3 3", stroke: C.grid }} content={<ScatterTip />} />
        <Scatter data={pts} isAnimationActive={false}>
          {pts.map((p, i) => (
            <Cell key={i} fill={brokerColor(p.code)} fillOpacity={0.6} stroke={brokerColor(p.code)} />
          ))}
          <LabelList dataKey="label" position="top" style={{ fill: "#c5cbdc", fontSize: 9 }} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
