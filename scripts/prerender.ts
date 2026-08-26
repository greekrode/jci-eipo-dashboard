/**
 * Static prerender: turns the SPA into one real HTML file per route.
 *
 * Runs after `vite build` (client) and `vite build --ssr` (server bundle). For every route it
 * renders the app to HTML, injects the route's head, and writes dist/<path>/index.html. Also
 * writes dist/sitemap.xml, then deletes dist/server — the SSR bundle is a build artifact only.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Head } from "../src/lib/seo";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const SITE_URL = "https://ipo.klinikpenyesalan.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function headTags(head: Head): string {
  return [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    `<link rel="canonical" href="${esc(head.canonical)}" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:url" content="${esc(head.canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");
}

const sitemapEntry = (loc: string, lastmod: string, priority: string, changefreq: string) =>
  `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

async function main() {
  const template = await readFile(join(dist, "index.html"), "utf8");
  if (!template.includes("<!--app-head-->") || !template.includes("<!--app-html-->")) {
    throw new Error("dist/index.html is missing the <!--app-head--> / <!--app-html--> placeholders");
  }

  const entry = pathToFileURL(join(dist, "server", "entry-server.js")).href;
  const { render, routes } = (await import(entry)) as {
    render: (path: string) => { html: string; head: Head };
    routes: () => string[];
  };

  const all = routes();
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];

  for (const route of all) {
    const { html, head } = render(route);
    const page = template.replace("<!--app-head-->", headTags(head)).replace("<!--app-html-->", html);

    const file = join(dist, route === "/" ? "" : route, "index.html");
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, page, "utf8");

    const priority = route === "/" ? "1.0" : route.startsWith("/upcoming/") ? "0.7" : "0.8";
    urls.push(sitemapEntry(head.canonical, today, priority, route.startsWith("/upcoming/") ? "weekly" : "daily"));
    console.log(`  ${route.padEnd(22)} → ${(route === "/" ? "/index.html" : `${route}/index.html`).padEnd(30)} ${head.title}`);
  }

  await writeFile(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
    "utf8"
  );

  // The SSR bundle is only needed by this script — keep it out of the deploy.
  await rm(join(dist, "server"), { recursive: true, force: true });

  console.log(`prerendered ${all.length} routes → dist/ · sitemap.xml (${urls.length} urls, lastmod ${today}) · ${SITE_URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
