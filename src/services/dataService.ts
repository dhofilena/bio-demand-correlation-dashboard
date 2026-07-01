import type { DemandApiResponse, SourceHealth, WeeklyRecord } from '../types';
import { mergeWeekly } from './csvIngest';
import { normalizeDemandPeriod, weekStartInRange } from '../lib/dateRange';

// Client-side orchestration: pull normalized demand from the secure proxy and
// merge it with locally-held content (CSV upload or Google Sheets) into the
// unified weekly model the views consume.

export interface DatasetResult {
  records: WeeklyRecord[];
  health: SourceHealth[];
  warning?: string;
}

export function filterRecordsByDateRange(
  records: WeeklyRecord[],
  start: string,
  end: string,
): WeeklyRecord[] {
  return records.filter((r) => weekStartInRange(r.weekStart, start, end));
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

/** Merge content (CSV/Sheets) with demand from the proxy. */
export async function buildLiveDataset(
  start: string,
  end: string,
  csvRecords: WeeklyRecord[] | null,
): Promise<DatasetResult> {
  const api = await fetchDemand(start, end);

  const contentBase = csvRecords?.length ? csvRecords : [];
  const demandRecords = api.weeks as WeeklyRecord[];
  const records = filterRecordsByDateRange(mergeWeekly(contentBase, demandRecords), start, end);

  return {
    records,
    warning: api.warning,
    health: [
      {
        id: 'content-csv',
        label: 'Content / social (CSV)',
        status: csvRecords?.length ? 'live' : 'mock',
        detail: csvRecords?.length ? `${csvRecords.length} weeks uploaded` : 'No content source connected',
      },
      ...api.health,
    ],
  };
}
