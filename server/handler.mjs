import { env } from './config.mjs';
import { normalizeDemandPeriod } from './dates.mjs';
import { fetchMockDemand } from './adapters/mockDemand.mjs';
import { fetchTripleWhaleWeekly } from './adapters/tripleWhaleAdapter.mjs';

// ===========================================================================
// Demand request handler. Orchestrates the per-source adapters, merges them by
// week, and reports per-source health so the UI can show live/partial/error.
// Framework-agnostic: consumed by both the Express server and the Vite dev
// middleware so there is exactly one code path.
// ===========================================================================

function mergeByWeek(...sources) {
  const map = new Map();
  for (const list of sources) {
    for (const rec of list ?? []) {
      const existing = map.get(rec.weekStart) ?? { weekStart: rec.weekStart };
      map.set(rec.weekStart, { ...existing, ...clean(rec) });
    }
  }
  return [...map.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// Drop null/undefined so a later source doesn't overwrite a good value with null.
function clean(rec) {
  const out = {};
  for (const [k, v] of Object.entries(rec)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

/**
 * @param {{start?:string,end?:string,mock?:boolean}} q
 * @returns {Promise<{status:number, body:object}>}
 */
export async function getWeeklyDemand(q) {
  const end = q.end || new Date().toISOString().slice(0, 10);
  const start = q.start || new Date(Date.now() - 13 * 7 * 864e5).toISOString().slice(0, 10);
  const forceMock = q.mock === true || env.DEMAND_DATA_MODE !== 'live';
  const period = normalizeDemandPeriod(start, end);

  const health = [];

  if (forceMock) {
    return {
      status: 200,
      body: {
        source: 'mock',
        generatedAt: new Date().toISOString(),
        weeks: fetchMockDemand(period.start, period.end),
        health: [
          {
            id: 'triple-whale',
            label: 'Triple Whale',
            status: 'mock',
            detail: env.TW_API_KEY ? 'Live mode off (DEMAND_DATA_MODE)' : 'No API key configured',
          },
        ],
      },
    };
  }

  // --- Live mode: each adapter fails independently and falls back to mock. ---
  let tw = [];
  try {
    tw = await fetchTripleWhaleWeekly(period.start, period.end);
    health.push({ id: 'triple-whale', label: 'Triple Whale', status: 'live', detail: `${tw.length} weeks` });
  } catch (err) {
    tw = fetchMockDemand(period.start, period.end).map((r) => ({
      weekStart: r.weekStart,
      weekLabel: r.weekLabel,
      googleOrganicSessions: r.googleOrganicSessions,
      nonOrganicPageViews: r.nonOrganicPageViews,
      gaOrganicRevenue: r.gaOrganicRevenue,
      gaPaidRevenue: r.gaPaidRevenue,
      gaSocialRevenue: r.gaSocialRevenue,
      gaOtherRevenue: r.gaOtherRevenue,
      dtcRevenue: r.dtcRevenue,
    }));
    health.push({ id: 'triple-whale', label: 'Triple Whale', status: 'error', detail: String(err.message || err) });
  }

  const degraded = health.some((h) => h.status === 'error');
  return {
    status: 200,
    body: {
      source: 'triple-whale',
      generatedAt: new Date().toISOString(),
      weeks: mergeByWeek(tw),
      health,
      warning: degraded ? 'One or more live sources failed; mock values were substituted.' : undefined,
    },
  };
}

/** connect/express-style middleware for GET /api/triplewhale/weekly. */
export async function demandMiddleware(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const { status, body } = await getWeeklyDemand({
      start: url.searchParams.get('start') || undefined,
      end: url.searchParams.get('end') || undefined,
      mock: url.searchParams.get('mock') === 'true',
    });
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}
