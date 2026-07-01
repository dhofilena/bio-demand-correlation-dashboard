import type { Unit } from '../types';

const numberFmt = new Intl.NumberFormat('en-US');
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const currencyCompactFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatValue(value: number | null | undefined, unit: Unit, compact = false): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (unit === 'currency') return (compact ? currencyCompactFmt : currencyFmt).format(value);
  if (unit === 'ratio') return `${value.toFixed(2)}x`;
  if (compact) return compactFmt.format(value);
  return numberFmt.format(Math.round(value));
}

export function formatPct(value: number | null | undefined, withSign = true): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = withSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDelta(value: number | null | undefined, unit: Unit): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatValue(Math.abs(value), unit, true)}`;
}
