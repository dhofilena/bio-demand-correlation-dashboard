import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchMockDemand } from '../server/adapters/mockDemand.mjs';
import { tryParseSocialScorecard } from '../src/services/csvIngest/socialScorecard.ts';
import { mergeWeekly } from '../src/services/csvIngest/parseWeeklyCsv.ts';
import { lagCorrelation } from '../src/lib/correlation.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheDir = path.join(__dirname, '../data/cache/sheets');

const socialCsv = fs.readFileSync(path.join(cacheDir, '839768178.csv'), 'utf8');
const social = tryParseSocialScorecard(socialCsv);
if (!social?.records.length) throw new Error('Failed to parse social scorecard');

const start = '2026-03-16';
const end = '2026-06-21';
const demand = fetchMockDemand(start, end);
const merged = mergeWeekly(demand, social.records)
  .filter((r) => r.weekStart >= start && r.weekStart <= end);

const signals = [
  { key: 'socialEngagement', label: 'MS Engagement' },
  { key: 'socialReach', label: 'MS Reach' },
  { key: 'socialImpressions', label: 'MS Impressions' },
  { key: 'emv', label: 'MS EMV' },
];

const weeklySeries = merged.map((r) => ({
  weekStart: r.weekStart,
  weekLabel: r.weekLabel ?? r.weekStart,
  gaSocialRevenue: r.gaSocialRevenue,
  socialEngagement: r.socialEngagement,
  socialReach: r.socialReach,
  socialImpressions: r.socialImpressions,
  emv: r.emv,
}));

const results = {};
for (const { key, label } of signals) {
  const res = lagCorrelation(merged, key, 'gaSocialRevenue');
  const lag4 = res.byLag.find((x) => x.lag === 4);
  const pairs = [];
  for (let t = 0; t + 4 < merged.length; t++) {
    const c = merged[t][key];
    const d = merged[t + 4].gaSocialRevenue;
    if (c != null && d != null) {
      pairs.push({
        contentWeek: merged[t].weekStart,
        revenueWeek: merged[t + 4].weekStart,
        content: c,
        revenue: d,
      });
    }
  }
  results[key] = { label, bestLag: res.bestLag, r: res.r, byLag: res.byLag, pairs4: pairs };
}

console.log(JSON.stringify({ weekCount: merged.length, weeks: merged.map((r) => r.weekStart), weeklySeries, results }, null, 2));
