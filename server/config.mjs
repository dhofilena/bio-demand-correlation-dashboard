// ===========================================================================
// ADAPTER CONFIG — this is the file you edit to wire in real endpoints.
//
// Nothing here is bundled to the browser. Values come from environment
// variables (see .env.example). Each adapter has an `endpoints` block and a
// `fieldMap` so you can adapt to whatever the live API actually returns without
// touching the transform logic.
// ===========================================================================

export const env = {
  // Secret — never exposed to the client.
  TW_API_KEY: process.env.TW_API_KEY ?? '',
  TW_SHOP_ID: process.env.TW_SHOP_ID ?? '',
  TW_API_BASE: process.env.TW_API_BASE ?? 'https://api.triplewhale.com',

  // 'live' attempts the real APIs; anything else (or a missing key) uses mock.
  DEMAND_DATA_MODE: process.env.DEMAND_DATA_MODE ?? 'mock',

  // Which adapter supplies Amazon search: 'mock' | 'triplewhale' | 'custom'.
  AMAZON_ADAPTER: process.env.AMAZON_ADAPTER ?? 'mock',
  AMAZON_API_BASE: process.env.AMAZON_API_BASE ?? '',
  AMAZON_API_KEY: process.env.AMAZON_API_KEY ?? '',
};

export const tripleWhaleConfig = {
  base: env.TW_API_BASE,
  // ----------------------------------------------------------------------
  // 👉 PLUG IN REAL ENDPOINT PATHS HERE.
  // Triple Whale exposes metrics via its data/summary API. The exact path and
  // body depend on your account & API version, so they are placeholders.
  // Common shape: POST {base}/api/v2/data/metrics with a JSON body containing
  // shopId, a date range, granularity 'week', and a list of metric ids.
  // ----------------------------------------------------------------------
  endpoints: {
    metrics: '/api/v2/data/metrics', // <-- replace with your real path
  },
  // Map dashboard fields → the metric id / response key the API returns.
  // 👉 Rename the right-hand values to match the live payload.
  fieldMap: {
    googleOrganicSessions: 'organic_sessions',
    directTraffic: 'direct_visits',
    amazonRevenue: 'amazon_revenue',
    googlePaidRevenue: 'google_paid_revenue',
  },
};

export const amazonSearchConfig = {
  base: env.AMAZON_API_BASE,
  endpoints: {
    search: '/search-volume', // <-- replace with your real Amazon search source path
  },
  fieldMap: {
    amazonSearchVolume: 'search_volume',
  },
};
