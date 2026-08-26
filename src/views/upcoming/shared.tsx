import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { RedFlag, UpcomingIPO } from "@/lib/upcoming-types";
import { trackUserAction } from "@/lib/analytics";

/** Ticker links are real anchors (`/upcoming/:TICKER`); this only records the click and scrolls up. */
export function openDeal(ipo: UpcomingIPO, source: string) {
  trackUserAction("Upcoming Stock Opened", {
    ticker: ipo.ticker,
    source,
    sector: ipo.sectorGroup,
    score: ipo.score?.overall ?? null,
  });
  scrollTop();
}

/** Back to the comparison matrix (`/upcoming`). */
export function openCompare(source: string) {
  trackUserAction("Upcoming Compare Opened", { source });
  scrollTop();
}

function scrollTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07-07" -> "07 Jul 2026"; short=true -> "07 Jul". */
export function fmtDate(iso: string | null, short = true): string {
  if (!iso) return "—";
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const day = m[3];
  const mon = MON[Number(m[2]) - 1] ?? m[2];
  return short ? `${day} ${mon}` : `${day} ${mon} ${m[1]}`;
}

/** "Rp 400–500" with id-ID grouping; single value when low===high. */
export function priceRange(low: number | null, high: number | null): string {
  const f = (x: number) => x.toLocaleString("id-ID");
  if (low == null && high == null) return "—";
  if (low == null) return `Rp ${f(high!)}`;
  if (high == null || low === high) return `Rp ${f(low)}`;
  return `Rp ${f(low)}–${f(high)}`;
}

export function lockBadge(strength: string) {
  if (strength === "Hard lock") return <Badge variant="pos">Hard lock</Badge>;
  if (strength === "None") return <Badge variant="neg">None</Badge>;
  return <Badge variant="secondary">Control only</Badge>;
}

/** Count red flags whose severity contains `level` (case-insensitive). */
export function severityCount(flags: RedFlag[], level: string): number {
  const l = level.toLowerCase();
  return flags.filter((f) => (f.severity ?? "").toLowerCase().includes(l)).length;
}

/** Badge variant for a red-flag severity string. */
export function sevVariant(sev: string | null): "neg" | "secondary" | "outline" {
  const s = (sev ?? "").toLowerCase();
  if (s.startsWith("high")) return "neg";
  if (s.includes("med")) return "secondary";
  return "outline";
}

/** Badge variant for a green-flag strength string — the positive mirror of sevVariant. */
export function strengthVariant(strength: string | null): "pos" | "secondary" | "outline" {
  const s = (strength ?? "").toLowerCase();
  if (s.startsWith("strong")) return "pos";
  if (s.startsWith("mod")) return "secondary";
  return "outline";
}

/** Count green flags whose strength contains `level` (case-insensitive). */
export function strengthCount(flags: { strength: string }[], level: string): number {
  const l = level.toLowerCase();
  return flags.filter((g) => (g.strength ?? "").toLowerCase().includes(l)).length;
}

// ── AI Score presentation ─────────────────────────────────────────────────────

/** Badge tone for an AI-Score letter grade (A best → E worst). */
export function gradeVariant(grade: string): "pos" | "secondary" | "outline" | "neg" {
  const g = (grade ?? "").toUpperCase();
  if (g === "A" || g === "B+") return "pos";
  if (g === "B" || g === "C+") return "secondary";
  if (g === "C" || g === "D+") return "outline";
  return "neg"; // D, E
}

/** Tailwind bg class for a 0–100 score-bar fill (3 tiers, restrained). */
export function scoreTone(n: number | null): string {
  if (n == null) return "bg-muted-foreground/30";
  if (n >= 70) return "bg-pos/70";
  if (n >= 55) return "bg-primary/65";
  return "bg-neg/65";
}

/** Badge tone for an underwriter track-record grade (A/B/C/D). */
export function uwGradeVariant(grade: string): "pos" | "secondary" | "outline" | "neg" {
  const g = (grade ?? "").toUpperCase();
  if (g === "A") return "pos";
  if (g === "B") return "secondary";
  if (g === "C") return "outline";
  return "neg"; // D
}

