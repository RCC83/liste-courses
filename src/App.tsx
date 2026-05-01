/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Check,
  Trash2,
  ShoppingCart,
  Sun,
  Moon,
  X,
  ChevronDown,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Category =
  | 'Fruits & Légumes'
  | 'Viandes & Poissons'
  | 'Produits laitiers'
  | 'Boulangerie'
  | 'Boissons'
  | 'Épicerie'
  | 'Surgelés'
  | 'Hygiène'
  | 'Autre';

type Filter = 'tous' | 'a-acheter' | 'achetes';

interface Item {
  id: string;
  name: string;
  qty: string;
  category: Category;
  checked: boolean;
  createdAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
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

const CATEGORY_EMOJI: Record<Category, string> = {
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

// ─── Storage helpers ──────────────────────────────────────────────────────────

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value));

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    load('sl_theme', 'dark')
  );
  const [items, setItems] = useState<Item[]>(() => load('sl_items', []));
  const [filter, setFilter] = useState<Filter>('tous');
  const [showAdd, setShowAdd] = useState(false);

  // Sync theme class
  useEffect(() => {
    save('sl_theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Persist items
  useEffect(() => {
    save('sl_items', items);
  }, [items]);

  const addItem = (item: Omit<Item, 'id' | 'checked' | 'createdAt'>) => {
    setItems((prev) => [
      {
        ...item,
        id: crypto.randomUUID(),
        checked: false,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setShowAdd(false);
  };

  const toggleItem = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );

  const deleteItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const clearChecked = () =>
    setItems((prev) => prev.filter((i) => !i.checked));

  // Filtered items
  const filtered = items.filter((i) => {
    if (filter === 'a-acheter') return !i.checked;
    if (filter === 'achetes') return i.checked;
    return true;
  });

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: filtered.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden bg-surface text-text">
      {/* Header */}
      <header className="fixed top-0 w-full max-w-md z-50 bg-surface/90 backdrop-blur-xl border-b border-text/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-on-primary" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-text font-headline font-black tracking-tight text-[14px] leading-none">
                Liste
              </span>
              <span className="text-primary font-headline font-black tracking-tight text-[14px] leading-none">
                Courses
              </span>
            </div>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary transition-all active:scale-90"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-text-dim">
                {checkedCount} / {totalCount} articles
              </span>
              <span className="text-[9px] font-bold text-primary">
                {Math.round((checkedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="h-1 bg-surface-bright rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(checkedCount / totalCount) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Main */}
      <main
        className="flex-1 px-3 pb-28 overflow-y-auto"
        style={{ paddingTop: totalCount > 0 ? '7rem' : '4.5rem' }}
      >
        {/* Filter tabs */}
        <div className="flex gap-1.5 py-2.5 sticky top-0 bg-surface z-10">
          {(['tous', 'a-acheter', 'achetes'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg font-headline font-bold text-[9px] uppercase tracking-widest transition-all ${
                filter === f
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-high text-text-muted border border-text/5'
              }`}
            >
              {f === 'tous' ? 'Tous' : f === 'a-acheter' ? 'À acheter' : 'Achetés'}
            </button>
          ))}
        </div>

        {/* Empty state */}
        <AnimatePresence>
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-16 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-surface-high border border-text/5 flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-text-dim" />
              </div>
              <div>
                <p className="font-headline font-bold text-text-muted text-sm">
                  {filter === 'achetes' ? 'Rien acheté' : 'Liste vide'}
                </p>
                <p className="text-text-dim text-xs mt-0.5">
                  {filter === 'tous' || filter === 'a-acheter'
                    ? 'Appuyez sur + pour ajouter'
                    : 'Cochez des articles pour les voir ici'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clear checked button */}
        <AnimatePresence>
          {checkedCount > 0 && filter !== 'a-acheter' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-2"
            >
              <button
                onClick={clearChecked}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-error/10 border border-error/20 text-error text-[10px] font-bold uppercase tracking-wide hover:bg-error/20 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Supprimer les achetés ({checkedCount})
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grouped list */}
        <div className="flex flex-col gap-3">
          {grouped.map(({ cat, items: catItems }) => (
            <motion.section
              key={cat}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
                <span className="text-sm">{CATEGORY_EMOJI[cat]}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-text-dim">
                  {cat}
                </span>
                <div className="flex-1 h-px bg-text/5" />
                <span className="text-[9px] font-bold text-text-dim tabular-nums">
                  {catItems.length}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <AnimatePresence>
                  {catItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(item.id)}
                      onDelete={() => deleteItem(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </div>
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 z-40 max-w-md w-full flex justify-end pr-3 pb-[env(safe-area-inset-bottom)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:brightness-110 transition-all"
        >
          <Plus className="w-6 h-6 text-on-primary" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Add Item Sheet */}
      <AnimatePresence>
        {showAdd && (
          <AddItemSheet
            onAdd={addItem}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${
        item.checked
          ? 'bg-surface-container border-text/5 opacity-50'
          : 'bg-surface-high border-text/5'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
          item.checked
            ? 'bg-primary border-primary'
            : 'border-text/25 hover:border-primary/60'
        }`}
      >
        <AnimatePresence>
          {item.checked && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Check className="w-3 h-3 text-on-primary" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-body font-medium text-sm leading-tight transition-all ${
          item.checked ? 'line-through text-text-dim' : 'text-text'
        }`}>
          {item.name}
        </p>
        {item.qty && (
          <p className="text-[10px] text-text-dim mt-0.5">{item.qty}</p>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-error hover:bg-error/10 transition-all active:scale-90"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Qty suggestions ─────────────────────────────────────────────────────────

const QTY_SUGGESTIONS = [
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

function QtyInput({ qty, setQty }: { qty: string; setQty: (v: string) => void }) {
  const [focused, setFocused] = useState(false);

  const suggestions = qty.trim()
    ? QTY_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(qty.toLowerCase()) && s.toLowerCase() !== qty.toLowerCase()
      ).slice(0, 8)
    : QTY_SUGGESTIONS.slice(0, 8);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-bold uppercase tracking-widest text-text-dim ml-0.5">
        Quantité (optionnel)
      </label>
      <div className="relative">
        <input
          type="text"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder="500g, 1 L, 2 bouteilles…"
          className="w-full bg-surface-high border border-text/5 rounded-xl py-2.5 px-3 text-text font-body font-medium text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-dim"
        />
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 top-full mt-1 z-10 bg-surface-container border border-text/10 rounded-xl shadow-xl overflow-hidden"
            >
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => setQty(s)}
                  className="w-full text-left px-3 py-2 font-body font-medium text-sm text-text-muted hover:text-text hover:bg-surface-high transition-colors border-b border-text/5 last:border-0"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Add Item Sheet ───────────────────────────────────────────────────────────

function AddItemSheet({
  onAdd,
  onClose,
}: {
  onAdd: (item: Omit<Item, 'id' | 'checked' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [category, setCategory] = useState<Category>('Épicerie');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 150);
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), qty: qty.trim(), category });
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-surface-container rounded-t-2xl border-t border-text/10 shadow-2xl pb-[env(safe-area-inset-bottom)]"
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-0.5 rounded-full bg-text/20" />
        </div>

        <div className="px-4 pt-2 pb-5 flex flex-col gap-3.5">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-primary text-xs tracking-wide">
              Ajouter un article
            </h2>
            <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-text-dim ml-0.5">
              Article *
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Tomates, Lait, Pain…"
              className="w-full bg-surface-high border border-text/5 rounded-xl py-2.5 px-3 text-text font-body font-medium text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-dim"
            />
          </div>

          {/* Qty */}
          <QtyInput qty={qty} setQty={setQty} />

          {/* Category picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-text-dim ml-0.5">
              Catégorie
            </label>
            <button
              onClick={() => setShowCatPicker(!showCatPicker)}
              className="w-full bg-surface-high border border-text/5 rounded-xl py-2.5 px-3 flex items-center justify-between text-text font-body font-medium text-sm focus:outline-none transition-all hover:border-primary/30"
            >
              <span className="flex items-center gap-2">
                <span>{CATEGORY_EMOJI[category]}</span>
                <span>{category}</span>
              </span>
              <motion.div animate={{ rotate: showCatPicker ? 180 : 0 }}>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showCatPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategory(cat); setShowCatPicker(false); }}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all ${
                          category === cat
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface-bright border-text/5 text-text-muted hover:text-text'
                        }`}
                      >
                        <span className="text-lg">{CATEGORY_EMOJI[cat]}</span>
                        <span className="text-[7px] font-bold uppercase tracking-wide leading-tight text-center">
                          {cat}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-surface-bright border border-text/5 text-text-muted font-body font-medium text-sm hover:text-text transition-all active:scale-95"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-grow h-10 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 px-5"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Ajouter</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
