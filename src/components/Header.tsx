import { useDashboard } from '../store/dashboardStore';
import type { CsvConnectionStatus, DataSourceStatus } from '../types';
import { METRIC_LIST } from '../config/metrics';
import { Bolt, Download, Info, Moon, Plug, Refresh, Sun, Upload } from './common/icons';
import { Dot } from './common/ui';

const STATUS_COLOR: Record<DataSourceStatus, string> = {
  live: 'var(--strong)',
  mock: 'var(--flat)',
  partial: 'var(--moderate)',
  error: 'var(--soft)',
  loading: 'var(--moderate)',
};

const CSV_STATUS_COLOR: Record<CsvConnectionStatus, string> = {
  connected: 'var(--strong)',
  loading: 'var(--moderate)',
  error: 'var(--soft)',
  disabled: 'var(--flat)',
  idle: 'var(--flat)',
};

const alertBannerStyle: React.CSSProperties = {
  marginTop: 10,
  padding: '7px 12px',
  borderRadius: 8,
  background: 'var(--soft-soft)',
  color: 'var(--soft)',
  fontSize: 12.5,
  fontWeight: 500,
  lineHeight: 1.45,
};

function HealthIndicator() {
  const health = useDashboard((s) => s.health);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {health.map((h) => (
        <span
          key={h.id}
          title={h.detail && h.status !== 'error' ? `${h.label}: ${h.detail}` : undefined}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}
        >
          <Dot color={STATUS_COLOR[h.status]} />
          {h.label}
          <span style={{ color: 'var(--text-faint)', textTransform: 'capitalize' }}>· {h.status}</span>
          {h.detail && h.status !== 'mock' && h.status !== 'live' && (
            <span style={{ color: h.status === 'error' ? 'var(--soft)' : 'var(--text-faint)' }}>· {h.detail}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function CsvConnectionIndicator() {
  const csvConnection = useDashboard((s) => s.csvConnection);
  const syncGoogleSheet = useDashboard((s) => s.syncGoogleSheet);
  const { status, label, weekCount, detail, connectedAt, tabs } = csvConnection;
  const isConnected = status === 'connected';

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 10px',
    borderRadius: 999,
    border: `1px solid ${isConnected ? 'color-mix(in srgb, var(--strong) 35%, var(--border))' : 'var(--border)'}`,
    background: isConnected ? 'color-mix(in srgb, var(--strong) 8%, var(--surface))' : 'var(--surface-2)',
    fontSize: 12,
    color: 'var(--text-muted)',
  };

  if (isConnected && tabs.length > 1) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <div key={tab.gid} title={`${tab.label}: ${tab.detail}`} style={pillStyle}>
            <Dot color="var(--strong)" />
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{tab.label}</span>
            <span style={{ color: 'var(--strong)', fontWeight: 600 }}>Connected</span>
            <span className="nums">· {tab.weekCount} rows</span>
          </div>
        ))}
        <div title={detail} style={{ ...pillStyle, borderStyle: 'dashed' }}>
          <span className="nums">{weekCount} merged weeks</span>
          {connectedAt && <span style={{ color: 'var(--text-faint)' }}>· synced {relativeTime(connectedAt)}</span>}
          <button
            className="btn"
            style={{ padding: '2px 8px', fontSize: 11, marginLeft: 2 }}
            onClick={() => void syncGoogleSheet()}
            title="Sync fresh CSV from Google (writes local cache)"
          >
            <Refresh size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div title={detail} style={pillStyle}>
      <Dot color={CSV_STATUS_COLOR[status]} />
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      {status === 'connected' && (
        <span style={{ color: 'var(--strong)', fontWeight: 600 }}>Connected</span>
      )}
      {status === 'loading' && <span>Loading…</span>}
      {status === 'error' && <span style={{ color: 'var(--soft)' }}>Error</span>}
      {status === 'disabled' && <span>Not configured</span>}
      {weekCount > 0 && <span className="nums">· {weekCount} weeks</span>}
      {connectedAt && status === 'connected' && (
        <span style={{ color: 'var(--text-faint)' }}>· synced {relativeTime(connectedAt)}</span>
      )}
      {(status === 'error' || status === 'connected') && (
        <button
          className="btn"
          style={{ padding: '2px 8px', fontSize: 11, marginLeft: 2 }}
          onClick={() => void syncGoogleSheet()}
          title="Sync fresh CSV from Google (updates local cache)"
        >
          <Refresh size={12} />
        </button>
      )}
    </div>
  );
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return new Date(iso).toLocaleString();
}

