import type { MetricKey, WeeklyRecord } from '../types';
import { METRICS } from '../config/metrics';
import { buildSeries } from './metrics';
import {
  confidenceFromR,
  FIT_TIER_LABELS,
  linearRegression,
  pearson,
  pointFitFromRegression,
  rSquared,
  trendAngleDegrees,
} from './correlation';
import type { ValueMode } from '../store/dashboardStore';

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seriesMeta(key: MetricKey, lag: number) {
  const def = METRICS[key];
  const isDemand = def.group === 'demand';
  return {
    key,
    label: def.label,
    short: def.short,
    group: def.group,
    unit: def.unit,
    chartStyle: isDemand ? ('solid-line' as const) : ('dashed-area' as const),
    shiftedEarlierByWeeks: isDemand ? lag : 0,
  };
}

export function buildTimelineChartExport(
  records: WeeklyRecord[],
  visibleKeys: MetricKey[],
  valueMode: ValueMode,
  lag: number,
) {
  const seriesByKey = new Map(visibleKeys.map((k) => [k, buildSeries(records, k)]));
  const rows = records.map((r) => ({
    weekStart: r.weekStart,
    weekLabel: r.weekLabel,
    values: {} as Record<string, number | null>,
  }));

  for (const key of visibleKeys) {
    const pts = seriesByKey.get(key)!;
    const def = METRICS[key];
    const shift = def.group === 'demand' ? lag : 0;
    pts.forEach((p, i) => {
      const targetIndex = i - shift;
      if (targetIndex < 0 || targetIndex >= rows.length) return;
      const value = valueMode === 'indexed' ? p.indexed : p.value;
      rows[targetIndex].values[key] = value === null ? null : round(value, valueMode === 'indexed' ? 2 : 4);
    });
  }

  return {
    chartType: 'timeline' as const,
    description:
      'Weekly content signals (dashed) vs demand outcomes (solid). Demand series may be shifted earlier by lagWeeks to test a leading relationship.',
    valueMode,
    lagWeeks: lag,
    lagNote:
      lag > 0
        ? `Demand series pulled ${lag} week${lag === 1 ? '' : 's'} earlier to align with leading content.`
        : 'No lag shift applied; demand and content share the same week on the x-axis.',
    series: visibleKeys.map((key) => seriesMeta(key, lag)),
    weeks: rows,
  };
}

export function buildScatterChartExport(
  records: WeeklyRecord[],
  signalKey: MetricKey,
  demandKey: MetricKey,
  valueMode: ValueMode,
  lag: number,
) {
  const signalDef = METRICS[signalKey];
  const demandDef = METRICS[demandKey];
  const indexed = valueMode === 'indexed';
  const signalSeries = buildSeries(records, signalKey);
  const demandSeries = buildSeries(records, demandKey);

  const xs: number[] = [];
  const ys: number[] = [];
  const weekStarts: string[] = [];
  const weekLabels: string[] = [];

  for (let t = 0; t + lag < records.length; t++) {
    const sp = signalSeries[t];
    const dp = demandSeries[t + lag];
    const x = indexed ? sp.indexed : sp.value;
    const y = indexed ? dp.indexed : dp.value;
    if (x !== null && y !== null) {
      weekStarts.push(records[t].weekStart);
      weekLabels.push(sp.weekLabel);
      xs.push(x);
      ys.push(y);
    }
  }

  const reg = linearRegression(xs, ys);
  const fits = reg ? pointFitFromRegression(xs, ys, reg) : [];
  const r = pearson(xs, ys);
  const r2 = rSquared(r);

  const trendLine =
    reg && xs.length >= 2
      ? (() => {
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          return {
            x1: round(minX, 4),
            y1: round(reg.slope * minX + reg.intercept, 4),
            x2: round(maxX, 4),
            y2: round(reg.slope * maxX + reg.intercept, 4),
          };
        })()
      : null;

  const points = xs.map((x, i) => {
    const fit = fits[i];
    return {
      weekStart: weekStarts[i],
      weekLabel: weekLabels[i],
      signal: round(x, indexed ? 2 : 4),
      demand: round(ys[i], indexed ? 2 : 4),
      predictedDemand: fit ? round(fit.predicted, indexed ? 2 : 4) : null,
      residual: fit ? round(fit.residual, indexed ? 2 : 4) : null,
      fitTier: fit?.tier ?? null,
      fitLabel: fit ? FIT_TIER_LABELS[fit.tier] : null,
    };
  });

  return {
    chartType: 'scatter' as const,
    description:
      'Each point is one week: signal on x-axis vs demand on y-axis. Demand is aligned using lagWeeks so earlier content can be tested against later demand.',
    valueMode,
    lagWeeks: lag,
    lagNote:
      lag > 0
        ? `Demand is shifted ${lag} week${lag === 1 ? '' : 's'} later relative to content (content leads).`
        : 'Signal and demand are from the same week.',
    signal: seriesMeta(signalKey, 0),
    demand: seriesMeta(demandKey, lag),
    axes: {
      x: indexed ? `${signalDef.short} (index)` : signalDef.label,
      y: indexed
        ? `${demandDef.short} (index${lag > 0 ? `, +${lag}w lag` : ''})`
        : `${demandDef.label}${lag > 0 ? ` (+${lag}w lag)` : ''}`,
    },
    stats: {
      reliabilityScoreR: round(r, 4),
      reliabilityScorePercent: Math.round(Math.abs(r) * 100),
      confidenceScoreR2: round(r2, 4),
      confidenceScorePercentExplained: Math.round(r2 * 100),
      relationshipStrength: confidenceFromR(r),
      trendAngleDegrees: reg ? round(trendAngleDegrees(reg.slope), 2) : null,
      trendSlope: reg ? round(reg.slope, 4) : null,
    },
    trendLine,
    points,
  };
}

export type ChartExportPayload = ReturnType<typeof buildTimelineChartExport> | ReturnType<typeof buildScatterChartExport>;
