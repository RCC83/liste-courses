/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Keeps the app in sync with the server. The browser's localStorage stays the
 * working copy (so the app is instant and works offline); whenever something
 * changes, and every few seconds, the whole state is sent to /api/sync and the
 * merged result is applied. Changes made while the response was on its way are
 * kept, because the response is merged with the *current* state, not replaced.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeStates, repairState, sameState, sanitizeState, type SyncState } from './sync';

/**
 * local   = no server found (e.g. the Vercel version): everything stays on this device
 * syncing = a request is in progress
 * synced  = this device and the server have the same data
 * offline = the server can't be reached; changes are sent as soon as it can
 */
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline';

const POLL_MS = 15_000;
const DEBOUNCE_MS = 600;
const TIMEOUT_MS = 10_000;

export function useSync(state: SyncState, apply: (s: SyncState) => void) {
  const [status, setStatus] = useState<SyncStatus>('syncing');
  const latest = useRef(state);
  latest.current = state;
  const inflight = useRef(false);
  const again = useRef(false);
  const noServer = useRef(false);

  const run = useCallback(async () => {
    if (noServer.current) return;
    if (inflight.current) {
      again.current = true;
      return;
    }
    inflight.current = true;
    setStatus((s) => (s === 'synced' ? s : 'syncing'));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest.current),
        cache: 'no-store',
        signal: controller.signal,
      });
      const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
      if (res.status === 404 || res.status === 405 || !isJson) {
        // Nothing answers /api/sync (static hosting): stay purely local.
        noServer.current = true;
        setStatus('local');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const server = sanitizeState((await res.json()).state);
      const current = latest.current;
      // Merge with the current state (not the one that was sent) so edits made
      // during the request are not lost, then apply the usual repairs.
      const merged = repairState(mergeStates(current, server));
      if (!sameState(merged, current)) {
        latest.current = merged;
        apply(merged);
      }
      // Anything the server doesn't have yet (newer local edits, repairs) goes out right away.
      if (!sameState(merged, server)) again.current = true;
      setStatus('synced');
    } catch {
      setStatus('offline');
    } finally {
      clearTimeout(timeout);
      inflight.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(run, 0);
      }
    }
  }, [apply]);

  // Something changed here: send it shortly after (grouping quick successive edits).
  useEffect(() => {
    const t = setTimeout(run, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [state.lists, state.items, state.deleted, run]);

  // Pick up changes made on other devices, and retry after a failure.
  useEffect(() => {
    const id = setInterval(run, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', run);
      window.removeEventListener('focus', run);
    };
  }, [run]);

  return status;
}
