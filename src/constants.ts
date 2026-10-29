/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Category } from './types';

export const CATEGORIES: Category[] = [
  'Fruits & Légumes',
  'Viandes & Poissons',
  'Produits laitiers',
  'Boulangerie',
  'Boissons',
  'Épicerie',
  'Surgelés',
  'Hygiène',
  'Autre',
];

export const CATEGORY_EMOJI: Record<Category, string> = {
  'Fruits & Légumes': '🥦',
  'Viandes & Poissons': '🥩',
  'Produits laitiers': '🧀',
  'Boulangerie': '🥖',
  'Boissons': '🥤',
  'Épicerie': '🛒',
  'Surgelés': '🧊',
  'Hygiène': '🧴',
  'Autre': '📦',
};

/** Max length of a quantity string (input field and backup import). */
export const QTY_MAX_LENGTH = 40;

export const QTY_SUGGESTIONS = [
  '×1', '×2', '×3', '×4', '×6',
  '100g', '150g', '200g', '250g', '300g', '400g', '500g', '750g', '1 kg', '1.5 kg', '2 kg',
  '50 ml', '100 ml', '150 ml', '200 ml', '250 ml', '330 ml', '500 ml', '750 ml', '1 L', '1.5 L', '2 L',
  '1 paquet', '2 paquets', '3 paquets',
  '1 bouteille', '2 bouteilles',
  '1 boîte', '2 boîtes',
  '1 sachet', '2 sachets',
  '1 barquette', '2 barquettes',
  '1 douzaine',
  '1 tranche', '2 tranches',
  '1 pot', '2 pots',
  '1 rouleau',
];
