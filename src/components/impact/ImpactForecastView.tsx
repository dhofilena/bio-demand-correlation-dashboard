import { useMemo } from 'react';
import { useDashboard, type BumpPct } from '../../store/dashboardStore';
import { METRICS, CONTENT_KEYS, DEMAND_CHANNELS, BRANDED_SEARCH_METRIC_KEY, signalToggleLabel } from '../../config/metrics';
import type { MetricKey } from '../../types';
import { type LagWeek } from '../../lib/correlation';
import { buildSeries } from '../../lib/metrics';
import { lagImpact, predictLift, findPastBumps, BUMP_THRESHOLD } from '../../lib/impact';
import { formatDelta, formatPct } from '../../lib/format';
import { liftTimingLabel, liftTimingLabelShort, reliabilityScorePercent } from '../../lib/marketingLabels';
import { useEffectiveRecords } from '../../hooks/useEffectiveRecords';
import { SearchableSelect } from '../common/SearchableSelect';
import { Dot, RelationshipStrengthBadge, DeltaPill } from '../common/ui';

const BUMP_OPTIONS: BumpPct[] = [10, 25, 50];

const SIGNAL_OPTIONS = CONTENT_KEYS.map((k) => ({ value: k, label: signalToggleLabel(k) }));
const DEMAND_OPTIONS = [...DEMAND_CHANNELS, BRANDED_SEARCH_METRIC_KEY].map((k) => ({
  value: k as MetricKey,
  label: METRICS[k].label,
}));

function BumpSegmented({ value, onChange }: { value: BumpPct; onChange: (v: BumpPct) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
      {BUMP_OPTIONS.map((o) => {
        const active = o === value;
        return (
          <button key={o} onClick={() => onChange(o)}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 6, padding: '5px 11px', fontSize: 12.5, fontWeight: 500,
              background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow)' : 'none',
            }}>
            +{o}%
          </button>
        );
      })}
    </div>
  );
}

