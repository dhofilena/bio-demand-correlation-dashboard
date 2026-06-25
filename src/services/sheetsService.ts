import { mergeWeekly, parseWeeklyCsv, type CsvSheetFormat } from './csvIngest';
import type { WeeklyRecord } from '../types';

export interface SheetTabConfig {
  gid: string;
  label: string;
  format?: CsvSheetFormat;
}

export interface SheetsStatusResponse {
  enabled: boolean;
  configured: boolean;
  sheetId: string | null;
  tabs: SheetTabConfig[];
  error?: string;
}

export interface SheetTabLoadResult {
  gid: string;
  label: string;
  records: WeeklyRecord[];
  rowCount: number;
  mappedColumns: number;
}

export interface SheetsLoadResult {
  records: WeeklyRecord[];
  weekCount: number;
  fetchedAt: string;
  mappedColumns: number;
  tabs: SheetTabLoadResult[];
}

interface SheetsBundleResponse {
  spreadsheetId: string;
  fetchedAt: string;
  tabs: { gid: string; label: string; format?: CsvSheetFormat; csv: string; rowCount: number }[];
}

export async function fetchSheetsStatus(): Promise<SheetsStatusResponse> {
  const res = await fetch('/api/sheets/status');
  if (!res.ok) throw new Error(`Sheets status failed (${res.status})`);
  return res.json() as Promise<SheetsStatusResponse>;
}

async function parseTabCsv(
  label: string,
  gid: string,
  csv: string,
  format?: CsvSheetFormat,
): Promise<SheetTabLoadResult> {
  if (!csv.trim()) {
    throw new Error(`"${label}" (gid=${gid}) is empty.`);
  }

  try {
    const { records, mappedMetrics } = await parseWeeklyCsv(csv, { format: format ?? 'auto' });
    return {
      gid,
      label,
      records,
      rowCount: records.length,
      mappedColumns: mappedMetrics,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`"${label}" (gid=${gid}): ${detail}`);
  }
}

export async function loadWeeklyRecordsFromGoogleSheet(): Promise<SheetsLoadResult> {
  const res = await fetch('/api/sheets/bundle');
  if (!res.ok) {
    let detail = `Google Sheet fetch failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json.error) detail = json.error;
    } catch {
      // response was not JSON
    }
    throw new Error(detail);
  }

  const bundle = (await res.json()) as SheetsBundleResponse;
  if (!bundle.tabs?.length) throw new Error('No sheet tabs returned from the server.');

  const loadedTabs: SheetTabLoadResult[] = [];
  for (const tab of bundle.tabs) {
    loadedTabs.push(await parseTabCsv(tab.label, tab.gid, tab.csv, tab.format));
  }

  const records = loadedTabs.reduce(
    (merged, tab) => mergeWeekly(merged, tab.records),
    [] as WeeklyRecord[],
  );

  const mappedColumns = loadedTabs.reduce((max, tab) => Math.max(max, tab.mappedColumns), 0);

  return {
    records,
    weekCount: records.length,
    fetchedAt: bundle.fetchedAt,
    mappedColumns,
    tabs: loadedTabs,
  };
}
