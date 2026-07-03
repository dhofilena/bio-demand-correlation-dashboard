import type { Confidence, LagResult, MetricKey, WeeklyRecord } from '../types';

export const LAG_WEEKS = [0, 1, 2, 3, 4] as const;
export type LagWeek = (typeof LAG_WEEKS)[number];

/** Ordinary least-squares fit y = slope * x + intercept. */
export function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/** Trend-line angle in data coordinates (degrees). 45° = slope 1 (y rises 1:1 with x). */
export function trendAngleDegrees(slope: number): number {
  return (Math.atan(slope) * 180) / Math.PI;
}

/** Share of demand variance explained by the linear trend (r²). 1.0 = perfect fit. */
export function rSquared(r: number): number {
  return r * r;
}

/** Pearson correlation over paired, finite samples. Returns 0 if undefined. */
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  let sa = 0,
    sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  let num = 0,
    da = 0,
    db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

function series(records: WeeklyRecord[], key: MetricKey): (number | null)[] {
  return records.map((r) => (r[key] as number | null) ?? null);
}

/**
 * Test whether a content signal "leads" a demand signal. For each lag L in
 * `lags`, correlate content[t] with demand[t + L] (content earlier, demand later)
 * over the weeks where both are present. Returns the lag with the strongest
 * positive correlation.
 */
export function lagCorrelation(
  records: WeeklyRecord[],
  contentKey: MetricKey,
  demandKey: MetricKey,
  lags: number[] = [...LAG_WEEKS],
): LagResult {
  const content = series(records, contentKey);
  const demand = series(records, demandKey);

  const byLag = lags.map((lag) => {
    const a: number[] = [];
    const b: number[] = [];
    for (let t = 0; t + lag < records.length; t++) {
      const c = content[t];
      const d = demand[t + lag];
      if (c !== null && d !== null) {
        a.push(c);
        b.push(d);
      }
    }
    return { lag, r: pearson(a, b) };
  });

  const best = byLag.reduce((acc, cur) => (cur.r > acc.r ? cur : acc), byLag[0]);

  return {
    contentKey,
    demandKey,
    bestLag: best.lag,
    r: best.r,
    byLag,
    confidence: confidenceFromR(best.r),
  };
}

export function confidenceFromR(r: number): Confidence {
  const a = Math.abs(r);
  if (a >= 0.6) return 'High';
  if (a >= 0.35) return 'Medium';
  return 'Low';
}

export type FitTier = 'close' | 'moderate' | 'far';

export interface PointFit {
  predicted: number;
  residual: number;
  absResidual: number;
  tier: FitTier;
}

const FIT_TIER_THRESHOLDS = { close: 0.5, moderate: 1.0 } as const;

/** Per-point distance from the OLS trend line, tiered by |residual| / σ(y). */
export function pointFitFromRegression(
  xs: number[],
  ys: number[],
  reg: { slope: number; intercept: number },
): PointFit[] {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return [];

  let sy = 0;
  for (let i = 0; i < n; i++) sy += ys[i];
  const my = sy / n;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const d = ys[i] - my;
    vy += d * d;
  }
  const stdY = Math.sqrt(vy / n) || 1;

  return xs.slice(0, n).map((x, i) => {
    const predicted = reg.slope * x + reg.intercept;
    const residual = ys[i] - predicted;
    const absResidual = Math.abs(residual);
    const z = absResidual / stdY;
    const tier: FitTier =
      z <= FIT_TIER_THRESHOLDS.close
        ? 'close'
        : z <= FIT_TIER_THRESHOLDS.moderate
          ? 'moderate'
          : 'far';
    return { predicted, residual, absResidual, tier };
  });
}

export const FIT_TIER_COLORS: Record<FitTier, string> = {
  close: 'var(--strong)',
  moderate: 'var(--moderate)',
  far: 'var(--soft)',
};

export const FIT_TIER_LABELS: Record<FitTier, string> = {
  close: 'On trend',
  moderate: 'Slightly off',
  far: 'Off trend',
};

/** Detect the strongest content→demand lead relationship for a demand channel. */
export function bestLeadingSignal(
  records: WeeklyRecord[],
  demandKey: MetricKey,
  contentKeys: MetricKey[],
): LagResult | null {
  const results = contentKeys
    .map((c) => lagCorrelation(records, c, demandKey))
    .filter((res) => res.r > 0.1);
  if (!results.length) return null;
  return results.reduce((acc, cur) => (cur.r > acc.r ? cur : acc));
}
