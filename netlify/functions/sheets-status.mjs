import { getGoogleSheetsStatus } from '../../server/sheetsHandler.mjs';
import { errorResponse, jsonResponse } from './_shared.mjs';

export async function handler() {
  try {
    return jsonResponse(200, getGoogleSheetsStatus());
  } catch (err) {
    return errorResponse(500, err);
  }
}
