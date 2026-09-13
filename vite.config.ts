import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { extractItemsFromImage } from './src/server/geminiExtract';

// Serves POST /api/extract-items during `npm run dev`, mirroring the Vercel
// serverless function in api/extract-items.ts so the photo-import feature
// works locally without deploying. Reads GEMINI_API_KEY from .env.
function devExtractItemsApi(apiKey: string | undefined): Plugin {
  return {
    name: 'dev-extract-items-api',
    configureServer(server) {
      server.middlewares.use('/api/extract-items', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Méthode non autorisée' }));
          return;
        }
        if (!apiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY manquant dans .env' }));
          return;
        }
        let body = '';
        for await (const chunk of req) body += chunk;
        try {
          const { image, mimeType } = JSON.parse(body || '{}');
          if (typeof image !== 'string' || typeof mimeType !== 'string') {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Champs "image" et "mimeType" requis' }));
            return;
          }
          const items = await extractItemsFromImage(apiKey, image, mimeType);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ items }));
        } catch (err) {
          console.error('dev extract-items failed:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Échec de l'analyse de l'image" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      devExtractItemsApi(env.GEMINI_API_KEY),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.svg', 'icon-192.png', 'icon-512.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'Liste Courses',
          short_name: 'ListeCourses',
          description: 'Application de liste de courses simple, rapide et intuitive.',
          theme_color: '#16a34a',
          background_color: '#111111',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          lang: 'fr',
          orientation: 'portrait',
          categories: ['shopping', 'food', 'lifestyle', 'utilities'],
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
