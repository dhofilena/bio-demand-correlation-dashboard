import { useState } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { METRIC_LIST } from '../config/metrics';
import {
  parseCsv,
  autoDetectMapping,
  applyMapping,
  type ColumnMapping,
  type ParsedCsv,
} from '../services/csvIngest';
import { Upload, Refresh } from './common/icons';

type Step = 'select' | 'map' | 'error';

const TARGET_FIELDS: { key: keyof ColumnMapping; label: string; required?: boolean }[] = [
  { key: 'weekStart', label: 'Week start (date)', required: true },
  ...METRIC_LIST.map((m) => ({ key: m.key as keyof ColumnMapping, label: m.label })),
];

export function CsvUploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setCsv = useDashboard((s) => s.setCsv);
  const clearCsv = useDashboard((s) => s.clearCsv);
  const csvRecords = useDashboard((s) => s.csvRecords);
  const csvConnection = useDashboard((s) => s.csvConnection);
  const syncGoogleSheet = useDashboard((s) => s.syncGoogleSheet);

  const [step, setStep] = useState<Step>('select');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  if (!open) return null;

  async function onFile(file: File) {
    setFileName(file.name);
    try {
      const res = await parseCsv(file);
      if (!res.headers.length || !res.rows.length) throw new Error('No rows detected. Expect a tidy CSV with a header row and one row per week.');
      setParsed(res);
      setMapping(autoDetectMapping(res.headers));
      setStep('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep('error');
    }
  }

  const preview = parsed && mapping.weekStart ? applyMapping(parsed.rows, mapping).slice(0, 5) : [];
  const mappedMetrics = METRIC_LIST.filter((m) => mapping[m.key]);

  function confirm() {
    if (!parsed) return;
    const records = applyMapping(parsed.rows, mapping);
    if (!records.length) {
      setError('Could not build any weekly rows — check that the Week start column maps to a real date column.');
      setStep('error');
      return;
    }
    setCsv(records, { label: fileName || 'Uploaded CSV' });
    reset();
    onClose();
  }

  function reset() {
    setStep('select');
    setParsed(null);
    setMapping({});
    setError('');
    setFileName('');
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={modal}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={16} />
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Upload content / social CSV</h2>
          <button className="btn" onClick={onClose} style={{ marginLeft: 'auto', padding: '4px 10px' }}>Close</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto' }}>
          {step === 'select' && (
            <div>
              <p style={{ marginTop: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                Upload a tidy CSV — one row per week, a date column, and a column per metric. Headers are auto-detected and you can remap them on the next step. A ready-made sample lives in <code>/sample-data</code>.
              </p>
              <label style={dropzone}>
                <Upload size={22} />
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>Choose a CSV file</span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>or drag it onto this box</span>
                <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  disabled={syncLoading || csvConnection.status === 'loading'}
                  onClick={async () => {
                    setSyncLoading(true);
                    try {
                      const ok = await syncGoogleSheet();
                      if (ok) onClose();
                    } finally {
                      setSyncLoading(false);
                    }
                  }}
                >
                  <Refresh size={14} />
                  {syncLoading || csvConnection.status === 'loading' ? 'Syncing from Google…' : 'Sync from Google Sheet'}
                </button>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.45 }}>
                  The dashboard loads from a local CSV cache on startup. Sync pulls the latest sheet data from Google and updates that cache.
                </p>
                {csvConnection.status === 'connected' && (
                  <div style={{ fontSize: 12.5, color: 'var(--strong)', fontWeight: 600 }}>
                    {csvConnection.label} connected · {csvConnection.weekCount} weeks · {csvConnection.detail}
                  </div>
                )}
              </div>

              {csvRecords?.length ? (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>
                  <span>{csvRecords.length} weeks currently loaded{csvConnection.source === 'upload' ? ' from upload' : ''}.</span>
                  <button className="btn" onClick={() => { clearCsv(); }}>Clear & use demo content</button>
                </div>
              ) : null}
            </div>
          )}

          {step === 'map' && parsed && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12.5, color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{fileName}</strong> · {parsed.rows.length} rows · {parsed.headers.length} columns
              </div>
              <p style={{ marginTop: 0, fontSize: 12.5, color: 'var(--text-muted)' }}>Map each dashboard field to a column in your file. Only <strong>Week start</strong> is required; leave others blank to keep demo values.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10, margin: '12px 0 18px' }}>
                {TARGET_FIELDS.map((f) => (
                  <label key={String(f.key)} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                      {f.label}{f.required && <span style={{ color: 'var(--soft)' }}> *</span>}
                    </span>
                    <select value={mapping[f.key] ?? ''} onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                      style={selectStyle}>
                      <option value="">— none —</option>
                      {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </label>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Preview ({mappedMetrics.length} metric column{mappedMetrics.length === 1 ? '' : 's'} mapped)</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: 'var(--text-faint)', textAlign: 'left' }}>
                      <th style={pTh}>Week</th>
                      {mappedMetrics.map((m) => <th key={m.key} style={pTh}>{m.short}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.length ? preview.map((r) => (
                      <tr key={r.weekStart} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={pTd} className="nums">{r.weekLabel}</td>
                        {mappedMetrics.map((m) => <td key={m.key} style={pTd} className="nums">{r[m.key] ?? '—'}</td>)}
                      </tr>
                    )) : (
                      <tr><td style={pTd} colSpan={mappedMetrics.length + 1}>Map the Week start column to preview rows.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={reset}>Back</button>
                <button className="btn btn-primary" onClick={confirm} disabled={!mapping.weekStart}>Merge into dashboard</button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ color: 'var(--soft)', fontWeight: 600, marginBottom: 8 }}>Couldn’t read that file</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 16px' }}>{error}</p>
              <button className="btn" onClick={reset}>Try another file</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(8,12,18,0.45)', zIndex: 50,
  display: 'grid', placeItems: 'center', padding: 20,
};
const modal: React.CSSProperties = {
  width: 'min(820px, 96vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column',
  boxShadow: 'var(--shadow-lg)', padding: 0,
};
const dropzone: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  padding: '36px 20px', border: '1.5px dashed var(--border-strong)', borderRadius: 12,
  cursor: 'pointer', color: 'var(--text-muted)', background: 'var(--surface-2)',
};
const selectStyle: React.CSSProperties = {
  border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)',
  borderRadius: 7, padding: '6px 8px', fontSize: 12.5,
};
const pTh: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, whiteSpace: 'nowrap' };
const pTd: React.CSSProperties = { padding: '7px 10px', whiteSpace: 'nowrap' };
