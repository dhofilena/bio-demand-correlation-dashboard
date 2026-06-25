import { create } from 'zustand';
import type { CsvConnection, MetricKey, SourceHealth, WeeklyRecord } from '../types';
import { buildDemoDataset, buildLiveDataset } from '../services/dataService';
import { fetchSheetsStatus, loadWeeklyRecordsFromGoogleSheet } from '../services/sheetsService';

export type TabId = 'timeline' | 'scorecard' | 'summary';
export type ValueMode = 'absolute' | 'indexed';
export type LagSetting = 0 | 1 | 2 | 'auto';
export type Theme = 'light' | 'dark';

const DEFAULT_CSV_CONNECTION: CsvConnection = {
  status: 'idle',
  source: null,
  label: 'No CSV connected',
  weekCount: 0,
  connectedAt: null,
  detail: 'Upload a CSV or connect a Google Sheet',
  tabs: [],
};

interface DashboardState {
  mode: 'demo' | 'live';
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  warning?: string;
  records: WeeklyRecord[];
  health: SourceHealth[];
  csvRecords: WeeklyRecord[] | null;
  csvConnection: CsvConnection;
  lastUpdated: string | null;

  dateRange: { start: string; end: string };
  theme: Theme;
  activeTab: TabId;
  valueMode: ValueMode;
  lag: LagSetting;
  visible: Record<MetricKey, boolean>;

  init: () => void;
  bootstrap: () => Promise<void>;
  connectGoogleSheet: () => Promise<boolean>;
  connectLive: () => Promise<void>;
  useDemo: () => void;
  refresh: () => Promise<void>;
  setCsv: (records: WeeklyRecord[], meta?: { label?: string }) => void;
  clearCsv: () => void;
  setTab: (tab: TabId) => void;
  setValueMode: (mode: ValueMode) => void;
  setLag: (lag: LagSetting) => void;
  toggleSeries: (key: MetricKey) => void;
  setDateRange: (start: string, end: string) => void;
  toggleTheme: () => void;
}

const DEFAULT_RANGE = { start: '2026-03-16', end: '2026-06-21' };

const DEFAULT_VISIBLE: Record<MetricKey, boolean> = {
  influencerPosts: true,
  podcastImpressions: true,
  amazonSearchVolume: true,
  googleOrganicSessions: true,
  nonOrganicPageViews: false,
  amazonRevenue: false,
  dtcRevenue: false,
  instagramPosts: false,
  tiktokPosts: false,
  podcastAdSpend: false,
  emv: false,
};

export const useDashboard = create<DashboardState>((set, get) => ({
  mode: 'demo',
  status: 'idle',
  error: null,
  records: [],
  health: [],
  csvRecords: null,
  csvConnection: DEFAULT_CSV_CONNECTION,
  lastUpdated: null,
  dateRange: DEFAULT_RANGE,
  theme: 'light',
  activeTab: 'timeline',
  valueMode: 'indexed',
  lag: 0,
  visible: DEFAULT_VISIBLE,

  init: () => {
    const { csvRecords, dateRange } = get();
    const result = buildDemoDataset(csvRecords, dateRange.start, dateRange.end);
    set({
      mode: 'demo',
      status: 'ready',
      records: result.records,
      health: result.health,
      warning: undefined,
      lastUpdated: new Date().toISOString(),
    });
  },

  /** Prefer live Triple Whale demand when the server is configured for it; otherwise demo. */
  bootstrap: async () => {
    const { dateRange, csvRecords } = get();
    set({ status: 'loading', error: null });
    try {
      const result = await buildLiveDataset(dateRange.start, dateRange.end, csvRecords);
      const tw = result.health.find((h) => h.id === 'triple-whale');
      if (tw?.status === 'live') {
        set({
          mode: 'live',
          status: 'ready',
          records: result.records,
          health: result.health,
          warning: result.warning,
          lastUpdated: new Date().toISOString(),
        });
        return;
      }
    } catch {
      // Proxy unreachable — fall back to bundled demo demand below.
    }
    get().init();
  },

  connectGoogleSheet: async () => {
    set((s) => ({
      csvConnection: {
        ...s.csvConnection,
        status: 'loading',
        detail: 'Fetching Google Sheet…',
      },
    }));

    try {
      const status = await fetchSheetsStatus();
      if (!status.enabled || !status.configured) {
        set({
          csvConnection: {
            status: 'disabled',
            source: null,
            label: 'Google Sheets off',
            weekCount: 0,
            connectedAt: null,
            detail: 'Set GOOGLE_SHEETS_ENABLED=true and credentials in .env',
            tabs: [],
          },
        });
        return false;
      }

      const loaded = await loadWeeklyRecordsFromGoogleSheet();
      const tabCount = loaded.tabs.length;
      const tabSummary = loaded.tabs
        .map((t) => `${t.label}: ${t.rowCount} rows`)
        .join(' · ');
      set({
        csvRecords: loaded.records,
        csvConnection: {
          status: 'connected',
          source: 'google-sheets',
          label: tabCount > 1 ? `Google Sheets (${tabCount} tabs)` : loaded.tabs[0]?.label ?? 'Google Sheet',
          weekCount: loaded.records.length,
          connectedAt: loaded.fetchedAt,
          detail: `${loaded.records.length} merged weeks · ${tabSummary}`,
          tabs: loaded.tabs.map((t) => ({
            gid: t.gid,
            label: t.label,
            weekCount: t.rowCount,
            detail: `${t.mappedColumns} columns mapped`,
          })),
        },
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({
        csvConnection: {
          status: 'error',
          source: 'google-sheets',
          label: 'Google Sheet',
          weekCount: 0,
          connectedAt: null,
          detail: message,
          tabs: [],
        },
      });
      return false;
    }
  },

  connectLive: async () => {
    const { dateRange, csvRecords } = get();
    set({ status: 'loading', error: null });
    try {
      const result = await buildLiveDataset(dateRange.start, dateRange.end, csvRecords);
      set({
        mode: 'live',
        status: 'ready',
        records: result.records,
        health: result.health,
        warning: result.warning,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },

  useDemo: () => get().init(),

  refresh: async () => {
    if (get().mode === 'live') await get().connectLive();
    else await get().bootstrap();
  },

  setCsv: (records, meta) => {
    set({
      csvRecords: records,
      csvConnection: {
        status: 'connected',
        source: 'upload',
        label: meta?.label ?? 'Uploaded CSV',
        weekCount: records.length,
        connectedAt: new Date().toISOString(),
        detail: `${records.length} weeks loaded from upload`,
        tabs: [],
      },
    });
    void get().refresh();
  },

  clearCsv: () => {
    set({
      csvRecords: null,
      csvConnection: DEFAULT_CSV_CONNECTION,
    });
    void get().refresh();
  },

  setTab: (activeTab) => set({ activeTab }),
  setValueMode: (valueMode) => set({ valueMode }),
  setLag: (lag) => set({ lag }),
  toggleSeries: (key) => set((s) => ({ visible: { ...s.visible, [key]: !s.visible[key] } })),
  setDateRange: (start, end) => {
    set({ dateRange: { start, end } });
    void get().refresh();
  },
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));
