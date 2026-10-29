/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One shared password (APP_PASSWORD) protects the data. After a correct
 * password the server hands out a signed cookie valid for 90 days, so nobody
 * has to type it again. Nothing is stored per session: the cookie is a signed
 * expiry date. The signing key is derived from a random secret kept in the data
 * folder *and* from the password, so changing APP_PASSWORD logs everybody out.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const COOKIE_NAME = 'lc_session';
export const SESSION_MS = 90 * 24 * 60 * 60 * 1000;
/** A session with less than this left is renewed on use, so regular users never get logged out. */
const RENEW_BELOW_MS = 30 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest();

export class Auth {
  readonly enabled: boolean;
  private readonly password: string;
  private readonly passwordHash: Buffer;
  private readonly key: Buffer;

  constructor(password: string | undefined, dataDir: string) {
    this.password = password ?? '';
    this.enabled = this.password.length > 0;
    this.passwordHash = sha256(this.password);
    this.key = crypto
      .createHmac('sha256', this.loadSecret(dataDir))
      .update(`pw:${this.password}`)
      .digest();
  }

  private loadSecret(dir: string): string {
    const file = path.join(dir, 'session-secret');
    try {
      const existing = fs.readFileSync(file, 'utf8').trim();
      if (existing.length >= 32) return existing;
    } catch {
      /* first start: create it below */
    }
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }

  /** Constant-time comparison (both sides hashed, so lengths always match). */
  checkPassword(candidate: unknown): boolean {
    if (!this.enabled || typeof candidate !== 'string') return false;
    return crypto.timingSafeEqual(sha256(candidate), this.passwordHash);
  }

  private sign(expires: number): string {
    return crypto.createHmac('sha256', this.key).update(String(expires)).digest('base64url');
  }

  issue(now = Date.now()): string {
    const expires = now + SESSION_MS;
    return `${expires}.${this.sign(expires)}`;
  }

  verify(token: string | undefined, now = Date.now()): { valid: boolean; renew: boolean } {
    if (!token) return { valid: false, renew: false };
    const dot = token.indexOf('.');
    if (dot < 1) return { valid: false, renew: false };
    const expires = Number(token.slice(0, dot));
    if (!Number.isSafeInteger(expires) || expires <= now) return { valid: false, renew: false };
    const given = Buffer.from(token.slice(dot + 1));
    const expected = Buffer.from(this.sign(expires));
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
      return { valid: false, renew: false };
    }
    return { valid: true, renew: expires - now < RENEW_BELOW_MS };
  }
}

export function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0 || part.slice(0, i).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function sessionCookie(value: string, maxAgeSeconds: number, secure: boolean): string {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;
}

/**
 * Slows down password guessing. Failures are counted per client address and
 * also across all clients: the address comes from a header a LAN client could
 * forge, so the overall limit is the one that really caps guessing.
 */
export class LoginLimiter {
  private readonly perKey = new Map<string, number[]>();
  private all: number[] = [];

  constructor(
    private readonly maxPerKey = 5,
    private readonly maxTotal = 30,
    private readonly windowMs = 15 * 60 * 1000
  ) {}

  private recent(times: number[], now: number) {
    return times.filter((t) => now - t < this.windowMs);
  }

  /** Seconds to wait before another attempt is allowed (0 = go ahead). */
  retryAfter(key: string, now = Date.now()): number {
    const mine = this.recent(this.perKey.get(key) ?? [], now);
    this.all = this.recent(this.all, now);
    let until = 0;
    if (mine.length >= this.maxPerKey) until = Math.max(until, mine[0] + this.windowMs);
    if (this.all.length >= this.maxTotal) until = Math.max(until, this.all[0] + this.windowMs);
    return until > now ? Math.ceil((until - now) / 1000) : 0;
  }

  fail(key: string, now = Date.now()): void {
    this.perKey.set(key, [...this.recent(this.perKey.get(key) ?? [], now), now]);
    this.all = [...this.recent(this.all, now), now];
    if (this.perKey.size > 1000) {
      for (const [k, v] of this.perKey) if (this.recent(v, now).length === 0) this.perKey.delete(k);
    }
  }

  success(key: string): void {
    this.perKey.delete(key);
  }
}
