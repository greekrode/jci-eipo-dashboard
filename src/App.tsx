import { useState } from "react";
import iposData from "./data/ipos.json";
import type { IPO } from "./lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Overview from "./views/Overview";
import Underwriters from "./views/Underwriters";
import SectorsTime from "./views/SectorsTime";
import Explorer from "./views/Explorer";

const ipos = iposData as unknown as IPO[];
const TAB_IDS = ["overview", "underwriters", "sectors", "explorer"];

function initialTab(): string {
  const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  return TAB_IDS.includes(h) ? h : "overview";
}

export default function App() {
  const [tab, setTab] = useState<string>(initialTab);
  const onTab = (v: string) => {
    setTab(v);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${v}`);
  };

  return (
    <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-5">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3.5 w-3.5 bg-primary" aria-hidden />
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">IDX e-IPO Analytics</h1>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">IDX · 2021&ndash;2026</span>
        </div>
        <div className="tabnum font-mono text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">246</span> DEALS
          <span className="px-1.5 text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">237</span> LISTED
          <span className="px-1.5 text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">9</span> N/L
        </div>
      </header>

      <Tabs value={tab} onValueChange={onTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="underwriters">Underwriters</TabsTrigger>
          <TabsTrigger value="sectors">Sectors &amp; Time</TabsTrigger>
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview ipos={ipos} /></TabsContent>
        <TabsContent value="underwriters"><Underwriters ipos={ipos} /></TabsContent>
        <TabsContent value="sectors"><SectorsTime ipos={ipos} /></TabsContent>
        <TabsContent value="explorer"><Explorer ipos={ipos} /></TabsContent>
      </Tabs>

      <footer className="mt-6 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Definitions.</span> Final price is the final IPO offer price (post
        book-building). D1–D7 are daily returns; cumulative compounds them. Returns are right-skewed, so median leads and
        sample size (n) is shown on every cut. Source:{" "}
        <a href="https://e-ipo.co.id" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          e-ipo.co.id
        </a>
        .
      </footer>
    </div>
  );
}
