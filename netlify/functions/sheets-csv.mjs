import { readCachedTabCsv } from '../../server/sheetsCache.mjs';
import { errorResponse, queryParams } from './_shared.mjs';

export async function handler(event) {
  try {
    const gid = queryParams(event.queryStringParameters).gid || undefined;
    const { csv, rowCount, fetchedAt, label, source } = readCachedTabCsv(gid);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Sheet-Row-Count': String(rowCount),
        'X-Sheet-Fetched-At': fetchedAt,
        'X-Sheet-Label': label,
        'X-Sheet-Source': source,
      },
      body: csv,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('No cached') ? 404 : 502;
    return errorResponse(status, err);
  }
}
