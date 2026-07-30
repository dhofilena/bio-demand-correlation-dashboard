# BIO Demand Correlation Dashboard

**Internal · BIOptimizers Marketing**

**Live report:** [bio-demand-correlation-dashboard.netlify.app](https://bio-demand-correlation-dashboard.netlify.app)

A weekly planning report for the marketing team that shows how upstream **content
activity** (influencer posts, podcast flights, earned media) appears to **lead
downstream demand** (Google traffic, Amazon revenue, DTC revenue, branded search
by product line) over time.

This is **correlation-oriented planning, not attribution**. Use it to align
campaign timing, prioritize channels, and sanity-check weekly performance — not to
claim causal credit. The dashboard helps you answer:

- **What changed?** — Which demand channels moved vs their recent baseline?
- **Why might it have changed?** — Did a content signal spike 1–4 weeks earlier?
- **How confident are we?** — How strong and consistent is the lagged pattern?
- **What should we do next?** — If we push a signal, when and how much might demand lift?

Four connected views walk through those questions end to end.

| View | What it does |
| --- | --- |
| **Timeline** | Multi-series chart (normalized, indexed, or absolute), lag alignment (0–4w / auto), scatter plot with OLS trend line, lag explorer, insight banner, chart export |
| **Scorecard** | Channel-by-channel decision table: this week vs 4-week baseline, status, leading signal, lag timing, reliability score, expandable week-by-week matrix |
| **Summary** | Five plain-English cards for weekly recaps (what improved / drove the lift / needs attention / action / watch) |
| **Impact Forecast** | “If signal X bumps +10/25/50%, when and how much does demand Y lift?” — OLS on baseline deviations, historical bump validation |

---

## Why Pearson correlation and OLS regression?

Marketing effects rarely show up in the same week. For BIOptimizers, a creator
push, podcast flight, or earned-media spike often needs time to move through
awareness → search → purchase — especially on Amazon and DTC where buyers research
before converting. The dashboard tests **0, 1, 2, 3, and 4-week lags** on purpose:
that window matches how we typically see content activity show up in sessions,
revenue, and branded search, without stretching so far that weekly noise dominates.

### Pearson correlation — *finding the lag*

For each content→demand pair, we test **0, 1, 2, 3, and 4-week lags**:

> correlate `content[week t]` with `demand[week t + L]`

Pearson *r* measures how closely the two series move together at each offset. The
lag with the **strongest positive *r*** is treated as the best lead time. That
drives:

- Auto lag selection on the Timeline
- Leading-signal callouts on the Scorecard and Summary
- Confidence tiers (High ≥ 0.60, Medium ≥ 0.35, Low otherwise)
- The Lag explorer bar charts

Pearson is a good fit here because we need a **simple, comparable score across
many signal pairs** without assuming a fixed functional form. It answers: *“At
which offset do these two series co-move most?”*

### OLS regression — *quantifying the lift*

Correlation tells us **when** a relationship shows up; it does not translate a
planned bump into an expected outcome. For that, **Impact Forecast** and the
**scatter view** use ordinary least-squares (OLS) regression.

**Scatter chart (Timeline):** When exactly one signal and one demand metric are
visible, switch to Scatter. Each point is one week at the selected lag. An OLS
trend line shows the linear relationship; points are tiered by distance from the
line (on trend / slightly off / off trend).

**Impact Forecast:** Instead of raw levels (which can share an upward trend and
fake a lag), we regress **baseline deviations**:

- Signal bump = % vs its trailing 4-week average (`vsRollingPct`)
- Demand lift = % vs its trailing 4-week average, **L weeks later**

The OLS **slope (β)** converts a bump into an expected lift: a +10% signal bump
maps to roughly **β × 10%** demand lift at the best lag. A 90% confidence band on
β reflects historical scatter. The best lag is the offset with the strongest
positive relationship (highest *t*-statistic with β > 0).

Together, Pearson picks the **timing**; OLS estimates the **magnitude** — both
grounded in the same lag hypothesis.

> **Caveat:** Short histories, seasonality, and paid media can all weaken these
> estimates. Use them for **planning and prioritization**, not as proof of
> causation. See the in-app **Methodology** drawer for full assumptions.

---

## How to use it (marketing workflow)

**Every Monday (or your weekly reporting cadence):**

1. **Open the live report** at [bio-demand-correlation-dashboard.netlify.app](https://bio-demand-correlation-dashboard.netlify.app)
   and confirm source health in the header (Triple Whale live, Google Sheets tabs synced).
2. **Scan the KPI strip** — Quick read on the latest week for social, podcast,
   and demand metrics.
3. **Summary tab** — Pull the five cards into your weekly marketing recap or
   Slack update.
4. **Scorecard** — See which demand channels are Strong / Soft and which content
   signal led them (if any). Expand rows when you need the week-by-week matrix.
5. **Timeline** — Dig into a specific story: toggle series, set lag to **Auto** or
   align manually, switch to **Scatter** for one signal + one demand metric.
6. **Impact Forecast** — Before a planned push, estimate timing and lift.

**Branded search** works like any other demand metric: toggle it on the Timeline
or Scorecard and pick a product line (Magnesium Breakthrough, MassZymes, shop
total, etc.) from the dropdown.

### Example scenarios

**Scenario A — Planning a creator push ahead of an Amazon moment**

Amazon organic revenue is Strong on the Scorecard. The leading signal shows
**MS Profile posted** ~2 weeks earlier with Medium confidence.

1. Open **Impact Forecast** → signal: *MS Profile posted*, demand: *Amazon organic
   revenue*, bump: *+25%*.
2. Read the forecast: expected lift %, “about 2 weeks later,” and whether past
   bumps followed through.
3. **Action:** Schedule the next creator wave **~2 weeks before** the Amazon promo
   or inventory moment, not the same week.

**Scenario B — Podcast flight vs Google organic**

Podcast impressions spiked last week. You want to know if organic sessions should
move soon.

1. **Timeline** → show *Podscribe Total Impressions* + *Google Organic Traffic*,
   lag **Auto** (or try 1w / 2w in the Lag explorer).
2. If the Lag explorer shows the best *r* at 1–2w, check **Summary** for the
   “What likely drove the lift” card.
3. **Action:** Watch organic sessions this week and next; if flat, the pattern may
   be weak this window — don’t over-interpret a single podcast week.

**Scenario C — Product-line check before a Magnesium campaign**

You are planning Magnesium Breakthrough content and want a demand read beyond
site-wide traffic.

1. **Timeline** → enable **Branded search**, select *Magnesium Breakthrough*.
2. Compare alongside *MS Impressions* or *MS EMV* with lag aligned.
3. **Scorecard** → expand the branded search row (same product picker) to see
   status vs baseline and leading signal.
4. **Action:** Use product-level branded search alongside Amazon organic / DTC
   when sizing the campaign — not as a standalone success metric.

**Scenario D — Weekly standup in 5 minutes**

1. **Summary** — read headline + five cards aloud.
2. **Scorecard** — call out anything **Soft** or **Strong** with a named leading
   signal.
3. Only open **Timeline** or **Impact Forecast** if someone asks “why?” or “what
   should we do next week?”

### Reading the Scorecard (cheat sheet)

| Column | What it means for you |
| --- | --- |
| **Status** | Strong / Moderate / Flat / Soft vs the trailing 4-week average |
| **Leading signal** | Which content metric best preceded this demand channel in the 0–4w window |
| **Timing** | How many weeks earlier that signal tended to move (e.g. “2 wks earlier”) |
| **Reliability** | How tight the lagged pattern is (Pearson *r* as a % — higher = more consistent) |
| **Interpretation** | One-line plain-English read you can paste into a recap |

---

## Developer setup

*The sections below are for maintaining the dashboard, data pipes, and Netlify deploy.*

## Quick start

```bash
npm install
cp .env.example .env   # fill in API keys / sheet config as needed
npm run dev
```

Open the printed URL. The app loads demand from the secure proxy and merges it
with content from Google Sheets (when configured) or an uploaded CSV. The Triple
Whale and Google Sheets proxies are mounted as Vite dev middleware, so this
single command also serves `/api/*` with secrets kept server-side.

```bash
npm run sheets:sync    # refresh local CSV cache from Google Sheets (optional)
npm run dev:netlify    # local Netlify dev — mirrors production (functions + static)
npm run build          # type-check + production build → dist/
```

Production is hosted on **Netlify** (`netlify.toml` builds `dist/` and routes
`/api/*` to serverless functions). Use `npm run dev:netlify` locally to match
that setup. `npm run proxy` is an optional standalone Express server for local
API testing only — not used in production.

---

## Data sources

| Source | Metrics | How it connects |
| --- | --- | --- |
| **Mighty Scout / Grin** (Social Metrics Scorecard) | Profile posted, impressions, reach, engagement, media posted, EMV | Google Sheet tab `social-scorecard` or CSV upload |
| **Podscribe** | Impressions, IP modelling revenue, last-click sales, IP multiplier | Google Sheet tab `podscribe` or CSV upload |
| **Amazon revenue scorecard** | Amazon organic & PPC revenue | Google Sheet tab `amazon-revenue` or CSV upload |
| **Triple Whale** | Google organic/non-organic traffic, GA revenue by channel group, DTC revenue, branded search terms | `/api/triplewhale/weekly` (live or mock) |

Content and demand are merged into a **unified weekly model** (one row per week).
Derived fields include week-over-week deltas, trailing 4-week baselines, indexed
values, and status bands.

```
Google Sheets / CSV (content) ─┐
                               ├─► weekly merge ─► derived metrics ─► insight engine ─► views
/api/triplewhale (demand)  ────┘     (by week)      (Δ, 4-wk avg,         (rule-based,
                                                    indexed, status)      deterministic)
```

---

## Production (Netlify)

The live marketing report runs on Netlify:

- **URL:** [https://bio-demand-correlation-dashboard.netlify.app](https://bio-demand-correlation-dashboard.netlify.app)
- **Admin:** [app.netlify.com/projects/bio-demand-correlation-dashboard](https://app.netlify.com/projects/bio-demand-correlation-dashboard)
- **Build:** `npm run build` → publishes `dist/`
- **API:** `netlify/functions/*` handle `/api/triplewhale/weekly` and `/api/sheets/*`
  (see redirects in `netlify.toml`)
- **Env vars:** Set in Netlify **Site settings → Environment variables** (same
  keys as `.env.example`). On Netlify use `GOOGLE_SERVICE_ACCOUNT_JSON` (inline
  JSON), not `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` — the `secrets/` folder is not
  deployed.
- **Sheet cache:** `data/cache/sheets/` is bundled into functions via
  `included_files` in `netlify.toml`. Refresh with **Sync from Google** in the
  app or `npm run sheets:sync` before deploy if tabs changed.

Pushes to the connected branch trigger a Netlify deploy automatically.

## Security model — API keys never reach the browser

`TW_API_KEY`, Google service-account credentials, and similar values are **not**
`VITE_`-prefixed, so Vite never bundles them into client code. They are read only by:

- the **Vite dev middleware** during `npm run dev`, and
- **Netlify functions** in production (or the optional local Express proxy).

The browser only calls `/api/triplewhale/weekly` and `/api/sheets/*` and receives
normalized JSON.

---

## Configuration

### Triple Whale

1. Copy `.env.example` → `.env` and set:
   ```env
   TW_API_KEY=...
   TW_SHOP_ID=your-store.myshopify.com
   DEMAND_DATA_MODE=live    # 'mock' (default) runs fully offline
   ```
2. Edit **`server/config.mjs`** — endpoints and `fieldMap` for live API fields.
3. Adjust request/transform logic in **`server/adapters/tripleWhaleAdapter.mjs`**
   (marked with `👉` comments). Wrong field names degrade gracefully to mock per
   source instead of crashing the report.

### Google Sheets

```env
GOOGLE_SHEETS_ENABLED=true
GOOGLE_SHEET_ID=...
GOOGLE_SHEET_TABS=[{"gid":"...","label":"Social content","format":"social-scorecard"}, ...]
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./secrets/google-service-account.json
```

Share each workbook with the service account email. Run `npm run sheets:sync` to
cache tabs under `data/cache/sheets/`, or click **Sync from Google** in the app.
Tab `format` values drive parsing: `social-scorecard`, `podscribe`,
`amazon-revenue`.

### CSV upload (alternative to Sheets)

Header → **Upload CSV**. Expects a **tidy** file: one row per week, a date column,
and a column per metric. Headers are auto-detected, columns can be remapped, and
rows are previewed before merge. Sample:
[`sample-data/social-content-weekly.csv`](sample-data/social-content-weekly.csv).

Source exports (Podscribe, Mighty Scout) are often **wide** (weeks as columns).
Pivot to tidy shape before uploading — each week as a row, each metric as a column.

---

## Project structure

```
server/                          # secure proxy (no secrets in the client)
  config.mjs                     # endpoints, field maps, sheet tab config
  handler.mjs                    # demand orchestration + health reporting
  sheetsHandler.mjs              # /api/sheets/* routes
  brandedSearchGroups.mjs        # product-line keyword rules for branded search
  adapters/                      # tripleWhale, googleSheets, mockDemand
  index.mjs                      # standalone Express entry
src/
  config/metrics.ts              # metric registry (labels, colors, groups, units)
  types/index.ts                 # unified weekly model + derived types
  lib/
    correlation.ts               # Pearson lag correlation, OLS for scatter
    impact.ts                      # OLS bump→lift for Impact Forecast
    insightEngine.ts             # deterministic insight rules
    brandedSearch.ts             # product picker helpers
    metrics.ts, format.ts, chartExportData.ts, …
  services/                      # dataService, sheetsService, csvIngest
  store/dashboardStore.ts        # Zustand state (tabs, lag, date range, theme)
  components/
    timeline/                    # chart, scatter, lag explorer, export
    scorecard/                   # channel table + week matrix
    summary/                     # executive cards
    impact/                      # Impact Forecast
    demand/                      # branded search controls
    MethodologyDrawer.tsx
netlify/functions/               # serverless API on Netlify deploys
```

---

## Insight engine (deterministic, explainable)

No AI calls. Every statement traces to the numbers:

- Week-over-week deltas and trailing **4-week baseline** (`vsRollingPct`)
- Status bands: **Strong** ≥ +8%, **Soft** ≤ −2%
- **Lagged Pearson correlation** across 0–4 week windows for leading-signal detection
- Spike threshold: **+12%** vs baseline counts as a bump (used in insights and Impact Forecast)

The engine distinguishes demand strength, content-led lift, awareness patterns,
paid delivery issues, and insufficient evidence — each with Low / Medium / High
confidence from correlation strength.

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | App + API middleware (one command) |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run proxy` | Optional local Express API (not used on Netlify) |
| `npm run sheets:sync` | Pull Google Sheet tabs into local CSV cache |
| `npm run dev:netlify` | Netlify CLI dev (functions + static) |
| `npm run typecheck` | `tsc` no-emit |

---

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · Recharts · Zustand · PapaParse ·
Netlify Functions (production API).
