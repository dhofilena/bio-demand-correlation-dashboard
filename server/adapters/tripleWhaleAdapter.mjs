import { env, tripleWhaleConfig as cfg } from '../config.mjs';
import { brandedSearchGroupOrder } from '../brandedSearchGroups.mjs';
import { mondayOf, weekLabel } from '../dates.mjs';

// ===========================================================================
// Triple Whale adapter — demand metrics via the Orca SQL API.
// Each configured query returns weekly rows that merge into partial records.
// ===========================================================================

/**
 * @param {string} start yyyy-mm-dd
 * @param {string} end   yyyy-mm-dd
 * @returns {Promise<Array<object>>} partial weekly records keyed by weekStart
 */
export async function fetchTripleWhaleWeekly(start, end) {
  if (!env.TW_API_KEY) throw new Error('TW_API_KEY not set');
  if (!env.TW_SHOP_ID) throw new Error('TW_SHOP_ID not set');

  const entries = Object.entries(cfg.queries ?? {});
  if (!entries.length) throw new Error('No Triple Whale SQL queries configured');

  const byWeek = new Map();
  /** @type {import('../../src/types/index.ts').BrandedSearchData | null} */
  let brandedSearch = null;

  for (const [field, queryCfg] of entries) {
    const rows = await executeSqlQuery(start, end, queryCfg.sql);

    if (queryCfg.productDimensional) {
      brandedSearch = transformBrandedSearchRows(rows, queryCfg);
      continue;
    }

    const weekRows = queryCfg.fields
      ? transformMultiFieldSqlRows(rows, queryCfg)
      : transformSqlRows(rows, queryCfg, field);

    for (const row of weekRows) {
      const existing = byWeek.get(row.weekStart) ?? { weekStart: row.weekStart, weekLabel: row.weekLabel };
      const { weekStart, weekLabel: label, ...values } = row;
      byWeek.set(row.weekStart, { ...existing, ...values });
    }
  }

  const weeks = [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  if (!weeks.length) {
    throw new Error('Triple Whale SQL returned no weekly rows for the requested range');
  }
  return { weeks, brandedSearch };
}

/**
 * @param {string} start
 * @param {string} end
 * @param {string} query
 */
async function executeSqlQuery(start, end, query) {
  const url = `${cfg.base}${cfg.endpoints.sql}`;
  const body = {
    shopId: env.TW_SHOP_ID,
    query,
    currency: cfg.currency,
    period: { startDate: start, endDate: end },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.TW_API_KEY}`,
      'x-api-key': env.TW_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const hint = (await res.text()).trim().slice(0, 200);
    const suffix = hint ? ` — ${hint}` : '';
    throw new Error(`Triple Whale SQL responded ${res.status} ${res.statusText}${suffix}`);
  }

  const json = await res.json();
  return normalizeSqlResponse(json);
}

/** SQL API returns a bare array of row objects. */
export function normalizeSqlResponse(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.result)) return json.result;
  return [];
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ weekColumn: string, valueColumn: string }} queryCfg
 * @param {string} field
 */
export function transformSqlRows(rows, queryCfg, field) {
  const { weekColumn, valueColumn } = queryCfg;
  return rows.map((row) => {
    const iso = mondayOf(String(row[weekColumn] ?? ''));
    const v = Number(row[valueColumn]);
    return {
      weekStart: iso,
      weekLabel: weekLabel(iso),
      [field]: Number.isFinite(v) ? v : null,
    };
  });
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ weekColumn: string, fields: Record<string, string> }} queryCfg
 */
export function transformMultiFieldSqlRows(rows, queryCfg) {
  const { weekColumn, fields } = queryCfg;
  return rows.map((row) => {
    const iso = mondayOf(String(row[weekColumn] ?? ''));
    const out = { weekStart: iso, weekLabel: weekLabel(iso) };
    for (const [field, column] of Object.entries(fields)) {
      const v = Number(row[column]);
      out[field] = Number.isFinite(v) ? v : null;
    }
    return out;
  });
}

/**
 * Product-dimensional branded search rows → per-product weekly series + shop total.
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ weekColumn: string, productColumn: string, fields: Record<string, string> }} queryCfg
 */
export function transformBrandedSearchRows(rows, queryCfg) {
  const { weekColumn, productColumn, fields } = queryCfg;
  const byProduct = new Map();
  const totalByWeek = new Map();

  for (const row of rows) {
    const iso = mondayOf(String(row[weekColumn] ?? ''));
    const product = String(row[productColumn] ?? '').trim();
    if (!iso || !product) continue;

    const point = {
      weekStart: iso,
      weekLabel: weekLabel(iso),
      volume: readMetric(row, fields.volume),
      clicks: readMetric(row, fields.clicks),
      avgPosition: readMetric(row, fields.avgPosition),
    };

    const productSeries = byProduct.get(product) ?? [];
    productSeries.push(point);
    byProduct.set(product, productSeries);

    const total = totalByWeek.get(iso) ?? {
      weekStart: iso,
      weekLabel: weekLabel(iso),
      volume: 0,
      clicks: 0,
      positionWeighted: 0,
      positionWeight: 0,
    };
    if (point.volume !== null) total.volume += point.volume;
    if (point.clicks !== null) total.clicks += point.clicks;
    if (point.avgPosition !== null && point.volume !== null && point.volume > 0) {
      total.positionWeighted += point.avgPosition * point.volume;
      total.positionWeight += point.volume;
    }
    totalByWeek.set(iso, total);
  }

  const products = [...byProduct.keys()].sort((a, b) => {
    const order = brandedSearchGroupOrder();
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  const normalizedByProduct = {};
  for (const [product, series] of byProduct.entries()) {
    normalizedByProduct[product] = [...series].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }

  const total = [...totalByWeek.values()]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map(({ weekStart, weekLabel: label, volume, clicks, positionWeighted, positionWeight }) => ({
      weekStart,
      weekLabel: label,
      volume: volume || null,
      clicks: clicks || null,
      avgPosition:
        positionWeight > 0 ? Math.round((positionWeighted / positionWeight) * 100) / 100 : null,
    }));

  return { products, byProduct: normalizedByProduct, total };
}

function readMetric(row, column) {
  const v = Number(row[column]);
  return Number.isFinite(v) ? v : null;
}
