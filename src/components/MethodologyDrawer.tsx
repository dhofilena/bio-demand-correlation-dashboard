import { Info } from './common/icons';

const SECTIONS = [
  {
    h: 'This is correlation, not attribution',
    p: 'The dashboard relates upstream content activity to downstream demand signals over time. It does not run a media-mix or last-touch attribution model and should not be read as proof that one channel caused another.',
  },
  {
    h: 'Lag windows are estimated',
    p: 'For each content→demand pair we test 0, 1 and 2-week lags and surface the window with the strongest positive correlation. Short histories make these estimates noisy; treat them as planning hints.',
  },
  {
    h: 'Rolling averages are the baseline',
    p: 'Status (Strong / Moderate / Flat / Soft) compares the current week to the trailing 4-week average, which smooths weekly noise. A metric is “Strong” at ≥ +8%, “Soft” at ≤ −2%.',
  },
  {
    h: 'Confidence levels',
    p: 'Confidence reflects correlation strength: High at |r| ≥ 0.60, Medium at ≥ 0.35, otherwise Low. Low confidence usually means no clear preceding content spike was found.',
  },
  {
    h: 'Data quality affects conclusions',
    p: 'Content comes from CSV (Podscribe, Mighty Scout, Grin); demand comes from Triple Whale and the Amazon revenue scorecard. Missing weeks, mapping errors or partial API responses reduce reliability — the source health row shows which feeds are live vs mock.',
  },
];

export function MethodologyDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(8,12,18,0.45)', zIndex: 40,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s ease',
        }}
      />
      <aside
        role="dialog"
        aria-label="Methodology"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 92vw)', background: 'var(--surface)',
          borderLeft: '1px solid var(--border)', zIndex: 41, boxShadow: 'var(--shadow-lg)',
          transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.24s ease',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={16} />
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Methodology & caveats</h2>
          <button className="btn" onClick={onClose} style={{ marginLeft: 'auto', padding: '4px 10px' }} aria-label="Close">Close</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h3 style={{ margin: '0 0 5px', fontSize: 13.5, fontWeight: 650 }}>{s.h}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>{s.p}</p>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
