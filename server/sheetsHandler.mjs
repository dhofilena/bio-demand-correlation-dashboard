import { env, getGoogleSheetTabs } from './config.mjs';
import {
  fetchAllGoogleSheetTabs,
  fetchGoogleSheetCsv,
  isGoogleSheetsConfigured,
} from './adapters/googleSheetsAdapter.mjs';

// ===========================================================================
// Google Sheets request handlers for /api/sheets/*
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
        error: String(err?.message || err),
      };
    }
  }
  return {
    enabled,
    configured,
    sheetId: configured ? maskId(env.GOOGLE_SHEET_ID) : null,
    tabs,
  };
}

function maskId(id) {
  if (!id || id.length < 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

/** GET /api/sheets/status — config snapshot (no Google API call). */
export function sheetsStatusMiddleware(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(getGoogleSheetsStatus()));
}

/** GET /api/sheets/csv?gid=0 — raw CSV for one tab. */
export async function sheetsCsvMiddleware(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const gid = url.searchParams.get('gid') || undefined;
    const { csv, rowCount, fetchedAt, label } = await fetchGoogleSheetCsv(gid);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Sheet-Row-Count', String(rowCount));
    res.setHeader('X-Sheet-Fetched-At', fetchedAt);
    res.setHeader('X-Sheet-Label', label);
    res.end(csv);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

/** GET /api/sheets/bundle — all configured tabs as JSON (merged client-side). */
export async function sheetsBundleMiddleware(_req, res) {
  try {
    const bundle = await fetchAllGoogleSheetTabs();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(bundle));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}
