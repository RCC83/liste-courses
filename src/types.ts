/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category =
  | 'Fruits & Légumes'
  | 'Viandes & Poissons'
  | 'Produits laitiers'
  | 'Boulangerie'
  | 'Boissons'
  | 'Épicerie'
  | 'Surgelés'
  | 'Hygiène'
  | 'Autre';

export type Filter = 'tous' | 'a-acheter' | 'achetes';

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  /** Last modification (ms). Used to merge changes coming from several devices. */
  updatedAt: number;
}

export interface Item {
  id: string;
  listId: string;
  name: string;
  qty: string;
  category: Category;
  checked: boolean;
  createdAt: number;
  /** Last modification (ms). Used to merge changes coming from several devices. */
  updatedAt: number;
}
