import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { env } from './config.mjs';
import { fetchAllGoogleSheetTabs } from './adapters/googleSheetsAdapter.mjs';

// ===========================================================================
// Google Sheets local CSV cache — sync once, read from disk until next sync.
// ===========================================================================

const MANIFEST_FILE = 'manifest.json';
const PROJECT_ROOT = process.cwd();
const BUNDLED_CACHE_DIR = path.join(PROJECT_ROOT, 'data', 'cache', 'sheets');
const NETLIFY_TMP_CACHE_DIR = path.join('/tmp', 'sheets-cache');

function isServerlessRuntime() {
  return Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function resolveExistingCacheDir() {
  const configured = env.GOOGLE_SHEETS_CACHE_DIR?.trim();
  if (configured) {
    const resolved = path.resolve(configured);
    if (existsSync(path.join(resolved, MANIFEST_FILE))) return resolved;
  }

  const candidates = [
    NETLIFY_TMP_CACHE_DIR,
    BUNDLED_CACHE_DIR,
    path.join(process.cwd(), 'data', 'cache', 'sheets'),
  ];

  for (const dir of candidates) {
    if (existsSync(path.join(dir, MANIFEST_FILE))) return dir;
  }

  return BUNDLED_CACHE_DIR;
}

/** Writable cache — /tmp on Netlify (ephemeral); project dir locally. */
function getCacheDir() {
  if (isServerlessRuntime()) return NETLIFY_TMP_CACHE_DIR;
  const configured = env.GOOGLE_SHEETS_CACHE_DIR?.trim();
  return configured ? path.resolve(configured) : BUNDLED_CACHE_DIR;
}

/** Read cache — prefers /tmp after a sync, then bundled files shipped with the deploy. */
function getReadCacheDir() {
  return resolveExistingCacheDir();
}

function manifestPath() {
  return path.join(getReadCacheDir(), MANIFEST_FILE);
}

function tabCsvPath(gid) {
  return path.join(getReadCacheDir(), `${gid}.csv`);
}

function ensureCacheDir() {
  mkdirSync(getCacheDir(), { recursive: true });
}

function readManifest() {
  const file = manifestPath();
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Invalid cache manifest (${file}): ${err?.message || err}`);
  }
}

function writeManifest(manifest) {
  ensureCacheDir();
  writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

/** @returns {{ available: boolean, lastSync: string | null, tabCount: number, spreadsheetId: string | null, cacheDir: string }} */
export function getCacheStatus() {
  const manifest = readManifest();
  return {
    available: Boolean(manifest?.tabs?.length),
    lastSync: manifest?.syncedAt ?? null,
    tabCount: manifest?.tabs?.length ?? 0,
    spreadsheetId: manifest?.spreadsheetId ?? null,
    cacheDir: getCacheDir(),
  };
}

/**
 * Read the cached bundle (no Google API call).
 * @returns {Promise<{ spreadsheetId: string, tabs: Array<{ gid: string, label: string, format?: string, csv: string, rowCount: number }>, fetchedAt: string, source: 'cache' }>}
 */
export function readCachedBundle() {
  const manifest = readManifest();
  if (!manifest?.tabs?.length) {
    throw new Error(
      'No cached Google Sheet data. Run `npm run sheets:sync` or click “Sync from Google” in Upload CSV.',
    );
  }

  const tabs = [];
  for (const tab of manifest.tabs) {
    const file = tab.file ?? tabCsvPath(tab.gid);
    const resolved = path.isAbsolute(file) ? file : path.join(getReadCacheDir(), path.basename(file));
    if (!existsSync(resolved)) {
      throw new Error(`Cache file missing for tab "${tab.label}" (gid=${tab.gid}). Run sheets:sync again.`);
    }
    const csv = readFileSync(resolved, 'utf8').trim();
    if (!csv) throw new Error(`Cache file is empty for tab "${tab.label}" (gid=${tab.gid}).`);
    tabs.push({
      gid: String(tab.gid),
      label: tab.label,
      format: tab.format,
      csv,
      rowCount: tab.rowCount ?? Math.max(0, csv.split(/\r?\n/).length - 1),
    });
  }

  return {
    spreadsheetId: manifest.spreadsheetId,
    tabs,
    fetchedAt: manifest.syncedAt,
    source: 'cache',
  };
}

/** @returns {{ csv: string, rowCount: number, gid: string, label: string, fetchedAt: string, source: 'cache' }} */
export function readCachedTabCsv(gid) {
  const manifest = readManifest();
  if (!manifest?.tabs?.length) {
    throw new Error('No cached Google Sheet data. Run `npm run sheets:sync` first.');
  }

  const tab = manifest.tabs.find((t) => String(t.gid) === String(gid));
  if (!tab) {
    throw new Error(`No cached tab for gid=${gid}. Cached gids: ${manifest.tabs.map((t) => t.gid).join(', ')}`);
  }

  const file = tab.file ?? tabCsvPath(tab.gid);
  const resolved = path.isAbsolute(file) ? file : path.join(getReadCacheDir(), path.basename(file));
  if (!existsSync(resolved)) {
    throw new Error(`Cache file missing for gid=${gid}. Run sheets:sync again.`);
  }

  const csv = readFileSync(resolved, 'utf8').trim();
  if (!csv) throw new Error(`Cache file is empty for gid=${gid}.`);

  return {
    csv,
    rowCount: tab.rowCount ?? Math.max(0, csv.split(/\r?\n/).length - 1),
    gid: String(tab.gid),
    label: tab.label,
    fetchedAt: manifest.syncedAt,
    source: 'cache',
  };
}

/**
 * Pull live data from Google and write CSV files + manifest to disk.
 * @returns {Promise<{ spreadsheetId: string, tabs: Array<{ gid: string, label: string, format?: string, csv: string, rowCount: number }>, fetchedAt: string, source: 'live' }>}
 */
export async function syncSheetsToCache() {
  const live = await fetchAllGoogleSheetTabs();
  ensureCacheDir();

  const manifestTabs = [];
  for (const tab of live.tabs) {
    const fileName = `${tab.gid}.csv`;
    const filePath = path.join(getCacheDir(), fileName);
    writeFileSync(filePath, `${tab.csv}\n`, 'utf8');
    manifestTabs.push({
      gid: tab.gid,
      label: tab.label,
      format: tab.format,
      rowCount: tab.rowCount,
      file: fileName,
    });
  }

  const manifest = {
    spreadsheetId: live.spreadsheetId,
    syncedAt: live.fetchedAt,
    tabs: manifestTabs,
  };
  writeManifest(manifest);

  return {
    ...live,
    source: 'live',
  };
}
