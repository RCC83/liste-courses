/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Keeps the shared lists in memory and on disk (one JSON file). Writes are
 * atomic (temp file + rename) and the previous version is kept as `.bak`, so a
 * crash or power cut cannot leave a half-written file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { emptyState, mergeStates, sameState, sanitizeState, type SyncState } from '../src/sync';

const FILE_VERSION = 1;

export class Store {
  private state: SyncState = emptyState();
  private timer: NodeJS.Timeout | null = null;
  private dirty = false;
  private readonly file: string;
  private readonly bak: string;
  private readonly tmp: string;

  constructor(private readonly dir: string) {
    this.file = path.join(dir, 'data.json');
    this.bak = path.join(dir, 'data.json.bak');
    this.tmp = path.join(dir, 'data.json.tmp');
    fs.mkdirSync(dir, { recursive: true });
    this.state = this.load();
  }

  get(): SyncState {
    return this.state;
  }

  /** Merges what a device sent into the shared state and returns the result. */
  merge(incoming: SyncState): SyncState {
    const merged = mergeStates(this.state, incoming);
    if (!sameState(merged, this.state)) {
      this.state = merged;
      this.schedule();
    }
    return this.state;
  }

  /** Writes any pending change right now (used on shutdown). */
  flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.dirty) this.write();
  }

  private schedule() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.write();
    }, 300);
  }

  private write() {
    const json = JSON.stringify({ version: FILE_VERSION, ...this.state });
    const fd = fs.openSync(this.tmp, 'w');
    try {
      fs.writeSync(fd, json);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    if (fs.existsSync(this.file)) fs.renameSync(this.file, this.bak);
    fs.renameSync(this.tmp, this.file);
    this.dirty = false;
  }

  private read(file: string): SyncState | null {
    try {
      return sanitizeState(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Impossible de lire ${file}:`, (err as Error).message);
      }
      return null;
    }
  }

  private load(): SyncState {
    const main = this.read(this.file);
    if (main) return main;
    // Crash between the two renames, or a damaged file: fall back to the previous version.
    const bak = this.read(this.bak);
    if (bak) {
      console.warn('data.json absent ou illisible : restauration depuis data.json.bak');
      return bak;
    }
    return emptyState();
  }
}
