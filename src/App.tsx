/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  Cloud,
  CloudOff,
  Plus,
  Sun,
  Moon,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES, CATEGORY_EMOJI } from './constants';
import { load, loadListsAndItems, save } from './storage';
import { useSync } from './useSync';
import type { SyncState } from './sync';
import {
  BACKUP_MAX_BYTES,
  BackupError,
  backupFilename,
  buildBackup,
  importSummary,
  mergeBackup,
  parseBackup,
} from './backup';
import type { Filter, Item, ShoppingList } from './types';
import { ItemRow } from './components/ItemRow';
import { ItemSheet, type ItemDraft } from './components/ItemSheet';
import { ListsSheet } from './components/ListsSheet';
import { LoginScreen } from './components/LoginScreen';

const initial = loadListsAndItems();

const SYNC_LABEL: Record<string, string> = {
  syncing: 'Synchronisation en cours…',
  synced: 'Enregistré sur le serveur',
  offline: 'Serveur injoignable : les modifications seront envoyées dès son retour',
};

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => load('sl_theme', 'dark'));
  const [lists, setLists] = useState<ShoppingList[]>(initial.lists);
  const [items, setItems] = useState<Item[]>(initial.items);
  const [activeListId, setActiveListId] = useState<string>(() =>
    load('sl_active_list', initial.lists[0]?.id ?? 'default')
  );
  // Ids of lists/items deleted here, so that other devices delete them too.
  const [deleted, setDeleted] = useState<Record<string, number>>(() => load('sl_deleted', {}));
  const [filter, setFilter] = useState<Filter>('tous');
  const [showAdd, setShowAdd] = useState(false);
  const [showLists, setShowLists] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Sync theme class
  useEffect(() => {
    save('sl_theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => save('sl_lists', lists), [lists]);
  useEffect(() => save('sl_items', items), [items]);
  useEffect(() => save('sl_deleted', deleted), [deleted]);
  useEffect(() => save('sl_active_list', activeListId), [activeListId]);

  // Guard against a stale/deleted active list id.
  useEffect(() => {
    if (!lists.some((l) => l.id === activeListId) && lists.length > 0) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId]);

  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];

  const applySync = useCallback((s: SyncState) => {
    setLists(s.lists);
    setItems(s.items);
    setDeleted(s.deleted);
  }, []);
  const { status: syncStatus, authRequired, syncNow } = useSync({ lists, items, deleted }, applySync);

  /** Every change gets a strictly newer timestamp, so the latest edit wins everywhere. */
  const stamp = <T extends { updatedAt: number }>(x: T): T => ({
    ...x,
    updatedAt: Math.max(Date.now(), x.updatedAt + 1),
  });
  const markDeleted = (ids: string[]) => {
    const now = Date.now();
    setDeleted((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, now])) }));
  };

  const addItem = (draft: ItemDraft) => {
    setItems((prev) => [
      {
        ...draft,
        id: crypto.randomUUID(),
        listId: activeListId,
        checked: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...prev,
    ]);
    setShowAdd(false);
  };

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(buildBackup(lists, items), null, 2)], {
      type: 'application/json',
    });
    const file = new File([blob], backupFilename(), { type: 'application/json' });

    // iOS home-screen apps can't download blobs reliably: use the share sheet
    // ("Enregistrer dans Fichiers"). Everywhere else a normal download works.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Liste de courses' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') throw err;
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const importData = async (file: File): Promise<{ ok: boolean; message: string }> => {
    if (file.size > BACKUP_MAX_BYTES) {
      return { ok: false, message: 'Ce fichier est trop volumineux.' };
    }
    try {
      const incoming = parseBackup(await file.text());
      const result = mergeBackup({ lists, items }, incoming);
      setLists(result.lists);
      setItems(result.items);
      // Imported items count as new changes: forget older deletions of the same ids.
      const added = new Set(result.addedIds);
      setDeleted((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !added.has(id))));
      return { ok: true, message: importSummary(result) };
    } catch (err) {
      if (err instanceof BackupError) return { ok: false, message: err.message };
      throw err;
    }
  };

  const login = async (password: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        await syncNow();
        return null;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const minutes = Math.max(1, Math.ceil((body.retryAfter ?? 60) / 60));
        return `Trop d’essais. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`;
      }
      return body.error || 'Connexion impossible.';
    } catch {
      return 'Serveur injoignable. Vérifie ta connexion.';
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    } finally {
      setShowLists(false);
      syncNow(); // the server now answers 401, which shows the login screen
    }
  };

  const updateItem = (id: string, draft: ItemDraft) => {
    setItems((prev) => prev.map((i) => (i.id === id ? stamp({ ...i, ...draft }) : i)));
    setEditingItem(null);
  };

  const toggleItem = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? stamp({ ...i, checked: !i.checked }) : i))
    );

  const deleteItem = (id: string) => {
    markDeleted([id]);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setEditingItem((cur) => (cur?.id === id ? null : cur));
  };

  const clearChecked = () => {
    markDeleted(items.filter((i) => i.checked && i.listId === activeListId).map((i) => i.id));
    setItems((prev) => prev.filter((i) => !(i.checked && i.listId === activeListId)));
  };

  // Lists management
  const createList = (name: string) => {
    const now = Date.now();
    const list: ShoppingList = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
    setLists((prev) => [...prev, list]);
    setActiveListId(list.id);
  };

  const renameList = (id: string, name: string) =>
    setLists((prev) => prev.map((l) => (l.id === id ? stamp({ ...l, name }) : l)));

  const deleteList = (id: string) => {
    if (lists.length <= 1) return; // always keep at least one list
    markDeleted([id, ...items.filter((i) => i.listId === id).map((i) => i.id)]);
    setLists((prev) => prev.filter((l) => l.id !== id));
    setItems((prev) => prev.filter((i) => i.listId !== id));
  };

  // Items scoped to the active list
  const listItems = items.filter((i) => i.listId === activeListId);

  const filtered = listItems.filter((i) => {
    if (filter === 'a-acheter') return !i.checked;
    if (filter === 'achetes') return i.checked;
    return true;
  });

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: filtered.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const checkedCount = listItems.filter((i) => i.checked).length;
  const totalCount = listItems.length;

  const itemCounts = lists.reduce<Record<string, number>>((acc, l) => {
    acc[l.id] = items.filter((i) => i.listId === l.id).length;
    return acc;
  }, {});

  if (syncStatus === 'locked') return <LoginScreen onSubmit={login} />;

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden bg-surface text-text">
      {/* Header */}
      <header className="fixed top-0 w-full max-w-md z-50 bg-surface/90 backdrop-blur-xl border-b border-text/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 h-20">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="w-14 h-14 rounded-2xl" />
            <div className="flex items-baseline gap-1">
              <span className="text-text font-headline font-black tracking-tight text-[26px] leading-none">
                Liste
              </span>
              <span className="text-primary font-headline font-black tracking-tight text-[26px] leading-none">
                Courses
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
          {syncStatus !== 'local' && (
            <span
              role="img"
              aria-label={SYNC_LABEL[syncStatus]}
              title={SYNC_LABEL[syncStatus]}
              className={`p-2 ${syncStatus === 'offline' ? 'text-error' : 'text-text-dim'} ${
                syncStatus === 'syncing' ? 'animate-pulse' : ''
              }`}
            >
              {syncStatus === 'offline' ? <CloudOff className="w-[18px] h-[18px]" /> : <Cloud className="w-[18px] h-[18px]" />}
            </span>
          )}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-text-muted hover:text-primary transition-all active:scale-90"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          </div>
        </div>

        {/* List switcher */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowLists(true)}
            className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors"
          >
            <span className="font-headline font-bold text-sm truncate max-w-[220px]">
              {activeList?.name ?? 'Ma liste'}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
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
        style={{ paddingTop: totalCount > 0 ? '9.5rem' : '7rem' }}
      >
        {/* Filter tabs */}
        <div className="flex gap-1.5 py-2.5 sticky top-0 bg-surface z-10">
          {(['tous', 'a-acheter', 'achetes'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg font-headline font-bold text-xs uppercase tracking-widest transition-all ${
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
                <span className="text-xs font-black uppercase tracking-[0.18em] text-text-dim">
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
                      onEdit={() => setEditingItem(item)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </div>
      </main>

      {/* FABs */}
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 z-40 max-w-md w-full flex flex-col items-end gap-2.5 pr-3 pb-[env(safe-area-inset-bottom)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:brightness-110 transition-all"
          aria-label="Ajouter un article"
        >
          <Plus className="w-6 h-6 text-on-primary" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Add item sheet */}
      <AnimatePresence>
        {showAdd && (
          <ItemSheet onSubmit={addItem} onClose={() => setShowAdd(false)} />
        )}
      </AnimatePresence>

      {/* Edit item sheet */}
      <AnimatePresence>
        {editingItem && (
          <ItemSheet
            item={editingItem}
            onSubmit={(draft) => updateItem(editingItem.id, draft)}
            onDelete={() => deleteItem(editingItem.id)}
            onClose={() => setEditingItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Lists sheet */}
      <AnimatePresence>
        {showLists && (
          <ListsSheet
            lists={lists}
            activeListId={activeListId}
            itemCounts={itemCounts}
            onSelect={(id) => { setActiveListId(id); setShowLists(false); }}
            onCreate={createList}
            onRename={renameList}
            onDelete={deleteList}
            syncStatus={syncStatus}
            onLogout={authRequired ? logout : undefined}
            onExport={exportData}
            onImport={importData}
            onClose={() => setShowLists(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
