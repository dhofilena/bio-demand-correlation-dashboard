import type { WeeklyRecord } from '../../types';
import type { ParseWeeklyCsvOptions, WeeklyParseResult } from './types';
import { parseRawCsvRows } from './shared';
import { tryParsePodscribe } from './podscribe';
import { tryParseSocialScorecard } from './socialScorecard';
import { tryParseAmazonRevenueScorecard } from './amazonRevenueScorecard';
import { parseTidyCsv } from './tidy';

function inferWideFormat(rows: string[][]): 'social-scorecard' | 'podscribe' {
  const head = rows
    .slice(0, 8)
    .flat()
    .join(' ')
    .toLowerCase();
  if (head.includes('podscribe')) return 'podscribe';
  return 'social-scorecard';
}

async function tryWideParser(
  text: string,
  format: 'social-scorecard' | 'podscribe',
): Promise<WeeklyParseResult | null> {
  return format === 'podscribe' ? tryParsePodscribe(text) : tryParseSocialScorecard(text);
}

/**
 * Parse weekly records from CSV text — tidy uploads, Social scorecard, or Podscribe.
 */
export async function parseWeeklyCsv(
  text: string,
  options?: ParseWeeklyCsvOptions,
): Promise<WeeklyParseResult> {
  const format = options?.format ?? 'auto';

  if (format === 'tidy' || format === 'auto') {
    const tidy = await parseTidyCsv(text);
    if (tidy) return tidy;
    if (format === 'tidy') {
      throw new Error('No Week start column found in tidy CSV.');
    }
  }

  if (format === 'social-scorecard') {
    const parsed = tryParseSocialScorecard(text);
    if (parsed?.records.length) return parsed;
    throw new Error('Could not parse Social scorecard layout.');
  }

  if (format === 'podscribe') {
    const parsed = tryParsePodscribe(text);
    if (parsed?.records.length) return parsed;
    throw new Error('Could not parse Podscribe layout.');
  }

  if (format === 'amazon-revenue') {
    const parsed = tryParseAmazonRevenueScorecard(text);
    if (parsed?.records.length) return parsed;
    throw new Error('Could not parse Amazon revenue scorecard layout.');
  }

  const rows = parseRawCsvRows(text);
  const inferred = inferWideFormat(rows);
  const fallback: 'social-scorecard' | 'podscribe' =
    inferred === 'podscribe' ? 'social-scorecard' : 'podscribe';
  for (const wideFormat of [inferred, fallback] as const) {
    const parsed = await tryWideParser(text, wideFormat);
    if (parsed?.records.length) return parsed;
  }

  throw new Error(
    'Could not parse weekly data. Use a tidy CSV (one row per week), a Social scorecard (Start Date row), ' +
      'a Podscribe wide export, or an Amazon revenue scorecard.',
  );
}

/**
 * Merge incoming records into a base set by weekStart. Non-null incoming values
 * win; the base fills the rest. Weeks present in either source are kept.
 */
export function mergeWeekly(base: WeeklyRecord[], incoming: WeeklyRecord[]): WeeklyRecord[] {
  const map = new Map<string, WeeklyRecord>();
  base.forEach((r) => map.set(r.weekStart, { ...r }));
  incoming.forEach((r) => {
    const existing = map.get(r.weekStart);
    if (!existing) {
      map.set(r.weekStart, { ...r });
      return;
    }
    (Object.keys(r) as (keyof WeeklyRecord)[]).forEach((k) => {
      const v = r[k];
      if (v !== null && v !== undefined && v !== '') {
        // @ts-expect-error heterogeneous assignment across known keys
        existing[k] = v;
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
