/** @param {Record<string, string | undefined> | null | undefined} raw */
export function queryParams(raw) {
  return raw ?? {};
}

/**
 * @param {number} statusCode
 * @param {unknown} body
 * @param {Record<string, string>} [extraHeaders]
 */
export function jsonResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

/** @param {number} statusCode @param {unknown} err */
export function errorResponse(statusCode, err) {
  const message = err instanceof Error ? err.message : String(err);
  return jsonResponse(statusCode, { error: message });
}
