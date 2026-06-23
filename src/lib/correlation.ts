import type { Confidence, LagResult, MetricKey, WeeklyRecord } from '../types';

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
  lags: number[] = [0, 1, 2],
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
