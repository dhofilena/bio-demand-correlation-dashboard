import { jsonResponse } from './_shared.mjs';

export async function handler() {
  return jsonResponse(200, { ok: true });
}
