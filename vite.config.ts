import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Mounts the Triple Whale proxy as dev-server middleware so `npm run dev` is a
// single command and the API key never reaches the browser. The same handler
// powers the standalone Express server (server/index.mjs) for production.
function tripleWhaleDevApi(): PluginOption {
  return {
    name: 'triple-whale-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/triplewhale/weekly', async (req, res) => {
        // @ts-expect-error server handler is plain JS (.mjs) with no type declarations
        const { demandMiddleware } = await import('./server/handler.mjs')
        demandMiddleware(req, res)
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
  'AMAZON_ADAPTER',
  'AMAZON_API_BASE',
  'AMAZON_API_KEY',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), tailwindcss(), tripleWhaleDevApi()],
  }
})
