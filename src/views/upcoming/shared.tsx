import { Badge } from "@/components/ui/badge";
import type { RedFlag } from "@/lib/upcoming-types";

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

/** NFA / DYOR disclaimer shown on every Upcoming surface (compare + detail). */
export function Disclaimer() {
  return (
    <div className="flex flex-col gap-2 rounded-[2px] border border-border bg-secondary/30 px-4 py-3 sm:flex-row sm:items-start sm:gap-3">
      <Badge variant="outline" className="w-fit shrink-0 border-foreground/30 text-foreground">NFA · DYOR</Badge>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
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
