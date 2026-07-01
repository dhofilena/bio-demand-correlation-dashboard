import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { env, getGoogleSheetTabs } from '../config.mjs';

// ===========================================================================
// Google Sheets adapter — private sheets via service account.
// Fetches a tab as CSV using an OAuth access token (JWT bearer grant).
// ===========================================================================

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const FETCH_TIMEOUT_MS = 45_000;

function fetchWithTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

function loadServiceAccount() {
  if (env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const raw = readFileSync(env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE, 'utf8');
    return JSON.parse(raw);
  }
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }
  throw new Error('Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_FILE');
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: `${SHEETS_SCOPE} ${DRIVE_SCOPE}`,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${detail}`);
  }

  const json = await res.json();
  if (!json.access_token) throw new Error('Google token response missing access_token');
  return json.access_token;
}

function valuesToCsv(values) {
  return values
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? '');
          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(','),
    )
    .join('\r\n');
}

async function resolveSheetTitle(spreadsheetId, gid, accessToken) {
  const res = await fetchWithTimeout(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Could not read spreadsheet metadata (${res.status}): ${detail}`);
  }
  const json = await res.json();
  const targetGid = Number(gid);
  const sheet = json.sheets?.find((s) => s.properties?.sheetId === targetGid);
  if (!sheet?.properties?.title) {
    throw new Error(`No tab found for gid=${gid}. Check GOOGLE_SHEET_GID in .env.`);
  }
  return sheet.properties.title;
}

async function fetchViaExportUrl(spreadsheetId, gid, accessToken) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Sheet export failed (${res.status}): ${detail.slice(0, 240)}`);
  }
  return res.text();
}

async function fetchViaSheetsApi(spreadsheetId, gid, accessToken) {
  const title = await resolveSheetTitle(spreadsheetId, gid, accessToken);
  const range = encodeURIComponent(`${title}!A:ZZ`);
  const res = await fetchWithTimeout(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Sheets API read failed (${res.status}): ${detail}`);
  }
  const json = await res.json();
  const values = json.values ?? [];
  if (!values.length) throw new Error('Sheet tab is empty');
  return valuesToCsv(values);
}

/** Whether Google Sheets integration is turned on and minimally configured. */
export function isGoogleSheetsConfigured() {
  if (!env.GOOGLE_SHEETS_ENABLED) return false;
  if (!env.GOOGLE_SHEET_ID) return false;
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON || env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
}

async function fetchTabCsv(spreadsheetId, gid, accessToken) {
  let csv;
  try {
    csv = await fetchViaExportUrl(spreadsheetId, gid, accessToken);
  } catch {
    csv = await fetchViaSheetsApi(spreadsheetId, gid, accessToken);
  }

  const trimmed = csv.trim();
  if (!trimmed) throw new Error(`Tab gid=${gid} is empty`);

  const rowCount = Math.max(0, trimmed.split(/\r?\n/).length - 1);
  return { csv: trimmed, rowCount };
}

/**
 * Fetch one tab as CSV text.
 * @param {string} [gid] — tab id; defaults to the first configured tab
 * @returns {Promise<{ csv: string, rowCount: number, gid: string, label: string, fetchedAt: string }>}
 */
export async function fetchGoogleSheetCsv(gid) {
  if (!isGoogleSheetsConfigured()) {
    throw new Error('Google Sheets is not configured (see .env)');
  }

  const tabs = getGoogleSheetTabs();
  const targetGid = gid ?? tabs[0].gid;
  const tab = tabs.find((t) => t.gid === String(targetGid));
  if (!tab) {
    throw new Error(`Unknown tab gid=${targetGid}. Configured gids: ${tabs.map((t) => t.gid).join(', ')}`);
  }

  const spreadsheetId = tab.spreadsheetId ?? env.GOOGLE_SHEET_ID;
  const serviceAccount = loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const { csv, rowCount } = await fetchTabCsv(spreadsheetId, tab.gid, accessToken);

  return {
    csv,
    rowCount,
    gid: tab.gid,
    label: tab.label,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch every configured tab in the workbook.
 * @returns {Promise<{ spreadsheetId: string, tabs: Array<{ gid: string, label: string, csv: string, rowCount: number }>, fetchedAt: string }>}
 */
export async function fetchAllGoogleSheetTabs() {
  if (!isGoogleSheetsConfigured()) {
    throw new Error('Google Sheets is not configured (see .env)');
  }

  const configuredTabs = getGoogleSheetTabs();
  const serviceAccount = loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const fetchedAt = new Date().toISOString();

  const tabs = [];
  const errors = [];
  for (const tab of configuredTabs) {
    try {
      const spreadsheetId = tab.spreadsheetId ?? env.GOOGLE_SHEET_ID;
      const { csv, rowCount } = await fetchTabCsv(spreadsheetId, tab.gid, accessToken);
      tabs.push({
        gid: tab.gid,
        label: tab.label,
        format: tab.format,
        spreadsheetId,
        csv,
        rowCount,
      });
    } catch (err) {
      errors.push(`"${tab.label}" (gid=${tab.gid}): ${err?.message || err}`);
    }
  }

  if (!tabs.length) {
    throw new Error(errors.join('; ') || 'No Google Sheet tabs could be fetched.');
  }

  const spreadsheetId = tabs[0]?.spreadsheetId ?? env.GOOGLE_SHEET_ID;
  const result = { spreadsheetId, tabs, fetchedAt };
  if (errors.length) {
    result.partialErrors = errors;
  }
  return result;
}
