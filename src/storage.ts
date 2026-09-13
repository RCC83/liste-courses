/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Item, ShoppingList } from './types';

export const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const save = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value));

const DEFAULT_LIST_ID = 'default';

/**
 * Loads lists and items, migrating the old single-list format
 * (flat `sl_items` with no `listId`) into the multi-list format on first run.
 */
export function loadListsAndItems(): { lists: ShoppingList[]; items: Item[] } {
  const existingLists = load<ShoppingList[] | null>('sl_lists', null);
  if (existingLists && existingLists.length > 0) {
    const items = load<Item[]>('sl_items', []);
    return { lists: existingLists, items };
  }

  // Migration from the old single-list format, or first run.
  const legacyItems = load<Array<Record<string, unknown>>>('sl_items', []);
  const defaultList: ShoppingList = {
    id: DEFAULT_LIST_ID,
    name: 'Ma liste',
    createdAt: Date.now(),
  };
  const items: Item[] = legacyItems.map((raw) => ({
    id: String(raw.id),
    listId: DEFAULT_LIST_ID,
    name: String(raw.name ?? ''),
    qty: String(raw.qty ?? ''),
    category: (raw.category as Item['category']) ?? 'Autre',
    checked: Boolean(raw.checked),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
  }));

  save('sl_lists', [defaultList]);
  save('sl_items', items);
  save('sl_active_list', DEFAULT_LIST_ID);

  return { lists: [defaultList], items };
}
