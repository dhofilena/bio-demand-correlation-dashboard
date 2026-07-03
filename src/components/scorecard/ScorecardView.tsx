import { Fragment, useMemo, useState } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { METRICS, DEMAND_CHANNELS, CONTENT_KEYS, CONTENT_SIGNAL_KEYS, signalToggleLabel, BRANDED_SEARCH_METRIC_KEY } from '../../config/metrics';
import { brandedSearchSelectionLabel } from '../../lib/brandedSearch';
import { useEffectiveRecords } from '../../hooks/useEffectiveRecords';
import { BrandedSearchScorecardPicker } from '../demand/BrandedSearchControls';
import { summarize, buildSeries } from '../../lib/metrics';
import { bestLeadingSignal, lagCorrelation, LAG_WEEKS, type LagWeek } from '../../lib/correlation';
import { formatValue, formatPct } from '../../lib/format';
import { reliabilityScorePercent, timingLabel, timingLabelShort } from '../../lib/marketingLabels';
import type { MetricDef, MetricKey, SeriesPoint, LagResult, WeeklyRecord } from '../../types';
import { StatusBadge, RelationshipStrengthBadge, DeltaPill, Dot, MiniBar } from '../common/ui';
import { ChevronDown } from '../common/icons';

function interpret(
  vsRolling: number | null,
  status: string | null,
  leadLabel: string | null,
): string {
  if (status === 'Strong' || status === 'Moderate') {
    return leadLabel
      ? `Up ${formatPct(vsRolling)} vs baseline, consistent with ${leadLabel} earlier in the window.`
      : `Up ${formatPct(vsRolling)} vs baseline; no clear preceding signal, so treat as a weak pattern only.`;
  }
  if (status === 'Soft') return `Below baseline (${formatPct(vsRolling)}); worth watching over the next 1–2 weeks.`;
  return 'Holding close to its 4-week baseline.';
}

type WeekRow = {
  period: string;
  weekLabel: string;
  weekStart: string;
  demandPoint: SeriesPoint;
  isCurrent: boolean;
};

function buildWeekRows(demandPoints: SeriesPoint[]): WeekRow[] {
  if (!demandPoints.length) return [];
  const recent = demandPoints.slice(-5);
  const prior = recent.slice(0, -1);
  const current = recent[recent.length - 1];

  const rows: WeekRow[] = prior.map((point, i) => ({
    period: `Week ${i + 1}`,
    weekLabel: point.weekLabel,
    weekStart: point.weekStart,
    demandPoint: point,
    isCurrent: false,
  }));

  rows.push({
    period: 'This week',
    weekLabel: current.weekLabel,
    weekStart: current.weekStart,
    demandPoint: current,
    isCurrent: true,
  });

  return rows;
}

function SignalCell({ def, point }: { def: MetricDef; point: SeriesPoint | null }) {
  if (!point || point.value === null) {
    return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  }
  return (
    <div>
      <div className="nums" style={{ fontWeight: 600, fontSize: 12.5 }}>
        {formatValue(point.value, def.unit, true)}
      </div>
      <DeltaPill pct={point.priorWeekDeltaPct} />
    </div>
  );
}

function lagWhyLine(result: LagResult): string {
  const label = signalToggleLabel(result.contentKey);
  const lagLabel = timingLabel(result.bestLag);
  const runnerUp = [...result.byLag]
    .filter(({ lag }) => lag !== result.bestLag)
    .sort((a, b) => b.r - a.r)[0];
  const gap = runnerUp ? result.r - runnerUp.r : 0;
  const runnerLag = runnerUp ? timingLabel(runnerUp.lag) : null;
  if (gap >= 0.05 && runnerLag) {
    return `${label} best matches at ${lagLabel} (Best Match Score ${reliabilityScorePercent(result.r)}) — ${reliabilityScorePercent(gap)} stronger than next best (${runnerLag}).`;
  }
  return `${label} best matches at ${lagLabel} (Best Match Score ${reliabilityScorePercent(result.r)}).`;
}

