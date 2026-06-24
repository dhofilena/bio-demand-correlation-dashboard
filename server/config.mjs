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
  TW_CURRENCY: process.env.TW_CURRENCY ?? 'USD',

  // 'live' attempts the real APIs; anything else (or a missing key) uses mock.
  DEMAND_DATA_MODE: process.env.DEMAND_DATA_MODE ?? 'mock',

  // Which adapter supplies Amazon search: 'mock' | 'triplewhale' | 'custom'.
  AMAZON_ADAPTER: process.env.AMAZON_ADAPTER ?? 'mock',
  AMAZON_API_BASE: process.env.AMAZON_API_BASE ?? '',
  AMAZON_API_KEY: process.env.AMAZON_API_KEY ?? '',

  // Google Sheets — private CSV source via service account (server-only).
  GOOGLE_SHEETS_ENABLED: process.env.GOOGLE_SHEETS_ENABLED === 'true',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ?? '',
  /** @deprecated Use GOOGLE_SHEET_TABS when you have more than one tab. */
  GOOGLE_SHEET_GID: process.env.GOOGLE_SHEET_GID ?? '0',
  /** JSON array: [{"gid":"0","label":"Social","format":"social-scorecard"},{"gid":"123","label":"Podscribe","format":"podscribe"}] */
  GOOGLE_SHEET_TABS: process.env.GOOGLE_SHEET_TABS ?? '',
  GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '',
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ?? '',
};

/**
 * Tabs to pull from the workbook identified by GOOGLE_SHEET_ID.
 * Each tab is targeted by its gid (from the URL #gid=…).
 * @returns {{ gid: string, label: string }[]}
 */
export function getGoogleSheetTabs() {
  if (env.GOOGLE_SHEET_TABS) {
    const parsed = JSON.parse(env.GOOGLE_SHEET_TABS);
    if (!Array.isArray(parsed) || !parsed.length) {
      throw new Error('GOOGLE_SHEET_TABS must be a non-empty JSON array');
    }
    return parsed.map((tab, i) => ({
      gid: String(tab.gid ?? tab.sheetGid ?? '0'),
      label: String(tab.label ?? tab.name ?? `Sheet ${i + 1}`),
      format: tab.format ? String(tab.format) : undefined,
    }));
  }
  return [{ gid: env.GOOGLE_SHEET_GID, label: 'Google Sheet' }];
}

export const tripleWhaleConfig = {
  base: env.TW_API_BASE,
  currency: env.TW_CURRENCY,
  endpoints: {
    sql: '/api/v2/orcabase/api/sql',
  },
  // Custom SQL queries — one per dashboard demand field. Use @startDate / @endDate
  // in the query; the adapter injects the requested range via `period`.
  // Docs: https://triplewhale.readme.io/reference/data-out-execute-custom-sql-query
  queries: {
    googleOrganicSessions: {
      weekColumn: 'week_start_monday',
      valueColumn: 'non_paid_sessions',
      sql: `SELECT
  toStartOfWeek(event_date, 1) AS week_start_monday,
  SUM(sessions) AS non_paid_sessions
FROM ga4_sessions_agg_table
WHERE (
  session_default_channel_group NOT IN (
    'Paid Search',
    'Paid Social',
    'Paid Shopping',
    'Paid Video',
    'Paid Other',
    'Cross-network',
    'Display'
  )
  OR session_default_channel_group IS NULL
)
  AND event_date BETWEEN @startDate AND @endDate
GROUP BY week_start_monday
ORDER BY week_start_monday`,
    },
    nonOrganicPageViews: {
      weekColumn: 'week_start_monday',
      valueColumn: 'non_organic_page_views',
      sql: `SELECT
  toStartOfWeek(event_date, 1) AS week_start_monday,
  SUM(screen_page_views) AS non_organic_page_views,
  SUM(sessions) AS non_organic_sessions
FROM ga4_sessions_agg_table
WHERE session_default_channel_group NOT IN (
  'Organic Search',
  'Organic Social',
  'Organic Video'
)
  AND event_date BETWEEN @startDate AND @endDate
GROUP BY week_start_monday
ORDER BY week_start_monday`,
    },
    dtcRevenue: {
      weekColumn: 'week_start_monday',
      valueColumn: 'website_sales',
      sql: `SELECT
  toStartOfWeek(event_date, 1) AS week_start_monday,
  SUM(order_revenue) AS website_sales,
  uniq(order_id) AS website_orders
FROM orders_table
WHERE event_date BETWEEN @startDate AND @endDate
  AND platform NOT ILIKE '%amazon%'
GROUP BY week_start_monday
ORDER BY week_start_monday`,
    },
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
