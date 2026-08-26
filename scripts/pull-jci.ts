// Refresh scripts/jci-trend.json (IHSG close + 200-session MA) straight from the alpha-flow
// Postgres. Needs ARTHARA_DATABASE_URL (bun auto-loads .env; the file is gitignored).
// Run: bun run data:jci   → then `bun run data` to reclassify regimes.
// ponytail: plain SQL over Bun.sql, no ORM; MA200 = trailing 200 *sessions* (not calendar days).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.ARTHARA_DATABASE_URL;
if (!url) {
  console.error("ARTHARA_DATABASE_URL is not set. Put it in .env (gitignored) — read-only credentials are enough.");
  process.exit(1);
}
const OUT = resolve(import.meta.dir, "jci-trend.json");
const sql = new Bun.SQL(url);

const rows = await sql`
  with s as (
    select trade_date, close_price,
           avg(close_price) over (order by trade_date rows between 199 preceding and current row) as ma200,
           count(*)         over (order by trade_date rows between 199 preceding and current row) as n
    from index_prices where index_symbol = 'IHSG'
  )
  select to_char(trade_date, 'YYYY-MM-DD') as date, round(close_price, 2)::float8 as close, round(ma200, 2)::float8 as ma200
  from s where n = 200 and trade_date >= '2021-01-01' order by trade_date`;
await sql.close();

if (!rows.length) throw new Error("index_prices returned no IHSG rows");
const out = {
  _meta: {
    source: "arthara-db public.index_prices (IHSG close_price), MA200 = trailing 200-session simple average computed in SQL",
    asOf: rows[rows.length - 1].date,
  },
  rows,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`Wrote ${rows.length} IHSG points ${rows[0].date} → ${out._meta.asOf} to scripts/jci-trend.json`);
