import { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend } from "recharts";
import type { UpcomingIPO } from "@/lib/upcoming-types";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatStrip } from "@/components/stat-strip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { sectorColor } from "@/lib/colors";
import { idr, idrBn, idrPrice, pctN, pctNSigned, intFmt, signClass } from "@/lib/format";
import { fmtDate, priceRange, lockBadge, sevVariant, strengthVariant, proceedsTone, Disclaimer, TagChip, orderTags, exposureMeta } from "@/views/upcoming/shared";

const fx = (x: number | null, d = 1) => (x == null ? "—" : x.toFixed(d));
const normKey = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "").slice(0, 18);
/** Compact axis tick from an IDR-billions value: 1.8T / 900B / 0 (no "Rp", fits a narrow gutter). */
const axisBn = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1000) return `${(v / 1000).toFixed(1)}T`;
  if (a >= 1) return `${Math.round(v)}B`;
  return "0";
};

export default function Detail({
  ipo, all, onBack, onSelect,
}: { ipo: UpcomingIPO; all: UpcomingIPO[]; onBack: () => void; onSelect: (t: string) => void }) {
  const f = ipo.financials;
  const kpis = [
    { label: "Offer price", value: priceRange(ipo.offering.priceLow, ipo.offering.priceHigh), sub: `par ${idrPrice(ipo.offering.par)}` },
    { label: "Gross raise", value: idrRange(ipo.offering.grossLow, ipo.offering.grossHigh), sub: ipo.issueType ?? "" },
    { label: "Free float", value: pctN(ipo.freeFloat), sub: `${intFmt(ipo.offering.sharesOffered)} shares` },
    { label: "Post-IPO cap", value: idrRange(ipo.valuation.mcapLow, ipo.valuation.mcapHigh), sub: `lists ${fmtDate(ipo.listingISO, false)}` },
    { label: "Trailing P/E", value: `${fx(ipo.valuation.peLow)}–${fx(ipo.valuation.peHigh)}×`, sub: `P/BV ${fx(ipo.valuation.pbLow)}–${fx(ipo.valuation.pbHigh)}×` },
    { label: "DER FY25", value: `${fx(f.totalLiabilities[2] && f.totalEquity[2] ? ipo.metrics.der[2] : null)}×`, sub: ipo.metrics.derPost != null ? `→ ${fx(ipo.metrics.derPost)}× post-IPO` : "" },
  ];

  return (
    <TooltipProvider delayDuration={120}>
      <div key={ipo.ticker} className="anim-fade space-y-4">
        {/* nav — sticky so the ticker switcher / back stay reachable on long pages */}
        <div className="sticky top-0 z-20 -mx-3 flex flex-wrap items-center gap-2 border-b border-transparent bg-background/90 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <button
            onClick={onBack}
            className="rounded-[2px] border border-border bg-secondary px-2.5 py-1 font-mono text-[12px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            ← Compare
          </button>
          <div className="ml-1 flex flex-wrap gap-1.5">
            {all.map((o) => (
              <button
                key={o.ticker}
                onClick={() => onSelect(o.ticker)}
                aria-current={o.ticker === ipo.ticker ? "true" : undefined}
                className={`rounded-[2px] border px-2 py-1 font-mono text-[12px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                  o.ticker === ipo.ticker
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {o.ticker}
              </button>
            ))}
          </div>
        </div>

        {/* header */}
        <Card>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="h-4 w-4" style={{ background: sectorColor(ipo.sectorGroup) }} aria-hidden />
                  <h2 className="text-[22px] font-semibold tracking-tight text-foreground">{ipo.ticker}</h2>
                  <Badge variant="outline">{ipo.sectorGroup}</Badge>
                  {lockBadge(ipo.lockup.strength)}
                </div>
                <div className="mt-1 text-[14px] text-foreground">{ipo.legalName}{ipo.brand && ipo.brand !== ipo.legalName ? ` · ${ipo.brand}` : ""}</div>
                <div className="mt-0.5 font-mono text-[12px] text-muted-foreground">{ipo.sector}</div>
              </div>
              <div className="text-left font-mono text-[12px] text-muted-foreground sm:text-right">
                <div><span className="text-muted-foreground">Lists</span> <span className="text-foreground">{fmtDate(ipo.listingISO, false)}</span></div>
                <div className="mt-0.5 max-w-[260px]"><span className="text-muted-foreground">Lead</span> {ipo.underwriter ?? "—"}</div>
                {ipo.underwriterJoint && <div className="max-w-[260px]"><span className="text-muted-foreground">Joint</span> {ipo.underwriterJoint}</div>}
              </div>
            </div>
            {ipo.valuation.verdict && (
              <div className="rounded-[2px] border border-border bg-secondary/40 px-3 py-2.5 text-[13px] leading-relaxed text-foreground">
                <span className="mr-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-primary">Verdict</span>
                {ipo.valuation.verdict}
              </div>
            )}
          </CardContent>
        </Card>

        <StatStrip items={kpis} cols={6} />

        {/* panels — masonry so uneven card heights pack tightly; staggered entrance */}
        <div className="stagger columns-1 gap-x-4 [&>*]:mb-4 [&>*]:break-inside-avoid lg:columns-2">
          <BusinessModel ipo={ipo} />
          <Ownership ipo={ipo} />
          <Proceeds ipo={ipo} />
          <Financials ipo={ipo} />
          <ValuationPanel ipo={ipo} />
          <RedFlags ipo={ipo} />
          <GreenFlags ipo={ipo} />
          <Qualitative ipo={ipo} />
        </div>

        {/* full narrative */}
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between border-b border-border px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-baseline gap-2">
                <span className="self-center font-mono text-[9px] text-muted-foreground transition-transform duration-150 group-open:rotate-90" aria-hidden>▶</span>
                <span className="text-[15px] font-semibold tracking-tight text-foreground">Full forensic writeup</span>
              </span>
              <span className="font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground">click to expand</span>
            </summary>
            <CardContent>
              {/* full-width card → columns sized to a readable ~65ch measure (1 col on mobile,
                  more as width allows), each whole section kept together */}
              <div className="md gap-x-10 lg:columns-[33rem]">
                {(ipo.forensicMd ?? ipo.narrativeMd).split(/\n(?=## )/).map((sec, i) => (
                  <div key={i} className="mb-5 break-inside-avoid">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </CardContent>
          </details>
        </Card>

        <Disclaimer />
      </div>
    </TooltipProvider>
  );
}

// ── panels ──────────────────────────────────────────────────────────────────
function Panel({ title, note, children, defaultOpen = true }: { title: string; note?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <Card>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-baseline gap-2">
            <span className="self-center font-mono text-[9px] text-muted-foreground transition-transform duration-150 group-open:rotate-90" aria-hidden>▶</span>
            <CardTitle>{title}</CardTitle>
          </span>
          {note && <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{note}</span>}
        </summary>
        <CardContent className="p-0">{children}</CardContent>
      </details>
    </Card>
  );
}

const OWNER_PALETTE = ["#a78bfa", "#38c98a", "#f5a623", "#e0654f", "#2dd4bf", "#f472b6", "#eab308", "#c084fc", "#fb923c", "#60a5fa"];
function ownerColor(name: string, idx: number): string {
  if (/masyarakat|public|publik/i.test(name)) return "hsl(222 100% 62%)"; // structural accent for the float
  if (/\besa\b|esop|karyawan/i.test(name)) return "#7c8598";
  return OWNER_PALETTE[idx % OWNER_PALETTE.length];
}

/** Ownership composition as 100%-stacked bars (pre → post → [post-option]) with a shared legend. */
type OwnerList = { name: string; pct: number | null; shares?: number | null }[];
function Ownership({ ipo }: { ipo: UpcomingIPO }) {
  const states: { label: string; col: string; list: OwnerList }[] = [];
  if (ipo.shareholdersPre) states.push({ label: "Pre-IPO", col: "Pre %", list: ipo.shareholdersPre });
  if (ipo.shareholdersPost) states.push({ label: "Post-IPO", col: "Post %", list: ipo.shareholdersPost });
  if (ipo.shareholdersPostOption) states.push({ label: "Post-option", col: "Opt %", list: ipo.shareholdersPostOption });
  if (states.length === 0) return null;

  const lastList = states[states.length - 1].list;

  // Stable holder universe + colour, seeded from the most complete (last) state then any extras.
  const order: string[] = [];
  const meta = new Map<string, { name: string; color: string }>();
  for (const s of [...lastList, ...states.flatMap((st) => st.list)]) {
    const k = normKey(s.name);
    if (!meta.has(k)) { meta.set(k, { name: s.name, color: "" }); order.push(k); }
  }
  order.forEach((k, i) => (meta.get(k)!.color = ownerColor(meta.get(k)!.name, i)));
  const pctIn = (list: OwnerList, k: string) => list.find((s) => normKey(s.name) === k)?.pct ?? null;
  const sharesIn = (list: OwnerList, k: string) => list.find((s) => normKey(s.name) === k)?.shares ?? null;
  const rows = order.slice().sort((a, b) => (pctIn(lastList, b) ?? -1) - (pctIn(lastList, a) ?? -1));

  // Structural-flag lookup (conglomerate / PEP / listed-affiliate / foreign-strategic), keyed
  // the same way as cap-table rows so chips render inline on the holders that carry them.
  const flagOf = new Map<string, string[]>();
  for (const h of ipo.ownership?.holders ?? []) flagOf.set(normKey(h.name), orderTags(h.tags));

  return (
    <Panel title="Ownership & cap table" note={states.map((s) => s.label).join(" → ")}>
      <div className="space-y-2.5 p-4">
        {states.map((st) => (
          <div key={st.label}>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">{st.label}</div>
            <div className="flex h-6 w-full overflow-hidden rounded-[2px] border border-border">
              {order.map((k) => {
                const p = pctIn(st.list, k);
                if (!p || p <= 0) return null;
                return <div key={k} style={{ width: `${p}%`, background: meta.get(k)!.color }} title={`${meta.get(k)!.name}: ${fx(p)}%`} />;
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto border-t border-border">
      <table className="w-full font-mono text-[12px] tabnum">
        <thead>
          <tr className="border-b border-border text-[10.5px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-1.5 text-left font-medium">Holder</th>
            {states.map((st) => <th key={st.label} className="px-2 py-1.5 text-right font-medium">{st.col}</th>)}
            <th className="px-4 py-1.5 text-right font-medium">Shares</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const m = meta.get(k)!;
            const sh = sharesIn(lastList, k);
            return (
              <tr key={k} className="border-b border-border/40 last:border-0">
                <td className="max-w-[230px] px-4 py-1.5 text-left align-top">
                  <span className="flex items-start gap-1.5">
                    <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: m.color }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-muted-foreground" title={m.name}>{m.name}</span>
                      {(flagOf.get(k)?.length ?? 0) > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {flagOf.get(k)!.map((t) => <TagChip key={t} tag={t} />)}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                {states.map((st) => {
                  const p = pctIn(st.list, k);
                  return <td key={st.label} className="px-2 py-1.5 text-right text-foreground">{p == null ? "—" : `${fx(p)}%`}</td>;
                })}
                <td className="px-4 py-1.5 text-right text-muted-foreground">{sh == null ? "—" : intFmt(sh)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {(ipo.ubo || ipo.controllerPost) && (
        <div className="space-y-0.5 border-t border-border px-4 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {ipo.controllerPost && <div><span className="text-muted-foreground">Controller</span> <span className="text-foreground">{ipo.controllerPost}</span></div>}
          {ipo.ubo && <div><span className="text-muted-foreground">UBO</span> <span className="text-foreground">{ipo.ubo}</span></div>}
        </div>
      )}
      {ipo.ownership && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Ownership exposure</span>
            {(() => { const e = exposureMeta(ipo.ownership.level); return <Badge variant={e.variant}>{e.label}</Badge>; })()}
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">{ipo.ownership.summary}</p>
          {ipo.ownership.flags.length > 0 && (
            <ul className="space-y-1">
              {ipo.ownership.flags.map((fl, i) => (
                <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden />{fl}
                </li>
              ))}
            </ul>
          )}
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/70">
            Background flags from public-source research. Structural ownership facts only; see disclaimer.
          </p>
        </div>
      )}
    </Panel>
  );
}

const SEG_PALETTE = ["hsl(222 100% 62%)", "#38c98a", "#f5a623", "#a78bfa", "#e0654f", "#2dd4bf", "#f472b6", "#eab308"];
function BusinessModel({ ipo }: { ipo: UpcomingIPO }) {
  const bm = ipo.businessModel;
  if (!bm) return null;
  const seg = bm.revenueBreakdown.filter((s) => s.year === 2025 && s.pct != null && s.pct > 0);
  return (
    <Panel title="Business model" note={bm.sourcePages ?? undefined}>
      <div className="space-y-3 p-4">
        <p className="text-[12.5px] leading-relaxed text-foreground">{bm.summary}</p>
        {seg.length > 0 && (
          <div>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Revenue mix · FY2025 · {bm.breakdownBasis}</div>
            <div className="flex h-6 w-full overflow-hidden rounded-[2px] border border-border">
              {seg.map((s, i) => (
                <div key={i} style={{ width: `${s.pct}%`, background: SEG_PALETTE[i % SEG_PALETTE.length] }} title={`${s.label}: ${fx(s.pct)}%`} />
              ))}
            </div>
            <table className="mt-2 w-full font-mono text-[12px] tabnum">
              <tbody>
                {seg.map((s, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-0">
                    <td className="py-1 pr-2 text-left">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: SEG_PALETTE[i % SEG_PALETTE.length] }} aria-hidden />
                        <span className="truncate text-muted-foreground" title={s.label}>{s.label}</span>
                      </span>
                    </td>
                    <td className="py-1 text-right text-foreground">{pctN(s.pct)}</td>
                    <td className="py-1 pl-3 text-right text-muted-foreground">{s.rpBn != null ? idrBn(s.rpBn) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">{bm.model}</p>
        {(bm.keyCustomersOrChannel || bm.moatOrEdge) && (
          <div className="space-y-1.5 border-t border-border pt-2.5">
            {bm.keyCustomersOrChannel && (
              <div className="text-[12px] leading-snug text-muted-foreground"><span className="font-medium text-foreground">Customers / channel: </span>{bm.keyCustomersOrChannel}</div>
            )}
            {bm.moatOrEdge && (
              <div className="text-[12px] leading-snug text-muted-foreground"><span className="font-medium text-foreground">Edge: </span>{bm.moatOrEdge}</div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

function Proceeds({ ipo }: { ipo: UpcomingIPO }) {
  const total = ipo.useOfProceeds.reduce((s, u) => s + (u.amountRp ?? 0), 0);
  return (
    <Panel title="Use of proceeds" note={ipo.debtAlloc.basis !== "n/d" ? `→ debt ${ipo.debtAlloc.pct != null ? pctN(ipo.debtAlloc.pct) : `${fx(ipo.debtAlloc.low)}–${fx(ipo.debtAlloc.high)}%`}` : undefined}>
      <div className="space-y-2.5 p-4">
        {ipo.useOfProceeds.length === 0 && <div className="font-mono text-[12px] text-muted-foreground">Not itemized in structured data — see writeup.</div>}
        {ipo.useOfProceeds.map((u, i) => {
          const pct = u.pct ?? (u.amountRp && total ? (u.amountRp / total) * 100 : null);
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12.5px] text-foreground">
                  <Badge variant={proceedsTone(u.type)}>{(u.type ?? "use").replace(/_/g, " ")}</Badge>
                  {u.affiliated && <Badge variant="outline">affiliated</Badge>}
                </span>
                <span className="shrink-0 font-mono text-[12px] tabnum text-muted-foreground">
                  {pct != null ? pctN(pct) : ""}{u.amountRp ? ` · ${idr(u.amountRp)}` : ""}
                </span>
              </div>
              <div className="mt-1 text-[12px] leading-snug text-muted-foreground">{u.purpose}</div>
              {pct != null && (
                <div className="mt-1 h-1.5 w-full bg-secondary">
                  <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              )}
            </div>
          );
        })}
        {ipo.debtAlloc.facility && (
          <div className="border-t border-border pt-2 font-mono text-[11px] text-muted-foreground">Facility: {ipo.debtAlloc.facility}</div>
        )}
      </div>
    </Panel>
  );
}

function Financials({ ipo }: { ipo: UpcomingIPO }) {
  const f = ipo.financials;
  const chart = f.years.map((y, i) => ({ year: String(y), Revenue: f.revenue[i], "Net profit": f.netProfitParent[i] }));
  const margin = (num: (number | null)[], den: (number | null)[]) =>
    num.map((v, i) => (v != null && den[i] != null && den[i] !== 0 ? (v / den[i]!) * 100 : null));
  const grossMargin = margin(f.grossProfit, f.revenue);
  const netMargin = margin(f.netProfitTotal, f.revenue);
  const roe = margin(f.netProfitTotal, f.totalEquity);
  const bn = (x: number | null) => idrBn(x);
  const der = (x: number | null) => (x == null ? "—" : `${x.toFixed(2)}×`);
  const rows: { label: string; vals: (number | null)[]; fmt: (x: number | null) => string; sub?: boolean }[] = [
    { label: "Revenue", vals: f.revenue, fmt: bn },
    { label: "Gross profit", vals: f.grossProfit, fmt: bn },
    { label: "Gross margin", vals: grossMargin, fmt: pctN, sub: true },
    { label: "Net profit (parent)", vals: f.netProfitParent, fmt: bn },
    { label: "Net margin", vals: netMargin, fmt: pctN, sub: true },
    { label: "Total assets", vals: f.totalAssets, fmt: bn },
    { label: "Total liabilities", vals: f.totalLiabilities, fmt: bn },
    { label: "Total equity", vals: f.totalEquity, fmt: bn },
    { label: "DER (total)", vals: ipo.metrics.der, fmt: der },
    { label: "ROE", vals: roe, fmt: pctN, sub: true },
  ];
  return (
    <Panel title="Financials" note="FY2023 – FY2025 · IDR">
      <div className="p-4 pb-1">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chart} margin={{ top: 4, right: 8, left: 6, bottom: 0 }} barGap={3}>
            <CartesianGrid stroke="hsl(240 4% 24%)" vertical={false} />
            <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={axisBn} tickLine={false} axisLine={false} width={42} tick={{ fontSize: 11 }} />
            <RTooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<MiniTip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#aab2c5" }} />
            <Bar dataKey="Revenue" fill="#3d75ff" isAnimationActive animationDuration={650} animationEasing="ease-out" />
            <Bar dataKey="Net profit" fill="#38c98a" isAnimationActive animationDuration={650} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full border-t border-border font-mono text-[12.5px] tabnum">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Metric</th>
            {f.years.map((y) => <th key={y} className="px-3 py-2 text-right font-medium">{y}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border/50 last:border-0">
              <td className={`py-1.5 text-left ${r.sub ? "pl-7 text-[11.5px] text-muted-foreground" : "px-4 text-muted-foreground"}`}>{r.label}</td>
              {r.vals.map((v, i) => (
                <td key={i} className={`px-3 py-1.5 text-right ${r.sub ? "text-muted-foreground" : "text-foreground"}`}>{r.fmt(v)}</td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-border bg-secondary/40">
            <td className="px-4 py-1.5 text-left text-muted-foreground">FY25 YoY</td>
            <td className="px-3 py-1.5 text-right" colSpan={3}>
              <span className={signClass(ipo.metrics.revGrowth2025)}>rev {pctNSigned(ipo.metrics.revGrowth2025)}</span>
              <span className="text-muted-foreground"> · net profit </span>
              <span className={signClass(ipo.metrics.netGrowth2025)}>{pctNSigned(ipo.metrics.netGrowth2025)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </Panel>
  );
}

function ValuationPanel({ ipo }: { ipo: UpcomingIPO }) {
  const v = ipo.valuation;
  const kv: [string, ReactNode][] = [
    ["Trailing P/E", `${fx(v.peLow)}–${fx(v.peHigh)}×`],
    ["P/BV (post-money)", `${fx(v.pbLow)}–${fx(v.pbHigh)}×`],
    ["Post-IPO mkt cap", idrRange(v.mcapLow, v.mcapHigh)],
    ["ROE post-money", pctN(v.roePost)],
    ["DER FY25 → post-IPO", `${fx(ipo.metrics.der[2], 2)}× → ${ipo.metrics.derPost != null ? `${fx(ipo.metrics.derPost, 2)}×` : "n/d"}`],
    ["Dividend policy", ipo.dividendPolicy ?? "—"],
  ];
  return (
    <Panel title="Valuation & leverage">
      <dl className="divide-y divide-border">
        {kv.map(([k, val]) => (
          <div key={k} className="flex items-start justify-between gap-3 px-4 py-2">
            <dt className="font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground">{k}</dt>
            <dd className="max-w-[60%] text-right font-mono text-[12.5px] tabnum text-foreground">{val}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

function RedFlags({ ipo }: { ipo: UpcomingIPO }) {
  return (
    <Panel title="Red flags" note={`${ipo.redFlags.length} flagged`}>
      <ul className="space-y-2 p-4">
        {ipo.redFlags.map((rf, i) => (
          <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug">
            {rf.severity ? <Badge variant={sevVariant(rf.severity)} className="mt-0.5 shrink-0">{rf.severity}</Badge>
              : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-neg/70" aria-hidden />}
            <span className="text-muted-foreground">{rf.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Green flags — positives, graded and laid out as the mirror of RedFlags. */
function GreenFlags({ ipo }: { ipo: UpcomingIPO }) {
  const g = ipo.counterweights ?? [];
  if (g.length === 0) return null;
  return (
    <Panel title="Green flags" note={`${g.length} positives`}>
      <ul className="space-y-2 p-4">
        {g.map((c, i) => (
          <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug">
            <Badge variant={strengthVariant(c.strength)} className="mt-0.5 shrink-0">{c.strength}</Badge>
            <span className="text-muted-foreground">{c.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Qualitative({ ipo }: { ipo: UpcomingIPO }) {
  return (
    <Panel title="Context & open questions">
      <div className="space-y-3 p-4">
        {(ipo.primaryRisk || ipo.industryTailwind) && (
          <Section label="Context">
            {ipo.primaryRisk && <div className="text-[12.5px] leading-snug text-muted-foreground"><span className="text-neg/90">Primary risk:</span> {ipo.primaryRisk}</div>}
            {ipo.industryTailwind && <div className="mt-1 text-[12.5px] leading-snug text-muted-foreground"><span className="text-pos/90">Tailwind:</span> {ipo.industryTailwind}</div>}
          </Section>
        )}
        {ipo.openQuestions.length > 0 && (
          <Section label="Open questions (diligence)">
            <ul className="space-y-1">
              {ipo.openQuestions.map((q, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-muted-foreground">
                  <span className="shrink-0 text-muted-foreground/60">?</span>{q}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {ipo.esa.exists && (
          <Section label="ESA / ESOP"><div className="text-[12.5px] leading-snug text-muted-foreground">{ipo.esa.summary}</div></Section>
        )}
      </div>
    </Panel>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80">{label}</div>
      {children}
    </div>
  );
}

function MiniTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-secondary px-2.5 py-2 text-[11.5px] shadow-lg">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4 text-muted-foreground">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="tabnum font-medium text-foreground">{idrBn(p.value ?? null)}</span>
        </div>
      ))}
    </div>
  );
}

const idrRange = (a: number | null, b: number | null) =>
  a == null && b == null ? "—" : a === b || b == null ? idr(a) : `${idr(a)} – ${idr(b)}`;
