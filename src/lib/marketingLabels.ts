import type { Confidence } from '../types';

/** Pearson r as a 0–100% Reliability Score for marketing-facing views. */
export function reliabilityScorePercent(r: number): string {
  return `${Math.round(Math.abs(r) * 100)}%`;
}

/** Lag offset in plain timing language. */
export function timingLabel(lag: number): string {
  if (lag === 0) return 'Same week';
  if (lag === 1) return '1 week earlier';
  return `${lag} weeks earlier`;
}

/** Short timing label for compact table headers. */
export function timingLabelShort(lag: number): string {
  if (lag === 0) return 'Same week';
  if (lag === 1) return '1 wk earlier';
  return `${lag} wks earlier`;
}

export const RELATIONSHIP_STRENGTH_LABELS: Record<Confidence, string> = {
  High: 'Strong relationship',
  Medium: 'Some relationship',
  Low: 'Weak / no relationship',
};

/** Impact Forecast: when the lift should appear, in plain language. */
export function liftTimingLabel(lag: number): string {
  if (lag === 0) return 'the same week';
  if (lag === 1) return 'about 1 week later';
  return `about ${lag} weeks later`;
}

/** Compact lift timing for the week-by-week ripple columns. */
export function liftTimingLabelShort(lag: number): string {
  if (lag === 0) return 'Same week';
  if (lag === 1) return '1 wk later';
  return `${lag} wks later`;
}
