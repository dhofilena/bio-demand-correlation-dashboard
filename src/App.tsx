import { useEffect, useRef, useState } from 'react';
import { useDashboard, type TabId } from './store/dashboardStore';
import { Header } from './components/Header';
import { KpiStrip } from './components/KpiStrip';
import { TimelineView } from './components/timeline/TimelineView';
import { ScorecardView } from './components/scorecard/ScorecardView';
import { SummaryView } from './components/summary/SummaryView';
import { MethodologyDrawer } from './components/MethodologyDrawer';
import { CsvUploadModal } from './components/CsvUploadModal';
import { ErrorState } from './components/common/ui';
import { Info } from './components/common/icons';

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'timeline', label: 'Timeline', hint: 'How signals move over time' },
  { id: 'scorecard', label: 'Scorecard', hint: 'Channel-by-channel decisions' },
  { id: 'summary', label: 'Summary', hint: 'Plain-English executive read' },
];

export default function App() {
  const bootstrap = useDashboard((s) => s.bootstrap);
  const connectGoogleSheet = useDashboard((s) => s.connectGoogleSheet);
  const activeTab = useDashboard((s) => s.activeTab);
  const setTab = useDashboard((s) => s.setTab);
  const theme = useDashboard((s) => s.theme);
  const status = useDashboard((s) => s.status);
  const error = useDashboard((s) => s.error);
  const connectLive = useDashboard((s) => s.connectLive);

  const [methodOpen, setMethodOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    void (async () => {
      const loaded = await connectGoogleSheet();
      if (!loaded) await bootstrap();
    })();
  }, [bootstrap, connectGoogleSheet]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  function onTabKey(e: React.KeyboardEvent, idx: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <Header onOpenMethodology={() => setMethodOpen(true)} onOpenUpload={() => setUploadOpen(true)} />

      <main style={{ maxWidth: 1800, margin: '0 auto', padding: '20px 24px 48px', width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <KpiStrip />

        {status === 'error' ? (
          <ErrorState message={error ?? 'The live demand proxy did not respond.'} onRetry={() => connectLive()} />
        ) : (
          <>
            <div role="tablist" aria-label="Views" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
              {TABS.map((t, i) => (
                <button key={t.id} ref={(el) => { tabRefs.current[i] = el; }} role="tab" aria-selected={activeTab === t.id}
                  title={t.hint} className={`tab ${activeTab === t.id ? 'tab-active' : ''}`}
                  onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)} tabIndex={activeTab === t.id ? 0 : -1}>
                  {t.label}
                </button>
              ))}
            </div>

            <div role="tabpanel">
              {activeTab === 'timeline' && <TimelineView />}
              {activeTab === 'scorecard' && <ScorecardView />}
              {activeTab === 'summary' && <SummaryView />}
            </div>
          </>
        )}

        <footer className="card" style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <Info size={15} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>Data quality & assumptions</div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Correlation-oriented planning view, not an attribution model. Lag windows (0–4 weeks) are estimated from a short history; status uses a trailing 4-week baseline. Content comes from CSV, demand from Triple Whale and Amazon revenue scorecard. The header shows which feeds are live vs mock.
            </p>
          </div>
          <button className="btn" onClick={() => setMethodOpen(true)}>Full methodology</button>
        </footer>
      </main>

      <MethodologyDrawer open={methodOpen} onClose={() => setMethodOpen(false)} />
      <CsvUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
