import type { WeeklyParseResult } from './types';
import {
  colLetterToIndex,
  emptyWeeklyRecord,
  isGrowthOrRateRow,
  parseRawCsvRows,
  rowLabel,
  toNumber,
} from './shared';
import { parseWideWeeklyLayoutFromColumn } from './wideWeeklyLayout';

/** Weekly metrics begin at column WA in the Amazon revenue workbook. */
const WEEKLY_START_COL = colLetterToIndex('WA');

/** 1-based sheet rows from the BIO scorecard layout. */
const AMAZON_ORGANIC_REVENUE_ROW = 109;
const AMAZON_PPC_REVENUE_ROW = 113;

function findMetricRow(rows: string[][], labelNeedle: string, fallbackRow: number): number {
  const fallbackIdx = fallbackRow - 1;
  for (let r = 0; r < rows.length; r++) {
    const label = rowLabel(rows[r]);
    if (isGrowthOrRateRow(label, '')) continue;
    if (label.includes(labelNeedle)) return r;
  }
  return fallbackIdx >= 0 && fallbackIdx < rows.length ? fallbackIdx : -1;
}

const ORGANIC_LABEL = 'sales :: organic';
const PPC_LABEL = 'sales :: ppc';

export function tryParseAmazonRevenueScorecard(text: string): WeeklyParseResult | null {
  const rows = parseRawCsvRows(text);
  const layout = parseWideWeeklyLayoutFromColumn(rows, WEEKLY_START_COL);
  if (!layout) return null;

  const organicRowIdx = findMetricRow(rows, ORGANIC_LABEL, AMAZON_ORGANIC_REVENUE_ROW);
  const ppcRowIdx = findMetricRow(rows, PPC_LABEL, AMAZON_PPC_REVENUE_ROW);
  if (organicRowIdx < 0 && ppcRowIdx < 0) return null;

  const { weeks } = layout;
  const records = weeks.map((week) => {
    const rec = emptyWeeklyRecord(week);
    const organic = organicRowIdx >= 0 ? toNumber(rows[organicRowIdx][week.colIdx]) : null;
    const ppc = ppcRowIdx >= 0 ? toNumber(rows[ppcRowIdx][week.colIdx]) : null;
    rec.amazonOrganicRevenue = organic;
    rec.amazonPpcRevenue = ppc;
    return rec;
  });

  const mappedMetrics = [organicRowIdx, ppcRowIdx].filter((idx) => idx >= 0).length;
  if (!mappedMetrics) return null;

  return { records, mappedMetrics };
}