function exportCsv(records: ReturnType<typeof useDashboard.getState>['records']) {
  const cols = ['weekStart', 'weekLabel', ...METRIC_LIST.map((m) => m.key)];
  const head = cols.join(',');
  const body = records
    .map((r) => cols.map((c) => (r as unknown as Record<string, unknown>)[c] ?? '').join(','))
    .join('\n');
  const blob = new Blob([`${head}\n${body}`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'demand-correlation-export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function Header({ onOpenMethodology, onOpenUpload }: { onOpenMethodology: () => void; onOpenUpload: () => void }) {
  const { mode, status, lastUpdated, dateRange, theme, records, warning, health, csvConnection } = useDashboard();
  const sourceErrors = health.filter((h) => h.status === 'error' && h.detail);
  const connectLive = useDashboard((s) => s.connectLive);
  const useDemo = useDashboard((s) => s.useDemo);
  const refresh = useDashboard((s) => s.refresh);
  const toggleTheme = useDashboard((s) => s.toggleTheme);
  const setDateRange = useDashboard((s) => s.setDateRange);

  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 20 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center', color: '#fff' }}>
              <Bolt size={17} />
            </div>
            <div>
              <h1 style={{ fontSize: 16.5, fontWeight: 680, margin: 0, letterSpacing: -0.3 }}>Demand Correlation Dashboard</h1>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>How content activity leads demand signals · correlation, not attribution</div>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange(e.target.value, dateRange.end)}
                className="nums" style={inputStyle} aria-label="Start date" />
              <span style={{ color: 'var(--text-faint)' }}>→</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange(dateRange.start, e.target.value)}
                className="nums" style={inputStyle} aria-label="End date" title="Weeks are Monday–Sunday; demand APIs include through the Sunday of this week" />
            </div>

            {mode === 'demo' ? (
              <button className="btn btn-primary" onClick={() => connectLive()} disabled={status === 'loading'}>
                <Plug size={14} /> {status === 'loading' ? 'Connecting…' : 'Connect live data'}
              </button>
            ) : (
              <button className="btn" onClick={() => useDemo()}><Bolt size={14} /> Demo data</button>
            )}

            <button className="btn" onClick={() => refresh()} title="Refresh" aria-label="Refresh"><Refresh size={14} /></button>
            <button className="btn" onClick={onOpenUpload}><Upload size={14} /> Upload CSV</button>
            <button className="btn" onClick={() => exportCsv(records)}><Download size={14} /> Export</button>
            <button className="btn" onClick={onOpenMethodology} aria-label="Methodology"><Info size={14} /></button>
            <button className="btn" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <HealthIndicator />
          <CsvConnectionIndicator />
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-faint)' }}>
            Updated {relativeTime(lastUpdated)} · <span style={{ textTransform: 'capitalize' }}>{mode}</span> mode
          </span>
        </div>

        {csvConnection.status === 'error' && (
          <div style={alertBannerStyle}>
            Google Sheet: {csvConnection.detail}
          </div>
        )}

        {sourceErrors.map((h) => (
          <div key={h.id} style={alertBannerStyle}>
            <strong>{h.label}</strong>: {h.detail}. Demo values are being used for this source.
          </div>
        ))}

        {warning && !sourceErrors.length && (
          <div style={alertBannerStyle}>
            {warning}
          </div>
        )}
      </div>
    </header>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
  borderRadius: 8,
  padding: '6px 8px',
  fontSize: 12.5,
};
