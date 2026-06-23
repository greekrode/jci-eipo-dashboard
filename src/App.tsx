import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import iposData from "./data/ipos.json";
import upcomingData from "./data/upcoming-ipos.json";
import type { IPO } from "./lib/types";
import type { UpcomingIPO } from "./lib/upcoming-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Overview from "./views/Overview";
import Underwriters from "./views/Underwriters";
import SectorsTime from "./views/SectorsTime";
import Explorer from "./views/Explorer";
import Upcoming from "./views/Upcoming";

const ipos = iposData as unknown as IPO[];
const upcoming = upcomingData as unknown as UpcomingIPO[];
const TAB_IDS = ["overview", "underwriters", "sectors", "explorer", "upcoming"];

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

  // Theme: default light (:root); .dark class on <html> toggles the concrete-dark variant.
  const [dark, setDark] = useState<boolean>(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const toggleTheme = () =>
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* private mode */ }
      return next;
    });

  return (
    <div className="mx-auto w-full max-w-[2100px] px-3 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border pb-3 sm:mb-5 sm:items-end sm:pb-4">
        <div className="flex items-center gap-2.5">
          <span className="h-3.5 w-3.5 bg-primary sm:h-4 sm:w-4" aria-hidden />
          <h1 className="text-[16px] font-semibold tracking-tight text-foreground sm:text-[20px]">IDX e-IPO Analytics</h1>
          <span className="hidden font-mono text-[12px] uppercase tracking-wider text-muted-foreground sm:inline">IDX · 2021&ndash;2026</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="tabnum font-mono text-[12px] text-muted-foreground sm:text-[13.5px]">
            <span className="font-semibold text-foreground">246</span> DEALS
            <span className="px-1.5 text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">237</span> LISTED
            <span className="px-1.5 text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">9</span> N/L
          </div>
          <button
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            {dark ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
          </button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={onTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="underwriters">Underwriters</TabsTrigger>
          <TabsTrigger value="sectors">Sectors &amp; Time</TabsTrigger>
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview ipos={ipos} /></TabsContent>
        <TabsContent value="underwriters"><Underwriters ipos={ipos} /></TabsContent>
        <TabsContent value="sectors"><SectorsTime ipos={ipos} /></TabsContent>
        <TabsContent value="explorer"><Explorer ipos={ipos} /></TabsContent>
        <TabsContent value="upcoming"><Upcoming ipos={upcoming} /></TabsContent>
      </Tabs>

      <footer className="mt-8 border-t border-border pt-4 text-[12.5px] leading-relaxed text-muted-foreground">
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
