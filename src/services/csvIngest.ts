import Papa from 'papaparse';
import type { MetricKey, WeeklyRecord } from '../types';
import { METRIC_LIST } from '../config/metrics';

// ---------------------------------------------------------------------------
// CSV ingestion for tidy ("long") weekly files: one row per week, one column
// per metric, plus a date column. Supports header auto-detection, manual column
// remapping, preview and merge into the unified weekly model.
//
// The provided BIOptimizers source sheets are "wide" (weeks as columns); see
// README → "Working with the source sheets" for how to pivot them to this shape
// (a ready-made sample lives in /sample-data).
// ---------------------------------------------------------------------------

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** Map of target field → source CSV header. `weekStart` is required to merge. */
export type ColumnMapping = Partial<Record<'weekStart' | MetricKey, string>>;

export function parseCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
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

const FIELD_HINTS: Record<'weekStart' | MetricKey, string[]> = {
  weekStart: ['weekstart', 'week start', 'date', 'week', 'start date'],
  influencerPosts: ['influencer', 'posts', 'profile posted', 'media posted'],
  instagramPosts: ['instagram', 'ig post'],
  tiktokPosts: ['tiktok', 'tt post'],
  podcastDownloads: ['podcast', 'download', 'streaming'],
  podcastAdSpend: ['podcast spend', 'pod spend', 'ad spend'],
  emv: ['emv', 'earned media'],
  amazonSearchVolume: ['amazon search', 'search volume'],
  googleOrganicSessions: ['organic', 'sessions'],
  directTraffic: ['direct'],
  amazonRevenue: ['amazon revenue', 'amazon sales'],
  googlePaidRevenue: ['paid revenue', 'google paid'],
};

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

/** Parse a loose number string ("$1,234", "12.3%", "—") to a number or null. */
export function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = raw.replace(/[$,%\s]/g, '').replace(/[—–-]+$/, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a date-ish string to an ISO yyyy-mm-dd (Monday assumed by caller). */
export function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function shortLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const METRIC_KEYS = METRIC_LIST.map((m) => m.key);

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
      podcastDownloads: null,
      podcastAdSpend: null,
      emv: null,
      amazonSearchVolume: null,
      googleOrganicSessions: null,
      directTraffic: null,
      amazonRevenue: null,
      googlePaidRevenue: null,
    };
    METRIC_KEYS.forEach((key) => {
      const col = mapping[key];
      if (col) rec[key] = toNumber(row[col]);
    });
    out.push(rec);
  });
  return out.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
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
