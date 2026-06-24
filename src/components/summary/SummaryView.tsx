import { useMemo } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { METRICS, DEMAND_CHANNELS, CONTENT_KEYS } from '../../config/metrics';
import { summarize } from '../../lib/metrics';
import { bestLeadingSignal, lagCorrelation } from '../../lib/correlation';
import { formatPct } from '../../lib/format';
import { ConfidenceBadge } from '../common/ui';
import type { Confidence } from '../../types';

interface Card {
  id: string;
  title: string;
  body: string;
  evidence: string;
  confidence: Confidence;
  accent: string;
}

export function SummaryView() {
  const records = useDashboard((s) => s.records);

  const { headline, cards } = useMemo(() => {
    const sums = Object.fromEntries(DEMAND_CHANNELS.map((k) => [k, summarize(records, k)]));
    const improved = DEMAND_CHANNELS
      .map((k) => ({ k, s: sums[k] }))
      .filter(({ s }) => (s.vsRollingPct ?? 0) >= 2)
      .sort((a, b) => (b.s.vsRollingPct ?? 0) - (a.s.vsRollingPct ?? 0));
    const soft = DEMAND_CHANNELS.map((k) => ({ k, s: sums[k] })).filter(({ s }) => s.status === 'Soft');

    const infl = lagCorrelation(records, 'influencerPosts', 'amazonSearchVolume');
    const pod = lagCorrelation(records, 'podcastImpressions', 'googleOrganicSessions');

    const headline = improved.length
      ? 'Demand is broadly positive this week, with several channels above their recent baselines and content activity plausibly leading the strongest movers.'
      : 'Signals are steady this week, tracking close to recent baselines with no major spikes or drops to flag.';

    const cards: Card[] = [];

    cards.push({
      id: 'improved',
      title: 'What improved',
      accent: 'var(--strong)',
      confidence: improved.length ? 'High' : 'Low',
      body: improved.length
        ? `${improved.slice(0, 3).map(({ k, s }) => `${METRICS[k].label} (${formatPct(s.vsRollingPct)})`).join(', ')} ${improved.length === 1 ? 'is' : 'are'} above the trailing 4-week baseline.`
        : 'No demand channel is meaningfully above its 4-week baseline this week.',
      evidence: 'Compared each channel’s current week to its trailing 4-week average.',
    });

    const leadParts: string[] = [];
    if (infl.bestLag >= 1 && infl.r > 0.3) leadParts.push(`influencer posting leads Amazon search by ~${infl.bestLag}w (r=${infl.r.toFixed(2)})`);
    if (pod.bestLag >= 1 && pod.r > 0.3) leadParts.push(`podcast impressions lead organic sessions by ~${pod.bestLag}w (r=${pod.r.toFixed(2)})`);
    cards.push({
      id: 'drove',
      title: 'What likely drove the lift',
      accent: 'var(--accent)',
      confidence: leadParts.length ? (Math.max(infl.r, pod.r) > 0.6 ? 'High' : 'Medium') : 'Low',
      body: leadParts.length
        ? `Within this window, ${leadParts.join(' and ')}. These are lagged correlations that support planning, not proof of causation.`
        : 'No content signal shows a strong leading relationship with demand in this window.',
      evidence: 'Lagged correlation across 0–2 week windows for the standard content→demand pairs.',
    });

    cards.push({
      id: 'attention',
      title: 'What needs attention',
      accent: 'var(--soft)',
      confidence: soft.length ? 'Medium' : 'Low',
      body: soft.length
        ? `${soft.map(({ k, s }) => `${METRICS[k].label} (${formatPct(s.vsRollingPct)})`).join(', ')} ${soft.length === 1 ? 'is' : 'are'} below baseline.`
        : 'Nothing is materially below baseline this week.',
      evidence: 'Status derived from each channel vs its 4-week baseline.',
    });

    const bestLead = DEMAND_CHANNELS.map((k) => bestLeadingSignal(records, k, CONTENT_KEYS)).filter(Boolean).sort((a, b) => (b!.r) - (a!.r))[0];
    cards.push({
      id: 'action',
      title: 'What action to take next',
      accent: 'var(--moderate)',
      confidence: 'Medium',
      body: bestLead
        ? `Schedule ${METRICS[bestLead.contentKey].label.toLowerCase()} pushes ~${bestLead.bestLag || 1}–2 weeks ahead of key sales moments, since it tends to lead ${METRICS[bestLead.demandKey].label.toLowerCase()}.`
        : 'Maintain the current content cadence and reassess once another week of data lands.',
      evidence: 'Action follows the strongest observed content→demand lead window.',
    });

    cards.push({
      id: 'watch',
      title: 'What to watch (next 1–2 weeks)',
      accent: 'var(--flat)',
      confidence: 'Medium',
      body: `${infl.bestLag >= 1 ? `Amazon search should be watched for follow-through ~${infl.bestLag}w after recent influencer activity. ` : ''}${pod.bestLag >= 1 ? `Organic sessions may continue reflecting recent podcast impressions. ` : ''}Watch DTC revenue for confirmation that website demand is following through.`,
      evidence: 'Forward watch items derived from detected lag windows.',
    });

    return { headline, cards };
  }, [records]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-faint)', fontWeight: 600, marginBottom: 6 }}>Executive read</div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, fontWeight: 450 }}>{headline}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {cards.map((c) => (
          <div key={c.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 9, borderTop: `3px solid ${c.accent}` }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 650 }}>{c.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, flex: 1 }}>{c.body}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <ConfidenceBadge level={c.confidence} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.4 }}>{c.evidence}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
