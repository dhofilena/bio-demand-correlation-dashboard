import { env, getGoogleSheetTabs } from './config.mjs';
import { isGoogleSheetsConfigured } from './adapters/googleSheetsAdapter.mjs';
import { getCacheStatus, readCachedBundle, readCachedTabCsv, syncSheetsToCache } from './sheetsCache.mjs';

// ===========================================================================
// Google Sheets request handlers for /api/sheets/*
// Reads always come from the local CSV cache; Google API is sync-only.
// ===========================================================================

export function getGoogleSheetsStatus() {
  const enabled = env.GOOGLE_SHEETS_ENABLED;
  const configured = isGoogleSheetsConfigured();
  let tabs = [];
  if (configured) {
    try {
      tabs = getGoogleSheetTabs();
    } catch (err) {
      return {
        enabled,
        configured: false,
        sheetId: null,
        tabs: [],
        cache: getCacheStatus(),
        error: String(err?.message || err),
      };
    }
  }
  return {
    enabled,
    configured,
    sheetId: configured ? maskId(env.GOOGLE_SHEET_ID) : null,
    tabs,
    cache: getCacheStatus(),
  };
}

function maskId(id) {
  if (!id || id.length < 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/** GET /api/sheets/status — config + cache snapshot (no Google API call). */
export function sheetsStatusMiddleware(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(getGoogleSheetsStatus()));
}

/** GET /api/sheets/csv?gid=0 — raw CSV for one cached tab. */
export function sheetsCsvMiddleware(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const gid = url.searchParams.get('gid') || undefined;
    const { csv, rowCount, fetchedAt, label, source } = readCachedTabCsv(gid);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Sheet-Row-Count', String(rowCount));
    res.setHeader('X-Sheet-Fetched-At', fetchedAt);
    res.setHeader('X-Sheet-Label', label);
    res.setHeader('X-Sheet-Source', source);
    res.end(csv);
  } catch (err) {
    res.statusCode = err?.message?.includes('No cached') ? 404 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

/** GET /api/sheets/bundle — all cached tabs as JSON (merged client-side). */
export function sheetsBundleMiddleware(_req, res) {
  try {
    const bundle = readCachedBundle();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Sheet-Source', bundle.source);
    res.end(JSON.stringify(bundle));
  } catch (err) {
    res.statusCode = err?.message?.includes('No cached') ? 404 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

/** POST /api/sheets/sync — pull from Google and refresh the local CSV cache. */
export async function sheetsSyncMiddleware(req, res) {
  if (req.method && req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    const bundle = await syncSheetsToCache();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        spreadsheetId: bundle.spreadsheetId,
        fetchedAt: bundle.fetchedAt,
        source: bundle.source,
        tabs: bundle.tabs.map((t) => ({ gid: t.gid, label: t.label, rowCount: t.rowCount })),
        cache: getCacheStatus(),
      }),
    );
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}
