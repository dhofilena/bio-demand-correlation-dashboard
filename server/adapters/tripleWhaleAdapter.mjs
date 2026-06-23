import { env, tripleWhaleConfig as cfg } from '../config.mjs';
import { mondayOf, weekLabel } from '../dates.mjs';

// ===========================================================================
// Triple Whale adapter — website organic traffic, direct, revenue.
//
// This is intentionally thin and well-marked. Replace the request body and the
// response transform with the real contract once you confirm it against your
// Triple Whale account. Until `DEMAND_DATA_MODE=live` AND a key are set, the
// handler uses the mock adapter instead, so the app runs with zero config.
// ===========================================================================

/**
 * Fetch weekly demand metrics from Triple Whale.
 * @param {string} start yyyy-mm-dd
 * @param {string} end   yyyy-mm-dd
 * @returns {Promise<Array<object>>} partial weekly records keyed by weekStart
 */
export async function fetchTripleWhaleWeekly(start, end) {
  if (!env.TW_API_KEY) throw new Error('TW_API_KEY not set');

  const url = `${cfg.base}${cfg.endpoints.metrics}`;

  // 👉 ADAPT THIS REQUEST BODY to the real Triple Whale metrics endpoint.
  const body = {
    shopId: env.TW_SHOP_ID,
    startDate: start,
    endDate: end,
    granularity: 'week',
    metrics: Object.values(cfg.fieldMap), // the API-side metric ids
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 👉 Confirm the auth header your account expects (Authorization vs x-api-key).
      Authorization: `Bearer ${env.TW_API_KEY}`,
      'x-api-key': env.TW_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Triple Whale responded ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return transformTripleWhale(json);
}

/**
 * Normalize a Triple Whale response into partial weekly records.
 * 👉 EDIT to match the real payload. The default assumes an array of rows under
 *    `data`, each with a `date`/`week` field plus the metric keys in fieldMap.
 */
export function transformTripleWhale(json) {
  const rows = json?.data ?? json?.rows ?? [];
  const map = cfg.fieldMap;
  return rows.map((row) => {
    const iso = mondayOf(row.date ?? row.week ?? row.startDate);
    const rec = { weekStart: iso, weekLabel: weekLabel(iso) };
    for (const [field, apiKey] of Object.entries(map)) {
      const v = Number(row[apiKey]);
      rec[field] = Number.isFinite(v) ? v : null;
    }
    return rec;
  });
}
