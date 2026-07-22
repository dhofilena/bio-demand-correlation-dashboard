import { create } from 'zustand';
import type { BrandedSearchData, CsvConnection, MetricKey, SourceHealth, WeeklyRecord } from '../types';
import { BRANDED_SEARCH_TOTAL, METRICS } from '../config/metrics';
import type { BrandedSearchSelection } from '../lib/brandedSearch';
import { buildLiveDataset } from '../services/dataService';
import { fetchSheetsStatus, loadWeeklyRecordsFromGoogleSheet, syncGoogleSheets } from '../services/sheetsService';
import { bestContentDemandPair, type LagWeek } from '../lib/correlation';
import { defaultDateRange } from '../lib/dateRange';

export type TabId = 'timeline' | 'scorecard' | 'summary' | 'impact';
export type BumpPct = 10 | 25 | 50;
export type ValueMode = 'absolute' | 'indexed' | 'normalized';
export type LagSetting = LagWeek | 'auto';
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
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  warning?: string;
  records: WeeklyRecord[];
  brandedSearch: BrandedSearchData | null;
  brandedSearchProduct: BrandedSearchSelection;
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
  pendingScatterJump: {
    signalKey: MetricKey;
    demandKey: MetricKey;
    lag: LagWeek;
    requestId: number;
  } | null;
  impactSignalKey: MetricKey;
  impactDemandKey: MetricKey;
  impactBumpPct: BumpPct;

  bootstrap: () => Promise<void>;
  connectGoogleSheet: () => Promise<boolean>;
  syncGoogleSheet: () => Promise<boolean>;
  connectLive: () => Promise<void>;
  refresh: () => Promise<void>;
  setCsv: (records: WeeklyRecord[], meta?: { label?: string }) => void;
  clearCsv: () => void;
  setTab: (tab: TabId) => void;
  setValueMode: (mode: ValueMode) => void;
  setLag: (lag: LagSetting) => void;
  toggleSeries: (key: MetricKey) => void;
  setBrandedSearchProduct: (product: BrandedSearchSelection) => void;
  setDateRange: (start: string, end: string) => void;
  toggleTheme: () => void;
  setImpactSignal: (key: MetricKey) => void;
  setImpactDemand: (key: MetricKey) => void;
  setImpactBump: (pct: BumpPct) => void;
  focusScatterFromScorecard: (signalKey: MetricKey, demandKey: MetricKey, lag: LagWeek) => void;
  clearPendingScatterJump: () => void;
}

const DEFAULT_RANGE = defaultDateRange();

const FALLBACK_SIGNAL: MetricKey = 'profilePosted';
const FALLBACK_DEMAND: MetricKey = 'amazonOrganicRevenue';

function allSeriesHidden(): Record<MetricKey, boolean> {
  return Object.keys(METRICS).reduce((acc, key) => {
    acc[key as MetricKey] = false;
    return acc;
  }, {} as Record<MetricKey, boolean>);
}

function visibilityForPair(signalKey: MetricKey, demandKey: MetricKey): Record<MetricKey, boolean> {
  const next = allSeriesHidden();
  next[signalKey] = true;
  next[demandKey] = true;
  return next;
}

let initialVisibleApplied = false;

const DEFAULT_VISIBLE = allSeriesHidden();

export const useDashboard = create<DashboardState>((set, get) => ({
  status: 'idle',
  error: null,
  records: [],
  brandedSearch: null,
  brandedSearchProduct: BRANDED_SEARCH_TOTAL,
  health: [],
  csvRecords: null,
  csvConnection: DEFAULT_CSV_CONNECTION,
  lastUpdated: null,
  dateRange: DEFAULT_RANGE,
  theme: 'light',
  activeTab: 'timeline',
  valueMode: 'normalized',
  lag: 'auto',
  visible: DEFAULT_VISIBLE,
  pendingScatterJump: null,
  impactSignalKey: 'socialImpressions',
  impactDemandKey: 'googleOrganicSessions',
  impactBumpPct: 10,

  bootstrap: async () => {
    await get().connectLive();
  },

  connectGoogleSheet: async () => {
    set((s) => ({
      csvConnection: {
        ...s.csvConnection,
        status: 'loading',
        detail: 'Loading cached Google Sheet…',
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

      if (!status.cache?.available) {
        set({
          csvConnection: {
            status: 'error',
            source: 'google-sheets',
            label: 'Google Sheet',
            weekCount: 0,
            connectedAt: null,
            detail: 'No cached sheet data. Run `npm run sheets:sync` or click Sync from Google in Upload CSV.',
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
          detail: `${loaded.records.length} merged weeks · cached · ${tabSummary}`,
          tabs: loaded.tabs.map((t) => ({
            gid: t.gid,
            label: t.label,
            weekCount: t.rowCount,
            detail: `${t.mappedColumns} columns mapped`,
          })),
        },
      });
      void get().refresh();
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

  syncGoogleSheet: async () => {
    set((s) => ({
      csvConnection: {
        ...s.csvConnection,
        status: 'loading',
        detail: 'Syncing from Google Sheet…',
      },
    }));

    try {
      await syncGoogleSheets();
      return await get().connectGoogleSheet();
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
      const next: Partial<DashboardState> = {
        status: 'ready',
        records: result.records,
        brandedSearch: result.brandedSearch,
        health: result.health,
        warning: result.warning,
        lastUpdated: new Date().toISOString(),
      };

      if (!initialVisibleApplied && result.records.length > 0) {
        const best = bestContentDemandPair(result.records);
        const signalKey = best?.contentKey ?? FALLBACK_SIGNAL;
        const demandKey = best?.demandKey ?? FALLBACK_DEMAND;
        next.visible = visibilityForPair(signalKey, demandKey);
        next.impactSignalKey = signalKey;
        next.impactDemandKey = demandKey;
        next.lag = 'auto';
        initialVisibleApplied = true;
      }

      set(next);
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },

  refresh: async () => {
    await get().connectLive();
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
  setBrandedSearchProduct: (brandedSearchProduct) => set({ brandedSearchProduct }),
  focusScatterFromScorecard: (signalKey, demandKey, lag) =>
    set(() => ({
      activeTab: 'timeline',
      lag,
      visible: visibilityForPair(signalKey, demandKey),
      pendingScatterJump: {
        signalKey,
        demandKey,
        lag,
        requestId: Date.now() + Math.random(),
      },
    })),
  clearPendingScatterJump: () => set({ pendingScatterJump: null }),
  setImpactSignal: (impactSignalKey) => set({ impactSignalKey }),
  setImpactDemand: (impactDemandKey) => set({ impactDemandKey }),
  setImpactBump: (impactBumpPct) => set({ impactBumpPct }),
  setDateRange: (start, end) => {
    set({ dateRange: { start, end } });
    void get().refresh();
  },
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));
