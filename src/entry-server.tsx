/**
 * SSR entry — used only at build time by `scripts/prerender.ts`, never at runtime.
 * Renders one route to HTML and hands back the head that belongs to it.
 */
import { renderToString } from "react-dom/server";
import App from "./App";
import upcomingData from "./data/upcoming-ipos.json";
import type { UpcomingIPO } from "./lib/upcoming-types";
import { allRoutes, headFor, type Head } from "./lib/seo";

const deals = upcomingData as unknown as UpcomingIPO[];

export function render(path: string): { html: string; head: Head } {
  return { html: renderToString(<App initialPath={path} />), head: headFor(path, deals) };
}

/** Every path the prerender writes: the six tabs, then one page per deal. */
export function routes(): string[] {
  return allRoutes(deals);
}
