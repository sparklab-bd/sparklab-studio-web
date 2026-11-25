import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { safeLoadStorage, safeRemoveStorage, safeSaveStorage } from '../../lib/storage';
import { ViralShareBar } from '../ViralShareBar';

type PassMode = 'password' | 'pin';

interface PasswordPrefs {
  mode: PassMode;
  length: number;
  pinLength: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  easyToRead: boolean;
}

const STORAGE_KEY = 'spark_studio_pass_prefs_v1';

const DEFAULT_PREFS: PasswordPrefs = {
  mode: 'password',
  length: 16,
  pinLength: 6,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  easyToRead: false,
};

const AMBIGUOUS_CHARS = new Set(['0', 'O', 'o', '1', 'l', 'I']);

function secureRandomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let val = 0;
  do {
    window.crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);
  return val % max;
}

function generateSecret(prefs: PasswordPrefs): string {
  if (prefs.mode === 'pin') {
    const digits = '0123456789';
    let out = '';
    for (let i = 0; i < prefs.pinLength; i++) {
      out += digits[secureRandomIndex(digits.length)];
    }
    return out;
  }

  const filterAmbiguous = (chars: string) =>
    prefs.easyToRead ? [...chars].filter((c) => !AMBIGUOUS_CHARS.has(c)).join('') : chars;

  const pools: string[] = [];
  if (prefs.uppercase) pools.push(filterAmbiguous('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));
  if (prefs.lowercase) pools.push(filterAmbiguous('abcdefghijklmnopqrstuvwxyz'));
  if (prefs.numbers) pools.push(filterAmbiguous('0123456789'));
  if (prefs.symbols) pools.push('!@#$%^&*-_=+?');

  if (pools.length === 0) {
    pools.push(filterAmbiguous('abcdefghijklmnopqrstuvwxyz'));
  }

  const combined = pools.join('');
  const chars: string[] = [];

  // Guarantee at least 1 character from each selected pool when length allows
  for (let i = 0; i < pools.length && chars.length < prefs.length; i++) {
    const pool = pools[i];
    chars.push(pool[secureRandomIndex(pool.length)]);
  }

  while (chars.length < prefs.length) {
    chars.push(combined[secureRandomIndex(combined.length)]);
  }

  // Fisher-Yates shuffle with CSPRNG
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }

  return chars.join('');
}

export const PasswordGeneratorTool: React.FC = () => {
  const [prefs, setPrefs] = useState<PasswordPrefs>(() =>
    safeLoadStorage(STORAGE_KEY, DEFAULT_PREFS)
  );
  const [output, setOutput] = useState<string>(() => generateSecret(DEFAULT_PREFS));
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    safeSaveStorage(STORAGE_KEY, prefs);
  }, [prefs]);

  const regenerate = useCallback((nextPrefs: PasswordPrefs) => {
    setOutput(generateSecret(nextPrefs));
    setShareMessage(null);
  }, []);

  useEffect(() => {
    regenerate(prefs);
  }, [prefs, regenerate]);

  const strength = useMemo(() => {
    if (prefs.mode === 'pin') {
      const bits = Math.round(prefs.pinLength * Math.log2(10));
      if (prefs.pinLength >= 8) return { label: 'Strong PIN', bits, pct: 80, bar: 'bg-[#059669]' };
      if (prefs.pinLength >= 6) return { label: 'Standard PIN', bits, pct: 55, bar: 'bg-amber-500' };
      return { label: 'Basic PIN', bits, pct: 30, bar: 'bg-red-500' };
    }

    let poolSize = 0;
    if (prefs.uppercase) poolSize += prefs.easyToRead ? 24 : 26;
    if (prefs.lowercase) poolSize += prefs.easyToRead ? 24 : 26;
    if (prefs.numbers) poolSize += prefs.easyToRead ? 8 : 10;
    if (prefs.symbols) poolSize += 13;
    if (poolSize === 0) poolSize = 24;

    const bits = Math.round(prefs.length * Math.log2(poolSize));
    if (bits >= 80) return { label: 'Very Strong', bits, pct: 100, bar: 'bg-[#059669]' };
    if (bits >= 60) return { label: 'Strong', bits, pct: 75, bar: 'bg-[#059669]' };
    if (bits >= 40) return { label: 'Fair', bits, pct: 50, bar: 'bg-amber-500' };
    return { label: 'Weak', bits, pct: 25, bar: 'bg-red-500' };
  }, [prefs]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setShareMessage(
        prefs.mode === 'pin' ? 'PIN copied to clipboard.' : 'Strong password copied to clipboard.'
      );
    } catch {
      setShareMessage('Ready — select and copy the generated text above.');
    }
  };

  const handleTrySample = () => {
    const samplePrefs: PasswordPrefs = {
      mode: 'password',
      length: 20,
      pinLength: 6,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      easyToRead: true,
    };
    setPrefs(samplePrefs);
    setOutput(generateSecret(samplePrefs));
    setShareMessage(null);
  };

  const handleReset = () => {
    safeRemoveStorage(STORAGE_KEY);
    setPrefs(DEFAULT_PREFS);
    setOutput(generateSecret(DEFAULT_PREFS));
    setShareMessage(null);
  };

  return (
    <section
      aria-labelledby="password-tool-heading"
      className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-5 sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
        <div>
          <h1
            id="password-tool-heading"
            className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]"
          >
            Strong Password &amp; PIN Generator
          </h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Generate cryptographically random passwords or PINs offline right inside your browser.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTrySample}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-[#0F172A] dark:text-slate-100 whitespace-nowrap shrink-0 transition hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <Sparkles className="h-4 w-4 text-[#059669]" aria-hidden="true" />
          <span>Try Sample</span>
        </button>
      </div>

      {/* Mode Switch */}
      <div className="mt-6 grid max-w-xs grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 p-1.5">
        <button
          type="button"
          onClick={() => setPrefs((p) => ({ ...p, mode: 'password' }))}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition ${
            prefs.mode === 'password'
              ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setPrefs((p) => ({ ...p, mode: 'pin' }))}
          className={`min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition ${
            prefs.mode === 'pin'
              ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          PIN Code
        </button>
      </div>

      {/* Output Box */}
      <div className="mt-5 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            aria-live="polite"
            className="font-mono text-xl sm:text-2xl font-medium tracking-wide break-all text-[#0F172A] dark:text-[#F8FAFC] select-all"
          >
            {output}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => regenerate(prefs)}
              aria-label="Generate new password"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857]"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span>{prefs.mode === 'pin' ? 'Copy PIN' : 'Copy Password'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset password settings"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Strength Indicator */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F172A] dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-[#059669]" aria-hidden="true" />
              <span>Strength: {strength.label}</span>
            </span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              {strength.bits} bits entropy
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-200 ${strength.bar}`}
              style={{ width: `${strength.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Options */}
      {prefs.mode === 'password' ? (
        <div className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="pass-length"
                className="text-sm font-semibold text-[#0F172A] dark:text-slate-200"
              >
                Password Length
              </label>
              <span className="font-mono text-base font-semibold text-[#059669] tabular-nums">
                {prefs.length} characters
              </span>
            </div>
            <input
              id="pass-length"
              type="range"
              min={8}
              max={64}
              value={prefs.length}
              onChange={(e) => setPrefs((p) => ({ ...p, length: Number(e.target.value) }))}
              className="w-full accent-[#059669] h-2 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { key: 'uppercase', label: 'Uppercase (A–Z)' },
                { key: 'lowercase', label: 'Lowercase (a–z)' },
                { key: 'numbers', label: 'Numbers (0–9)' },
                { key: 'symbols', label: 'Symbols (!@#$%)' },
                { key: 'easyToRead', label: 'Easy-to-Read (Skip 0, O, 1, l, I)' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-base text-[#0F172A] dark:text-slate-100"
              >
                <input
                  type="checkbox"
                  checked={prefs[opt.key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [opt.key]: e.target.checked }))}
                  className="h-5 w-5 rounded accent-[#059669]"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-2">
            PIN Length
          </p>
          <div className="flex flex-wrap gap-2.5">
            {[4, 6, 8, 12].map((len) => (
              <button
                key={len}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, pinLength: len }))}
                className={`min-h-[44px] min-w-[72px] rounded-xl border px-4 py-2 text-base font-semibold tabular-nums transition ${
                  prefs.pinLength === len
                    ? 'border-[#059669] bg-[#059669] text-white'
                    : 'border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-slate-100'
                }`}
              >
                {len} digits
              </button>
            ))}
          </div>
        </div>
      )}

      <ViralShareBar actionMessage={shareMessage} />
    </section>
  );
};
