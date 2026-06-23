import { create } from 'zustand';
import type { MetricKey, SourceHealth, WeeklyRecord } from '../types';
import { buildDemoDataset, buildLiveDataset } from '../services/dataService';

export type TabId = 'timeline' | 'scorecard' | 'summary';
export type ValueMode = 'absolute' | 'indexed';
export type LagSetting = 0 | 1 | 2 | 'auto';
export type Theme = 'light' | 'dark';

interface DashboardState {
  mode: 'demo' | 'live';
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  warning?: string;
  records: WeeklyRecord[];
  health: SourceHealth[];
  csvRecords: WeeklyRecord[] | null;
  lastUpdated: string | null;

  dateRange: { start: string; end: string };
  theme: Theme;
  activeTab: TabId;
  valueMode: ValueMode;
  lag: LagSetting;
  visible: Record<MetricKey, boolean>;

  init: () => void;
  connectLive: () => Promise<void>;
  useDemo: () => void;
  refresh: () => Promise<void>;
  setCsv: (records: WeeklyRecord[]) => void;
  clearCsv: () => void;
  setTab: (tab: TabId) => void;
  setValueMode: (mode: ValueMode) => void;
  setLag: (lag: LagSetting) => void;
  toggleSeries: (key: MetricKey) => void;
  setDateRange: (start: string, end: string) => void;
  toggleTheme: () => void;
}

const DEFAULT_RANGE = { start: '2026-03-16', end: '2026-06-15' };

const DEFAULT_VISIBLE: Record<MetricKey, boolean> = {
  influencerPosts: true,
  podcastDownloads: true,
  amazonSearchVolume: true,
  googleOrganicSessions: true,
  directTraffic: false,
  amazonRevenue: false,
  googlePaidRevenue: false,
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
  lastUpdated: null,
  dateRange: DEFAULT_RANGE,
  theme: 'light',
  activeTab: 'timeline',
  valueMode: 'indexed',
  lag: 'auto',
  visible: DEFAULT_VISIBLE,

  init: () => {
    const result = buildDemoDataset(get().csvRecords);
    set({
      mode: 'demo',
      status: 'ready',
      records: result.records,
      health: result.health,
      warning: undefined,
      lastUpdated: new Date().toISOString(),
    });
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
    else get().init();
  },

  setCsv: (records) => {
    set({ csvRecords: records });
    void get().refresh();
  },

  clearCsv: () => {
    set({ csvRecords: null });
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
