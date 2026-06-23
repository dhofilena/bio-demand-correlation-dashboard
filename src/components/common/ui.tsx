import type { Confidence, StatusLabel } from '../../types';
import { ArrowDown, ArrowRight, ArrowUp } from './icons';
import { formatPct } from '../../lib/format';

const STATUS_CLASS: Record<StatusLabel, string> = {
  Strong: 'badge-strong',
  Moderate: 'badge-moderate',
  Flat: 'badge-flat',
  Soft: 'badge-soft',
};

export function StatusBadge({ status }: { status: StatusLabel | null }) {
  if (!status) return <span className="pill badge-flat">No data</span>;
  const Arrow = status === 'Strong' || status === 'Moderate' ? ArrowUp : status === 'Soft' ? ArrowDown : ArrowRight;
  return (
    <span className={`pill ${STATUS_CLASS[status]}`}>
      <Arrow size={12} />
      {status}
    </span>
  );
}

export function DeltaPill({ pct }: { pct: number | null }) {
  if (pct === null || Number.isNaN(pct)) return <span className="nums" style={{ color: 'var(--text-faint)' }}>—</span>;
  const up = pct >= 0;
  const color = Math.abs(pct) < 1.5 ? 'var(--flat)' : up ? 'var(--strong)' : 'var(--soft)';
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span className="nums" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontWeight: 600, fontSize: 12.5 }}>
      <Arrow size={12} />
      {formatPct(Math.abs(pct), false)}
    </span>
  );
}

const CONF_CLASS: Record<Confidence, string> = {
  High: 'badge-strong',
  Medium: 'badge-moderate',
  Low: 'badge-flat',
};

export function ConfidenceBadge({ level }: { level: Confidence }) {
  return <span className={`pill ${CONF_CLASS[level]}`}>{level} confidence</span>;
}

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, flex: 'none' }} />;
}

export function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-hover)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', className = '' }: { height?: number; width?: number | string; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height, width }} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px', fontSize: 13.5 }}>{body}</div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center', borderColor: 'var(--soft)' }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: 'var(--soft)' }}>Couldn’t load live data</div>
      <div style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px', fontSize: 13.5 }}>{message}</div>
      {onRetry && (
        <button className="btn" onClick={onRetry}>Retry</button>
      )}
    </div>
  );
}
