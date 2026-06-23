import type { WeeklyRecord } from '../types';

// ---------------------------------------------------------------------------
// Demo dataset — 14 weeks (Mar 16 → Jun 15, 2026).
// Hand-tuned so the intended relationships are visible:
//   • Influencer posting spikes (wk Apr 27, May 18) precede Amazon search lift
//     by ~2 weeks (May 11, Jun 1).
//   • Podcast strength (May 11, May 25) precedes organic session growth by ~1
//     week (May 18, Jun 1).
//   • Direct traffic drifts up with awareness/EMV.
//   • Google paid revenue softens over the final weeks WHILE organic, direct
//     and Amazon stay healthy — the "delivery constraint, not weak demand" case.
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

const weekLabels = [
  'Mar 16', 'Mar 23', 'Mar 30', 'Apr 6', 'Apr 13', 'Apr 20', 'Apr 27',
  'May 4', 'May 11', 'May 18', 'May 25', 'Jun 1', 'Jun 8', 'Jun 15',
];

const influencerPosts = [62, 70, 58, 66, 74, 60, 132, 80, 70, 124, 78, 66, 72, 68];
const instagramPosts = [24, 28, 22, 26, 30, 24, 52, 32, 28, 50, 30, 26, 28, 27];
const podcastDownloads = [30000, 31000, 29000, 32000, 30000, 31000, 33000, 34000, 55000, 36000, 58000, 38000, 35000, 34000];
const emv = [34000, 42000, 30000, 38000, 45000, 33000, 98000, 46000, 40000, 92000, 50000, 42000, 47000, 44000];
const podcastAdSpend = [16000, 18000, 15000, 17000, 19000, 16000, 20000, 21000, 24000, 19000, 25000, 20000, 18000, 17000];

const amazonSearchVolume = [8800, 9000, 8700, 9100, 9400, 9000, 9600, 10200, 14200, 13000, 11500, 16000, 13800, 12500];
const googleOrganicSessions = [40000, 41000, 39000, 42000, 41000, 43000, 42000, 44000, 46000, 58000, 48000, 62000, 55000, 58000];
const directTraffic = [14000, 14500, 13800, 15000, 15500, 15200, 16000, 16800, 17500, 19000, 20000, 22000, 24000, 25000];
const amazonRevenue = [42000, 44000, 41000, 45000, 47000, 44000, 48000, 52000, 68000, 64000, 60000, 82000, 74000, 70000];
const googlePaidRevenue = [38000, 40000, 37000, 41000, 42000, 40000, 43000, 44000, 42000, 40000, 39000, 34000, 31000, 29000];

const notes: Record<number, string> = {
  6: 'Creator burst around spring promo',
  9: 'Second influencer wave',
  11: 'Amazon search peak',
};

export const MOCK_WEEKLY: WeeklyRecord[] = weekStarts.map((weekStart, i) => ({
  weekStart,
  weekLabel: weekLabels[i],
  weekNumber: 12 + i,
  influencerPosts: influencerPosts[i],
  instagramPosts: instagramPosts[i],
  tiktokPosts: influencerPosts[i] - instagramPosts[i],
  podcastDownloads: podcastDownloads[i],
  podcastAdSpend: podcastAdSpend[i],
  emv: emv[i],
  amazonSearchVolume: amazonSearchVolume[i],
  googleOrganicSessions: googleOrganicSessions[i],
  directTraffic: directTraffic[i],
  amazonRevenue: amazonRevenue[i],
  googlePaidRevenue: googlePaidRevenue[i],
  notes: notes[i],
}));
