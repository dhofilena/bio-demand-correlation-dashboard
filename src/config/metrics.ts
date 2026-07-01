import type { MetricDef, MetricKey } from '../types';

// One restrained accent + a small, accessible categorical palette.
// Content signals use cool tones, demand outcomes use warm/neutral tones so the
// two groups read as visually distinct families on the timeline.
export const COLORS = {
  accent: '#4f46e5',
  influencer: '#6366f1',
  podcast: '#0ea5e9',
  emv: '#14b8a6',
  organic: '#10b981',
  nonOrganic: '#8b5cf6',
  amazonOrganicRev: '#f97316',
  amazonPpcRev: '#dc2626',
  dtcRev: '#64748b',
  gaOrganicRev: '#059669',
  gaPaidRev: '#7c3aed',
  gaSocialRev: '#db2777',
  gaOtherRev: '#94a3b8',
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
  profilePosted: {
    key: 'profilePosted',
    label: 'MS Profile posted',
    short: 'MS Profile',
    group: 'content',
    unit: 'count',
    color: '#6366f1',
    description: 'Mighty Scout Total profile posts (row 10).',
  },
  socialImpressions: {
    key: 'socialImpressions',
    label: 'MS Impressions',
    short: 'MS Impressions',
    group: 'content',
    unit: 'count',
    color: '#0ea5e9',
    description: 'Mighty Scout Total impressions (row 12).',
  },
  socialReach: {
    key: 'socialReach',
    label: 'MS Reach',
    short: 'MS Reach',
    group: 'content',
    unit: 'count',
    color: '#06b6d4',
    description: 'Mighty Scout Total reach (row 14).',
  },
  socialEngagement: {
    key: 'socialEngagement',
    label: 'MS Engagement',
    short: 'MS Engagement',
    group: 'content',
    unit: 'count',
    color: '#8b5cf6',
    description: 'Mighty Scout Total engagement — likes, comments, shares (row 16).',
  },
  mediaPosted: {
    key: 'mediaPosted',
    label: 'MS Media posted',
    short: 'MS Media Posted',
    group: 'content',
    unit: 'count',
    color: '#a855f7',
    description: 'Mighty Scout Total media posts (row 20).',
  },
  podcastImpressions: {
    key: 'podcastImpressions',
    label: 'Total Impressions',
    short: 'Podcast',
    group: 'content',
    unit: 'count',
    color: COLORS.podcast,
    description: 'Podscribe total impressions (row 6).',
  },
  podcastIpModellingRevenue: {
    key: 'podcastIpModellingRevenue',
    label: 'IP Modelling Revenue',
    short: 'Pod IP rev',
    group: 'content',
    unit: 'currency',
    color: '#0369a1',
    description: 'Podscribe IP modelling revenue (row 8).',
  },
  podcastLastClickSales: {
    key: 'podcastLastClickSales',
    label: 'Last-Click Sales',
    short: 'Pod LC sales',
    group: 'content',
    unit: 'currency',
    color: '#0891b2',
    description: 'Podscribe last-click sales new customers (row 15).',
  },
  podcastIpSalesMultiplier: {
    key: 'podcastIpSalesMultiplier',
    label: 'IP Sales vs Last Click Multiplier',
    short: 'Pod IP mult',
    group: 'content',
    unit: 'ratio',
    color: '#22d3ee',
    description: 'Podscribe IP sales vs last-click weekly multiplier (row 48).',
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
    label: 'MS Earned media value',
    short: 'MS EMV',
    group: 'content',
    unit: 'currency',
    color: COLORS.emv,
    description: 'Mighty Scout Total earned media value (row 22).',
  },
  googleOrganicSessions: {
    key: 'googleOrganicSessions',
    label: 'Google Organic Sessions',
    short: 'Google Organic Sessions',
    group: 'demand',
    unit: 'count',
    color: COLORS.organic,
    isDemandChannel: true,
    description: 'GA4 sessions excluding paid and display channel groups (Triple Whale).',
  },
  nonOrganicPageViews: {
    key: 'nonOrganicPageViews',
    label: 'Google Paid Sessions',
    short: 'Google Paid Sessions',
    group: 'demand',
    unit: 'count',
    color: COLORS.nonOrganic,
    isDemandChannel: true,
    description: 'GA4 page views excluding organic search, social and video channel groups (Triple Whale).',
  },
  gaOrganicRevenue: {
    key: 'gaOrganicRevenue',
    label: 'GA Organic Revenue',
    short: 'GA Organic rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.gaOrganicRev,
    isDemandChannel: true,
    description: 'GA4 revenue from organic search, shopping and video channel groups (Triple Whale).',
  },
  gaPaidRevenue: {
    key: 'gaPaidRevenue',
    label: 'GA Paid Revenue',
    short: 'GA Paid rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.gaPaidRev,
    isDemandChannel: true,
    description: 'GA4 revenue from paid search, shopping, video, display and cross-network channel groups (Triple Whale).',
  },
  gaSocialRevenue: {
    key: 'gaSocialRevenue',
    label: 'GA Social Revenue',
    short: 'GA Social rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.gaSocialRev,
    isDemandChannel: true,
    description: 'GA4 revenue from social channel groups (Triple Whale).',
  },
  gaOtherRevenue: {
    key: 'gaOtherRevenue',
    label: 'GA Other Revenue',
    short: 'GA Other rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.gaOtherRev,
    isDemandChannel: true,
    description: 'GA4 revenue from all other channel groups not classified as organic, paid or social (Triple Whale).',
  },
  amazonOrganicRevenue: {
    key: 'amazonOrganicRevenue',
    label: 'Amazon organic revenue',
    short: 'Amazon organic revenue',
    group: 'demand',
    unit: 'currency',
    color: COLORS.amazonOrganicRev,
    isDemandChannel: true,
    description: 'Amazon organic revenue from the BIO scorecard (row 109).',
  },
  amazonPpcRevenue: {
    key: 'amazonPpcRevenue',
    label: 'Amazon PPC revenue',
    short: 'Amazon PPC revenue',
    group: 'demand',
    unit: 'currency',
    color: COLORS.amazonPpcRev,
    isDemandChannel: true,
    description: 'Amazon PPC revenue from the BIO scorecard (row 113).',
  },
  dtcRevenue: {
    key: 'dtcRevenue',
    label: 'DTC revenue',
    short: 'DTC rev',
    group: 'demand',
    unit: 'currency',
    color: COLORS.dtcRev,
    isDemandChannel: true,
    description: 'Website order revenue excluding Amazon (Triple Whale orders_table).',
  },
};

