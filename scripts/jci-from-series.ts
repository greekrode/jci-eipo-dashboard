// Convert the `series` string returned by scripts/jci-trend.sql (via the arthara-db MCP)
// into scripts/jci-trend.json. Usage: bun run data:jci <file-with-series-string>
// ponytail: the DB is reached through the MCP in-session, not from the build — no DSN needed.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) { console.error("usage: bun run data:jci <file containing the `series` string from scripts/jci-trend.sql>"); process.exit(1); }
const text = readFileSync(file, "utf8").trim().replace(/^['"]|['"]$/g, "");
const rows = text.split(";").map((s, i) => {
  const [date, close, ma200] = s.split(",");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !Number.isFinite(+close) || !Number.isFinite(+ma200)) throw new Error(`bad row ${i + 1}: ${s}`);
  return { date, close: +close, ma200: +ma200 };
});
if (rows.length < 200) throw new Error(`only ${rows.length} rows — wrong input?`);
const out = { _meta: { source: "arthara-db public.index_prices (IHSG close_price), MA200 = trailing 200-session simple average computed in SQL (scripts/jci-trend.sql via MCP)", asOf: rows[rows.length - 1].date }, rows };
writeFileSync(resolve(import.meta.dir, "jci-trend.json"), JSON.stringify(out));
console.log(`Wrote ${rows.length} IHSG points ${rows[0].date} → ${out._meta.asOf} to scripts/jci-trend.json`);