function LagAlignedWeeksTable({
  demandDef,
  demandPoints,
  lagResults,
  records,
}: {
  demandDef: MetricDef;
  demandPoints: SeriesPoint[];
  lagResults: LagResult[];
  records: WeeklyRecord[];
}) {
  const weekRows = buildWeekRows(demandPoints);
  const notable = lagResults.filter((r) => r.r >= 0.1).sort((a, b) => b.r - a.r);
  if (!notable.length) return null;

  const weekIndexByStart = new Map(records.map((r, i) => [r.weekStart, i]));

  return (
    <table className="scorecard-weeks__table">
        <thead>
          <tr>
            <th>Demand week</th>
            <th>Dates</th>
            <th>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Dot color={demandDef.color} size={6} />
                {demandDef.short}
              </span>
            </th>
            {notable.map((result) => {
              const def = METRICS[result.contentKey];
              return (
                <th key={result.contentKey}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Dot color={def.color} size={6} />
                    {signalToggleLabel(result.contentKey)}
                  </span>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 0 }}>
                    {timingLabel(result.bestLag)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {weekRows.map(({ period, weekLabel, weekStart, demandPoint, isCurrent }) => {
            const demandIdx = weekIndexByStart.get(weekStart);
            return (
              <tr key={period} className={isCurrent ? 'scorecard-weeks__row--current' : undefined}>
                <td style={{ fontWeight: isCurrent ? 600 : 500 }}>{period}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{weekLabel}</td>
                <td>
                  <div className="nums" style={{ fontWeight: 600 }}>{formatValue(demandPoint.value, demandDef.unit, true)}</div>
                  <DeltaPill pct={demandPoint.vsRollingPct} />
                </td>
                {notable.map((result) => {
                  const def = METRICS[result.contentKey];
                  const contentPoints = buildSeries(records, result.contentKey);
                  if (demandIdx === undefined) {
                    return <td key={result.contentKey}><span style={{ color: 'var(--text-faint)' }}>—</span></td>;
                  }
                  const contentIdx = demandIdx - result.bestLag;
                  const point = contentIdx >= 0 ? contentPoints[contentIdx] : null;
                  return (
                    <td key={result.contentKey}>
                      <SignalCell def={def} point={point} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
  );
}

function LagMatchSection({
  demandDef,
  demandPoints,
  lagResults,
  records,
  bestLead,
  onLagCellClick,
}: {
  demandDef: MetricDef;
  demandPoints: SeriesPoint[];
  lagResults: LagResult[];
  records: WeeklyRecord[];
  bestLead: LagResult | null;
  onLagCellClick: (contentKey: MetricKey, demandKey: MetricKey, lag: LagWeek) => void;
}) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const sorted = [...lagResults].sort((a, b) => b.r - a.r);
  const notable = lagResults.filter((r) => r.r >= 0.1).sort((a, b) => b.r - a.r);

  return (
    <div className="scorecard-weeks scorecard-weeks--scroll">
      <div className="scorecard-weeks__title">
        Content signal match → {demandDef.short}
      </div>
      <p className="scorecard-timing-test-note">
        Timing test: greyed = weaker match, bold = best match. Click a score to open the scatter view.
      </p>
      <table className="scorecard-weeks__table scorecard-weeks__table--lag">
        <thead>
          <tr>
            <th>Content signal</th>
            <th>Timing</th>
            <th>Best Match Score</th>
            <th>Relationship Strength</th>
            <th colSpan={LAG_WEEKS.length} className="scorecard-timing-test-header">
              Timing test
            </th>
          </tr>
          <tr>
            <th aria-hidden />
            <th aria-hidden />
            <th aria-hidden />
            <th aria-hidden />
            {LAG_WEEKS.map((lag) => (
              <th key={lag} className="scorecard-lag-col scorecard-timing-test-subhead">
                {timingLabelShort(lag)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((result) => {
            const contentDef = METRICS[result.contentKey];
            const isBest = bestLead?.contentKey === result.contentKey;
            return (
              <tr key={result.contentKey} className={isBest ? 'scorecard-weeks__row--current' : undefined}>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: isBest ? 600 : 500 }}>
                    <Dot color={contentDef.color} />
                    {signalToggleLabel(result.contentKey)}
                    {isBest ? <span style={{ fontSize: 11, color: 'var(--accent)' }}>top lead</span> : null}
                  </span>
                </td>
                <td className="nums" style={{ fontWeight: 600 }}>
                  {timingLabel(result.bestLag)}
                </td>
                <td className="nums" style={{ fontWeight: 600 }}>{reliabilityScorePercent(result.r)}</td>
                <td><RelationshipStrengthBadge level={result.confidence} /></td>
                {result.byLag.map(({ lag, r }) => {
                  const isPeak = lag === result.bestLag;
                  const lagWeek = lag as LagWeek;
                  return (
                    <td
                      key={lag}
                      className={`nums scorecard-lag-col${isPeak ? ' scorecard-lag-cell--peak' : ''}`}
                      style={{ fontWeight: isPeak ? 650 : 500, color: r >= 0.35 ? 'var(--strong)' : r >= 0.1 ? 'var(--text)' : 'var(--text-faint)' }}
                    >
                      <button
                        type="button"
                        onClick={() => onLagCellClick(result.contentKey, result.demandKey, lagWeek)}
                        title={`Open scatter: ${signalToggleLabel(result.contentKey)} vs ${demandDef.short} at ${timingLabel(lag)}`}
                        style={{
                          all: 'unset',
                          cursor: 'pointer',
                          display: 'inline-block',
                          width: '100%',
                          textAlign: 'right',
                        }}
                      >
                        {reliabilityScorePercent(r)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {notable.length > 0 ? (
        <div className="scorecard-lag-accordion">
          <button
            type="button"
            className={`scorecard-lag-accordion__trigger${breakdownOpen ? ' scorecard-lag-accordion__trigger--open' : ''}`}
            onClick={() => setBreakdownOpen((o) => !o)}
            aria-expanded={breakdownOpen}
          >
            <ChevronDown
              size={13}
              className={`scorecard-chevron${breakdownOpen ? ' scorecard-chevron--open' : ''}`}
            />
            <span>
              Week-by-week timing breakdown
              <span className="scorecard-lag-accordion__subtitle">
                Content at each signal&apos;s best timing vs {demandDef.short}
              </span>
            </span>
          </button>
          <div
            className={`scorecard-lag-accordion__collapse${breakdownOpen ? ' scorecard-lag-accordion__collapse--open' : ''}`}
            aria-hidden={!breakdownOpen}
          >
            <div className="scorecard-lag-accordion__collapse-inner">
              <div className="scorecard-lag-accordion__body">
                <p className="scorecard-lag-accordion__why">
                  Bold timing test columns above are the best fit per signal. This table shifts each
                  content signal back by that timing so you can see week-by-week whether elevated content
                  preceded demand lifts.
                </p>
                <ul className="scorecard-lag-accordion__why-list">
                  {notable.slice(0, 5).map((result) => (
                    <li key={result.contentKey}>{lagWhyLine(result)}</li>
                  ))}
                </ul>
                <LagAlignedWeeksTable
                  demandDef={demandDef}
                  demandPoints={demandPoints}
                  lagResults={lagResults}
                  records={records}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ScorecardView() {
  const records = useEffectiveRecords();
  const brandedSearchProduct = useDashboard((s) => s.brandedSearchProduct);
  const focusScatterFromScorecard = useDashboard((s) => s.focusScatterFromScorecard);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    return DEMAND_CHANNELS.map((key) => {
      const s = summarize(records, key);
      const lead = bestLeadingSignal(records, key, CONTENT_KEYS);
      const allLagResults = CONTENT_SIGNAL_KEYS.map((contentKey) => lagCorrelation(records, contentKey, key));
      const leadLabel = lead ? `${signalToggleLabel(lead.contentKey)} (${timingLabel(lead.bestLag)})` : null;
      const sparkMax = Math.max(...s.spark, 1);
      return {
        key,
        def: METRICS[key],
        summary: s,
        lead,
        allLagResults,
        leadLabel,
        sparkMax,
        interpretation: interpret(s.vsRollingPct, s.status, leadLabel),
      };
    });
  }, [records]);

  const brandedSearchRow = useMemo(() => {
    const key = BRANDED_SEARCH_METRIC_KEY;
    const s = summarize(records, key);
    const lead = bestLeadingSignal(records, key, CONTENT_KEYS);
    const allLagResults = CONTENT_SIGNAL_KEYS.map((contentKey) => lagCorrelation(records, contentKey, key));
    const leadLabel = lead ? `${signalToggleLabel(lead.contentKey)} (${timingLabel(lead.bestLag)})` : null;
    const sparkMax = Math.max(...s.spark, 1);
    const productLabel = brandedSearchSelectionLabel(brandedSearchProduct);
    return {
      key,
      def: METRICS[key],
      summary: s,
      lead,
      allLagResults,
      leadLabel,
      sparkMax,
      interpretation: interpret(s.vsRollingPct, s.status, leadLabel),
      productLabel,
    };
  }, [records, brandedSearchProduct]);

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Channel decision scorecard</h2>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
          Each demand channel, its movement vs the trailing 4-week baseline, the content signal that most plausibly led it, and how strong that relationship is. Expand a row to see timing fits and a week-by-week breakdown at each signal&apos;s best timing.
        </p>
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
              <th style={th}>Relationship Strength</th>
              <th style={{ ...th, minWidth: 280 }}>Interpretation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, def, summary, leadLabel, lead, allLagResults, interpretation, sparkMax }) => {
              const open = !!expanded[key];
              return (
                <Fragment key={key}>
                  <tr
                    className={`scorecard-row${open ? ' scorecard-row--open' : ''}`}
                    style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => toggle(key)}
                    aria-expanded={open}
                  >
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ChevronDown
                          size={14}
                          className={`scorecard-chevron${open ? ' scorecard-chevron--open' : ''}`}
                        />
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
                    <td style={td}><RelationshipStrengthBadge level={lead?.confidence ?? 'Low'} /></td>
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>{interpretation}</td>
                  </tr>
                  <tr className="scorecard-detail">
                    <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                      <div
                        className={`scorecard-detail__collapse${open ? ' scorecard-detail__collapse--open' : ''}`}
                        aria-hidden={!open}
                      >
                        <div className="scorecard-detail__collapse-inner">
                          <div className="scorecard-detail__inner">
                            <LagMatchSection
                              demandDef={def}
                              demandPoints={summary.points}
                              lagResults={allLagResults}
                              records={records}
                              bestLead={lead}
                              onLagCellClick={focusScatterFromScorecard}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {(() => {
              const { key, def, summary, leadLabel, lead, allLagResults, interpretation, sparkMax, productLabel } =
                brandedSearchRow;
              const open = !!expanded[key];
              return (
                <Fragment key={key}>
                  <tr
                    className={`scorecard-row${open ? ' scorecard-row--open' : ''}`}
                    style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => toggle(key)}
                    aria-expanded={open}
                  >
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <ChevronDown
                          size={14}
                          className={`scorecard-chevron${open ? ' scorecard-chevron--open' : ''}`}
                        />
                        <Dot color={def.color} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{def.label}</div>
                          <div
                            style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BrandedSearchScorecardPicker />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <div className="nums" style={{ fontWeight: 600 }}>{formatValue(summary.current, def.unit, true)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{productLabel}</div>
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
                    <td style={td}><RelationshipStrengthBadge level={lead?.confidence ?? 'Low'} /></td>
                    <td style={{ ...td, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>{interpretation}</td>
                  </tr>
                  <tr className="scorecard-detail">
                    <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                      <div
                        className={`scorecard-detail__collapse${open ? ' scorecard-detail__collapse--open' : ''}`}
                        aria-hidden={!open}
                      >
                        <div className="scorecard-detail__collapse-inner">
                          <div className="scorecard-detail__inner">
                            <LagMatchSection
                              demandDef={def}
                              demandPoints={summary.points}
                              lagResults={allLagResults}
                              records={records}
                              bestLead={lead}
                              onLagCellClick={focusScatterFromScorecard}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '14px', verticalAlign: 'top' };
