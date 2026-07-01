import type { MetricKey } from '../../types';
import type { WeeklyParseResult } from './types';
import {
  emptyWeeklyRecord,
  isGrowthOrRateRow,
  parseRawCsvRows,
  rowHasWeekData,
  rowLabel,
  toNumber,
} from './shared';
import { parseWideWeeklyLayout } from './wideWeeklyLayout';

/** 1-based sheet rows — BIOptimizers totals in the Podscribe export. */
const PODSCRIBE_METRICS: { key: MetricKey; row: number; kpiNeedle: string; sectionNeedle?: string }[] = [
  { key: 'podcastImpressions', row: 6, kpiNeedle: 'total impressions', sectionNeedle: 'bioptimizers - totals' },
  { key: 'podcastIpModellingRevenue', row: 8, kpiNeedle: 'ip modelling revenue' },
  { key: 'podcastLastClickSales', row: 15, kpiNeedle: 'sales', sectionNeedle: 'last click sales new customers' },
  {
    key: 'podcastIpSalesMultiplier',
    row: 48,
    kpiNeedle: 'weekly multiplier vs last click',
    sectionNeedle: 'ip modelling',
  },
];

/** Legacy spend row — kept for backward compatibility with older sheet mappings. */
const PODSCRIBE_LEGACY_METRICS: { key: MetricKey; sectionNeedle: string; kpiNeedle: string }[] = [
  { key: 'podcastAdSpend', sectionNeedle: 'pixel performance all', kpiNeedle: 'spend' },
];

function findPodscribeRow(
  rows: string[][],
  kpiNeedle: string,
  fallbackRow: number,
  sectionNeedle?: string,
  weekColIdxs?: number[],
): number {
  const needle = kpiNeedle.toLowerCase();
  const section = (sectionNeedle ?? '').toLowerCase();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const label = rowLabel(row);
    const kpi = (row[1] ?? '').toLowerCase();
    if (section && !label.includes(section)) continue;
    if (!kpi.includes(needle) && !label.includes(needle)) continue;
    if (isGrowthOrRateRow(label, kpi) && !kpi.includes(needle)) continue;
    if (weekColIdxs && !rowHasWeekData(row, weekColIdxs)) continue;
    return r;
  }

  const fallbackIdx = fallbackRow - 1;
  return fallbackIdx >= 0 && fallbackIdx < rows.length ? fallbackIdx : -1;
}

function resolvePodscribeRows(rows: string[][], weekColIdxs: number[]): Map<MetricKey, number> {
  const resolved = new Map<MetricKey, number>();

  for (const { key, row, kpiNeedle, sectionNeedle } of PODSCRIBE_METRICS) {
    const rowIdx = findPodscribeRow(rows, kpiNeedle, row, sectionNeedle, weekColIdxs);
    if (rowIdx >= 0) resolved.set(key, rowIdx);
  }

  for (const { key, sectionNeedle, kpiNeedle } of PODSCRIBE_LEGACY_METRICS) {
    const rowIdx = findPodscribeRow(rows, kpiNeedle, -1, sectionNeedle, weekColIdxs);
    if (rowIdx >= 0) resolved.set(key, rowIdx);
  }

  return resolved;
}

export function tryParsePodscribe(text: string): WeeklyParseResult | null {
  const rows = parseRawCsvRows(text);
  const layout = parseWideWeeklyLayout(rows);
  if (!layout) return null;

  const { rows: grid, weeks } = layout;
  const weekColIdxs = weeks.map((w) => w.colIdx);
  const metricRows = resolvePodscribeRows(grid, weekColIdxs);
  if (!metricRows.size) return null;

  const records = weeks.map((week) => {
    const rec = emptyWeeklyRecord(week);
    metricRows.forEach((rowIdx, key) => {
      rec[key] = toNumber(grid[rowIdx][week.colIdx]);
    });
    return rec;
  });

  return { records, mappedMetrics: metricRows.size };
}
