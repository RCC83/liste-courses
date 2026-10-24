/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { QTY_SUGGESTIONS, QTY_MAX_LENGTH } from '../constants';

/** Lowercase, drop spaces, and treat "x" and "×" as the same character. */
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '').replace(/×/g, 'x');

export function QtyInput({
  qty,
  setQty,
  onEnter,
}: {
  qty: string;
  setQty: (v: string) => void;
  onEnter?: () => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const query = normalize(qty);
  const typed = qty.trim().toLowerCase();
  // Hide a suggestion only when it is exactly what's typed; "x2" or "1l" still
  // offer "×2" / "1 L" so the person can pick the canonical spelling.
  const suggestions = query
    ? QTY_SUGGESTIONS.filter(
        (s) => normalize(s).includes(query) && s.toLowerCase() !== typed
      ).slice(0, 8)
    : QTY_SUGGESTIONS.slice(0, 8);

  const showDropdown = open && suggestions.length > 0;

  // Keep the highlighted option visible when navigating with the keyboard.
  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (value: string) => {
    setQty(value);
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore keys pressed while an IME composition is in progress.
    if (e.nativeEvent.isComposing) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!showDropdown) {
          setOpen(true);
          return;
        }
        setActive((a) => (a + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        if (!showDropdown) return;
        e.preventDefault();
        setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
        break;
      case 'Escape':
        if (!showDropdown) return;
        // Close the list only — don't let the event reach anything that closes the sheet.
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setActive(-1);
        break;
      case 'Enter':
        if (showDropdown && active >= 0) {
          e.preventDefault();
          pick(suggestions[active]);
          return;
        }
        setOpen(false);
        onEnter?.();
        break;
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[9px] font-bold uppercase tracking-widest text-text-dim ml-0.5"
      >
        Quantité (optionnel)
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showDropdown && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          maxLength={QTY_MAX_LENGTH}
          value={qty}
          onChange={(e) => {
            setQty(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="500g, 1 L, 2 bouteilles…"
          className="w-full bg-surface-high border border-text/5 rounded-xl py-2.5 px-3 text-text font-body font-medium text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-dim"
        />
        {/*
          Rendered above the field so it never covers the category picker or the
          "Ajouter" button, and unmounted immediately on close so it can't
          intercept a tap meant for the controls underneath.
        */}
        {showDropdown && (
          <motion.div
            ref={listRef}
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 bottom-full mb-1 z-10 bg-surface-container border border-text/10 rounded-xl shadow-xl overflow-y-auto max-h-44"
          >
            {suggestions.map((s, i) => (
              <button
                key={s}
                id={`${id}-opt-${i}`}
                data-index={i}
                type="button"
                role="option"
                aria-selected={i === active}
                tabIndex={-1}
                // preventDefault keeps focus in the input, so the field never blurs mid-tap.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className={`w-full text-left px-3 py-2 font-body font-medium text-sm transition-colors border-b border-text/5 last:border-0 ${
                  i === active
                    ? 'text-text bg-surface-high'
                    : 'text-text-muted hover:text-text hover:bg-surface-high'
                }`}
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
