/**
 * Routes + per-route <head>.
 *
 * `headFor()` is pure and is the single source of truth for titles/descriptions/canonicals:
 * the client applies it through `useHead()` on every navigation, and `scripts/prerender.ts`
 * bakes the exact same values into the static HTML for each route. One function, so a crawler
 * and a browser can never disagree.
 */
import { useEffect } from "react";
import type { UpcomingIPO } from "./upcoming-types";

export const SITE_URL = "https://ipo.klinikpenyesalan.com";
export const SITE_NAME = "IDX e-IPO Analytics";

/** Site-wide description — kept as-is for the root route. */
const SITE_DESCRIPTION =
  "IDX e-IPO analytics — 2021–2026 IPO performance, underwriter track records, and upcoming-deal AI scoring. By Klinik Penyesalan.";

export interface Head {
  title: string;
  description: string;
  canonical: string;
}

export interface TabRoute {
  /** Radix <Tabs> value. Also the legacy hash id (`/#explorer`). */
  id: string;
  path: string;
  label: string;
  title: string;
  description: string;
}

export const TAB_ROUTES: TabRoute[] = [
  {
    id: "overview",
    path: "/",
    label: "Overview",
    title: `${SITE_NAME} | Klinik Penyesalan`,
    description: SITE_DESCRIPTION,
  },
  {
    id: "choppy",
    path: "/choppy-market",
    label: "Choppy Market",
    title: `Choppy Market — IDX IPOs that listed below the 200-day MA | ${SITE_NAME}`,
    description:
      "Day-1 to day-7 behavior of IDX IPOs that listed while the JCI sat below its 200-day moving average, set against deals that listed into a rising market.",
  },
  {
    id: "underwriters",
    path: "/underwriters",
    label: "Underwriters",
    title: `Underwriters — IDX IPO league table 2021–2026 | ${SITE_NAME}`,
    description:
      "Lead and member underwriter track records over 2021–2026 IDX IPOs: capital raised, day-1 to day-7 fade, win rate, and activity versus performance.",
  },
  {
    id: "sectors",
    path: "/sectors-time",
    label: "Sectors & Time",
    title: `Sectors & Time — IDX IPO returns by sector and year | ${SITE_NAME}`,
    description:
      "Median day-1 pop by sector, per-sector and per-year day-1 to day-7 fade tables, and a year-by-year market-temperature read on IDX IPOs.",
  },
  {
    id: "explorer",
    path: "/explorer",
    label: "Explorer",
    title: `Explorer — every IDX IPO 2021–2026 | ${SITE_NAME}`,
    description:
      "Search, filter, sort and group every IDX IPO from 2021 to 2026 — day-1 to day-7 cumulative returns, final offer price, sector, year, lead and member underwriters.",
  },
  {
    id: "upcoming",
    path: "/upcoming",
    label: "Upcoming",
    title: `Upcoming IPOs — prospectus-stage IDX deals with AI scores | ${SITE_NAME}`,
    description:
      "Side-by-side forensic of the IDX deals still at prospectus stage: offering, free float, valuation, leverage, ownership, red flags and a transparent AI score.",
  },
];

const DEAL_PREFIX = "/upcoming/";

/** Lowercased, query/hash-free, no trailing slash (except the root). */
export function normalizePath(raw: string | undefined | null): string {
  if (!raw) return "/";
  const clean = raw.split("?")[0]!.split("#")[0]!;
  const trimmed = clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
  return trimmed.startsWith("/") ? trimmed || "/" : `/${trimmed}`;
}

export interface Route {
  /** Canonical path for what is actually rendered (unknown paths resolve to a real route). */
  path: string;
  /** Active tab id. */
  tab: string;
  /** Deal ticker for `/upcoming/:TICKER`, else null. */
  ticker: string | null;
}

/** Path → what to render. Unknown ticker falls back to the Upcoming list; anything else to Overview. */
export function resolveRoute(rawPath: string, deals: Pick<UpcomingIPO, "ticker">[]): Route {
  const path = normalizePath(rawPath);

  const tab = TAB_ROUTES.find((t) => t.path === path);
  if (tab) return { path: tab.path, tab: tab.id, ticker: null };

  if (path.startsWith(DEAL_PREFIX)) {
    const ticker = path.slice(DEAL_PREFIX.length).toUpperCase();
    const deal = deals.find((d) => d.ticker === ticker);
    if (deal) return { path: `${DEAL_PREFIX}${deal.ticker}`, tab: "upcoming", ticker: deal.ticker };
    return { path: "/upcoming", tab: "upcoming", ticker: null };
  }

  return { path: "/", tab: "overview", ticker: null };
}

