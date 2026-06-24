import { useMemo } from 'react';
import { useDashboard, type LagSetting } from '../../store/dashboardStore';
import { METRICS, METRIC_LIST, CONTENT_KEYS, DEMAND_CHANNELS } from '../../config/metrics';
import type { MetricKey } from '../../types';
import { lagCorrelation, bestLeadingSignal } from '../../lib/correlation';
import { generateInsights } from '../../lib/insightEngine';
import { TimelineChart } from './TimelineChart';
import { InsightBanner } from './InsightBanner';
import { Dot } from '../common/ui';

const CONTENT_TOGGLES: MetricKey[] = ['influencerPosts', 'instagramPosts', 'tiktokPosts', 'podcastImpressions', 'emv'];
const DEMAND_TOGGLES: MetricKey[] = DEMAND_CHANNELS;

function SeriesChips({ title, keys }: { title: string; keys: MetricKey[] }) {
  const visible = useDashboard((s) => s.visible);
  const toggle = useDashboard((s) => s.toggleSeries);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{title}</span>
      {keys.map((k) => {
        const def = METRICS[k];
        const on = visible[k];
        return (
          <button key={k} className={`chip ${on ? 'chip-on' : ''}`} onClick={() => toggle(k)} aria-pressed={on}
            style={on ? { borderColor: def.color } : undefined}>
            <Dot color={on ? def.color : 'var(--text-faint)'} />
            {def.short}
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={String(o.value)} onClick={() => onChange(o.value)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 6, padding: '5px 11px', fontSize: 12.5, fontWeight: 500,
              background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow)' : 'none',
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function TimelineView() {
  const records = useDashboard((s) => s.records);
  const visible = useDashboard((s) => s.visible);
  const valueMode = useDashboard((s) => s.valueMode);
  const setValueMode = useDashboard((s) => s.setValueMode);
  const lag = useDashboard((s) => s.lag);
  const setLag = useDashboard((s) => s.setLag);

  const visibleKeys = METRIC_LIST.map((m) => m.key).filter((k) => visible[k]);

  // Auto-detect the strongest content→demand lead across the standard pairs.
  const auto = useMemo(() => {
    const candidates = DEMAND_CHANNELS
      .map((d) => bestLeadingSignal(records, d, CONTENT_KEYS))
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (!candidates.length) return { lag: 0, label: 'no clear lead' };
    const best = candidates.reduce((a, b) => (b.r > a.r ? b : a));
    return {
      lag: best.bestLag,
      label: `${best.bestLag}w · ${METRICS[best.contentKey].short} → ${METRICS[best.demandKey].short} (r=${best.r.toFixed(2)})`,
    };
  }, [records]);

  const effectiveLag = lag === 'auto' ? auto.lag : lag;

  const insights = useMemo(() => generateInsights(records), [records]);

  // Lag explorer mini-readout: influencer→amazon and podcast→organic across 0–2w.
  const explorer = useMemo(() => {
    return [
      lagCorrelation(records, 'influencerPosts', 'amazonSearchVolume'),
      lagCorrelation(records, 'podcastImpressions', 'googleOrganicSessions'),
    ];
  }, [records]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Content activity vs demand outcomes</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Dashed = content signals (lead) · solid = demand outcomes (lag). {valueMode === 'indexed' ? 'Indexed to 100 at the first week so different units compare directly.' : 'Absolute units split across two axes.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Segmented value={valueMode} onChange={setValueMode}
              options={[{ label: 'Indexed', value: 'indexed' }, { label: 'Absolute', value: 'absolute' }]} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 12 }}>
          <SeriesChips title="Signals" keys={CONTENT_TOGGLES} />
          <SeriesChips title="Demand" keys={DEMAND_TOGGLES} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>Lag alignment</span>
          <Segmented<LagSetting> value={lag} onChange={setLag}
            options={[{ label: '0w', value: 0 }, { label: '1w', value: 1 }, { label: '2w', value: 2 }, { label: 'Auto', value: 'auto' }]} />
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
            {lag === 'auto' ? `Auto-detected: ${auto.label}` : `Demand pulled back ${effectiveLag} week${effectiveLag === 1 ? '' : 's'} to test a leading relationship`}
          </span>
        </div>

        <TimelineChart records={records} visibleKeys={visibleKeys} valueMode={valueMode} lag={effectiveLag} />
      </div>

      <InsightBanner insights={insights} />

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 650 }}>Lag explorer</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>Correlation strength of each content signal against its demand outcome at 0–2 week lags. Higher and later = stronger lead.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {explorer.map((res) => (
            <div key={`${res.contentKey}-${res.demandKey}`}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Dot color={METRICS[res.contentKey].color} /> {METRICS[res.contentKey].short}
                <span style={{ color: 'var(--text-faint)' }}>→</span>
                <Dot color={METRICS[res.demandKey].color} /> {METRICS[res.demandKey].short}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {res.byLag.map((b) => {
                  const isBest = b.lag === res.bestLag && res.r > 0.1;
                  const h = Math.max(4, Math.abs(b.r) * 56);
                  return (
                    <div key={b.lag} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div style={{ width: 26, height: h, borderRadius: 5, background: isBest ? METRICS[res.demandKey].color : 'var(--border-strong)' }} title={`r=${b.r.toFixed(2)}`} />
                      </div>
                      <div className="nums" style={{ fontSize: 11, marginTop: 4, fontWeight: isBest ? 700 : 400, color: isBest ? 'var(--text)' : 'var(--text-muted)' }}>{b.r.toFixed(2)}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{b.lag}w</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
