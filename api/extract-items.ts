/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel serverless function. Keeps the Gemini API key server-side: the
 * client sends a base64 image, this function calls Gemini and returns the
 * extracted grocery items as JSON. Requires the GEMINI_API_KEY environment
 * variable to be set in the Vercel project settings.
 */

import { extractItemsFromImage } from '../src/server/geminiExtract';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

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
    res.status(200).json({ items });
  } catch (err) {
    console.error('extract-items failed:', err);
    res.status(500).json({ error: "Échec de l'analyse de l'image" });
  }
}
