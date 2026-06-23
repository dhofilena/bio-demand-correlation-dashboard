import { useMemo } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { METRICS, DEMAND_CHANNELS, CONTENT_KEYS } from '../../config/metrics';
import type { MetricKey } from '../../types';
import { summarize } from '../../lib/metrics';
import { bestLeadingSignal } from '../../lib/correlation';
import { formatValue, formatPct } from '../../lib/format';
import { StatusBadge, ConfidenceBadge, DeltaPill, Dot, MiniBar } from '../common/ui';

function interpret(
  key: MetricKey,
  vsRolling: number | null,
  status: string | null,
  leadLabel: string | null,
  paidContext: { organicUp: boolean; directUp: boolean },
): string {
  if (key === 'googlePaidRevenue' && status === 'Soft' && (paidContext.organicUp || paidContext.directUp)) {
    return 'Below baseline while organic/direct hold up — pattern fits a delivery or pacing constraint, not falling demand.';
  }
  if (status === 'Strong' || status === 'Moderate') {
    return leadLabel
      ? `Up ${formatPct(vsRolling)} vs baseline, consistent with ${leadLabel} earlier in the window.`
      : `Up ${formatPct(vsRolling)} vs baseline; no clear preceding signal, so treat as correlation only.`;
  }
  if (status === 'Soft') return `Below baseline (${formatPct(vsRolling)}); worth watching over the next 1–2 weeks.`;
  return 'Holding close to its 4-week baseline.';
}

export function ScorecardView() {
  const records = useDashboard((s) => s.records);

  const rows = useMemo(() => {
    const organic = summarize(records, 'googleOrganicSessions');
    const direct = summarize(records, 'directTraffic');
    const paidContext = {
      organicUp: (organic.vsRollingPct ?? 0) > 0,
      directUp: (direct.vsRollingPct ?? 0) > 0,
    };
    return DEMAND_CHANNELS.map((key) => {
      const s = summarize(records, key);
      const lead = bestLeadingSignal(records, key, CONTENT_KEYS);
      const leadLabel = lead ? `${METRICS[lead.contentKey].short} (~${lead.bestLag}w prior)` : null;
      const sparkMax = Math.max(...s.spark, 1);
      return {
        key,
        def: METRICS[key],
        summary: s,
        lead,
        leadLabel,
        sparkMax,
        interpretation: interpret(key, s.vsRollingPct, s.status, leadLabel, paidContext),
      };
    });
  }, [records]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Channel decision scorecard</h2>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>Each demand channel, its movement vs the trailing 4-week baseline, the content signal that most plausibly led it, and how confident we are.</p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-faint)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              <th style={th}>Demand channel</th>
              <th style={th}>This week</th>
              <th style={th}>Vs 4-wk avg</th>
              <th style={th}>Status</th>
              <th style={th}>Likely leading signal</th>
              <th style={th}>Confidence</th>
              <th style={{ ...th, minWidth: 280 }}>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, def, summary, leadLabel, lead, interpretation, sparkMax }) => (
              <tr key={key} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dot color={def.color} />
                    <span style={{ fontWeight: 600 }}>{def.label}</span>
                  </div>
                </td>
                <td style={td}>
                  <div className="nums" style={{ fontWeight: 600 }}>{formatValue(summary.current, def.unit, true)}</div>
                  <div style={{ width: 80, marginTop: 5 }}><MiniBar value={summary.current ?? 0} max={sparkMax} color={def.color} /></div>
                </td>
                <td style={td}><DeltaPill pct={summary.vsRollingPct} /></td>
                <td style={td}><StatusBadge status={summary.status} /></td>
                <td style={td}>
                  {leadLabel ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Dot color={lead ? METRICS[lead.contentKey].color : 'var(--flat)'} />
                      <span style={{ fontWeight: 500 }}>{leadLabel}</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-faint)' }}>No clear lead</span>
                  )}
                </td>
                <td style={td}><ConfidenceBadge level={lead?.confidence ?? 'Low'} /></td>
                <td style={{ ...td, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>{interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '14px', verticalAlign: 'top' };
