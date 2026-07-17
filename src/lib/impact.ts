import type { Confidence, MetricKey, WeeklyRecord } from '../types';
import { buildSeries } from './metrics';
import { LAG_WEEKS, confidenceFromR, pearson } from './correlation';

// ---------------------------------------------------------------------------
// Impact Forecast math — "bump & lift" estimation.
// For each lag L we relate the signal's weekly bump (% vs its trailing 4-week
// baseline, the existing vsRollingPct) to the demand metric's bump L weeks
// later, and fit an OLS line through those deviation pairs. The slope (beta)
// converts a bump size into an expected lift: a +10% bump in the signal maps
// to ~(beta × 10)% lift in demand at that lag. Working on baseline deviations
// rather than raw levels keeps a shared upward trend from faking a lag effect.
// ---------------------------------------------------------------------------

/** Signal bump (% vs baseline) counted as a real "bump" — same as insightEngine's SPIKE. */
export const BUMP_THRESHOLD = 12;

/** Minimum overlapping weeks before an estimate is attempted at a lag. */
export const MIN_WEEKS = 4;

/** Below this many overlapping weeks, confidence is capped one tier lower. */
const SMALL_SAMPLE_WEEKS = 8;

/** Impact estimate for one signal→demand pair at one lag. */
export interface ImpactLagResult {
  lag: number;
  n: number; // overlapping weeks used
  beta: number | null; // % lift in demand per 1% bump in the signal
  betaLow: number | null; // 90% likely range on beta
  betaHigh: number | null;
  r: number; // Pearson r of the deviation pairs
  r2: number;
  tStat: number | null; // slope / standard error — used to rank lags
}

export interface ImpactResult {
  signalKey: MetricKey;
  demandKey: MetricKey;
  byLag: ImpactLagResult[];
  /** Lag where the positive bump→lift relationship is strongest, or null if none. */
  best: ImpactLagResult | null;
  confidence: Confidence;
}

/** Two-sided 90% Student-t critical values by degrees of freedom (df > 30 ≈ normal). */
const T90: [df: number, t: number][] = [
  [1, 6.31], [2, 2.92], [3, 2.35], [4, 2.13], [5, 2.02], [6, 1.94], [7, 1.9],
  [8, 1.86], [9, 1.83], [10, 1.81], [12, 1.78], [15, 1.75], [20, 1.72], [30, 1.7],
];

function tCrit90(df: number): number {
  for (const [d, t] of T90) if (df <= d) return t;
  return 1.65;
}

function deviationPairs(
  signalDev: (number | null)[],
  demandDev: (number | null)[],
  lag: number,
): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let t = 0; t + lag < demandDev.length; t++) {
    const x = signalDev[t];
    const y = demandDev[t + lag];
    if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  return { xs, ys };
}

function fitLag(xs: number[], ys: number[], lag: number): ImpactLagResult {
  const n = xs.length;
  const empty: ImpactLagResult = { lag, n, beta: null, betaLow: null, betaHigh: null, r: 0, r2: 0, tStat: null };
  if (n < MIN_WEEKS) return empty;

  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    sxx += dx * dx;
    sxy += dx * (ys[i] - my);
  }
  if (sxx === 0) return empty;

  const beta = sxy / sxx;
  const intercept = my - beta * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const resid = ys[i] - (beta * xs[i] + intercept);
    sse += resid * resid;
  }
  const df = n - 2;
  const se = df > 0 ? Math.sqrt(sse / df / sxx) : null;
  const tStat = se !== null && se > 0 ? beta / se : null;
  const halfWidth = se !== null ? tCrit90(df) * se : null;
  const r = pearson(xs, ys);

  return {
    lag,
    n,
    beta,
    betaLow: halfWidth !== null ? beta - halfWidth : null,
    betaHigh: halfWidth !== null ? beta + halfWidth : null,
    r,
    r2: r * r,
    tStat,
  };
}

/** Confidence from correlation strength, capped one tier lower on short histories. */
export function impactConfidence(r: number, n: number): Confidence {
  const base = confidenceFromR(r);
  if (n >= SMALL_SAMPLE_WEEKS) return base;
  return base === 'High' ? 'Medium' : 'Low';
}

/**
 * Estimate the bump→lift relationship for a signal→demand pair at each lag.
 * `best` is the lag with the strongest positive relationship (highest t-stat
 * with beta > 0), or null when no lag shows a positive lift.
 */
export function lagImpact(
  records: WeeklyRecord[],
  signalKey: MetricKey,
  demandKey: MetricKey,
  lags: readonly number[] = LAG_WEEKS,
): ImpactResult {
  const signalDev = buildSeries(records, signalKey).map((p) => p.vsRollingPct);
  const demandDev = buildSeries(records, demandKey).map((p) => p.vsRollingPct);

  const byLag = lags.map((lag) => {
    const { xs, ys } = deviationPairs(signalDev, demandDev, lag);
    return fitLag(xs, ys, lag);
  });

  const positive = byLag.filter((res) => res.beta !== null && res.beta > 0 && res.tStat !== null);
  const best = positive.length
    ? positive.reduce((acc, cur) => ((cur.tStat ?? 0) > (acc.tStat ?? 0) ? cur : acc))
    : null;

  return {
    signalKey,
    demandKey,
    byLag,
    best,
    confidence: best ? impactConfidence(best.r, best.n) : 'Low',
  };
}

/** Expected lift (and likely range) in demand for a bump of `bumpPct` in the signal. */
export function predictLift(
  res: ImpactLagResult,
  bumpPct: number,
): { lift: number; low: number | null; high: number | null } | null {
  if (res.beta === null) return null;
  return {
    lift: res.beta * bumpPct,
    low: res.betaLow !== null ? res.betaLow * bumpPct : null,
    high: res.betaHigh !== null ? res.betaHigh * bumpPct : null,
  };
}

/** A past week where the signal bumped, and what demand did `lag` weeks later. */
export interface PastBump {
  weekStart: string;
  weekLabel: string;
  signalBumpPct: number;
  liftPct: number | null; // demand vs its baseline `lag` weeks later; null = not observed yet
  followed: boolean | null;
}

/** Historical check: every week the signal bumped ≥ threshold, and the demand response. */
export function findPastBumps(
  records: WeeklyRecord[],
  signalKey: MetricKey,
  demandKey: MetricKey,
  lag: number,
  threshold: number = BUMP_THRESHOLD,
): PastBump[] {
  const signalPts = buildSeries(records, signalKey);
  const demandPts = buildSeries(records, demandKey);

  const bumps: PastBump[] = [];
  for (let t = 0; t < signalPts.length; t++) {
    const bump = signalPts[t].vsRollingPct;
    if (bump === null || bump < threshold) continue;
    const liftPct = t + lag < demandPts.length ? demandPts[t + lag].vsRollingPct : null;
    bumps.push({
      weekStart: signalPts[t].weekStart,
      weekLabel: signalPts[t].weekLabel,
      signalBumpPct: bump,
      liftPct,
      followed: liftPct === null ? null : liftPct > 0,
    });
  }
  return bumps;
}
