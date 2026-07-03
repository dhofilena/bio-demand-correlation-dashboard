// Canonical branded-search product lines — matches the BIO scorecard groupings.
// Each group has one or more lowercase keywords matched as: search_query LIKE '%keyword%'

/** @type {{ group: string, keywords: string[], sort: number }[]} */
export const BRANDED_SEARCH_GROUPS = [
  {
    group: 'Magnesium Breakthrough',
    keywords: ['magnesium breakthrough', 'magnesium breakthrough drink'],
    sort: 1,
  },
  {
    group: 'Brand / BIOptimizers',
    keywords: ['bioptimizers', 'biooptimizers', 'bio optimizers', 'biooptimizer', 'bio optimizer'],
    sort: 2,
  },
  {
    group: 'MassZymes',
    keywords: ['masszymes', 'mass zymes'],
    sort: 3,
  },
  {
    group: 'Sleep Breakthrough',
    keywords: ['sleep breakthrough', 'dream optimizer'],
    sort: 4,
  },
  {
    group: 'Berberine Breakthrough',
    keywords: ['berberine breakthrough'],
    sort: 5,
  },
  {
    group: 'Probiotic Breakthrough / P3-OM',
    keywords: ['probiotic breakthrough', 'p3-om', 'p3om', 'p3 om'],
    sort: 6,
  },
  {
    group: 'CogniBiotics',
    keywords: ['cognibiotics', 'cogni biotics'],
    sort: 7,
  },
  {
    group: 'HCL Breakthrough',
    keywords: ['hcl breakthrough'],
    sort: 8,
  },
  {
    group: 'Gluten Guardian',
    keywords: ['gluten guardian'],
    sort: 9,
  },
  {
    group: 'kApex',
    keywords: ['kapex', 'k apex'],
    sort: 10,
  },
  {
    group: 'Blood Sugar Breakthrough',
    keywords: ['blood sugar breakthrough'],
    sort: 11,
  },
  {
    group: 'Protein Breakthrough',
    keywords: ['protein breakthrough'],
    sort: 12,
  },
  {
    group: 'VegZymes',
    keywords: ['vegzymes', 'veg zymes'],
    sort: 13,
  },
];

/** Escape single quotes for SQL string literals. */
function sqlLiteral(value) {
  return value.replace(/'/g, "''");
}

/** Build the canonical-groups CTE used by the branded search SQL query. */
export function buildCanonicalGroupsCte() {
  const rows = BRANDED_SEARCH_GROUPS.flatMap(({ group, keywords }) =>
    keywords.map((keyword) => `  SELECT '${sqlLiteral(group)}' AS product_group, '${sqlLiteral(keyword)}' AS match_keyword`),
  );
  return `canonical_groups AS (\n${rows.join('\n  UNION ALL\n')}\n)`;
}

/** Weekly branded search volume by canonical product line (not raw SKU names). */
export function buildBrandedSearchSql() {
  return `WITH ${buildCanonicalGroupsCte()},
search_terms AS (
  SELECT
    event_date,
    lower(query) AS search_query,
    impressions,
    clicks,
    position
  FROM search_terms_table
  WHERE
    event_date BETWEEN @startDate AND @endDate
    AND channel = 'google'
),
matched AS (
  SELECT DISTINCT
    st.event_date,
    st.search_query,
    cg.product_group,
    st.impressions,
    st.clicks,
    st.position
  FROM search_terms AS st
  INNER JOIN canonical_groups AS cg
    ON st.search_query LIKE concat('%', cg.match_keyword, '%')
)
SELECT
  toStartOfWeek(event_date, 1) AS week_start_monday,
  product_group,
  SUM(impressions) AS branded_search_volume,
  SUM(clicks) AS branded_search_clicks,
  AVG(position) AS avg_position
FROM matched
GROUP BY
  week_start_monday,
  product_group
ORDER BY
  week_start_monday ASC,
  branded_search_volume DESC`;
}

/** Stable display order for dropdowns (matches scorecard-style grouping). */
export function brandedSearchGroupOrder() {
  return [...BRANDED_SEARCH_GROUPS].sort((a, b) => a.sort - b.sort).map((g) => g.group);
}
