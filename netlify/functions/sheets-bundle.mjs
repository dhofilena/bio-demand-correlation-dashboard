import { readCachedBundle } from '../../server/sheetsCache.mjs';
import { errorResponse, jsonResponse } from './_shared.mjs';

export async function handler() {
  try {
    const bundle = readCachedBundle();
    return jsonResponse(200, bundle, { 'X-Sheet-Source': bundle.source });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('No cached') ? 404 : 502;
    return errorResponse(status, err);
  }
}
