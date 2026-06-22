import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClass?: string;
}

export function StatStrip({ items, cols = 6 }: { items: StatItem[]; cols?: number }) {
  const lg = cols === 6 ? "lg:grid-cols-6" : cols === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4";
  return (
    <Card className="overflow-hidden">
      <div className={cn("grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:divide-y-0", lg)}>
        {items.map((it) => (
          <div key={it.label} className="px-4 py-3">
            <div className="whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {it.label}
            </div>
            <div className={cn("mt-1.5 font-mono text-xl font-semibold tracking-tight tabnum", it.valueClass)}>
              {it.value}
            </div>
            {it.sub && <div className="mt-0.5 truncate font-mono text-[10.5px] text-muted-foreground">{it.sub}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
