import type { MetricKey, WeeklyRecord } from '../../types';
import type { WeeklyParseResult } from './types';
import {
  emptyWeeklyRecord,
  FIELD_HINTS,
  isGrowthOrRateRow,
  METRIC_KEYS,
  parseRawCsvRows,
  rowHasWeekData,
  rowLabel,
  toNumber,
} from './shared';
import { parseWideWeeklyLayout, type WideWeeklyLayout } from './wideWeeklyLayout';

function scorecardRowScore(metric: MetricKey, label: string, kpiCell: string): number {
  const kpi = kpiCell.toLowerCase();
  let score = 0;
  if (label.includes('mighty scout total') && (metric === 'influencerPosts' || metric === 'emv')) score += 100;
  if (label.includes('@bioptimizers ig') || label.includes('bioptimizers ig')) {
    if (metric === 'instagramPosts') score += 100;
  }
  if (label.includes('@bioptimizers tiktok') || label.includes('bioptimizers tiktok')) {
    if (metric === 'tiktokPosts') score += 100;
  }
  if (kpi === 'kpis' || kpi === '') score -= 80;
  if (isGrowthOrRateRow(label, kpi)) score -= 50;
  if (metric === 'emv' && label.includes('earned media value') && !label.includes('rate')) score += 30;
  if (metric === 'influencerPosts' && (label.includes('profle posted') || label.includes('profile posted'))) {
    score += 30;
  }
  if (metric === 'influencerPosts' && label.includes('mighty scout total')) score += 20;
  if (metric === 'instagramPosts' && (kpi.includes('profle posted') || kpi.includes('profile posted'))) score += 40;
  if (metric === 'tiktokPosts' && (kpi.includes('profle posted') || kpi.includes('profile posted'))) score += 40;
  return score;
}

function matchesSocialMetric(metric: MetricKey, label: string): boolean {
  if (isGrowthOrRateRow(label, '')) return false;
  if (metric === 'tiktokPosts' && label.includes('mighty scout total')) return false;
  if (metric === 'instagramPosts' && label.includes('mighty scout total')) return false;
  return FIELD_HINTS[metric].some((hint) => label.includes(hint));
}

function resolveSocialMetricRows(layout: WideWeeklyLayout): Map<MetricKey, number> {
  const { rows, startDateRowIdx, weeks } = layout;
  const weekColIdxs = weeks.map((w) => w.colIdx);
  const metricRows = new Map<MetricKey, { rowIdx: number; score: number }>();

  for (let r = startDateRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!rowHasWeekData(row, weekColIdxs)) continue;
    const label = rowLabel(row);
    if (!label.trim()) continue;
    const kpiCell = (row[1] ?? '').trim();
    for (const key of METRIC_KEYS) {
      if (!matchesSocialMetric(key, label)) continue;
      const score = scorecardRowScore(key, label, kpiCell);
      const existing = metricRows.get(key);
      if (!existing || score > existing.score) metricRows.set(key, { rowIdx: r, score });
    }
  }

  const resolved = new Map<MetricKey, number>();
  metricRows.forEach(({ rowIdx }, key) => resolved.set(key, rowIdx));
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
    return rec;
  });
}

export function tryParseSocialScorecard(text: string): WeeklyParseResult | null {
  const rows = parseRawCsvRows(text);
  const layout = parseWideWeeklyLayout(rows);
  if (!layout) return null;

  const metricRows = resolveSocialMetricRows(layout);
  if (!metricRows.size) return null;

  return {
    records: buildRecordsFromWide(layout, metricRows),
    mappedMetrics: metricRows.size,
  };
}

/** @deprecated Use tryParseSocialScorecard */
export const tryParseScorecardCsv = tryParseSocialScorecard;
