/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnimatePresence, motion } from 'motion/react';
import { Check, Trash2 } from 'lucide-react';
import type { Item } from '../types';

export function ItemRow({
  item,
  onToggle,
  onDelete,
  onEdit,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
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

      {/* Content — tap to edit */}
      <button onClick={onEdit} className="flex-1 min-w-0 text-left">
        <p className={`font-body font-semibold text-lg leading-tight break-words transition-all ${
          item.checked ? 'line-through text-text-dim' : 'text-text'
        }`}>
          {item.name}
        </p>
        {item.qty && (
          <p className="text-sm text-text-dim mt-0.5 break-words">{item.qty}</p>
        )}
      </button>

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
