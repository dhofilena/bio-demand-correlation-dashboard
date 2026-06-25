import type { MetricKey, WeeklyRecord } from '../../types';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Map of target field → source CSV header. `weekStart` is required to merge. */
export type ColumnMapping = Partial<Record<'weekStart' | MetricKey, string>>;

export interface WeeklyParseResult {
  records: WeeklyRecord[];
  mappedMetrics: number;
}

export type CsvSheetFormat = 'auto' | 'tidy' | 'social-scorecard' | 'podscribe';

export interface ParseWeeklyCsvOptions {
  format?: CsvSheetFormat;
}
