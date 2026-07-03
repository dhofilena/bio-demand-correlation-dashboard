import { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { MetricKey, WeeklyRecord } from '../../types';
import { METRICS } from '../../config/metrics';
import { buildSeries } from '../../lib/metrics';
import { formatValue } from '../../lib/format';
import {
  confidenceFromR,
  FIT_TIER_COLORS,
  FIT_TIER_LABELS,
  linearRegression,
  pearson,
  pointFitFromRegression,
  rSquared,
  trendAngleDegrees,
  type FitTier,
} from '../../lib/correlation';
import type { ValueMode } from '../../store/dashboardStore';

interface Props {
  records: WeeklyRecord[];
  signalKey: MetricKey;
  demandKey: MetricKey;
  valueMode: ValueMode;
  lag: number;
}

interface ScatterPoint {
  x: number;
  y: number;
  weekLabel: string;
  predicted: number;
  residual: number;
  tier: FitTier;
  fill: string;
}

export function TimelineScatterChart({ records, signalKey, demandKey, valueMode, lag }: Props) {
  const signalDef = METRICS[signalKey];
  const demandDef = METRICS[demandKey];
  const indexed = valueMode === 'indexed';

  const { points, r, r2, trendLine, trendAngle, trendSlope, tierCounts } = useMemo(() => {
    const signalSeries = buildSeries(records, signalKey);
    const demandSeries = buildSeries(records, demandKey);
    const weekLabels: string[] = [];
    const xs: number[] = [];
    const ys: number[] = [];

    for (let t = 0; t + lag < records.length; t++) {
      const sp = signalSeries[t];
      const dp = demandSeries[t + lag];
      const x = indexed ? sp.indexed : sp.value;
      const y = indexed ? dp.indexed : dp.value;
      if (x !== null && y !== null) {
        weekLabels.push(sp.weekLabel);
        xs.push(x);
        ys.push(y);
      }
    }

    const reg = linearRegression(xs, ys);
    const fits = reg ? pointFitFromRegression(xs, ys, reg) : [];
    const pts: ScatterPoint[] = xs.map((x, i) => {
      const fit = fits[i];
      const tier = fit?.tier ?? 'moderate';
      return {
        x,
        y: ys[i],
        weekLabel: weekLabels[i],
        predicted: fit?.predicted ?? ys[i],
        residual: fit?.residual ?? 0,
        tier,
        fill: FIT_TIER_COLORS[tier],
      };
    });

    const counts: Record<FitTier, number> = { close: 0, moderate: 0, far: 0 };
    for (const pt of pts) counts[pt.tier]++;

    const trendLine =
      reg && xs.length >= 2
        ? (() => {
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            return {
              x1: minX,
              y1: reg.slope * minX + reg.intercept,
              x2: maxX,
              y2: reg.slope * maxX + reg.intercept,
            };
          })()
        : null;

    const correlation = pearson(xs, ys);

    return {
      points: pts,
      r: correlation,
      r2: rSquared(correlation),
      trendLine,
      trendAngle: reg ? trendAngleDegrees(reg.slope) : null,
      trendSlope: reg?.slope ?? null,
      tierCounts: counts,
    };
  }, [records, signalKey, demandKey, valueMode, lag, indexed]);

  const confidence = confidenceFromR(r);
  const xLabel = indexed ? `${signalDef.short} (index)` : signalDef.label;
  const yLabel = indexed
    ? `${demandDef.short} (index${lag > 0 ? `, +${lag}w lag` : ''})`
    : `${demandDef.label}${lag > 0 ? ` (+${lag}w lag)` : ''}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Each dot = one week · dashed = avg trend
          {lag > 0 ? ` · demand shifted ${lag}w earlier` : ''}
        </span>
        <span className="nums" style={{ fontSize: 12.5, fontWeight: 600, marginLeft: 'auto', display: 'inline-flex', flexWrap: 'wrap', gap: '4px 10px', justifyContent: 'flex-end' }}>
          <span>
            Reliability Score (r) = {r.toFixed(2)}
            <span style={{ fontWeight: 500, color: 'var(--text-faint)', marginLeft: 6 }}>{confidence}</span>
          </span>
          <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
            Confidence Score (R²) = {(r2 * 100).toFixed(0)}% explained
          </span>
          {trendAngle !== null && trendSlope !== null ? (
            <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
              trend {trendAngle >= 0 ? '↗' : '↘'} {Math.abs(trendAngle).toFixed(0)}°
            </span>
          ) : null}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6, lineHeight: 1.45 }}>
        Reliability Score (r) = how reliably the signal tracks demand · Confidence Score (R²) = share of demand movement the trend explains · angle = direction only (a 45° line is not automatically 100% fit)
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap', fontSize: 11.5 }}>
        <span style={{ color: 'var(--text-faint)' }}>Dot color = distance from trend (explains r):</span>
        {(['close', 'moderate', 'far'] as const).map((tier) => (
          <span key={tier} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: FIT_TIER_COLORS[tier],
                flex: 'none',
              }}
            />
            {FIT_TIER_LABELS[tier]}
            <span className="nums" style={{ color: 'var(--text-faint)' }}>({tierCounts[tier]})</span>
          </span>
        ))}
      </div>
      <div style={{ width: '100%', height: 380, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
          <ScatterChart margin={{ top: 18, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name={signalDef.short}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v) => (indexed ? String(Math.round(v)) : formatValue(v, signalDef.unit, true))}
              label={{ value: xLabel, position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text-faint)' }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={demandDef.short}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) => (indexed ? String(Math.round(v)) : formatValue(v, demandDef.unit, true))}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-faint)' }}
            />
            <ZAxis range={[64, 64]} />
            {trendLine && (
              <ReferenceLine
                segment={[
                  { x: trendLine.x1, y: trendLine.y1 },
                  { x: trendLine.x2, y: trendLine.y2 },
                ]}
                stroke="var(--text-muted)"
                strokeDasharray="6 4"
                strokeWidth={1.75}
                ifOverflow="extendDomain"
              />
            )}
            <Tooltip content={<ScatterTooltip signalKey={signalKey} demandKey={demandKey} valueMode={valueMode} lag={lag} />} />
            <Scatter data={points} fillOpacity={0.85} strokeWidth={1.5} isAnimationActive={false}>
              {points.map((pt) => (
                <Cell key={pt.weekLabel} fill={pt.fill} stroke={pt.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ScatterTooltip({
  active,
  payload,
  signalKey,
  demandKey,
  valueMode,
  lag,
}: {
  active?: boolean;
  payload?: { payload: ScatterPoint }[];
  signalKey: MetricKey;
  demandKey: MetricKey;
  valueMode: ValueMode;
  lag: number;
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  const signalDef = METRICS[signalKey];
  const demandDef = METRICS[demandKey];
  const indexed = valueMode === 'indexed';

  return (
    <div className="card" style={{ padding: 10, boxShadow: 'var(--shadow-lg)', minWidth: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{pt.weekLabel}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: signalDef.color, flex: 'none' }} />
          <span style={{ color: 'var(--text-muted)', flex: 1 }}>{signalDef.label}</span>
          <span className="nums" style={{ fontWeight: 600 }}>
            {indexed ? pt.x.toFixed(0) : formatValue(pt.x, signalDef.unit, true)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: pt.fill, flex: 'none' }} />
          <span style={{ color: 'var(--text-muted)', flex: 1 }}>
            {demandDef.label}{lag > 0 ? ` (+${lag}w)` : ''}
          </span>
          <span className="nums" style={{ fontWeight: 600 }}>
            {indexed ? pt.y.toFixed(0) : formatValue(pt.y, demandDef.unit, true)}
          </span>
        </div>
        <div
          style={{
            marginTop: 4,
            paddingTop: 6,
            borderTop: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-faint)',
          }}
        >
          <span style={{ color: FIT_TIER_COLORS[pt.tier], fontWeight: 600 }}>{FIT_TIER_LABELS[pt.tier]}</span>
          {' · '}
          {pt.residual >= 0 ? 'above' : 'below'} trend by{' '}
          <span className="nums" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
            {indexed ? Math.abs(pt.residual).toFixed(0) : formatValue(Math.abs(pt.residual), demandDef.unit, true)}
          </span>
          {indexed ? ' index pts' : ''}
        </div>
      </div>
    </div>
  );
}
