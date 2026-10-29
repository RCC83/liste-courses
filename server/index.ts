/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Self-hosted server for the Docker image. Serves the built app (dist/).
 * Nothing is stored server-side: lists live in each browser's localStorage.
 */

import express from 'express';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = process.env.DIST_DIR ?? path.resolve(process.cwd(), 'dist');

const app = express();
app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Liste de courses prête sur http://0.0.0.0:${PORT}`);
});
