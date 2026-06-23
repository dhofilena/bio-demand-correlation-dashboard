import type { MetricDef, MetricKey } from '../types';

// One restrained accent + a small, accessible categorical palette.
// Content signals use cool tones, demand outcomes use warm/neutral tones so the
// two groups read as visually distinct families on the timeline.
export const COLORS = {
  accent: '#4f46e5',
  influencer: '#6366f1',
  podcast: '#0ea5e9',
  emv: '#14b8a6',
  amazonSearch: '#f59e0b',
  organic: '#10b981',
  direct: '#8b5cf6',
  amazonRev: '#ef4444',
  paidRev: '#64748b',
} as const;

/** Canonical metric registry — drives charts, KPI strip, scorecard and formatting. */
export const METRICS: Record<MetricKey, MetricDef> = {
  influencerPosts: {
    key: 'influencerPosts',
    label: 'Influencer posts',
    short: 'Influencer',
    group: 'content',
    unit: 'count',
    color: COLORS.influencer,
    description: 'Combined Instagram + TikTok creator posts (Mighty Scout / Grin).',
  },
  instagramPosts: {
    key: 'instagramPosts',
    label: 'Instagram posts',
    short: 'IG posts',
    group: 'content',
    unit: 'count',
    color: '#a855f7',
    description: 'Instagram creator posts.',
  },
  tiktokPosts: {
    key: 'tiktokPosts',
    label: 'TikTok posts',
    short: 'TikTok posts',
    group: 'content',
    unit: 'count',
    color: '#ec4899',
    description: 'TikTok creator posts.',
  },
  podcastDownloads: {
    key: 'podcastDownloads',
    label: 'Podcast downloads',
    short: 'Podcast',
    group: 'content',
    unit: 'count',
    color: COLORS.podcast,
    description: 'Podcast & streaming strength (downloads / audio reach via Podscribe).',
  },
  podcastAdSpend: {
    key: 'podcastAdSpend',
    label: 'Podcast ad spend',
    short: 'Pod spend',
    group: 'content',
    unit: 'currency',
    color: '#0284c7',
    description: 'Podcast media spend.',
  },
  emv: {
    key: 'emv',
    label: 'Earned media value',
    short: 'EMV',
    group: 'content',
    unit: 'currency',
    color: COLORS.emv,
    description: 'Estimated earned media value from social activity.',
  },
  amazonSearchVolume: {
    key: 'amazonSearchVolume',
    label: 'Amazon search volume',
    short: 'Amazon search',
    group: 'demand',
    unit: 'count',
    color: COLORS.amazonSearch,
    isDemandChannel: true,
    description: 'Branded Amazon search demand (swappable Amazon adapter).',
  },
  googleOrganicSessions: {
    key: 'googleOrganicSessions',
    label: 'Google organic sessions',
    short: 'Organic',
    group: 'demand',
    unit: 'count',
    color: COLORS.organic,
    isDemandChannel: true,
    description: 'Organic website sessions (Triple Whale).',
  },
  directTraffic: {
    key: 'directTraffic',
    label: 'Direct site visits',
    short: 'Direct',
    group: 'demand',
    unit: 'count',
    color: COLORS.direct,
    isDemandChannel: true,
    description: 'Direct website visits — a branded-awareness proxy (Triple Whale).',
  },
  amazonRevenue: {
    key: 'amazonRevenue',
    label: 'Amazon revenue',
    short: 'Amazon rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.amazonRev,
    isDemandChannel: true,
    description: 'Amazon revenue.',
  },
  googlePaidRevenue: {
    key: 'googlePaidRevenue',
    label: 'Google paid revenue',
    short: 'Paid rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.paidRev,
    isDemandChannel: true,
    description: 'Google paid revenue — sensitive to pacing / impression share.',
  },
};

export const METRIC_LIST: MetricDef[] = Object.values(METRICS);

/** Content signals offered as "leading" candidates in lag analysis. */
export const CONTENT_KEYS: MetricKey[] = ['influencerPosts', 'podcastDownloads', 'emv'];

/** Demand channels shown in the scorecard, in display order. */
export const DEMAND_CHANNELS: MetricKey[] = [
  'amazonSearchVolume',
  'googleOrganicSessions',
  'directTraffic',
  'amazonRevenue',
  'googlePaidRevenue',
];

/** Default KPI strip (max 7). */
export const KPI_KEYS: MetricKey[] = [
  'influencerPosts',
  'podcastDownloads',
  'amazonSearchVolume',
  'googleOrganicSessions',
  'directTraffic',
  'amazonRevenue',
  'googlePaidRevenue',
];
