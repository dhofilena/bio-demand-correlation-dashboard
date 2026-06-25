import type { MetricKey } from '../../types';
import type { WeeklyParseResult } from './types';
import {
  emptyWeeklyRecord,
  isGrowthOrRateRow,
  parseRawCsvRows,
  rowHasWeekData,
  toNumber,
} from './shared';
import { parseWideWeeklyLayout } from './wideWeeklyLayout';

const PODSCRIBE_METRICS: MetricKey[] = ['podcastImpressions', 'podcastAdSpend'];

/** Row 6 in the Podscribe export: BIOptimizers - TOTALS | Total Impressions */
function isPodcastTotalImpressionsRow(section: string, kpi: string): boolean {
  const sectionNorm = (section ?? '').trim().toLowerCase();
  const metric = (kpi ?? '').trim().toLowerCase();
  return sectionNorm === 'bioptimizers - totals' && metric === 'total impressions';
}

function podscribeRowScore(metric: MetricKey, section: string, kpi: string): number {
  let score = 0;
  if (metric === 'podcastImpressions' && isPodcastTotalImpressionsRow(section, kpi)) score += 100;
  if (metric === 'podcastAdSpend' && section.toLowerCase().includes('pixel performance all') && kpi === 'spend') score += 100;
  if (kpi === 'kpis' || kpi === '') score -= 80;
  return score;
}

function matchesPodscribeMetric(metric: MetricKey, section: string, kpi: string): boolean {
  if (isGrowthOrRateRow(section, kpi)) return false;
  if (metric === 'podcastImpressions') return isPodcastTotalImpressionsRow(section, kpi);
  if (metric === 'podcastAdSpend') return section.toLowerCase().includes('pixel performance all') && kpi === 'spend';
  return false;
}

export function tryParsePodscribe(text: string): WeeklyParseResult | null {
  const rows = parseRawCsvRows(text);
  const layout = parseWideWeeklyLayout(rows);
  if (!layout) return null;

  const { rows: grid, startDateRowIdx, weeks } = layout;
  const weekColIdxs = weeks.map((w) => w.colIdx);
  const metricRows = new Map<MetricKey, { rowIdx: number; score: number }>();

  for (let r = startDateRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!rowHasWeekData(row, weekColIdxs)) continue;
    const section = (row[0] ?? '').trim();
    const kpi = (row[1] ?? '').trim().toLowerCase();
    if (!section.trim()) continue;

    for (const key of PODSCRIBE_METRICS) {
      if (!matchesPodscribeMetric(key, section, kpi)) continue;
      const score = podscribeRowScore(key, section, kpi);
      const existing = metricRows.get(key);
      if (!existing || score > existing.score) metricRows.set(key, { rowIdx: r, score });
    }
  }

  if (!metricRows.size) return null;

  const records = weeks.map((week) => {
    const rec = emptyWeeklyRecord(week);
    metricRows.forEach(({ rowIdx }, key) => {
      rec[key] = toNumber(grid[rowIdx][week.colIdx]);
    });
    return rec;
  });

  return { records, mappedMetrics: metricRows.size };
}