export function ImpactForecastView() {
  const records = useEffectiveRecords();
  const signalKey = useDashboard((s) => s.impactSignalKey);
  const demandKey = useDashboard((s) => s.impactDemandKey);
  const bumpPct = useDashboard((s) => s.impactBumpPct);
  const setSignal = useDashboard((s) => s.setImpactSignal);
  const setDemand = useDashboard((s) => s.setImpactDemand);
  const setBump = useDashboard((s) => s.setImpactBump);
  const focusScatterFromScorecard = useDashboard((s) => s.focusScatterFromScorecard);

  const signalDef = METRICS[signalKey];
  const demandDef = METRICS[demandKey];

  const impact = useMemo(() => lagImpact(records, signalKey, demandKey), [records, signalKey, demandKey]);
  const best = impact.best;
  const headline = best ? predictLift(best, bumpPct) : null;

  // Rough absolute translation: expected lift × the demand metric's current 4-week baseline.
  const demandBaseline = useMemo(() => {
    const pts = buildSeries(records, demandKey);
    const last = pts[pts.length - 1];
    return last?.rolling4 ?? last?.value ?? null;
  }, [records, demandKey]);

  const pastBumps = useMemo(
    () => (best ? findPastBumps(records, signalKey, demandKey, best.lag) : []),
    [records, signalKey, demandKey, best],
  );
  const observed = pastBumps.filter((b) => b.followed !== null);
  const followedCount = observed.filter((b) => b.followed).length;

  const maxAbsLift = Math.max(
    ...impact.byLag.map((res) => (res.beta !== null ? Math.abs(res.beta * bumpPct) : 0)),
    0.001,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Impact Forecast</h2>
        <p style={{ margin: '3px 0 14px', fontSize: 12.5, color: 'var(--text-muted)' }}>
          If a signal bumps above its recent baseline, when should the lift show up in demand — and how big should it be?
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>If</span>
          <SearchableSelect value={signalKey} options={SIGNAL_OPTIONS} onChange={setSignal} aria-label="Signal" />
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>bumps by</span>
          <BumpSegmented value={bumpPct} onChange={setBump} />
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>what happens to</span>
          <SearchableSelect value={demandKey} options={DEMAND_OPTIONS} onChange={setDemand} aria-label="Demand metric" />
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>?</span>
        </div>

        {best && headline ? (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 17, fontWeight: 650, lineHeight: 1.5, maxWidth: 860 }}>
              A <span style={{ color: signalDef.color }}>+{bumpPct}% bump in {signalToggleLabel(signalKey)}</span> this week
              points to roughly a{' '}
              <span style={{ color: 'var(--strong)' }}>{formatPct(headline.lift)} lift in {demandDef.label}</span>{' '}
              {liftTimingLabel(best.lag)}.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
              <RelationshipStrengthBadge level={impact.confidence} />
              {headline.low !== null && headline.high !== null ? (
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Likely range {formatPct(headline.low)} to {formatPct(headline.high)}
                </span>
              ) : null}
              {demandBaseline !== null ? (
                <span className="nums" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  ≈ {formatDelta((headline.lift / 100) * demandBaseline, demandDef.unit)} vs a typical week
                </span>
              ) : null}
              <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>Based on {best.n} weeks of history</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
              Estimate from how past bumps in this signal (vs its 4-week baseline) lined up with later moves in this demand
              metric. The likely range shows how scattered that history is — this is a planning hint, not a promise.
            </p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>No reliable lift found for this pair</div>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 720, lineHeight: 1.5 }}>
              Past bumps in {signalToggleLabel(signalKey)} haven’t been followed by a consistent rise in {demandDef.label}{' '}
              within 0–4 weeks, or there isn’t enough overlapping history yet. Try another signal or demand metric.
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 650 }}>Week-by-week ripple</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
          How a +{bumpPct}% bump in {signalToggleLabel(signalKey)} plays out in {demandDef.short} over the following weeks.
          The highlighted week is where the relationship is strongest.
        </p>
        <div style={{ display: 'flex', gap: 8, maxWidth: 720 }}>
          {impact.byLag.map((res) => {
            const lift = predictLift(res, bumpPct);
            const isBest = best !== null && res.lag === best.lag;
            const h = lift ? Math.max(4, (Math.abs(lift.lift) / maxAbsLift) * 64) : 4;
            const barColor = !lift
              ? 'var(--border-strong)'
              : lift.lift < 0
                ? 'var(--soft)'
                : isBest
                  ? demandDef.color
                  : 'var(--border-strong)';
            return (
              <div key={res.lag} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 68, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ width: 30, height: h, borderRadius: 5, background: barColor }}
                    title={lift ? `Expected lift ${formatPct(lift.lift)}` : 'Not enough overlapping weeks'} />
                </div>
                <div className="nums" style={{ fontSize: 12, marginTop: 5, fontWeight: isBest ? 700 : 500, color: isBest ? 'var(--text)' : 'var(--text-muted)' }}>
                  {lift ? formatPct(lift.lift) : '—'}
                </div>
                {lift && lift.low !== null && lift.high !== null ? (
                  <div className="nums" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                    {formatPct(lift.low)} to {formatPct(lift.high)}
                  </div>
                ) : (
                  <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>—</div>
                )}
                <div className="nums" style={{ fontSize: 10.5, color: 'var(--text-faint)', marginTop: 2 }}>
                  Match {reliabilityScorePercent(res.r)}
                </div>
                <div style={{ fontSize: 10.5, color: isBest ? 'var(--text)' : 'var(--text-faint)', fontWeight: isBest ? 600 : 400, marginTop: 2 }}>
                  {liftTimingLabelShort(res.lag)}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.45 }}>
          Expected lift = how much {demandDef.short} typically moved when this signal bumped, at each timing offset ·
          smaller range = steadier history · Match = how reliably the two moved together at that timing.
        </p>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 650 }}>Did it happen before?</h3>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-muted)' }}>
              Every week {signalToggleLabel(signalKey)} bumped at least +{BUMP_THRESHOLD}% above its baseline, and what{' '}
              {demandDef.short} did {best ? liftTimingLabel(best.lag) : 'afterwards'}.
            </p>
          </div>
          {best ? (
            <button className="btn" onClick={() => focusScatterFromScorecard(signalKey, demandKey, best.lag as LagWeek)}>
              Open scatter view
            </button>
          ) : null}
        </div>

        {best && pastBumps.length ? (
          <>
            {observed.length ? (
              <p style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 600 }}>
                {followedCount} of {observed.length} past bump{observed.length === 1 ? '' : 's'} {followedCount === 1 ? 'was' : 'were'} followed by a lift {liftTimingLabel(best.lag)}.
              </p>
            ) : null}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-faint)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    <th style={th}>Bump week</th>
                    <th style={th}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Dot color={signalDef.color} size={6} /> {signalDef.short} bump
                      </span>
                    </th>
                    <th style={th}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Dot color={demandDef.color} size={6} /> {demandDef.short} {liftTimingLabelShort(best.lag).toLowerCase()}
                      </span>
                    </th>
                    <th style={th}>Followed by a lift?</th>
                  </tr>
                </thead>
                <tbody>
                  {pastBumps.map((b) => (
                    <tr key={b.weekStart} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={td}>{b.weekLabel}</td>
                      <td style={td}><DeltaPill pct={b.signalBumpPct} /></td>
                      <td style={td}><DeltaPill pct={b.liftPct} /></td>
                      <td style={td}>
                        {b.followed === null ? (
                          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Too recent to tell</span>
                        ) : b.followed ? (
                          <span className="pill badge-strong">Yes</span>
                        ) : (
                          <span className="pill badge-soft">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>
            {best
              ? `No week in the current window saw ${signalToggleLabel(signalKey)} bump at least +${BUMP_THRESHOLD}% above its baseline.`
              : 'Pick a pair with a reliable lift to see its history here.'}
          </p>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
