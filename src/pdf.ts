/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds a printable PDF of one shopping list: items grouped by category,
 * with a tick box in front of each one. jsPDF is loaded on demand so it does
 * not weigh on the app's first load.
 */

import { CATEGORIES } from './constants';
import type { Item, ShoppingList } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** "liste-ma-liste-2026-10-29.pdf", using the local date. */
export function pdfFilename(listName: string, now = new Date()): string {
  const slug = listName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `liste-${slug || 'courses'}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.pdf`;
}

/**
 * The built-in PDF fonts only know Western European characters. Anything else
 * (emoji, other alphabets) would come out as garbage, so it is replaced.
 */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/[^ -~¡-ÿŒœ€]/gu, '?')
    .trim();
}

export async function buildListPdf(list: ShoppingList, items: Item[], now = new Date()): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = 210;
  const H = 297;
  const M = 18;
  const BOTTOM = H - 18;
  const ROW = 7;
  let y = M;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = M;
    }
  };

  const total = items.length;
  const toBuy = items.filter((i) => !i.checked).length;

  // Title
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(20);
  const titleLines = doc.splitTextToSize(pdfSafe(list.name) || 'Liste', W - 2 * M) as string[];
  for (const line of titleLines) {
    doc.text(line, M, y + 6);
    y += 9;
  }
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(110);
  const date = now.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' });
  const count = total === 0 ? 'Liste vide' : `${toBuy} à acheter sur ${total} article${total > 1 ? 's' : ''}`;
  doc.text(pdfSafe(`${date}  -  ${count}`), M, y + 2);
  y += 10;

  if (total === 0) {
    doc.setFontSize(11).setTextColor(110);
    doc.text('Aucun article dans cette liste.', M, y + 4);
    return doc.output('blob');
  }

  const groups = CATEGORIES.map((c) => ({
    category: c as string,
    items: items.filter((i) => i.category === c),
  }));
  // Anything with an unknown category still has to appear.
  const known = new Set<string>(CATEGORIES);
  const others = items.filter((i) => !known.has(i.category));
  if (others.length) groups.push({ category: 'Autre', items: others });

  const qtyColumn = W - M;
  for (const group of groups) {
    if (group.items.length === 0) continue;
    // Unticked items first, ticked ones (already bought) at the end.
    const ordered = [...group.items.filter((i) => !i.checked), ...group.items.filter((i) => i.checked)];

    const heading = (suite: boolean) => {
      y += 3;
      doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(40);
      doc.text(pdfSafe(group.category).toUpperCase() + (suite ? ' (suite)' : ''), M, y + 4);
      y += 6;
      doc.setDrawColor(200).setLineWidth(0.3).line(M, y, W - M, y);
      y += 2;
    };
    // A heading is never left alone at the bottom of a page.
    if (y + 14 + ROW > BOTTOM) {
      doc.addPage();
      y = M;
    }
    heading(false);

    for (const item of ordered) {
      const qty = pdfSafe(item.qty);
      const qtyWidth = qty ? doc.setFont('helvetica', 'bold').setFontSize(11).getTextWidth(qty) + 4 : 0;
      doc.setFont('helvetica', 'normal').setFontSize(11);
      const lines = doc.splitTextToSize(pdfSafe(item.name) || '-', W - 2 * M - 9 - qtyWidth) as string[];
      const height = Math.max(ROW, lines.length * 5 + 2);
      if (y + height > BOTTOM) {
        doc.addPage();
        y = M;
        heading(true); // page break in the middle of a category
      }

      // tick box
      doc.setDrawColor(item.checked ? 160 : 60).setLineWidth(0.4).rect(M, y + 1.6, 4, 4);
      if (item.checked) {
        doc.setLineWidth(0.6).line(M + 0.8, y + 3.8, M + 1.8, y + 4.9).line(M + 1.8, y + 4.9, M + 3.4, y + 2.5);
      }

      doc.setTextColor(item.checked ? 150 : 20);
      lines.forEach((line, n) => {
        const ty = y + 5 + n * 5;
        doc.text(line, M + 9, ty);
        if (item.checked) {
          const w = doc.getTextWidth(line);
          doc.setDrawColor(150).setLineWidth(0.25).line(M + 9, ty - 1.3, M + 9 + w, ty - 1.3);
        }
      });

      if (qty) {
        doc.setFont('helvetica', 'bold').setTextColor(item.checked ? 150 : 20);
        doc.text(qty, qtyColumn, y + 5, { align: 'right' });
      }
      y += height;
    }
  }

  // Page numbers
  const pages = doc.getNumberOfPages();
  if (pages > 1) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(150);
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.text(`${p} / ${pages}`, W / 2, H - 8, { align: 'center' });
    }
  }

  return doc.output('blob');
}
