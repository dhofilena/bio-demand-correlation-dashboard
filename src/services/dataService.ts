import type { DemandApiResponse, SourceHealth, WeeklyRecord } from '../types';
import { MOCK_WEEKLY } from '../data/mockWeeklyData';
import { mergeWeekly } from './csvIngest';
import { normalizeDemandPeriod, weekStartInRange } from '../lib/dateRange';

// Client-side orchestration: pull normalized demand from the secure proxy and
// merge it with locally-held content (CSV upload, or mock content as fallback)
// into the unified weekly model the views consume.

export interface DatasetResult {
  records: WeeklyRecord[];
  health: SourceHealth[];
  source: 'demo' | 'live';
  warning?: string;
}

const CONTENT_HEALTH: SourceHealth = {
  id: 'content-csv',
  label: 'Content / social (CSV)',
  status: 'mock',
  detail: 'Using bundled demo content',
};

export function filterRecordsByDateRange(
  records: WeeklyRecord[],
  start: string,
  end: string,
): WeeklyRecord[] {
  return records.filter((r) => weekStartInRange(r.weekStart, start, end));
}

/** Demo mode — everything local, no network. Lets the app run immediately. */
export function buildDemoDataset(
  csvRecords: WeeklyRecord[] | null,
  start: string,
  end: string,
): DatasetResult {
  const merged = csvRecords?.length ? mergeWeekly(MOCK_WEEKLY, csvRecords) : MOCK_WEEKLY;
  const records = filterRecordsByDateRange(merged, start, end);
  return {
    records,
    source: 'demo',
    health: [
      { ...CONTENT_HEALTH, status: csvRecords?.length ? 'live' : 'mock', detail: csvRecords?.length ? `${csvRecords.length} weeks uploaded` : 'Using bundled demo content' },
      { id: 'triple-whale', label: 'Triple Whale', status: 'mock', detail: 'Demo data' },
    ],
  };
}

/** Fetch normalized demand from the proxy (full Monday–Sunday weeks). */
export async function fetchDemand(start: string, end: string, mock = false): Promise<DemandApiResponse> {
  const period = normalizeDemandPeriod(start, end);
  const params = new URLSearchParams({ start: period.start, end: period.end });
  if (mock) params.set('mock', 'true');
  const res = await fetch(`/api/triplewhale/weekly?${params.toString()}`);
  if (!res.ok) throw new Error(`Demand API error ${res.status}`);
  return (await res.json()) as DemandApiResponse;
}

/**
 * Live mode — content from CSV (or mock content fallback) merged with demand
 * from the proxy. The proxy itself decides live vs mock per adapter.
 */
export async function buildLiveDataset(
  start: string,
  end: string,
  csvRecords: WeeklyRecord[] | null,
): Promise<DatasetResult> {
  const api = await fetchDemand(start, end);

  // Content base: uploaded CSV wins; otherwise demo content keeps the report whole.
  const contentBase = csvRecords?.length ? mergeWeekly(MOCK_WEEKLY, csvRecords) : MOCK_WEEKLY;

  // Overlay API demand (partial records) so live demand values win.
  const demandRecords = api.weeks as WeeklyRecord[];
  const records = filterRecordsByDateRange(mergeWeekly(contentBase, demandRecords), start, end);

  return {
    records,
    source: 'live',
    warning: api.warning,
    health: [
      {
        id: 'content-csv',
        label: 'Content / social (CSV)',
        status: csvRecords?.length ? 'live' : 'mock',
        detail: csvRecords?.length ? `${csvRecords.length} weeks uploaded` : 'Using bundled demo content',
      },
      ...api.health,
    ],
  };
}
