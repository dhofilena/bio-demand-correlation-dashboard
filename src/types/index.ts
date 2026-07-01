// ---------------------------------------------------------------------------
// Unified weekly data model — the single shape every source normalizes into.
// CSV (content/social) + Triple Whale (demand) merge into this by `weekStart`.
// ---------------------------------------------------------------------------

/** One normalized week. Numeric fields are nullable so partial sources merge cleanly. */
export interface WeeklyRecord {
  weekStart: string; // ISO date of the Monday, e.g. "2026-03-16"
  weekLabel: string; // short display label, e.g. "Apr 6 to Apr 12"
  weekNumber: number; // ISO-ish running week index used in the source sheets

  // --- Content activity (upstream / leading signals) ---
  influencerPosts: number | null;
  instagramPosts: number | null;
  tiktokPosts: number | null;
  profilePosted: number | null; // Mighty Scout Total — Profile Posted (row 10)
  socialImpressions: number | null; // Mighty Scout Total — Impressions (row 12)
  socialReach: number | null; // Mighty Scout Total — Reach (row 14)
  socialEngagement: number | null; // Mighty Scout Total — Engagement (row 16)
  mediaPosted: number | null; // Mighty Scout Total — Media Posted (row 20)
  podcastImpressions: number | null; // Podscribe — Total Impressions (row 6)
  podcastIpModellingRevenue: number | null; // Podscribe — IP Modelling Revenue (row 8)
  podcastLastClickSales: number | null; // Podscribe — Last-Click Sales (row 15)
  podcastIpSalesMultiplier: number | null; // Podscribe — IP Sales vs Last Click Multiplier (row 48)
  podcastAdSpend: number | null;
  emv: number | null; // Mighty Scout Total — Earned Media Value (row 22)

  // --- Demand outcomes (downstream / lagging signals) ---
  googleOrganicSessions: number | null;
  nonOrganicPageViews: number | null;
  gaOrganicRevenue: number | null;
  gaPaidRevenue: number | null;
  gaSocialRevenue: number | null;
  gaOtherRevenue: number | null;
  amazonOrganicRevenue: number | null;
  amazonPpcRevenue: number | null;
  dtcRevenue: number | null;

  notes?: string;
}

/** Keys of WeeklyRecord that hold a plottable numeric series. */
export type MetricKey =
  | 'influencerPosts'
  | 'instagramPosts'
  | 'tiktokPosts'
  | 'profilePosted'
  | 'socialImpressions'
  | 'socialReach'
  | 'socialEngagement'
  | 'mediaPosted'
  | 'podcastImpressions'
  | 'podcastIpModellingRevenue'
  | 'podcastLastClickSales'
  | 'podcastIpSalesMultiplier'
  | 'podcastAdSpend'
  | 'emv'
  | 'googleOrganicSessions'
  | 'nonOrganicPageViews'
  | 'gaOrganicRevenue'
  | 'gaPaidRevenue'
  | 'gaSocialRevenue'
  | 'gaOtherRevenue'
  | 'amazonOrganicRevenue'
  | 'amazonPpcRevenue'
  | 'dtcRevenue';

export type SignalGroup = 'content' | 'demand';
export type Unit = 'count' | 'currency' | 'index' | 'ratio';
export type StatusLabel = 'Strong' | 'Moderate' | 'Flat' | 'Soft';
export type Confidence = 'Low' | 'Medium' | 'High';

/** Static definition of a metric: how to label, color, group and format it. */
export interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  group: SignalGroup;
  unit: Unit;
  color: string;
  /** True if the metric is a candidate "demand outcome" shown in the scorecard. */
  isDemandChannel?: boolean;
  description: string;
}

/** A single derived point for one metric in one week. */
export interface SeriesPoint {
  weekStart: string;
  weekLabel: string;
  value: number | null;
  priorWeekDelta: number | null; // absolute vs previous week
  priorWeekDeltaPct: number | null;
  rolling4: number | null; // trailing 4-week average (baseline)
  vsRollingPct: number | null; // current vs rolling-4 baseline
  indexed: number | null; // base = 100 at first non-null value
  status: StatusLabel | null;
}

/** Per-metric rollup used by KPI cards and the scorecard. */
export interface MetricSummary {
  def: MetricDef;
  points: SeriesPoint[];
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
  vsRollingPct: number | null;
  status: StatusLabel | null;
  spark: number[]; // recent values for the sparkline
}

/** Result of testing how strongly a content signal leads a demand signal. */
export interface LagResult {
  contentKey: MetricKey;
  demandKey: MetricKey;
  bestLag: number; // weeks the content signal appears to lead (0–4)
  r: number; // Pearson r at bestLag
  byLag: { lag: number; r: number }[];
  confidence: Confidence;
}

export type InsightKind =
  | 'demand-strength'
  | 'content-led-lift'
  | 'paid-delivery'
  | 'watch'
  | 'insufficient';

/** A single plain-English, evidence-backed observation. */
export interface Insight {
  id: string;
  kind: InsightKind;
  confidence: Confidence;
  title: string;
  text: string;
  evidence: string;
}

export type DataSourceStatus = 'live' | 'mock' | 'partial' | 'error' | 'loading';

export type CsvConnectionStatus = 'idle' | 'loading' | 'connected' | 'error' | 'disabled';
export type CsvConnectionSource = 'google-sheets' | 'upload';

export interface CsvSheetTab {
  gid: string;
  label: string;
  weekCount: number;
  detail: string;
}

export interface CsvConnection {
  status: CsvConnectionStatus;
  source: CsvConnectionSource | null;
  label: string;
  weekCount: number;
  connectedAt: string | null;
  detail: string;
  tabs: CsvSheetTab[];
}

export interface SourceHealth {
  id: string;
  label: string;
  status: DataSourceStatus;
  detail: string;
}

/** Payload returned by the server proxy (`/api/triplewhale/weekly`). */
export interface DemandApiResponse {
  source: 'triple-whale' | 'mock';
  generatedAt: string;
  weeks: Partial<WeeklyRecord>[];
  health: SourceHealth[];
  warning?: string;
}
