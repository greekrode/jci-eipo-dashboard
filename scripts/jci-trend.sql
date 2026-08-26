-- IHSG close + trailing 200-session MA, one row per session from 2021-01-01.
-- Run through the arthara-db MCP (execute_sql) — it returns a single `series` string;
-- save that string to a file and run: bun run data:jci <file>
with s as (
  select trade_date, close_price,
         avg(close_price) over (order by trade_date rows between 199 preceding and current row) as ma200,
         count(*)         over (order by trade_date rows between 199 preceding and current row) as n
  from index_prices where index_symbol = 'IHSG'
)
select string_agg(to_char(trade_date, 'YYYY-MM-DD') || ',' || round(close_price, 2) || ',' || round(ma200, 2), ';' order by trade_date) as series,
       count(*) as rows
from s where n = 200 and trade_date >= '2021-01-01';
