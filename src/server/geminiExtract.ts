/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-only module: calls the Gemini vision API to turn a photo (receipt,
 * handwritten list, or fridge/pantry shot) into a list of grocery items.
 * Used by both the Vercel serverless function (api/extract-items.ts) and the
 * local Vite dev middleware (vite.config.ts), so it never runs in the browser
 * and the API key never reaches the client bundle.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES, QTY_MAX_LENGTH } from '../constants';

export interface ExtractedItemPayload {
  name: string;
  qty: string;
  category: string;
}

const PROMPT = `Tu analyses une photo liée à des courses alimentaires. Elle peut être :
- un ticket de caisse (liste les articles achetés),
- une liste de courses manuscrite ou tapée (liste les articles écrits),
- ou une photo d'un frigo/placard/garde-manger (liste les produits visibles).

Identifie tous les articles pertinents et renvoie une liste JSON. Pour chaque article :
- "name": le nom de l'article en français, court et clair (ex: "Tomates", "Lait demi-écrémé").
- "qty": la quantité si elle est visible ou clairement déductible (ex: "500g", "×2", "1 L"), sinon une chaîne vide.
- "category": la catégorie la plus adaptée, choisie STRICTEMENT parmi cette liste : ${CATEGORIES.join(', ')}.

Ignore le texte qui n'est pas un article de course (totaux, dates, adresses, publicités, texte non alimentaire non pertinent). Si aucun article n'est identifiable, renvoie un tableau vide.`;

export async function extractItemsFromImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<ExtractedItemPayload[]> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            qty: { type: Type.STRING },
            category: { type: Type.STRING, enum: CATEGORIES },
          },
          required: ['name', 'category'],
        },
      },
    },
  });

  const text = response.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((it) => it && typeof it.name === 'string' && it.name.trim())
      .map((it) => ({
        name: String(it.name).trim(),
        qty: typeof it.qty === 'string' ? it.qty.trim().slice(0, QTY_MAX_LENGTH) : '',
        category: CATEGORIES.includes(it.category) ? it.category : 'Autre',
      }));
  } catch {
    return [];
  }
}
