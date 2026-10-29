/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Self-hosted server for the Docker image. Serves the built app (dist/) and
 * keeps the lists on disk (DATA_DIR), shared by every device that opens the app.
 */

import express from 'express';
import path from 'node:path';
import { SyncError, sanitizeState } from '../src/sync';
import { Store } from './store';

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = process.env.DIST_DIR ?? path.resolve(process.cwd(), 'dist');

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
const store = new Store(DATA_DIR);

const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// A device sends everything it has; the server merges it with what it holds
// and answers with the merged result. Needs Content-Type: application/json,
// which browsers only allow cross-site after a CORS preflight (not enabled here).
app.post('/api/sync', express.json({ limit: '5mb' }), (req, res) => {
  try {
    const merged = store.merge(sanitizeState(req.body));
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, state: merged });
  } catch (err) {
    if (err instanceof SyncError) {
      res.status(400).json({ ok: false, error: err.message });
      return;
    }
    console.error('sync failed:', err);
    res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ ok: false, error: 'Introuvable' });
});

// The service worker must never be served from a stale cache, otherwise
// updates to the app are not picked up by installed PWAs.
app.get(['/sw.js', '/registerSW.js', '/manifest.webmanifest'], (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

app.use(
  express.static(DIST_DIR, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite fingerprints these files, so they can be cached for a long time.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// SPA fallback (same as the rewrite in vercel.json).
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Malformed JSON bodies etc.: answer in JSON rather than with an HTML error page.
app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status && err.status < 500 ? err.status : 500).json({ ok: false, error: 'Requête invalide' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Liste de courses prête sur http://0.0.0.0:${PORT} (données : ${DATA_DIR})`);
});

// docker stop sends SIGTERM: write pending changes before exiting.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    store.flush();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
