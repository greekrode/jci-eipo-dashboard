-- IHSG close + trailing 200-session MA from 2021-01-01, emitted as the finished scripts/jci-trend.json.
-- Run through the alpha-flow DB MCP (execute_sql) — there is no direct DB connection by design —
-- and save the returned `jci` text as scripts/jci-trend.json, then `bun run data`.
with s as (
  select trade_date, close_price,
         avg(close_price) over (order by trade_date rows between 199 preceding and current row) as ma200,
         count(*)         over (order by trade_date rows between 199 preceding and current row) as n
  from index_prices where index_symbol = 'IHSG'
), r as (
  select trade_date, round(close_price, 2)::float8 as close, round(ma200, 2)::float8 as ma200
  from s where n = 200 and trade_date >= '2021-01-01'
)
select json_build_object(
  '_meta', json_build_object(
    'source', 'arthara-db public.index_prices (IHSG close_price), MA200 = trailing 200-session simple average computed in SQL (scripts/jci-trend.sql via MCP)',
    'asOf', to_char(max(trade_date), 'YYYY-MM-DD')),
  'rows', json_agg(json_build_object('date', to_char(trade_date, 'YYYY-MM-DD'), 'close', close, 'ma200', ma200) order by trade_date)
)::text as jci
from r;
