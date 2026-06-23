import { env, amazonSearchConfig as cfg } from '../config.mjs';
import { mondayOf, weekLabel } from '../dates.mjs';

// ===========================================================================
// Amazon search adapter — DELIBERATELY SEPARATE from Triple Whale.
//
// Amazon branded-search demand may not come from Triple Whale at all, so it
// lives in its own swappable adapter. Point AMAZON_ADAPTER at:
//   • 'mock'        → handled by mockDemand (default)
//   • 'triplewhale' → if your TW account does expose it, reuse the TW adapter
//   • 'custom'      → this file: plug in Helium 10 / Jungle Scout / internal feed
// ===========================================================================

/**
 * Fetch weekly Amazon search volume from a custom source.
 * @returns {Promise<Array<object>>} partial weekly records keyed by weekStart
 */
export async function fetchAmazonSearchWeekly(start, end) {
  if (!cfg.base || !env.AMAZON_API_KEY) throw new Error('Amazon search source not configured');

  const url = `${cfg.base}${cfg.endpoints.search}?start=${start}&end=${end}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.AMAZON_API_KEY}` },
  });
  if (!res.ok) throw new Error(`Amazon search source responded ${res.status}`);

  const json = await res.json();
  return transformAmazonSearch(json);
}

/** 👉 EDIT to match the real payload shape. */
export function transformAmazonSearch(json) {
  const rows = json?.data ?? json?.rows ?? [];
  const apiKey = cfg.fieldMap.amazonSearchVolume;
  return rows.map((row) => {
    const iso = mondayOf(row.date ?? row.week);
    const v = Number(row[apiKey]);
    return {
      weekStart: iso,
      weekLabel: weekLabel(iso),
      amazonSearchVolume: Number.isFinite(v) ? v : null,
    };
  });
}
