import { useMemo } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { KPI_KEYS } from '../config/metrics';
import { summarizeAll } from '../lib/metrics';
import type { MetricSummary } from '../types';
import { formatValue } from '../lib/format';
import { DeltaPill, StatusBadge, Skeleton, Dot } from './common/ui';
import { Sparkline } from './common/Sparkline';

function KpiCard({ s }: { s: MetricSummary }) {
  const { def, current, deltaPct, vsRollingPct, status, spark } = s;
  return (
    <div className="card" style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Dot color={def.color} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {def.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {def.group === 'content' ? 'Signal' : 'Demand'}
        </span>
      </div>

      <div className="nums" style={{ fontSize: 22, fontWeight: 650, letterSpacing: -0.4, lineHeight: 1.1 }}>
        {formatValue(current, def.unit, true)}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <DeltaPill pct={deltaPct} />
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }} title="vs trailing 4-week average">
            {vsRollingPct === null ? '' : `${vsRollingPct >= 0 ? '+' : ''}${vsRollingPct.toFixed(0)}% vs 4-wk`}
          </span>
        </div>
        <Sparkline values={spark} color={def.color} width={72} height={26} />
      </div>

      <div><StatusBadge status={status} /></div>
    </div>
  );
}

export function KpiStrip() {
  const records = useDashboard((s) => s.records);
  const status = useDashboard((s) => s.status);
  const summaries = useMemo(() => summarizeAll(records, KPI_KEYS), [records]);

  if (status === 'loading') {
    return (
      <div style={gridStyle}>
        {KPI_KEYS.map((k) => (
          <div key={k} className="card" style={{ padding: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton height={12} width="60%" />
            <Skeleton height={24} width="50%" />
            <Skeleton height={26} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {summaries.map((s) => (
        <KpiCard key={s.def.key} s={s} />
      ))}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 12,
};
