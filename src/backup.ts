/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Export / import of the lists as a JSON file. Everything here is pure (no DOM,
 * no storage) so it can be tested on its own.
 *
 * Importing is a non-destructive merge: lists and items whose id already exists
 * are left untouched, only the missing ones are added. Restoring into an empty
 * app brings everything back; importing on a second phone adds to what is there.
 */

import { MAX_ITEMS, MAX_LISTS, sanitizeItems, sanitizeLists } from './sync';
import type { Item, ShoppingList } from './types';

export const BACKUP_APP = 'liste-courses';
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  lists: ShoppingList[];
  items: Item[];
}

export class BackupError extends Error {}

export function buildBackup(lists: ShoppingList[], items: Item[], now = new Date()): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    lists,
    items,
  };
}

/** "liste-courses-2026-10-29.json", using the local date. */
export function backupFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `liste-courses-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Parses and validates a backup file. Anything malformed is dropped rather
 * than trusted: unknown categories become "Autre", bad numbers get a default.
 */
export function parseBackup(text: string): { lists: ShoppingList[]; items: Item[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("Ce fichier n'est pas une sauvegarde valide.");
  }

  if (!isObject(data) || data.app !== BACKUP_APP || !Array.isArray(data.lists) || !Array.isArray(data.items)) {
    throw new BackupError("Ce fichier n'est pas une sauvegarde de Liste de courses.");
  }
  if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
    throw new BackupError("Cette sauvegarde vient d'une version plus récente de l'app.");
  }
  if (data.lists.length > MAX_LISTS || data.items.length > MAX_ITEMS) {
    throw new BackupError('Cette sauvegarde est trop volumineuse.');
  }

  const lists = sanitizeLists(data.lists);
  const items = sanitizeItems(data.items);
  if (lists.length === 0 && items.length === 0) {
    throw new BackupError('Cette sauvegarde est vide.');
  }
  return { lists, items };
}

export interface MergeResult {
  lists: ShoppingList[];
  items: Item[];
  addedLists: number;
  addedItems: number;
  /** Ids of everything that was added (so a stale deletion of them can be forgotten). */
  addedIds: string[];
}

/** Adds what is missing; never modifies or removes anything that already exists. */
export function mergeBackup(
  current: { lists: ShoppingList[]; items: Item[] },
  incoming: { lists: ShoppingList[]; items: Item[] },
  now = Date.now()
): MergeResult {
  const knownLists = new Set(current.lists.map((l) => l.id));
  // What gets added is stamped "now", so it is treated as a fresh change when synchronised.
  const newLists = incoming.lists.filter((l) => !knownLists.has(l.id)).map((l) => ({ ...l, updatedAt: now }));
  const lists = [...current.lists, ...newLists];

  const knownItems = new Set(current.items.map((i) => i.id));
  const listIds = new Set(lists.map((l) => l.id));
  // An item pointing at a list that isn't in the file goes to the first list.
  const fallbackListId = lists[0]?.id;
  const newItems = incoming.items
    .filter((i) => !knownItems.has(i.id))
    .map((i) => ({ ...i, updatedAt: now, listId: listIds.has(i.listId) ? i.listId : fallbackListId }))
    .filter((i): i is Item => typeof i.listId === 'string' && i.listId !== '');

  return {
    lists,
    items: [...newItems, ...current.items],
    addedLists: newLists.length,
    addedItems: newItems.length,
    addedIds: [...newLists.map((l) => l.id), ...newItems.map((i) => i.id)],
  };
}

export function importSummary(r: Pick<MergeResult, 'addedLists' | 'addedItems'>): string {
  if (r.addedLists === 0 && r.addedItems === 0) {
    return 'Rien de nouveau : tout était déjà dans l’app.';
  }
  const parts: string[] = [];
  if (r.addedItems > 0) parts.push(`${r.addedItems} article${r.addedItems > 1 ? 's' : ''}`);
  if (r.addedLists > 0) parts.push(`${r.addedLists} liste${r.addedLists > 1 ? 's' : ''}`);
  return `Ajouté : ${parts.join(' et ')}.`;
}
