/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Plus, Save, Trash2, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_EMOJI } from '../constants';
import type { Category, Item } from '../types';
import { QtyInput } from './QtyInput';

export interface ItemDraft {
  name: string;
  qty: string;
  category: Category;
}

/**
 * Bottom sheet used both to add a new item and to edit an existing one.
 * Pass `item` to edit it in place; omit it to create a new item.
 */
export function ItemSheet({
  item,
  onSubmit,
  onDelete,
  onClose,
}: {
  item?: Item;
  onSubmit: (draft: ItemDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isEditing = !!item;
  const [name, setName] = useState(item?.name ?? '');
  const [qty, setQty] = useState(item?.qty ?? '');
  const [category, setCategory] = useState<Category>(item?.category ?? 'Épicerie');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 150);
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), qty: qty.trim(), category });
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
              {isEditing ? "Modifier l'article" : 'Ajouter un article'}
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
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                e.preventDefault();
                // Enter moves on to the quantity field instead of saving right away,
                // so the category can still be changed before tapping "Ajouter".
                if (name.trim()) qtyRef.current?.focus();
              }}
              placeholder="Tomates, Lait, Pain…"
              className="w-full bg-surface-high border border-text/5 rounded-xl py-2.5 px-3 text-text font-body font-medium text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-dim"
            />
          </div>

          {/* Qty */}
          <QtyInput qty={qty} setQty={setQty} onEnter={handleSubmit} inputRef={qtyRef} />

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
            {isEditing && onDelete ? (
              <button
                onClick={onDelete}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-error/10 border border-error/20 text-error hover:bg-error/20 transition-all active:scale-95"
                aria-label="Supprimer l'article"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-surface-bright border border-text/5 text-text-muted font-body font-medium text-sm hover:text-text transition-all active:scale-95"
              >
                Annuler
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-grow h-10 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 px-5"
            >
              {isEditing ? <Save className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              <span>{isEditing ? 'Enregistrer' : 'Ajouter'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
