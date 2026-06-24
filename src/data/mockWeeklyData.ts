import type { WeeklyRecord } from '../types';
import { weekRangeLabel } from '../services/csvIngest/shared';

// ---------------------------------------------------------------------------
// Demo dataset — 14 weeks (Mar 16 → Jun 15, 2026).
// Hand-tuned so the intended relationships are visible:
//   • Influencer posting spikes (wk Apr 27, May 18) precede Amazon search lift
//     by ~2 weeks (May 11, Jun 1).
//   • Podcast strength (May 11, May 25) precedes organic session growth by ~1
//     week (May 18, Jun 1).
//   • Non-organic page views drift up with awareness/EMV.
//   • DTC revenue tracks organic session growth as a downstream demand outcome.
// Content magnitudes are anchored to the BIOptimizers source sheets; demand
// figures stand in for the Triple Whale / Amazon adapters.
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
const podcastImpressions = [30000, 31000, 29000, 32000, 30000, 31000, 33000, 34000, 55000, 36000, 58000, 38000, 35000, 34000];
const emv = [34000, 42000, 30000, 38000, 45000, 33000, 98000, 46000, 40000, 92000, 50000, 42000, 47000, 44000];
const podcastAdSpend = [16000, 18000, 15000, 17000, 19000, 16000, 20000, 21000, 24000, 19000, 25000, 20000, 18000, 17000];

const amazonSearchVolume = [8800, 9000, 8700, 9100, 9400, 9000, 9600, 10200, 14200, 13000, 11500, 16000, 13800, 12500];
const googleOrganicSessions = [40000, 41000, 39000, 42000, 41000, 43000, 42000, 44000, 46000, 58000, 48000, 62000, 55000, 58000];
const nonOrganicPageViews = [42000, 43500, 41400, 45000, 46500, 45600, 48000, 50400, 52500, 57000, 60000, 66000, 72000, 75000];
const amazonRevenue = [42000, 44000, 41000, 45000, 47000, 44000, 48000, 52000, 68000, 64000, 60000, 82000, 74000, 70000];
const dtcRevenue = [48000, 50000, 47000, 51000, 52000, 50000, 54000, 56000, 58000, 62000, 60000, 68000, 64000, 66000];

const notes: Record<number, string> = {
  6: 'Creator burst around spring promo',
  9: 'Second influencer wave',
  11: 'Amazon search peak',
};

export const MOCK_WEEKLY: WeeklyRecord[] = weekStarts.map((weekStart, i) => ({
  weekStart,
  weekLabel: weekRangeLabel(weekStart),
  weekNumber: 12 + i,
  influencerPosts: influencerPosts[i],
  instagramPosts: instagramPosts[i],
  tiktokPosts: influencerPosts[i] - instagramPosts[i],
  podcastImpressions: podcastImpressions[i],
  podcastAdSpend: podcastAdSpend[i],
  emv: emv[i],
  amazonSearchVolume: amazonSearchVolume[i],
  googleOrganicSessions: googleOrganicSessions[i],
  nonOrganicPageViews: nonOrganicPageViews[i],
  amazonRevenue: amazonRevenue[i],
  dtcRevenue: dtcRevenue[i],
  notes: notes[i],
}));
