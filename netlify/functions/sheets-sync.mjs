import { syncSheetsToCache, getCacheStatus } from '../../server/sheetsCache.mjs';
import { errorResponse, jsonResponse } from './_shared.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, new Error('Method not allowed. Use POST.'));
  }

  try {
    const bundle = await syncSheetsToCache();
    return jsonResponse(200, {
      ok: true,
      spreadsheetId: bundle.spreadsheetId,
      fetchedAt: bundle.fetchedAt,
      source: bundle.source,
      tabs: bundle.tabs.map((t) => ({ gid: t.gid, label: t.label, rowCount: t.rowCount })),
      cache: getCacheStatus(),
    });
  } catch (err) {
    return errorResponse(502, err);
  }
}
