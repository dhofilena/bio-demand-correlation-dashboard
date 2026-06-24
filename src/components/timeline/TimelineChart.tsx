import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MetricKey, WeeklyRecord } from '../../types';
import { METRICS } from '../../config/metrics';
import { buildSeries } from '../../lib/metrics';
import { formatValue, formatPct } from '../../lib/format';
import type { ValueMode } from '../../store/dashboardStore';

interface Props {
  records: WeeklyRecord[];
  visibleKeys: MetricKey[];
  valueMode: ValueMode;
  lag: number; // demand series shifted earlier by this many weeks
}

interface Row {
  weekLabel: string;
  weekStart: string;
  [key: string]: number | string | null;
}

// Demand metrics whose raw magnitude shares the "big" left axis in absolute mode.
function axisFor(key: MetricKey, records: WeeklyRecord[]): 'big' | 'small' {
  const max = Math.max(0, ...records.map((r) => (r[key] as number | null) ?? 0));
  return max > 2000 ? 'big' : 'small';
}

export function TimelineChart({ records, visibleKeys, valueMode, lag }: Props) {
  const { data, perKey, hasBig, hasSmall } = useMemo(() => {
    const seriesByKey = new Map(visibleKeys.map((k) => [k, buildSeries(records, k)]));

    const rows: Row[] = records.map((r) => ({ weekLabel: r.weekLabel, weekStart: r.weekStart }));

    let hasBig = false;
    let hasSmall = false;

    for (const key of visibleKeys) {
      const pts = seriesByKey.get(key)!;
      const def = METRICS[key];
      const isDemand = def.group === 'demand';
      const shift = isDemand ? lag : 0;
      if (valueMode === 'absolute') {
        if (axisFor(key, records) === 'big') hasBig = true;
        else hasSmall = true;
      }
      pts.forEach((p, i) => {
        const targetIndex = i - shift; // pull demand earlier to align with its leading signal
        if (targetIndex < 0 || targetIndex >= rows.length) return;
        const value = valueMode === 'indexed' ? p.indexed : p.value;
        rows[targetIndex][key] = value;
      });
    }

    return { data: rows, perKey: seriesByKey, hasBig, hasSmall };
  }, [records, visibleKeys, valueMode, lag]);

  const indexed = valueMode === 'indexed';

  const weekBands = useMemo(() => {
    const BLOCK = 4;
    return Array.from({ length: Math.ceil(data.length / BLOCK) }, (_, bi) => {
      const start = bi * BLOCK;
      const end = Math.min(start + BLOCK - 1, data.length - 1);
      return {
        key: String(data[start].weekStart),
        x1: data[start].weekLabel,
        x2: data[end].weekLabel,
        fill: bi % 2 === 0 ? 'var(--surface-2)' : 'transparent',
      };
    });
  }, [data]);

  return (
    <div style={{ width: '100%', height: 380, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
        <ComposedChart data={data} margin={{ top: 18, right: 16, bottom: 4, left: 4 }}>
          {weekBands.map((band) => (
            <ReferenceArea key={band.key} x1={band.x1} x2={band.x2} fill={band.fill} strokeOpacity={0} ifOverflow="hidden" />
          ))}
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
          {indexed ? (
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={42}
              label={{ value: 'Index (base 100)', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--text-faint)' }} />
          ) : (
            <>
              {hasBig && <YAxis yAxisId="big" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => formatValue(v, 'count', true)} />}
              {hasSmall && <YAxis yAxisId="small" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={40} />}
            </>
          )}
          {indexed && <ReferenceLine y={100} stroke="var(--border-strong)" strokeDasharray="4 4" />}

          <Tooltip content={<ChartTooltip perKey={perKey} valueMode={valueMode} visibleKeys={visibleKeys} lag={lag} />} />

          {visibleKeys.map((key) => {
            const def = METRICS[key];
            const isDemand = def.group === 'demand';
            const axisId = indexed ? undefined : axisFor(key, records);
            const common = {
              dataKey: key,
              name: def.label,
              stroke: def.color,
              connectNulls: true,
              dot: false,
              isAnimationActive: false,
              ...(indexed ? {} : { yAxisId: axisId }),
            } as const;
            // Demand = solid lines (outcomes); content = lighter dashed area (signals).
            return isDemand ? (
              <Line key={key} {...common} type="monotone" strokeWidth={2.2} activeDot={{ r: 4 }} />
            ) : (
              <Area key={key} {...common} type="monotone" strokeWidth={1.8} strokeDasharray="5 4" fill={def.color} fillOpacity={0.05} />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string;
  perKey: Map<MetricKey, ReturnType<typeof buildSeries>>;
  valueMode: ValueMode;
  visibleKeys: MetricKey[];
  lag: number;
}

function ChartTooltip({ active, label, perKey, visibleKeys, valueMode, lag }: TooltipProps) {
  if (!active || !label) return null;
  const rows = visibleKeys
    .map((key) => {
      const pts = perKey.get(key)!;
      const def = METRICS[key];
      const shift = def.group === 'demand' ? lag : 0;
      // Find the point whose shifted x lands on this label.
      const idx = pts.findIndex((p, i) => pts[i] && p.weekLabel && i - shift >= 0 && pts[i - shift]?.weekLabel === label);
      const point = idx >= 0 ? pts[idx] : pts.find((p) => p.weekLabel === label);
      if (!point || point.value === null) return null;
      return { def, point, shifted: shift > 0 };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (!rows.length) return null;

  return (
    <div className="card" style={{ padding: 10, boxShadow: 'var(--shadow-lg)', minWidth: 200 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.map(({ def, point, shifted }) => (
          <div key={def.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: def.color, flex: 'none' }} />
            <span style={{ color: 'var(--text-muted)', flex: 1 }}>
              {def.label}{shifted ? ` (shifted ${lag}w)` : ''}
            </span>
            <span className="nums" style={{ fontWeight: 600 }}>
              {valueMode === 'indexed' ? `${point.indexed?.toFixed(0)}` : formatValue(point.value, def.unit, true)}
            </span>
            <span className="nums" style={{ color: (point.priorWeekDeltaPct ?? 0) >= 0 ? 'var(--strong)' : 'var(--soft)', width: 48, textAlign: 'right' }}>
              {formatPct(point.priorWeekDeltaPct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