/** Legacy hash tab (`/#explorer`) → its path equivalent, or null when the hash means nothing to us. */
export function legacyHashToPath(hash: string): string | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  return TAB_ROUTES.find((t) => t.id === id)?.path ?? null;
}

export function pathForTab(id: string): string {
  return TAB_ROUTES.find((t) => t.id === id)?.path ?? "/";
}

export function dealPath(ticker: string): string {
  return `${DEAL_PREFIX}${ticker}`;
}

/** Every route the prerender writes: the six tabs, then one page per deal. */
export function allRoutes(deals: Pick<UpcomingIPO, "ticker">[]): string[] {
  return [...TAB_ROUTES.map((t) => t.path), ...deals.map((d) => dealPath(d.ticker))];
}

export function canonicalUrl(path: string): string {
  const p = normalizePath(path);
  return p === "/" ? `${SITE_URL}/` : `${SITE_URL}${p}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-10" → "10 Sep 2026". */
function shortDate(iso: string | null): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "date TBA";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Markdown → plain text: bold/italic/code markers, bullets, headings, links. */
function stripMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/~~/g, "")
    .replace(/[*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_DESCRIPTION = 160;

function clamp(text: string, max = MAX_DESCRIPTION): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:—-]+$/, "")}…`;
}

/**
 * Leading sentence of the verdict, within the budget left over after the deal facts.
 * A terminator only ends a sentence when whitespace (or the end) follows, so "P/BV 1.4x" and
 * "10.6x earnings" stay intact. Very short leads ("Rich.") pull in the next sentence.
 */
function verdictLead(verdict: string | null, budget: number): string {
  const text = stripMarkdown(verdict ?? "");
  if (!text || budget < 24) return "";

  let out = "";
  const terminator = /[.!?]/g;
  let m: RegExpExecArray | null;
  while ((m = terminator.exec(text)) !== null) {
    const end = m.index + 1;
    if (text[end] && text[end] !== " ") continue; // decimal point, not a full stop
    out = text.slice(0, end);
    if (out.length >= budget) break;
  }

  return clamp((out || text).trim(), budget);
}

/** The one head builder — used by `useHead` on the client and by the prerender. */
export function headFor(path: string, deals: UpcomingIPO[]): Head {
  const route = resolveRoute(path, deals);
  const canonical = canonicalUrl(route.path);

  if (route.ticker) {
    const deal = deals.find((d) => d.ticker === route.ticker)!;
    const score = deal.score;
    const title = score
      ? `${deal.ticker} IPO — ${deal.legalName} · AI Score ${score.overall}/${score.grade} | ${SITE_NAME}`
      : `${deal.ticker} IPO — ${deal.legalName} | ${SITE_NAME}`;

    const price =
      deal.offering.priceLow == null && deal.offering.priceHigh == null
        ? "price TBA"
        : deal.offering.priceLow === deal.offering.priceHigh
          ? `offer Rp${deal.offering.priceLow}`
          : `offer Rp${deal.offering.priceLow}–${deal.offering.priceHigh}`;

    const facts = `${deal.sectorGroup} · ${price} · lists ${shortDate(deal.listingISO)}`;
    const lead = verdictLead(deal.valuation.verdict, MAX_DESCRIPTION - facts.length - 3);

    return { title, description: clamp(lead ? `${facts} · ${lead}` : facts), canonical };
  }

  const tab = TAB_ROUTES.find((t) => t.path === route.path) ?? TAB_ROUTES[0]!;
  return { title: tab.title, description: tab.description, canonical };
}

function setMeta(attr: "name" | "property", key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Applies a route's head to the live document (tags are created when missing). */
export function useHead(head: Head): void {
  useEffect(() => {
    document.title = head.title;
    setMeta("name", "description", head.description);
    setMeta("property", "og:title", head.title);
    setMeta("property", "og:description", head.description);
    setMeta("property", "og:url", head.canonical);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary");

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = head.canonical;
  }, [head.title, head.description, head.canonical]);
}
