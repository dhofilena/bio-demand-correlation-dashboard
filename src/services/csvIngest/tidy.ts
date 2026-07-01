import Papa from 'papaparse';
import type { WeeklyRecord } from '../../types';
import type { ColumnMapping, ParsedCsv } from './types';
import { FIELD_HINTS, METRIC_KEYS, shortLabel, toIsoDate, toNumber } from './shared';

function parseCsvPayload(payload: string | File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(payload, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        resolve({ headers, rows: res.data });
      },
      error: (err) => reject(err),
    });
  });
}

export function parseCsv(file: File): Promise<ParsedCsv> {
  return parseCsvPayload(file);
}

export function parseCsvText(text: string): Promise<ParsedCsv> {
  return parseCsvPayload(text);
}

/** Best-effort guess of which CSV header feeds each target field. */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lower = headers.map((h) => h.toLowerCase());
  (Object.keys(FIELD_HINTS) as (keyof typeof FIELD_HINTS)[]).forEach((field) => {
    const hints = FIELD_HINTS[field];
    const idx = lower.findIndex((h) => hints.some((hint) => h.includes(hint)));
    if (idx >= 0) mapping[field] = headers[idx];
  });
  return mapping;
}

/** Turn parsed rows + a mapping into partial weekly records (content/demand fields). */
export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): WeeklyRecord[] {
  const dateCol = mapping.weekStart;
  if (!dateCol) return [];
  const out: WeeklyRecord[] = [];
  rows.forEach((row, i) => {
    const iso = toIsoDate(row[dateCol]);
    if (!iso) return;
    const rec: WeeklyRecord = {
      weekStart: iso,
      weekLabel: shortLabel(iso),
      weekNumber: i + 1,
      influencerPosts: null,
      instagramPosts: null,
      tiktokPosts: null,
      profilePosted: null,
      socialImpressions: null,
      socialReach: null,
      socialEngagement: null,
      mediaPosted: null,
      podcastImpressions: null,
      podcastIpModellingRevenue: null,
      podcastLastClickSales: null,
      podcastIpSalesMultiplier: null,
      podcastAdSpend: null,
      emv: null,
      googleOrganicSessions: null,
      nonOrganicPageViews: null,
      gaOrganicRevenue: null,
      gaPaidRevenue: null,
      gaSocialRevenue: null,
      gaOtherRevenue: null,
      amazonOrganicRevenue: null,
      amazonPpcRevenue: null,
      dtcRevenue: null,
    };
    METRIC_KEYS.forEach((key) => {
      const col = mapping[key];
      if (col) rec[key] = toNumber(row[col]);
    });
    out.push(rec);
  });
  return out.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export async function parseTidyCsv(text: string): Promise<{ records: WeeklyRecord[]; mappedMetrics: number } | null> {
  const parsed = await parseCsvText(text);
  if (!parsed.headers.length || !parsed.rows.length) return null;
  const mapping = autoDetectMapping(parsed.headers);
  if (!mapping.weekStart) return null;
  const records = applyMapping(parsed.rows, mapping);
  if (!records.length) return null;
  return { records, mappedMetrics: Object.keys(mapping).length };
}
