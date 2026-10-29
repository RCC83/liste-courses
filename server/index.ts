/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Self-hosted server for the Docker image. Serves the built app (dist/) and
 * the same POST /api/extract-items route as the Vercel function, so the
 * Gemini API key stays on the server.
 */

import express from 'express';
import path from 'node:path';
import { extractItemsFromImage } from '../src/server/geminiExtract';

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = process.env.DIST_DIR ?? path.resolve(process.cwd(), 'dist');

const app = express();
app.disable('x-powered-by');

// A phone photo encoded in base64 is easily several MB.
app.use('/api', express.json({ limit: '25mb' }));

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/extract-items', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY n'est pas configurée sur le serveur" });
    return;
  }

  const { image, mimeType } = req.body ?? {};
  if (typeof image !== 'string' || typeof mimeType !== 'string') {
    res.status(400).json({ error: 'Champs "image" et "mimeType" requis' });
    return;
  }

  try {
    const items = await extractItemsFromImage(apiKey, image, mimeType);
    res.json({ items });
  } catch (err) {
    console.error('extract-items failed:', err);
    res.status(500).json({ error: "Échec de l'analyse de l'image" });
  }
});

app.all('/api/*', (_req, res) => {
  res.status(405).json({ error: 'Méthode non autorisée' });
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
