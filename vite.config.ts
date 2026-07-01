import path from 'node:path'
import os from 'node:os'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Keep Vite's pre-bundle cache off OneDrive to avoid EPERM locks on .vite/deps.
const VITE_CACHE_DIR = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'vite-cache',
  'bio-demand-correlation-dashboard',
)

// Mounts the Triple Whale proxy as dev-server middleware so `npm run dev` is a
// single command and the API key never reaches the browser. The same handler
// powers the standalone Express server (server/index.mjs) for production.
function demandDevApi(): PluginOption {
  return {
    name: 'demand-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/triplewhale/weekly', async (req, res) => {
        // @ts-expect-error server handler is plain JS (.mjs) with no type declarations
        const { demandMiddleware } = await import('./server/handler.mjs')
        demandMiddleware(req, res)
      })
      server.middlewares.use('/api/sheets/status', async (req, res) => {
        // @ts-expect-error server handler is plain JS (.mjs) with no type declarations
        const { sheetsStatusMiddleware } = await import('./server/sheetsHandler.mjs')
        sheetsStatusMiddleware(req, res)
      })
      server.middlewares.use('/api/sheets/csv', async (req, res) => {
        // @ts-expect-error server handler is plain JS (.mjs) with no type declarations
        const { sheetsCsvMiddleware } = await import('./server/sheetsHandler.mjs')
        sheetsCsvMiddleware(req, res)
      })
      server.middlewares.use('/api/sheets/bundle', async (req, res) => {
        // @ts-expect-error server handler is plain JS (.mjs) with no type declarations
        const { sheetsBundleMiddleware } = await import('./server/sheetsHandler.mjs')
        sheetsBundleMiddleware(req, res)
      })
      server.middlewares.use('/api/sheets/sync', async (req, res) => {
        // @ts-expect-error server handler is plain JS (.mjs) with no type declarations
        const { sheetsSyncMiddleware } = await import('./server/sheetsHandler.mjs')
        sheetsSyncMiddleware(req, res)
      })
    },
  }
}

// Server-only env keys mirrored into process.env for the middleware. These are
// NOT VITE_-prefixed, so Vite will never inline them into client bundles.
const SERVER_ENV_KEYS = [
  'TW_API_KEY',
  'TW_SHOP_ID',
  'TW_API_BASE',
  'DEMAND_DATA_MODE',
  'GOOGLE_SHEETS_ENABLED',
  'GOOGLE_SHEET_ID',
  'GOOGLE_SHEET_GID',
  'GOOGLE_SHEET_TABS',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_SERVICE_ACCOUNT_KEY_FILE',
  'GOOGLE_SHEETS_CACHE_DIR',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    cacheDir: VITE_CACHE_DIR,
    plugins: [react(), tailwindcss(), demandDevApi()],
  }
})
