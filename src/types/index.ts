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
  podcastImpressions: number | null; // Podscribe total impressions (BIOptimizers - TOTALS row)
  podcastAdSpend: number | null;
  emv: number | null; // earned media value

  // --- Demand outcomes (downstream / lagging signals) ---
  amazonSearchVolume: number | null;
  googleOrganicSessions: number | null;
  nonOrganicPageViews: number | null;
  amazonRevenue: number | null;
  dtcRevenue: number | null;

  notes?: string;
}

/** Keys of WeeklyRecord that hold a plottable numeric series. */
export type MetricKey =
  | 'influencerPosts'
  | 'instagramPosts'
  | 'tiktokPosts'
  | 'podcastImpressions'
  | 'podcastAdSpend'
  | 'emv'
  | 'amazonSearchVolume'
  | 'googleOrganicSessions'
  | 'nonOrganicPageViews'
  | 'amazonRevenue'
  | 'dtcRevenue';

export type SignalGroup = 'content' | 'demand';
export type Unit = 'count' | 'currency' | 'index';
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
  bestLag: number; // weeks the content signal appears to lead (0,1,2)
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
