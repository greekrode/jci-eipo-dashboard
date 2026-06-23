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
          <div key={it.label} className="px-3.5 py-3 sm:px-5 sm:py-4">
            <div className="whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:text-[11.5px]">
              {it.label}
            </div>
            <div className={cn("mt-1 font-mono text-[20px] font-semibold tracking-tight tabnum sm:mt-1.5 sm:text-[26px]", it.valueClass)}>
              {it.value}
            </div>
            {it.sub && <div className="mt-1 truncate font-mono text-[11.5px] text-muted-foreground sm:text-[12px]">{it.sub}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}
