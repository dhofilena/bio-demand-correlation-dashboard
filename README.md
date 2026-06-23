# Demand Correlation Dashboard

An executive-facing web app report that shows how **upstream content activity**
(influencer posts, podcast strength, earned media) appears to **lead downstream
demand signals** (Amazon search, Google organic, direct traffic, revenue) over
time — framed explicitly as **correlation-oriented planning, not attribution**.

Three connected views answer: *What changed? Why do we think it changed? How
confident are we? What should we do next?*

- **Timeline** — multi-series chart (indexed or absolute), lag alignment (0/1/2/auto),
  spike annotations, a lag explorer, and a plain-English insight banner.
- **Scorecard** — channel-by-channel decision table: this week vs the 4-week
  baseline, status, the likely leading signal, confidence, and an interpretation.
- **Summary** — 5 deterministic executive cards (what improved / drove the lift /
  needs attention / action / watch).

## Quick start (runs immediately on mock data)

```bash
npm install
npm run dev
```

Open the printed URL. The app boots in **Demo mode** with a built-in 14-week
dataset — no API key or CSV required. The Triple Whale proxy is mounted as Vite
dev middleware, so this single command also serves `/api/*` with the key kept
server-side.

## How data flows

```
CSV upload (content) ─┐
                      ├─► unified weekly model ─► derived metrics ─► insight engine ─► views
/api/triplewhale  ────┘        (merge by week)     (Δ, 4-wk avg,        (rule-based,
 (demand, server-side)                              indexed, status)     deterministic)
```

- **Demo mode** (default): everything local, no network.
- **Live mode** (“Connect live data”): demand is fetched from the secure proxy and
  merged with uploaded CSV content (or demo content as a fallback).

## Security model — the API key never reaches the browser

`TW_API_KEY` and friends are **not** `VITE_`-prefixed, so Vite never bundles them
into client code. They are read only by:

- the **Vite dev middleware** (`vite.config.ts` → `server/handler.mjs`) during `npm run dev`, and
- the **standalone Express proxy** (`server/index.mjs`) in production.

The browser only ever calls `/api/triplewhale/weekly` and receives normalized
weekly JSON.

### Production proxy

```bash
npm run build          # outputs dist/
npm run proxy          # node --env-file=.env server/index.mjs  (serves /api on :8787)
```

Serve `dist/` from your static host / CDN and route `/api/*` to the proxy.

## Configure Triple Whale (and the swappable Amazon source)

1. `cp .env.example .env` and fill in:
   ```env
   TW_API_KEY=...           # your key (kept server-side)
   TW_SHOP_ID=your-store.myshopify.com
   DEMAND_DATA_MODE=live    # 'mock' (default) keeps everything offline
   AMAZON_ADAPTER=mock      # 'custom' to plug a real Amazon search source
   ```
2. Open **`server/config.mjs`** — this is the one file you edit to wire real
   endpoints. Each adapter has an `endpoints` block and a `fieldMap`:
   - `tripleWhaleConfig.endpoints.metrics` → **paste your real metrics path here**.
   - `tripleWhaleConfig.fieldMap` → rename the right-hand values to the metric ids
     / response keys the live API actually returns.
   - `amazonSearchConfig` → same idea for the Amazon search source.
3. Adjust the request body / auth header and the `transform*` functions in
   `server/adapters/tripleWhaleAdapter.mjs` and `amazonSearchAdapter.mjs`. Every
   spot you need to touch is marked with a `👉` comment and has a `mockDemand`
   fallback, so a wrong field name degrades gracefully (the header shows
   `error`/`mock` per source) instead of crashing the report.

> **Adapter-based by design:** the app does **not** assume Triple Whale owns every
> metric. Triple Whale supplies website organic/direct/revenue; Amazon search is a
> separate, swappable adapter (point it at Helium 10, Jungle Scout, an internal
> feed, etc.). The UI treats both as one report.

## CSV ingestion

Header → **Upload CSV**. Expects a **tidy** file: one row per week, a date column,
and a column per metric. Headers are auto-detected, you can remap any column,
preview the parsed rows, then merge. A ready-made sample is in
[`sample-data/social-content-weekly.csv`](sample-data/social-content-weekly.csv).

### Working with the source sheets

The provided BIOptimizers exports (Podscribe, Mighty Scout/Grin) are **wide**
(weeks as columns, metrics as rows). Pivot them to the tidy shape above before
uploading — transpose so each week is a row and each metric a column, matching the
sample file’s headers.

## Project structure

```
server/                     # secure proxy (no secrets in the client)
  config.mjs                # 👉 endpoints + field maps you edit
  handler.mjs               # orchestrates adapters, merges by week, reports health
  adapters/                 # tripleWhale / amazonSearch / mockDemand
  index.mjs                 # standalone Express entry
src/
  config/metrics.ts         # metric registry (labels, colors, groups, units)
  types/index.ts            # unified weekly model + derived types
  lib/                      # metrics, correlation, insightEngine, format
  services/                 # dataService (orchestration) + csvIngest (parse/map/merge)
  store/dashboardStore.ts   # Zustand state
  components/               # Header, KpiStrip, timeline/ scorecard/ summary/, common/
  data/mockWeeklyData.ts    # 14-week demo dataset
```

## Insight engine (deterministic, explainable)

No AI calls. Every statement traces to the numbers: week-over-week deltas, a
trailing 4-week baseline, and lagged Pearson correlation across 0–2 week windows.
It distinguishes demand strength, content-led lift, paid delivery issues, and
insufficient evidence, and assigns Low/Medium/High confidence from correlation
strength. See the in-app **Methodology** drawer.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | App + proxy middleware (one command) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run proxy` | Standalone Express proxy (`--env-file=.env`) |
| `npm run typecheck` | `tsc` no-emit |

## Stack

React 19 · TypeScript · Vite · Tailwind v4 (+ CSS variables for theming) ·
Recharts · Zustand · PapaParse · Express (proxy only).
