/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Check, ImageUp, Loader2, RotateCcw, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_EMOJI, QTY_MAX_LENGTH, QTY_SUGGESTIONS } from '../constants';
import type { Category, ExtractedItem } from '../types';
import { extractItemsFromPhoto } from '../lib/extractItemsFromPhoto';

type Status = 'pick' | 'loading' | 'review' | 'error';

interface ReviewRow extends ExtractedItem {
  selected: boolean;
}

export function PhotoImportSheet({
  onImport,
  onClose,
}: {
  onImport: (items: ExtractedItem[]) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>('pick');
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus('loading');
    try {
      const items = await extractItemsFromPhoto(file);
      if (items.length === 0) {
        setErrorMsg("Aucun article n'a été reconnu sur cette photo. Réessayez avec une photo plus nette.");
        setStatus('error');
        return;
      }
      setRows(items.map((it) => ({ ...it, selected: true })));
      setStatus('review');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Échec de l'analyse de l'image");
      setStatus('error');
    }
  };

  const toggleRow = (i: number) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));

  const updateRow = (i: number, patch: Partial<ReviewRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // A row can only be imported if it is ticked and still has a name
  // (same rule as the manual "Ajouter un article" sheet).
  const isImportable = (r: ReviewRow) => r.selected && r.name.trim() !== '';
  const selectedCount = rows.filter(isImportable).length;

  const confirmImport = () => {
    const selected = rows
      .filter(isImportable)
      .map(({ name, qty, category }) => ({ name: name.trim(), qty: qty.trim(), category }));
    if (selected.length === 0) return;
    onImport(selected);
  };

  const reset = () => {
    setStatus('pick');
    setRows([]);
    setErrorMsg('');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-surface-container rounded-t-2xl border-t border-text/10 shadow-2xl pb-[env(safe-area-inset-bottom)] max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-0.5 rounded-full bg-text/20" />
        </div>

        <div className="px-4 pt-2 pb-3 flex items-center justify-between flex-shrink-0">
          <h2 className="font-headline font-bold text-primary text-xs tracking-wide">
            Ajouter par photo
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'pick' && (
          <div className="px-4 pb-6 flex flex-col gap-2.5">
            <p className="text-text-dim text-xs -mt-1 mb-1">
              Ticket de caisse, liste manuscrite ou photo du frigo/placard : l'IA reconnaît les articles automatiquement.
            </p>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm hover:brightness-110 transition-all active:scale-95"
            >
              <Camera className="w-5 h-5" />
              Prendre une photo
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface-high border border-text/5 text-text font-body font-semibold text-sm hover:border-primary/30 transition-all active:scale-95"
            >
              <ImageUp className="w-5 h-5 text-text-muted" />
              Choisir depuis la galerie
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-text-muted text-sm font-body font-medium">Analyse de la photo…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="px-4 pb-6 flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-error text-sm font-body font-medium">{errorMsg}</p>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-high border border-text/5 text-text-muted hover:text-text text-xs font-bold uppercase tracking-wide transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        )}

        {status === 'review' && (
          <>
            <div className="px-4 pb-3 flex-1 overflow-y-auto flex flex-col gap-1.5">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all ${
                    row.selected ? 'bg-surface-high border-text/5' : 'bg-surface-container border-text/5 opacity-50'
                  }`}
                >
                  <button
                    onClick={() => toggleRow(i)}
                    role="checkbox"
                    aria-checked={row.selected}
                    aria-label="Importer cet article"
                    className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
                      row.selected ? 'bg-primary border-primary' : 'border-text/25'
                    }`}
                  >
                    {row.selected && <Check className="w-3 h-3 text-on-primary" strokeWidth={3} />}
                  </button>

                  <input
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    aria-label="Nom de l'article"
                    aria-invalid={row.selected && row.name.trim() === ''}
                    className="flex-1 min-w-0 bg-transparent text-text font-body font-semibold text-sm focus:outline-none"
                  />

                  <input
                    value={row.qty}
                    onChange={(e) => updateRow(i, { qty: e.target.value })}
                    list="photo-qty-suggestions"
                    maxLength={QTY_MAX_LENGTH}
                    autoComplete="off"
                    aria-label="Quantité"
                    title={row.qty}
                    placeholder="qté"
                    className="w-24 flex-shrink-0 bg-surface-bright rounded-lg px-1.5 py-1 text-text-dim text-xs text-center focus:outline-none"
                  />

                  <select
                    value={row.category}
                    aria-label="Catégorie"
                    onChange={(e) => updateRow(i, { category: e.target.value as Category })}
                    className="flex-shrink-0 bg-surface-bright rounded-lg px-1 py-1 text-xs focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_EMOJI[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <datalist id="photo-qty-suggestions">
              {QTY_SUGGESTIONS.map((q) => (
                <option key={q} value={q} />
              ))}
            </datalist>

            <div className="px-4 pt-1 pb-4 flex gap-2 flex-shrink-0 border-t border-text/5">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-surface-bright border border-text/5 text-text-muted font-body font-medium text-sm hover:text-text transition-all active:scale-95"
              >
                Annuler
              </button>
              <button
                onClick={confirmImport}
                disabled={selectedCount === 0}
                className="flex-grow h-10 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              >
                Ajouter ({selectedCount})
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}