/** "PT Trimegah Sekuritas Indonesia Tbk" -> "Trimegah Sekuritas Indonesia". */
export function firmShort(name: string): string {
  return (name ?? "").replace(/^PT\s+/i, "").replace(/\s+Tbk\b.*/i, "").split(/[(,]/)[0].trim();
}

/** NFA / DYOR disclaimer shown on every Upcoming surface (compare + detail). */
export function Disclaimer() {
  return (
    <div className="flex flex-col gap-2 rounded-[2px] border border-border bg-secondary/30 px-4 py-3 sm:flex-row sm:items-start sm:gap-3">
      <Badge variant="outline" className="w-fit shrink-0 border-foreground/30 text-foreground">NFA · DYOR</Badge>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Independent forensic analysis of <span className="text-foreground">preliminary</span> prospectuses (Prospektus Awal),
        for educational purposes only. <span className="text-foreground">Not financial advice</span> and not a recommendation
        to subscribe, buy, or sell. Figures are drawn from draft documents and may change in the final prospectus; opinions
        are analysis attributed to those documents. Always <span className="text-foreground">do your own research</span> and
        consult a licensed advisor before investing.
      </p>
    </div>
  );
}

/** Badge variant for a use-of-proceeds type keyword. */
export function proceedsTone(type: string | null): "neg" | "pos" | "secondary" | "outline" {
  const t = (type ?? "").toLowerCase();
  if (t.includes("delever") || t.includes("debt") || t.includes("repay")) return "neg";
  if (t.includes("growth") || t.includes("capex")) return "pos";
  if (t.includes("working") || t.includes("opex") || t.includes("capital")) return "secondary";
  return "outline";
}

// ── Ownership-exposure presentation (shareholder background research) ──────────
type Tone = "neg" | "pos" | "secondary" | "outline";

const TAG_LABEL: Record<string, string> = {
  conglomerate: "Conglomerate",
  pep: "PEP",
  "pep-family": "PEP family",
  "affiliated-listed": "Listed affiliate",
  "foreign-strategic": "Foreign strategic",
};
/** Display order so chips read consistently (risk-weighted first). */
const TAG_ORDER = ["pep", "pep-family", "conglomerate", "affiliated-listed", "foreign-strategic"];

function tagVariant(tag: string): Tone {
  if (tag === "pep" || tag === "pep-family") return "neg";
  if (tag === "conglomerate") return "secondary";
  return "outline"; // affiliated-listed, foreign-strategic
}

/** Small chip for one structural ownership tag. */
export function TagChip({ tag }: { tag: string }) {
  return (
    <Badge variant={tagVariant(tag)} className="px-1 py-0 text-[11.5px] font-medium uppercase tracking-wide">
      {TAG_LABEL[tag] ?? tag}
    </Badge>
  );
}

/** Sort a holder's tags into display order. */
export function orderTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b));
}

/** Deal-level exposure badge label + tone. */
export function exposureMeta(level: string | null): { label: string; variant: Tone } {
  switch (level) {
    case "pep-linked": return { label: "PEP-linked", variant: "neg" };
    case "conglomerate-linked": return { label: "Conglomerate-linked", variant: "secondary" };
    case "mixed": return { label: "Mixed", variant: "secondary" };
    case "family-controlled": return { label: "Family-controlled", variant: "outline" };
    case "clean": return { label: "Independent", variant: "pos" };
    default: return { label: level ?? "—", variant: "outline" };
  }
}

// ── Inline emphasis for analyst prose ─────────────────────────────────────────

/** One tokenizer pass over a line of analyst prose. Ordered alternation:
 *  1. trailing prospectus citation `(PAGE 29, 425, 408)` — captured, demoted to `p. …`
 *  2. rupiah amounts — `Rp1.42bn`, `Rp 120`, `Rp138-149bn`
 *  3. percentages — `30%`, `68.7%`
 *  4. multiples — `10.6x`, `228-246x`, `97 to 105x`
 *  Years and period tokens (FY2025, 2M-2026) carry no `Rp` / `%` / `x`, so they stay unbolded. */
const EMPH_RX =
  /\s*\(PAGE\s+([^)]*)\)\.?|\bRp\s?\d+(?:[.,]\d+)*(?:\s?[–-]\s?\d+(?:[.,]\d+)*)?(?:bn|tn|m|k)?|\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?(?:\s?(?:to|–|-)\s?\d+(?:\.\d+)?)?\s?[x×]/g;

/** Longest "Profit quality:" style lead-in still treated as a label rather than prose. */
const LEAD_MAX = 45;

function emphTokens(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  EMPH_RX.lastIndex = 0;
  for (let m = EMPH_RX.exec(s); m !== null; m = EMPH_RX.exec(s)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <span key={key++} className="ml-1 font-mono text-[12px] text-muted-foreground/80">p. {m[1].trim()}</span>,
      );
    } else {
      out.push(<strong key={key++} className="font-semibold text-foreground">{m[0]}</strong>);
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Renders one line of analyst prose with the figures that carry the argument set in bold,
 *  a short `Label:` lead-in promoted to a heading weight, and a trailing prospectus page
 *  citation demoted to a quiet mono `p. 29, 425, 408`. No HTML injection — pure nodes. */
export function Emph({ text }: { text: string }) {
  const s = text ?? "";
  const colon = s.indexOf(":");
  const lead = colon > 0 && colon <= LEAD_MAX && !s.slice(0, colon).includes("\n");
  return (
    <>
      {lead && <span className="font-semibold text-foreground">{s.slice(0, colon + 1)}</span>}
      {emphTokens(lead ? s.slice(colon + 1) : s)}
    </>
  );
}

/** Distinct structural tags present across a deal's flagged holders, in display order. */
export function distinctTags(holders: { tags: string[] }[]): string[] {
  const seen = new Set<string>();
  for (const h of holders) for (const t of h.tags) seen.add(t);
  return TAG_ORDER.filter((t) => seen.has(t));
}
