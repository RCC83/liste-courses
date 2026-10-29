/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';

export function LoginScreen({
  onSubmit,
}: {
  /** Resolves with an error message, or null when the password was accepted. */
  onSubmit: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    const message = await onSubmit(password);
    setBusy(false);
    if (message) {
      setError(message);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center max-w-md mx-auto px-6 bg-surface text-text">
      <img src="/logo.svg" alt="" className="w-20 h-20 rounded-3xl mb-5" />
      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-text font-headline font-black tracking-tight text-3xl leading-none">Liste</span>
        <span className="text-primary font-headline font-black tracking-tight text-3xl leading-none">Courses</span>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <label
          htmlFor="password"
          className="text-[9px] font-bold uppercase tracking-widest text-text-dim ml-0.5"
        >
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-text-dim absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            disabled={busy}
            aria-invalid={!!error}
            aria-describedby={error ? 'password-error' : undefined}
            className="w-full bg-surface-high border border-text/5 rounded-xl py-3 pl-9 pr-3 text-text font-body font-medium text-base focus:outline-none focus:border-primary/50 transition-all disabled:opacity-60"
          />
        </div>

        {error && (
          <p id="password-error" role="alert" className="text-sm font-body font-medium text-error ml-0.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!password || busy}
          className="h-11 rounded-xl bg-primary text-on-primary font-headline font-bold text-sm hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Entrer
        </button>
      </form>
    </div>
  );
}
