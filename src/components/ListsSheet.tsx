/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ClipboardList, Download, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import type { ShoppingList } from '../types';
import type { SyncStatus } from '../useSync';

const STATUS_TEXT: Record<SyncStatus, string> = {
  local: 'Données enregistrées sur cet appareil uniquement.',
  syncing: 'Synchronisation avec le serveur…',
  synced: 'Enregistré sur le serveur : tes listes sont partagées entre tes appareils.',
  offline: 'Serveur injoignable. Les modifications sont gardées ici et envoyées dès son retour.',
};

export function ListsSheet({
  lists,
  activeListId,
  itemCounts,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  syncStatus,
  onExport,
  onImport,
  onClose,
}: {
  lists: ShoppingList[];
  activeListId: string;
  itemCounts: Record<string, number>;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  syncStatus: SyncStatus;
  onExport: () => void | Promise<void>;
  /** Resolves with a message to show; `ok: false` marks it as an error. */
  onImport: (file: File) => Promise<{ ok: boolean; message: string }>;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const newInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBackupMsg(null);
    try {
      await onExport();
    } catch {
      setBackupMsg({ ok: false, message: "L'export a échoué." });
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setBackupMsg(null);
    try {
      setBackupMsg(await onImport(file));
    } catch {
      setBackupMsg({ ok: false, message: "L'import a échoué." });
    } finally {
      setBusy(false);
      // Lets the same file be picked again.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startCreate = () => {
    setCreating(true);
    setNewName('');
    setTimeout(() => newInputRef.current?.focus(), 100);
  };

  const confirmCreate = () => {
    const trimmed = newName.trim();
    if (trimmed) onCreate(trimmed);
    setCreating(false);
    setNewName('');
  };

  const startRename = (list: ShoppingList) => {
    setEditingId(list.id);
    setEditName(list.name);
  };

  const confirmRename = () => {
    const trimmed = editName.trim();
    if (editingId && trimmed) onRename(editingId, trimmed);
    setEditingId(null);
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
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-surface-container rounded-t-2xl border-t border-text/10 shadow-2xl pb-[env(safe-area-inset-bottom)] max-h-[75vh] flex flex-col"
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-8 h-0.5 rounded-full bg-text/20" />
        </div>

        <div className="px-4 pt-2 pb-3 flex items-center justify-between">
          <h2 className="font-headline font-bold text-primary text-xs tracking-wide">
            Mes listes
          </h2>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-4 flex flex-col gap-1.5 overflow-y-auto">
          {lists.map((list) => (
            <div
              key={list.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                list.id === activeListId
                  ? 'bg-primary/10 border-primary'
                  : 'bg-surface-high border-text/5'
              }`}
            >
              {editingId === list.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                    className="flex-1 bg-surface-bright border border-text/10 rounded-lg py-1.5 px-2 text-text font-body font-medium text-sm focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={confirmRename}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-all"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(list.id)}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left"
                  >
                    <ClipboardList className={`w-4 h-4 flex-shrink-0 ${list.id === activeListId ? 'text-primary' : 'text-text-dim'}`} />
                    <span className={`font-body font-semibold text-sm truncate ${list.id === activeListId ? 'text-text' : 'text-text-muted'}`}>
                      {list.name}
                    </span>
                    <span className="text-[10px] font-bold text-text-dim tabular-nums flex-shrink-0">
                      {itemCounts[list.id] ?? 0}
                    </span>
                  </button>
                  <button
                    onClick={() => startRename(list)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-text hover:bg-surface-bright transition-all active:scale-90"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {lists.length > 1 && (
                    <button
                      onClick={() => onDelete(list.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-error hover:bg-error/10 transition-all active:scale-90"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {creating ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-primary bg-primary/10">
              <input
                ref={newInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmCreate()}
                placeholder="Nom de la liste…"
                className="flex-1 bg-surface-bright border border-text/10 rounded-lg py-1.5 px-2 text-text font-body font-medium text-sm focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={confirmCreate}
                disabled={!newName.trim()}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-all disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={startCreate}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-text/15 text-text-muted hover:text-primary hover:border-primary/40 transition-all font-body font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle liste
            </button>
          )}
        </div>

        <div className="px-4 pt-3 pb-4 border-t border-text/5 flex flex-col gap-2 flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-dim ml-0.5">
            Sauvegarde
          </p>
          <p
            className={`text-xs font-body font-medium ml-0.5 ${syncStatus === 'offline' ? 'text-error' : 'text-text-muted'}`}
          >
            {STATUS_TEXT[syncStatus]}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={busy}
              className="flex-1 h-10 rounded-xl bg-surface-bright border border-text/5 text-text-muted hover:text-text hover:border-primary/30 font-body font-medium text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex-1 h-10 rounded-xl bg-surface-bright border border-text/5 text-text-muted hover:text-text hover:border-primary/30 font-body font-medium text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            >
              <Upload className="w-4 h-4" />
              Importer
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {backupMsg && (
            <p
              role="status"
              className={`text-xs font-body font-medium ml-0.5 ${backupMsg.ok ? 'text-primary' : 'text-error'}`}
            >
              {backupMsg.message}
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
