import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
for (const [key, value] of Object.entries(loadEnv('development', root, ''))) {
  process.env[key] = value;
}

const { tripleWhaleConfig: cfg, env } = await import('../server/config.mjs');
const { normalizeSqlResponse, transformBrandedSearchRows } = await import(
  '../server/adapters/tripleWhaleAdapter.mjs'
);
const { normalizeDemandPeriod } = await import('../server/dates.mjs');

const period = normalizeDemandPeriod('2026-03-16', '2026-06-21');
const q = cfg.queries.brandedSearch;

const res = await fetch(`${cfg.base}${cfg.endpoints.sql}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.TW_API_KEY}`,
    'x-api-key': env.TW_API_KEY,
  },
  body: JSON.stringify({
    shopId: env.TW_SHOP_ID,
    query: q.sql,
    currency: cfg.currency,
    period: { startDate: period.start, endDate: period.end },
  }),
});

const rows = normalizeSqlResponse(JSON.parse(await res.text()));
const transformed = transformBrandedSearchRows(rows, q);
console.log('products', transformed.products);
console.log('total weeks', transformed.total.length);
