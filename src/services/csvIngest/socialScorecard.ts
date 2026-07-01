import type { MetricKey, WeeklyRecord } from '../../types';
import type { WeeklyParseResult } from './types';
import {
  emptyWeeklyRecord,
  isGrowthOrRateRow,
  parseRawCsvRows,
  rowLabel,
  toNumber,
} from './shared';
import { parseWideWeeklyLayout, type WideWeeklyLayout } from './wideWeeklyLayout';

/** 1-based sheet rows — Mighty Scout Total (IG + TikTok) in the Social Metrics Scorecard. */
const TOTAL_METRICS: { key: MetricKey; row: number; kpiNeedle: string }[] = [
  { key: 'profilePosted', row: 10, kpiNeedle: 'profle posted' },
  { key: 'socialImpressions', row: 12, kpiNeedle: 'impressions' },
  { key: 'socialReach', row: 14, kpiNeedle: 'reach' },
  { key: 'socialEngagement', row: 16, kpiNeedle: 'engagement (likes' },
  { key: 'mediaPosted', row: 20, kpiNeedle: 'media posted' },
  { key: 'emv', row: 22, kpiNeedle: 'earned media value' },
];

function findTotalRow(rows: string[][], kpiNeedle: string, fallbackRow: number): number {
  const needle = kpiNeedle.toLowerCase();
  const fallbackIdx = fallbackRow - 1;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const label = rowLabel(row);
    if (!label.includes('mighty scout total')) continue;
    const kpi = (row[1] ?? '').toLowerCase();
    if (isGrowthOrRateRow(label, kpi)) continue;
    if (kpi.includes(needle) || label.includes(needle)) return r;
  }
  return fallbackIdx >= 0 && fallbackIdx < rows.length ? fallbackIdx : -1;
}

function resolveTotalRows(rows: string[][]): Map<MetricKey, number> {
  const resolved = new Map<MetricKey, number>();
  for (const { key, row, kpiNeedle } of TOTAL_METRICS) {
    const rowIdx = findTotalRow(rows, kpiNeedle, row);
    if (rowIdx >= 0) resolved.set(key, rowIdx);
  }
  return resolved;
}

function buildRecordsFromWide(
  layout: WideWeeklyLayout,
  metricRows: Map<MetricKey, number>,
): WeeklyRecord[] {
  const { rows, weeks } = layout;
  return weeks.map((week) => {
    const rec = emptyWeeklyRecord(week);
    metricRows.forEach((rowIdx, key) => {
      rec[key] = toNumber(rows[rowIdx][week.colIdx]);
    });
    if (rec.profilePosted !== null) rec.influencerPosts = rec.profilePosted;
    return rec;
  });
}

export function tryParseSocialScorecard(text: string): WeeklyParseResult | null {
  const rows = parseRawCsvRows(text);
  const layout = parseWideWeeklyLayout(rows);
  if (!layout) return null;

  const metricRows = resolveTotalRows(rows);
  if (!metricRows.size) return null;

  return {
    records: buildRecordsFromWide(layout, metricRows),
    mappedMetrics: metricRows.size,
  };
}

/** @deprecated Use tryParseSocialScorecard */
export const tryParseScorecardCsv = tryParseSocialScorecard;
