import express from 'express';
import { demandMiddleware } from './handler.mjs';

// Standalone production proxy. The Vite dev server mounts the same handler as
// middleware (see vite.config.ts), so this is only needed when serving the
// built app. Run with:  node --env-file=.env server/index.mjs
const app = express();
const PORT = process.env.PORT || 8787;

app.get('/api/triplewhale/weekly', demandMiddleware);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`[proxy] Triple Whale proxy listening on http://localhost:${PORT}`);
});