export const METRIC_LIST: MetricDef[] = Object.values(METRICS);

/** Social Metrics Scorecard — Mighty Scout Total rows 10, 12, 14, 16, 20, 22. */
export const SOCIAL_SIGNAL_KEYS: MetricKey[] = [
  'profilePosted',
  'socialImpressions',
  'socialReach',
  'socialEngagement',
  'mediaPosted',
  'emv',
];

/** Podscribe scorecard — rows 6, 8, 15, 48. */
export const PODSCRIBE_SIGNAL_KEYS: MetricKey[] = [
  'podcastImpressions',
  'podcastIpModellingRevenue',
  'podcastLastClickSales',
  'podcastIpSalesMultiplier',
];

/** Timeline and scorecard use full Podscribe-prefixed labels; Mighty Scout uses short labels. */
export function signalToggleLabel(key: MetricKey): string {
  const def = METRICS[key];
  if (PODSCRIBE_SIGNAL_KEYS.includes(key)) return `Podscribe ${def.label}`;
  return def.short;
}

/** Content signals offered as "leading" candidates in lag analysis. */
export const CONTENT_KEYS: MetricKey[] = [...SOCIAL_SIGNAL_KEYS, ...PODSCRIBE_SIGNAL_KEYS];

/** Upstream content metrics shown in the scorecard weekly matrix. */
export const CONTENT_SIGNAL_KEYS: MetricKey[] = [...SOCIAL_SIGNAL_KEYS, ...PODSCRIBE_SIGNAL_KEYS];

/** Demand channels shown in the scorecard, in display order. */
export const DEMAND_CHANNELS: MetricKey[] = [
  'googleOrganicSessions',
  'nonOrganicPageViews',
  'gaOrganicRevenue',
  'gaPaidRevenue',
  'gaSocialRevenue',
  'gaOtherRevenue',
  'amazonOrganicRevenue',
  'amazonPpcRevenue',
  'dtcRevenue',
];

/** Default KPI strip (max 7). */
export const KPI_KEYS: MetricKey[] = [
  'profilePosted',
  'socialImpressions',
  'socialReach',
  'podcastImpressions',
  'googleOrganicSessions',
  'nonOrganicPageViews',
  'amazonOrganicRevenue',
  'amazonPpcRevenue',
  'dtcRevenue',
];
