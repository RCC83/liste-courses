/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ExtractedItem } from '../types';

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:<mime>;base64,<data>"
      const commaIndex = result.indexOf(',');
      const header = result.slice(0, commaIndex);
      const base64 = result.slice(commaIndex + 1);
      const mimeMatch = header.match(/data:(.*);base64/);
      resolve({ base64, mimeType: mimeMatch?.[1] ?? file.type ?? 'image/jpeg' });
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

export async function extractItemsFromPhoto(file: File): Promise<ExtractedItem[]> {
  const { base64, mimeType } = await fileToBase64(file);

  const res = await fetch('/api/extract-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Échec de l'analyse de l'image");
  }

  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}
