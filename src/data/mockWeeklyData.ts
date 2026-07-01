import type { WeeklyRecord } from '../types';
import { weekRangeLabel } from '../services/csvIngest/shared';

// ---------------------------------------------------------------------------
// Demo dataset — 14 weeks (Mar 16 → Jun 15, 2026).
// Hand-tuned so the intended relationships are visible:
//   • Influencer posting spikes (wk Apr 27, May 18) precede Amazon organic revenue lift
//     by ~2 weeks (May 11, Jun 1).
//   • Podcast strength (May 11, May 25) precedes organic session growth by ~1
//     week (May 18, Jun 1).
//   • Non-organic page views drift up with awareness/EMV.
//   • DTC revenue tracks organic session growth as a downstream demand outcome.
// Content magnitudes are anchored to the BIOptimizers source sheets; demand
// figures stand in for the Triple Whale adapters.
// ---------------------------------------------------------------------------

const weekStarts = [
  '2026-03-16',
  '2026-03-23',
  '2026-03-30',
  '2026-04-06',
  '2026-04-13',
  '2026-04-20',
  '2026-04-27',
  '2026-05-04',
  '2026-05-11',
  '2026-05-18',
  '2026-05-25',
  '2026-06-01',
  '2026-06-08',
  '2026-06-15',
];

const influencerPosts = [62, 70, 58, 66, 74, 60, 132, 80, 70, 124, 78, 66, 72, 68];
const instagramPosts = [24, 28, 22, 26, 30, 24, 52, 32, 28, 50, 30, 26, 28, 27];
const socialImpressions = [714716, 3238265, 3083996, 611538, 3509197, 1026022, 2454481, 1608198, 1894035, 5816802, 1695170, 1894459, 3178486, 1230342];
const socialReach = [2409377, 7541747, 7152409, 1999405, 8129805, 7119063, 6139991, 4811484, 6714824, 13080825, 5155597, 9365093, 14323346, 1604992];
const socialEngagement = [14832, 34255, 23746, 14237, 13498, 9980, 24386, 34701, 11672, 27443, 12445, 6010, 18825, 5174];
const mediaPosted = [83, 119, 104, 80, 127, 109, 161, 102, 141, 159, 45, 88, 147, 66];
const emv = [34000, 42000, 30000, 38000, 45000, 33000, 98000, 46000, 40000, 92000, 50000, 42000, 47000, 44000];
const podcastImpressions = [30000, 31000, 29000, 32000, 30000, 31000, 33000, 34000, 55000, 36000, 58000, 38000, 35000, 34000];
const podcastIpModellingRevenue = [0, 0, 0, 0, 1606, 599, 12523, 26885, 29814, 26374, 37565, 43714, 32542, 23629];
const podcastLastClickSales = [0, 0, 0, 0, 717, 522, 1957, 6668, 5486, 6759, 9475, 8843, 9834, 8392];
const podcastIpSalesMultiplier = [2.24, 2.24, 2.24, 2.24, 2.24, 1.15, 6.4, 4.03, 5.43, 3.9, 3.96, 4.94, 3.31, 2.82];
const podcastAdSpend = [16000, 18000, 15000, 17000, 19000, 16000, 20000, 21000, 24000, 19000, 25000, 20000, 18000, 17000];

const googleOrganicSessions = [40000, 41000, 39000, 42000, 41000, 43000, 42000, 44000, 46000, 58000, 48000, 62000, 55000, 58000];
const nonOrganicPageViews = [42000, 43500, 41400, 45000, 46500, 45600, 48000, 50400, 52500, 57000, 60000, 66000, 72000, 75000];
const gaOrganicRevenue = [21000, 21500, 20500, 22000, 21800, 22500, 22200, 23000, 24000, 30000, 25000, 32000, 28500, 30000];
const gaPaidRevenue = [17000, 17500, 16800, 18000, 18200, 17800, 18500, 19200, 20000, 22000, 21000, 24000, 22500, 23000];
const gaSocialRevenue = [7500, 7800, 7200, 8000, 8200, 7900, 8100, 8500, 9000, 9800, 9200, 10500, 9800, 10000];
const gaOtherRevenue = [3800, 3900, 3600, 4000, 4100, 3950, 4050, 4200, 4400, 4800, 4500, 5200, 4900, 5000];
const amazonOrganicRevenue = [25000, 26000, 24000, 27000, 28000, 26000, 29000, 31000, 40000, 38000, 36000, 49000, 44000, 42000];
const amazonPpcRevenue = [17000, 18000, 17000, 18000, 19000, 18000, 19000, 21000, 28000, 26000, 24000, 33000, 30000, 28000];
const dtcRevenue = [48000, 50000, 47000, 51000, 52000, 50000, 54000, 56000, 58000, 62000, 60000, 68000, 64000, 66000];

const notes: Record<number, string> = {
  6: 'Creator burst around spring promo',
  9: 'Second influencer wave',
  11: 'Amazon organic revenue peak',
};

export const MOCK_WEEKLY: WeeklyRecord[] = weekStarts.map((weekStart, i) => ({
  weekStart,
  weekLabel: weekRangeLabel(weekStart),
  weekNumber: 12 + i,
  influencerPosts: influencerPosts[i],
  instagramPosts: instagramPosts[i],
  tiktokPosts: influencerPosts[i] - instagramPosts[i],
  profilePosted: influencerPosts[i],
  socialImpressions: socialImpressions[i],
  socialReach: socialReach[i],
  socialEngagement: socialEngagement[i],
  mediaPosted: mediaPosted[i],
  podcastImpressions: podcastImpressions[i],
  podcastIpModellingRevenue: podcastIpModellingRevenue[i],
  podcastLastClickSales: podcastLastClickSales[i],
  podcastIpSalesMultiplier: podcastIpSalesMultiplier[i],
  podcastAdSpend: podcastAdSpend[i],
  emv: emv[i],
  googleOrganicSessions: googleOrganicSessions[i],
  nonOrganicPageViews: nonOrganicPageViews[i],
  gaOrganicRevenue: gaOrganicRevenue[i],
  gaPaidRevenue: gaPaidRevenue[i],
  gaSocialRevenue: gaSocialRevenue[i],
  gaOtherRevenue: gaOtherRevenue[i],
  amazonOrganicRevenue: amazonOrganicRevenue[i],
  amazonPpcRevenue: amazonPpcRevenue[i],
  dtcRevenue: dtcRevenue[i],
  notes: notes[i],
}));
