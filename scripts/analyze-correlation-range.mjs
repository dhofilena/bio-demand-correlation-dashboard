import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { tryParseSocialScorecard } from '../src/services/csvIngest/socialScorecard.ts';
import { tryParseAmazonRevenueScorecard } from '../src/services/csvIngest/amazonRevenueScorecard.ts';
import { mergeWeekly } from '../src/services/csvIngest/parseWeeklyCsv.ts';
import { pearson } from '../src/lib/correlation.ts';
import { buildSeries } from '../src/lib/metrics.ts';
import { weekStartInRange } from '../src/lib/dateRange.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cache = path.join(__dirname, '../data/cache/sheets');

const social = tryParseSocialScorecard(fs.readFileSync(path.join(cache, '839768178.csv'), 'utf8'));
const amazon = tryParseAmazonRevenueScorecard(fs.readFileSync(path.join(cache, '1638815849.csv'), 'utf8'));
const merged = mergeWeekly(amazon.records, social.records);

function analyze(start, end, label) {
  const recs = merged.filter((r) => weekStartInRange(r.weekStart, start, end));
  const pairs = recs
    .map((r) => ({
      week: r.weekStart,
      imp: r.socialImpressions,
      ppc: r.amazonPpcRevenue,
    }))
    .filter((p) => p.imp != null && p.ppc != null);

  const rRaw = pearson(
    pairs.map((p) => p.imp),
    pairs.map((p) => p.ppc),
  );

  const sigSeries = buildSeries(recs, 'socialImpressions');
  const demSeries = buildSeries(recs, 'amazonPpcRevenue');
  const idxPairs = sigSeries
    .map((s, i) => ({ week: s.weekStart, x: s.indexed, y: demSeries[i].indexed, imp: s.value, ppc: demSeries[i].value }))
    .filter((p) => p.x != null && p.y != null);
  const rIdx = pearson(
    idxPairs.map((p) => p.x),
    idxPairs.map((p) => p.y),
  );

  console.log(`\n=== ${label} (${start} → ${end}) ===`);
  console.log(`Weeks: ${pairs.length}`);
  console.log(`Pearson raw: ${rRaw.toFixed(3)} | indexed (scatter default): ${rIdx.toFixed(3)}`);
  console.log('Weekly pairs:');
  for (const p of pairs) {
    console.log(`  ${p.week}  impressions=${p.imp.toLocaleString()}  amazon PPC=$${Math.round(p.ppc).toLocaleString()}`);
  }
}

analyze('2026-02-02', '2026-06-14', 'Range A (ends Jun 14)');
analyze('2026-02-02', '2026-06-28', 'Range B (ends Jun 28)');

const full = merged.filter((r) => weekStartInRange(r.weekStart, '2026-02-02', '2026-06-28'));
const pairs = full.filter((r) => r.socialImpressions != null && r.amazonPpcRevenue != null);
const rFor = (rows) =>
  pearson(
    rows.map((r) => r.socialImpressions),
    rows.map((r) => r.amazonPpcRevenue),
  );

console.log('\n=== Sensitivity check ===');
console.log('All 21 weeks:', rFor(pairs).toFixed(3));
console.log('Without Jun 22 week:', rFor(pairs.filter((r) => r.weekStart !== '2026-06-22')).toFixed(3));
console.log('Without Jun 15 week:', rFor(pairs.filter((r) => r.weekStart !== '2026-06-15')).toFixed(3));
console.log('Without both new weeks (same as Range A):', rFor(pairs.filter((r) => r.weekStart < '2026-06-15')).toFixed(3));
