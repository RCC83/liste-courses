/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QTY_SUGGESTIONS } from '../constants';

export function QtyInput({
  qty,
  setQty,
  onEnter,
}: {
  qty: string;
  setQty: (v: string) => void;
  onEnter?: () => void;
}) {
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setFocused(false);
              onEnter?.();
            }
          }}
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
              className="absolute left-0 right-0 top-full mt-1 z-10 bg-surface-container border border-text/10 rounded-xl shadow-xl overflow-y-auto max-h-44"
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
