import Papa from 'papaparse';
import type { MetricKey, WeeklyRecord } from '../../types';
import { METRIC_LIST } from '../../config/metrics';

export const METRIC_KEYS = METRIC_LIST.map((m) => m.key);

export const FIELD_HINTS: Record<'weekStart' | MetricKey, string[]> = {
  weekStart: ['weekstart', 'week start', 'date', 'week', 'start date'],
  influencerPosts: ['influencer', 'posts', 'profile posted', 'profle posted'],
  instagramPosts: ['instagram', 'ig post', '@bioptimizers ig', 'bioptimizers ig'],
  tiktokPosts: ['tiktok', 'tt post', '@bioptimizers tiktok', 'bioptimizers tiktok'],
  profilePosted: ['profile posted', 'profle posted'],
  socialImpressions: ['impressions'],
  socialReach: ['reach'],
  socialEngagement: ['engagement (likes', 'engagement'],
  mediaPosted: ['media posted'],
  podcastImpressions: ['podcast impression', 'total impression', 'podcast', 'streaming'],
  podcastIpModellingRevenue: ['ip modelling revenue', 'pod ip revenue'],
  podcastLastClickSales: ['last click sales', 'last-click sales', 'podscribe sales'],
  podcastIpSalesMultiplier: ['ip sales multiplier', 'weekly multiplier vs last click', 'ip vs last click'],
  podcastAdSpend: ['podcast spend', 'pod spend', 'ad spend'],
  emv: ['emv', 'earned media'],
  googleOrganicSessions: ['organic', 'sessions'],
  nonOrganicPageViews: ['non_organic_page_views', 'non organic page views', 'non-organic page views', 'direct'],
  gaOrganicRevenue: ['ga organic revenue', 'organic revenue'],
  gaPaidRevenue: ['ga paid revenue', 'paid revenue'],
  gaSocialRevenue: ['ga social revenue', 'social revenue'],
  gaOtherRevenue: ['ga other revenue', 'other ga4 revenue', 'other revenue'],
  amazonOrganicRevenue: ['amazon organic revenue'],
  amazonPpcRevenue: ['amazon ppc revenue'],
  dtcRevenue: ['dtc revenue', 'website sales', 'dtc sales'],
};

/** Convert Excel-style column letters (e.g. WA) to a 0-based index. */
export function colLetterToIndex(col: string): number {
  let n = 0;
  for (const ch of col.trim().toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

export function parseRawCsvRows(text: string): string[][] {
  const res = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false });
  return res.data;
}

export function inferSheetYear(rows: string[][]): number {
  for (let r = 0; r < Math.min(rows.length, 4); r++) {
    for (const cell of rows[r] ?? []) {
      const match = (cell ?? '').match(/\b(20\d{2})\b/);
      if (match) return Number(match[1]);
    }
  }
  return new Date().getFullYear();
}

function formatLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse "Mon, Jan 5" style cells; year is inferred from sheet context and week order. */
export function parseWideDate(raw: string, defaultYear: number, prevIso: string | null): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const tryYear = (year: number) => {
    const d = new Date(`${trimmed}, ${year}`);
    return Number.isNaN(d.getTime()) ? null : formatLocalIso(d);
  };

  if (!prevIso && /\bdec\b/i.test(trimmed)) {
    const decPrevYear = tryYear(defaultYear - 1);
    if (decPrevYear) return decPrevYear;
  }

  let iso = tryYear(defaultYear);
  if (!iso) return toIsoDate(trimmed);
  if (prevIso && iso < prevIso) iso = tryYear(defaultYear + 1) ?? iso;
  return iso;
}

/** Parse a loose number string ("$1,234", "12.3%", "—") to a number or null. */
export function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = raw.replace(/[$,%\sx]/gi, '').replace(/[—–-]+$/, '');
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

export function weekRangeLabel(iso: string): string {
  const start = new Date(iso + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', opts);
  return `${startStr} to ${endStr}`;
}

/** Monday-start week display label, e.g. "Apr 6 to Apr 12". */
export function shortLabel(iso: string): string {
  return weekRangeLabel(iso);
}

export function rowLabel(row: string[]): string {
  return `${row[0] ?? ''} ${row[1] ?? ''}`.toLowerCase();
}

export function rowHasWeekData(row: string[], weekCols: number[]): boolean {
  return weekCols.some((c) => toNumber(row[c]) !== null);
}

export function emptyWeeklyRecord(week: { iso: string; weekNumber: number }): WeeklyRecord {
  return {
    weekStart: week.iso,
    weekLabel: shortLabel(week.iso),
    weekNumber: week.weekNumber,
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
}

export function isGrowthOrRateRow(label: string, kpi: string): boolean {
  const combined = `${label} ${kpi}`;
  return combined.includes('growth') || combined.includes('rate');
}
