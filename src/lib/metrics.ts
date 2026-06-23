import type { MetricKey, MetricSummary, SeriesPoint, StatusLabel, WeeklyRecord } from '../types';
import { METRICS } from '../config/metrics';

// Thresholds (percent vs the trailing 4-week baseline) that map a metric to a
// scannable status word. Tuned to be forgiving — weekly marketing data is noisy.
const STRONG = 8;
const MODERATE = 2;
const SOFT = -2;

export function statusFromVsRolling(vsRollingPct: number | null): StatusLabel | null {
  if (vsRollingPct === null) return null;
  if (vsRollingPct >= STRONG) return 'Strong';
  if (vsRollingPct >= MODERATE) return 'Moderate';
  if (vsRollingPct > SOFT) return 'Flat';
  return 'Soft';
}

/** Build the derived series (deltas, rolling baseline, indexed, status) for one metric. */
export function buildSeries(records: WeeklyRecord[], key: MetricKey): SeriesPoint[] {
  const firstNonNull = records.find((r) => r[key] !== null && r[key] !== undefined)?.[key] ?? null;
  const base = typeof firstNonNull === 'number' && firstNonNull !== 0 ? firstNonNull : null;

  return records.map((r, i) => {
    const value = (r[key] as number | null) ?? null;
    const prev = i > 0 ? ((records[i - 1][key] as number | null) ?? null) : null;

    const priorWeekDelta = value !== null && prev !== null ? value - prev : null;
    const priorWeekDeltaPct =
      value !== null && prev !== null && prev !== 0 ? ((value - prev) / prev) * 100 : null;

    // Trailing 4-week average (excluding the current week) as the baseline.
    const window = records
      .slice(Math.max(0, i - 4), i)
      .map((w) => w[key] as number | null)
      .filter((v): v is number => v !== null);
    const rolling4 = window.length ? window.reduce((a, b) => a + b, 0) / window.length : null;

    const vsRollingPct =
      value !== null && rolling4 !== null && rolling4 !== 0
        ? ((value - rolling4) / rolling4) * 100
        : null;

    const indexed = value !== null && base !== null ? (value / base) * 100 : null;

    return {
      weekStart: r.weekStart,
      weekLabel: r.weekLabel,
      value,
      priorWeekDelta,
      priorWeekDeltaPct,
      rolling4,
      vsRollingPct,
      indexed,
      status: statusFromVsRolling(vsRollingPct),
    };
  });
}

/** Roll a metric up into the shape KPI cards / scorecard rows consume. */
export function summarize(records: WeeklyRecord[], key: MetricKey): MetricSummary {
  const points = buildSeries(records, key);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const spark = points
    .slice(-8)
    .map((p) => p.value)
    .filter((v): v is number => v !== null);

  return {
    def: METRICS[key],
    points,
    current: last?.value ?? null,
    previous: prev?.value ?? null,
    deltaPct: last?.priorWeekDeltaPct ?? null,
    vsRollingPct: last?.vsRollingPct ?? null,
    status: last?.status ?? null,
    spark,
  };
}

export function summarizeAll(records: WeeklyRecord[], keys: MetricKey[]): MetricSummary[] {
  return keys.map((k) => summarize(records, k));
}
