import { fetchAllGoogleSheetTabs } from '../../server/adapters/googleSheetsAdapter.mjs';
import { errorResponse, jsonResponse } from './_shared.mjs';

export async function handler() {
  try {
    const bundle = await fetchAllGoogleSheetTabs();
    return jsonResponse(200, bundle);
  } catch (err) {
    return errorResponse(502, err);
  }
}
