import { getWeeklyDemand } from '../../server/handler.mjs';
import { errorResponse, jsonResponse, queryParams } from './_shared.mjs';

export async function handler(event) {
  try {
    const q = queryParams(event.queryStringParameters);
    const { status, body } = await getWeeklyDemand({
      start: q.start || undefined,
      end: q.end || undefined,
      mock: q.mock === 'true',
    });
    return jsonResponse(status, body);
  } catch (err) {
    return errorResponse(500, err);
  }
}
