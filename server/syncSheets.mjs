#!/usr/bin/env node
// CLI: pull Google Sheets tabs into the local CSV cache.
// Usage: node --env-file=.env server/syncSheets.mjs

import { syncSheetsToCache, getCacheStatus } from './sheetsCache.mjs';
import { isGoogleSheetsConfigured } from './adapters/googleSheetsAdapter.mjs';

if (!isGoogleSheetsConfigured()) {
  console.error('[sheets:sync] Google Sheets is not configured. Set GOOGLE_SHEETS_ENABLED=true and credentials in .env');
  process.exit(1);
}

try {
  console.log('[sheets:sync] Pulling tabs from Google…');
  const bundle = await syncSheetsToCache();
  const status = getCacheStatus();
  console.log(`[sheets:sync] Done — ${bundle.tabs.length} tab(s) cached at ${status.cacheDir}`);
  for (const tab of bundle.tabs) {
    console.log(`  · ${tab.label} (gid=${tab.gid}): ${tab.rowCount} rows`);
  }
} catch (err) {
  console.error('[sheets:sync] Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}
