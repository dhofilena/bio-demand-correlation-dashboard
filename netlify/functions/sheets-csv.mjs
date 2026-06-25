import { fetchGoogleSheetCsv } from '../../server/adapters/googleSheetsAdapter.mjs';
import { errorResponse, queryParams } from './_shared.mjs';

export async function handler(event) {
  try {
    const q = queryParams(event.queryStringParameters);
    const gid = q.gid || undefined;
    const { csv, rowCount, fetchedAt, label } = await fetchGoogleSheetCsv(gid);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'X-Sheet-Row-Count': String(rowCount),
        'X-Sheet-Fetched-At': fetchedAt,
        'X-Sheet-Label': label,
      },
      body: csv,
    };
  } catch (err) {
    return errorResponse(502, err);
  }
}
