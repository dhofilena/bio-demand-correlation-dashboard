import { Fragment, useMemo, useState } from 'react';
import { useDashboard } from '../../store/dashboardStore';
import { METRICS, DEMAND_CHANNELS, CONTENT_KEYS, CONTENT_SIGNAL_KEYS, signalToggleLabel } from '../../config/metrics';
import { summarize, buildSeries } from '../../lib/metrics';
import { bestLeadingSignal, lagCorrelation, LAG_WEEKS } from '../../lib/correlation';
import { formatValue, formatPct } from '../../lib/format';
import type { MetricDef, MetricKey, SeriesPoint, LagResult, WeeklyRecord } from '../../types';
import { StatusBadge, ConfidenceBadge, DeltaPill, Dot, MiniBar } from '../common/ui';
import { ChevronDown } from '../common/icons';

function interpret(
  vsRolling: number | null,
  status: string | null,
  leadLabel: string | null,
): string {
  if (status === 'Strong' || status === 'Moderate') {
    return leadLabel
      ? `Up ${formatPct(vsRolling)} vs baseline, consistent with ${leadLabel} earlier in the window.`
      : `Up ${formatPct(vsRolling)} vs baseline; no clear preceding signal, so treat as correlation only.`;
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

function pointAtWeek(points: SeriesPoint[], weekStart: string): SeriesPoint | null {
  return points.find((p) => p.weekStart === weekStart) ?? null;
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

function SignalWeekMatrix({
  demandDef,
  demandPoints,
  contentKeys,
  records,
}: {
  demandDef: MetricDef;
  demandPoints: SeriesPoint[];
  contentKeys: MetricKey[];
  records: WeeklyRecord[];
}) {
  const weekRows = buildWeekRows(demandPoints);
  const contentSeries = useMemo(
    () => contentKeys.map((key) => ({ def: METRICS[key], points: buildSeries(records, key) })),
    [contentKeys, records],
  );
  const barMax = Math.max(...weekRows.map((w) => w.demandPoint.value ?? 0), 1);

  return (
    <div className="scorecard-weeks scorecard-weeks--scroll">
      <div className="scorecard-weeks__title">Weekly breakdown — demand vs content signals (weeks 1–4 + this week)</div>
      <table className="scorecard-weeks__table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Dates</th>
            <th>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Dot color={demandDef.color} size={6} />
                {demandDef.short}
              </span>
            </th>
            {contentSeries.map(({ def }) => (
              <th key={def.key}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Dot color={def.color} size={6} />
                  {signalToggleLabel(def.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekRows.map(({ period, weekLabel, weekStart, demandPoint, isCurrent }) => (
            <tr key={period} className={isCurrent ? 'scorecard-weeks__row--current' : undefined}>
              <td style={{ fontWeight: isCurrent ? 600 : 500 }}>{period}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{weekLabel}</td>
              <td>
                <div className="nums" style={{ fontWeight: 600 }}>{formatValue(demandPoint.value, demandDef.unit, true)}</div>
                <div style={{ width: 72, marginTop: 4 }}>
                  <MiniBar value={demandPoint.value ?? 0} max={barMax} color={demandDef.color} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5, alignItems: 'center' }}>
                  <DeltaPill pct={demandPoint.vsRollingPct} />
                  <StatusBadge status={demandPoint.status} />
                </div>
              </td>
              {contentSeries.map(({ def, points }) => (
                <td key={def.key}>
                  <SignalCell def={def} point={pointAtWeek(points, weekStart)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllSignalsLagMatrix({
  demandDef,
  lagResults,
  bestLead,
}: {
  demandDef: MetricDef;
  lagResults: LagResult[];
  bestLead: LagResult | null;
}) {
  const sorted = [...lagResults].sort((a, b) => b.r - a.r);

  return (
    <div className="scorecard-weeks scorecard-weeks--scroll">
      <div className="scorecard-weeks__title">
        Lag match — all content signals → {demandDef.short}
      </div>
      <table className="scorecard-weeks__table scorecard-weeks__table--lag">
        <thead>
          <tr>
            <th>Content signal</th>
            <th>Best lag</th>
            <th>Peak r</th>
            <th>Confidence</th>
            {LAG_WEEKS.map((lag) => (
              <th key={lag} className="scorecard-lag-col">
                {lag === 0 ? '0w' : `${lag}w`}
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
                  {result.bestLag === 0 ? 'Same wk' : `${result.bestLag}w prior`}
                </td>
                <td className="nums" style={{ fontWeight: 600 }}>{result.r.toFixed(2)}</td>
                <td><ConfidenceBadge level={result.confidence} /></td>
                {result.byLag.map(({ lag, r }) => {
                  const isPeak = lag === result.bestLag;
                  return (
                    <td
                      key={lag}
                      className={`nums scorecard-lag-col${isPeak ? ' scorecard-lag-cell--peak' : ''}`}
                      style={{ fontWeight: isPeak ? 650 : 500, color: r >= 0.35 ? 'var(--strong)' : r >= 0.1 ? 'var(--text)' : 'var(--text-faint)' }}
                    >
                      {r.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LagAlignedWeeks({
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
    <div className="scorecard-weeks scorecard-weeks--scroll">
      <div className="scorecard-weeks__title">
        Lag-aligned view — content at each signal&apos;s best lag vs {demandDef.short}
      </div>
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
                    {result.bestLag === 0 ? 'same week' : `${result.bestLag}w earlier`}
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
    </div>
  );
}

export function ScorecardView() {
  const records = useDashboard((s) => s.records);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    return DEMAND_CHANNELS.map((key) => {
      const s = summarize(records, key);
      const lead = bestLeadingSignal(records, key, CONTENT_KEYS);
      const allLagResults = CONTENT_SIGNAL_KEYS.map((contentKey) => lagCorrelation(records, contentKey, key));
      const leadLabel = lead ? `${signalToggleLabel(lead.contentKey)} (~${lead.bestLag}w prior)` : null;
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

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Channel decision scorecard</h2>
        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
          Each demand channel, its movement vs the trailing 4-week baseline, the content signal that most plausibly led it, and how confident we are. Expand a row to compare weeks 1–4 against all content signals and lag fits.
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
              <th style={th}>Confidence</th>
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
                    <td style={td}><ConfidenceBadge level={lead?.confidence ?? 'Low'} /></td>
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
                            <SignalWeekMatrix
                              demandDef={def}
                              demandPoints={summary.points}
                              contentKeys={CONTENT_SIGNAL_KEYS}
                              records={records}
                            />
                            <LagAlignedWeeks
                              demandDef={def}
                              demandPoints={summary.points}
                              lagResults={allLagResults}
                              records={records}
                            />
                            <AllSignalsLagMatrix
                              demandDef={def}
                              lagResults={allLagResults}
                              bestLead={lead}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '14px', verticalAlign: 'top' };
