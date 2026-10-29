/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared by the browser and the server: validation and merging of the app
 * state. Every list and item carries an `updatedAt`; deletions are remembered
 * in `deleted` (id -> time of deletion). Merging two states keeps, for each id,
 * the most recently modified version, and a deletion wins over any older edit.
 * The result does not depend on the order of the arguments, and merging the
 * same data twice changes nothing, so devices converge whatever the order in
 * which they synchronise, including after working offline.
 */

import { CATEGORIES, QTY_MAX_LENGTH } from './constants';
import type { Category, Item, ShoppingList } from './types';

export interface SyncState {
  lists: ShoppingList[];
  items: Item[];
  /** id -> deletion time (ms) */
  deleted: Record<string, number>;
}

export const DEFAULT_LIST_ID = 'default';
export const MAX_LISTS = 200;
export const MAX_ITEMS = 20000;
export const MAX_TOMBSTONES = 50000;
export const MAX_NAME_LENGTH = 200;
/** After this long a deletion is forgotten (a device offline longer could bring the item back). */
export const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export class SyncError extends Error {}

export const emptyState = (): SyncState => ({ lists: [], items: [], deleted: {} });

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const cleanText = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

const cleanId = (v: unknown): string => {
  const id = cleanText(v, 100);
  return id === '__proto__' ? '' : id;
};

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Drops anything malformed instead of trusting it. */
export function sanitizeLists(raw: unknown[]): ShoppingList[] {
  const now = Date.now();
  const ts = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const out: ShoppingList[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!isObject(r)) continue;
    const id = cleanId(r.id);
    const name = cleanText(r.name, MAX_NAME_LENGTH);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const createdAt = ts(r.createdAt, now);
    out.push({ id, name, createdAt, updatedAt: ts(r.updatedAt, createdAt) });
  }
  return out;
}

export function sanitizeItems(raw: unknown[]): Item[] {
  const now = Date.now();
  const ts = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const out: Item[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (!isObject(r)) continue;
    const id = cleanId(r.id);
    const name = cleanText(r.name, MAX_NAME_LENGTH);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const createdAt = ts(r.createdAt, now);
    out.push({
      id,
      listId: cleanId(r.listId),
      name,
      qty: cleanText(r.qty, QTY_MAX_LENGTH),
      category: CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'Autre',
      checked: r.checked === true,
      createdAt,
      updatedAt: ts(r.updatedAt, createdAt),
    });
  }
  return out;
}

export function sanitizeDeleted(raw: unknown): Record<string, number> {
  if (!isObject(raw)) return {};
  const entries = Object.entries(raw)
    .filter(([id, t]) => id !== '__proto__' && id.length > 0 && id.length <= 100 && typeof t === 'number' && Number.isFinite(t))
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, MAX_TOMBSTONES);
  return Object.fromEntries(entries) as Record<string, number>;
}

/** Validates a state received from the network or read from disk. */
export function sanitizeState(raw: unknown): SyncState {
  if (!isObject(raw) || !Array.isArray(raw.lists) || !Array.isArray(raw.items)) {
    throw new SyncError('État invalide');
  }
  if (raw.lists.length > MAX_LISTS || raw.items.length > MAX_ITEMS) {
    throw new SyncError('État trop volumineux');
  }
  return {
    lists: sanitizeLists(raw.lists),
    items: sanitizeItems(raw.items),
    deleted: sanitizeDeleted(raw.deleted),
  };
}

// Fixed key order, so that two equal entities always serialise identically.
const canonList = (l: ShoppingList): ShoppingList => ({
  id: l.id, name: l.name, createdAt: l.createdAt, updatedAt: l.updatedAt,
});
const canonItem = (i: Item): Item => ({
  id: i.id, listId: i.listId, name: i.name, qty: i.qty, category: i.category,
  checked: i.checked, createdAt: i.createdAt, updatedAt: i.updatedAt,
});

/** Most recently modified version of each id; a later-or-equal deletion removes it. */
function pick<T extends { id: string; updatedAt: number }>(a: T[], b: T[], deleted: Record<string, number>): T[] {
  const byId = new Map<string, T>();
  for (const e of [...a, ...b]) {
    const cur = byId.get(e.id);
    if (
      !cur ||
      e.updatedAt > cur.updatedAt ||
      // Same millisecond, different content: pick deterministically so every device agrees.
      (e.updatedAt === cur.updatedAt && JSON.stringify(e) > JSON.stringify(cur))
    ) {
      byId.set(e.id, e);
    }
  }
  return [...byId.values()].filter((e) => !(own(deleted, e.id) && deleted[e.id] >= e.updatedAt));
}

export function mergeStates(a: SyncState, b: SyncState, now = Date.now()): SyncState {
  const deleted: Record<string, number> = {};
  for (const src of [a.deleted, b.deleted]) {
    for (const [id, t] of Object.entries(src)) {
      if (now - t > TOMBSTONE_TTL_MS) continue;
      if (!own(deleted, id) || t > deleted[id]) deleted[id] = t;
    }
  }

  const lists = pick(a.lists.map(canonList), b.lists.map(canonList), deleted);
  lists.sort((x, y) => x.createdAt - y.createdAt || (x.id < y.id ? -1 : 1));

  const items = pick(a.items.map(canonItem), b.items.map(canonItem), deleted);
  items.sort((x, y) => y.createdAt - x.createdAt || (x.id < y.id ? -1 : 1));

  const sortedDeleted = Object.fromEntries(Object.entries(deleted).sort(([x], [y]) => (x < y ? -1 : 1)));
  return { lists, items, deleted: sortedDeleted };
}

/**
 * Fixes states that no longer make sense after a merge: at least one list must
 * exist, and an item must belong to an existing list (e.g. a list deleted on
 * one phone while another added an item to it). Called by the app, never by the
 * merge itself: these fixes are ordinary edits, which keeps the merge simple
 * and the order of synchronisation irrelevant.
 */
export function repairState(state: SyncState, now = Date.now()): SyncState {
  let lists = state.lists;
  if (lists.length === 0) {
    lists = [{ id: DEFAULT_LIST_ID, name: 'Ma liste', createdAt: now, updatedAt: now }];
  }
  const listIds = new Set(lists.map((l) => l.id));
  const orphan = (i: Item) => !listIds.has(i.listId);
  if (lists === state.lists && !state.items.some(orphan)) return state;
  const items = state.items.map((i) =>
    orphan(i) ? { ...i, listId: lists[0].id, updatedAt: Math.max(now, i.updatedAt + 1) } : i
  );
  return { ...state, lists, items };
}

export const sameState = (a: SyncState, b: SyncState) => JSON.stringify(a) === JSON.stringify(b);
