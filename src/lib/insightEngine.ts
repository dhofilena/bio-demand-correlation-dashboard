import type { Insight, MetricKey, WeeklyRecord } from '../types';
import { METRICS, CONTENT_KEYS } from '../config/metrics';
import { buildSeries } from './metrics';
import { bestLeadingSignal, lagCorrelation } from './correlation';
import { formatPct } from './format';

// ---------------------------------------------------------------------------
// Deterministic, explainable insight engine.
// No AI calls: every statement is derived from week-over-week deltas, rolling
// baselines and lagged correlation so the report can always be traced back to
// the numbers. Language is intentionally hedged — correlation, not attribution.
// ---------------------------------------------------------------------------

const SPIKE = 12; // % above 4-week baseline considered a spike
const DROP = -10; // % below 4-week baseline considered a drop

/** Demand channels checked for content-led spikes in section 1. */
const CONTENT_LED_DEMAND_KEYS: MetricKey[] = [
  'amazonOrganicRevenue',
  'googleOrganicSessions',
  'dtcRevenue',
];

function label(key: MetricKey): string {
  return METRICS[key].label;
}

interface SpikeInfo {
  spiked: boolean;
  dropped: boolean;
  vsRollingPct: number | null;
  current: number | null;
  weekLabel: string;
}

function lastWeekState(records: WeeklyRecord[], key: MetricKey): SpikeInfo {
  const pts = buildSeries(records, key);
  const last = pts[pts.length - 1];
  return {
    spiked: (last?.vsRollingPct ?? 0) >= SPIKE,
    dropped: (last?.vsRollingPct ?? 0) <= DROP,
    vsRollingPct: last?.vsRollingPct ?? null,
    current: last?.value ?? null,
    weekLabel: last?.weekLabel ?? '',
  };
}

/** Generate the full set of insights for the current window. */
export function generateInsights(records: WeeklyRecord[]): Insight[] {
  if (records.length < 4) {
    return [
      {
        id: 'insufficient',
        kind: 'insufficient',
        confidence: 'Low',
        title: 'Not enough history yet',
        text: 'At least four weeks of overlapping content and demand data are needed before lag relationships can be assessed.',
        evidence: `${records.length} week(s) available.`,
      },
    ];
  }

  const insights: Insight[] = [];
  const lastWeek = records[records.length - 1].weekLabel;

  // 1) Content-led lift: a demand channel is up and a content signal led it in a prior week.
  for (const demandKey of CONTENT_LED_DEMAND_KEYS) {
    const demand = lastWeekState(records, demandKey);
    if (!demand.spiked) continue;
    const lead = bestLeadingSignal(records, demandKey, CONTENT_KEYS);
    if (lead && lead.bestLag >= 1 && lead.r > 0.3) {
      insights.push({
        id: `lift-${demandKey}`,
        kind: 'content-led-lift',
        confidence: lead.confidence,
        title: `${label(demandKey)} rose this week`,
        text: `${label(demandKey)} is ${formatPct(demand.vsRollingPct)} vs its 4-week baseline, following higher ${label(
          lead.contentKey,
        ).toLowerCase()} about ${lead.bestLag} week${lead.bestLag > 1 ? 's' : ''} earlier. The pattern is consistent with a lagged content effect, not a guarantee of causation.`,
        evidence: `Lag ${lead.bestLag}w correlation r=${lead.r.toFixed(2)} (${lead.confidence.toLowerCase()} confidence).`,
      });
    } else {
      insights.push({
        id: `lift-noevidence-${demandKey}`,
        kind: 'demand-strength',
        confidence: 'Low',
        title: `${label(demandKey)} rose this week`,
        text: `${label(demandKey)} is ${formatPct(demand.vsRollingPct)} vs baseline, but no clear preceding content spike was detected, so confidence in a content-led explanation is low.`,
        evidence: 'No leading content signal above threshold in the prior 0–4 week window.',
      });
    }
  }

  // 2) Google Paid Sessions + branded awareness.
  const nonOrganicPv = lastWeekState(records, 'nonOrganicPageViews');
  const emv = lastWeekState(records, 'emv');
  if (nonOrganicPv.spiked && (emv.vsRollingPct ?? 0) > 0) {
    insights.push({
      id: 'non-organic-awareness',
      kind: 'demand-strength',
      confidence: 'Medium',
      title: 'Google Paid Sessions rising with awareness',
      text: `Google Paid Sessions are ${formatPct(nonOrganicPv.vsRollingPct)} vs baseline as earned media value also rose. Rising paid traffic alongside awareness activity is consistent with growing branded interest.`,
      evidence: 'Google Paid Sessions above baseline coincides with elevated EMV.',
    });
  }

  // 4) Explicit lag callouts (Amazon organic revenue vs influencer, organic vs podcast, sessions vs DTC revenue).
  const infl = lagCorrelation(records, 'profilePosted', 'amazonOrganicRevenue');
  if (infl.bestLag >= 1 && infl.r > 0.35) {
    insights.push({
      id: 'lag-influencer-amazon',
      kind: 'content-led-lift',
      confidence: infl.confidence,
      title: 'Influencer activity appears to lead Amazon organic revenue',
      text: `Across the window, influencer posting tends to precede Amazon organic revenue movement by about ${infl.bestLag} week${
        infl.bestLag > 1 ? 's' : ''
      }. Plan creator pushes ahead of key Amazon moments rather than at launch.`,
      evidence: `Best fit at lag ${infl.bestLag}w, r=${infl.r.toFixed(2)}.`,
    });
  }
  const pod = lagCorrelation(records, 'podcastImpressions', 'googleOrganicSessions');
  if (pod.bestLag >= 1 && pod.r > 0.35) {
    insights.push({
      id: 'lag-podcast-organic',
      kind: 'content-led-lift',
      confidence: pod.confidence,
      title: 'Podcast impressions appear to lead organic sessions',
      text: `Podcast impressions tend to precede Google organic session growth by about ${pod.bestLag} week${
        pod.bestLag > 1 ? 's' : ''
      }. Treat podcast pushes as an early indicator for organic demand.`,
      evidence: `Best fit at lag ${pod.bestLag}w, r=${pod.r.toFixed(2)}.`,
    });
  }
  const organicDtc = lagCorrelation(records, 'googleOrganicSessions', 'dtcRevenue');
  if (organicDtc.bestLag >= 1 && organicDtc.r > 0.35) {
    insights.push({
      id: 'lag-organic-dtc',
      kind: 'demand-strength',
      confidence: organicDtc.confidence,
      title: 'Organic sessions appear to lead DTC revenue',
      text: `Google organic sessions tend to precede DTC revenue movement by about ${organicDtc.bestLag} week${
        organicDtc.bestLag > 1 ? 's' : ''
      }. Rising website traffic is a useful early read on whether DTC revenue will follow through.`,
      evidence: `Best fit at lag ${organicDtc.bestLag}w, r=${organicDtc.r.toFixed(2)}.`,
    });
  }

  // 5) Safety net: nothing notable.
  if (!insights.length) {
    insights.push({
      id: 'steady',
      kind: 'demand-strength',
      confidence: 'Low',
      title: 'Signals look steady',
      text: `No spikes or drops crossed the alert thresholds during ${lastWeek}. Demand and content activity are tracking close to their recent baselines.`,
      evidence: 'All monitored metrics within ±10% of their 4-week baselines.',
    });
  }

  return insights;
}
