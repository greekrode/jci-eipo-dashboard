import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import iposData from "./data/ipos.json";
import upcomingData from "./data/upcoming-ipos.json";
import type { IPO } from "./lib/types";
import type { UpcomingIPO } from "./lib/upcoming-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Overview from "./views/Overview";
import ChoppyMarket from "./views/ChoppyMarket";
import Underwriters from "./views/Underwriters";
import SectorsTime from "./views/SectorsTime";
import Explorer from "./views/Explorer";
import Upcoming from "./views/Upcoming";

const ipos = iposData as unknown as IPO[];
const upcoming = upcomingData as unknown as UpcomingIPO[];
const TAB_IDS = ["overview", "choppy", "underwriters", "sectors", "explorer", "upcoming"];

// Owner brand mark (Klinik Penyesalan). Lives in public/, BASE_URL keeps it
// correct under the relative ("./") build base.
const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
const DISCORD_URL = "https://discord.gg/kpkp88";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

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
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            title="Klinik Penyesalan — join the Discord"
            className="shrink-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <img
              src={logoSrc}
              alt="Klinik Penyesalan"
              width={32}
              height={32}
              className="h-7 w-7 rounded-[3px] border border-border sm:h-8 sm:w-8"
            />
          </a>
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
          <TabsTrigger value="choppy">Choppy Market</TabsTrigger>
          <TabsTrigger value="underwriters">Underwriters</TabsTrigger>
          <TabsTrigger value="sectors">Sectors &amp; Time</TabsTrigger>
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><Overview ipos={ipos} /></TabsContent>
        <TabsContent value="choppy"><ChoppyMarket ipos={ipos} /></TabsContent>
        <TabsContent value="underwriters"><Underwriters ipos={ipos} /></TabsContent>
        <TabsContent value="sectors"><SectorsTime ipos={ipos} /></TabsContent>
        <TabsContent value="explorer"><Explorer ipos={ipos} /></TabsContent>
        <TabsContent value="upcoming"><Upcoming ipos={upcoming} /></TabsContent>
      </Tabs>

      <footer className="mt-8 space-y-4 border-t border-border pt-4 text-[12.5px] leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Definitions.</span> Final price is the final IPO offer price (post
          book-building). D1–D7 are daily returns; cumulative compounds them. Returns are right-skewed, so median leads and
          sample size (n) is shown on every cut. Source:{" "}
          <a href="https://e-ipo.co.id" target="_blank" rel="noreferrer" className="text-primary hover:underline">
            e-ipo.co.id
          </a>
          .
        </p>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={logoSrc}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0 rounded-[3px] border border-border"
            />
            <span>
              Owned and operated by{" "}
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                Klinik Penyesalan
              </a>
              .
            </span>
          </div>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 rounded-[2px] border border-border bg-card px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <DiscordIcon className="h-3.5 w-3.5" />
            Join the Discord
          </a>
        </div>
      </footer>
    </div>
  );
}
