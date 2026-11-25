import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Copy, RotateCcw, Sparkles } from 'lucide-react';
import { safeLoadStorage, safeRemoveStorage, safeSaveStorage } from '../../lib/storage';
import { ViralShareBar } from '../ViralShareBar';

type CategoryId = 'storage' | 'length' | 'weight' | 'temperature' | 'percentage';

interface ConverterState {
  category: CategoryId;
  value: string;
  fromUnit: string;
  toUnit: string;
  storageBase: 1024 | 1000;
  pctX: string;
  pctY: string;
}

const STORAGE_KEY = 'spark_studio_converter_v1';

const DEFAULT_STATE: ConverterState = {
  category: 'storage',
  value: '4.7',
  fromUnit: 'GB',
  toUnit: 'MB',
  storageBase: 1024,
  pctX: '20',
  pctY: '85',
};

const LENGTH_FACTORS: Record<string, { label: string; toMeter: number }> = {
  mm: { label: 'Millimeters (mm)', toMeter: 0.001 },
  cm: { label: 'Centimeters (cm)', toMeter: 0.01 },
  m: { label: 'Meters (m)', toMeter: 1 },
  km: { label: 'Kilometers (km)', toMeter: 1000 },
  in: { label: 'Inches (in)', toMeter: 0.0254 },
  ft: { label: 'Feet (ft)', toMeter: 0.3048 },
  yd: { label: 'Yards (yd)', toMeter: 0.9144 },
  mi: { label: 'Miles (mi)', toMeter: 1609.344 },
};

const WEIGHT_FACTORS: Record<string, { label: string; toGram: number }> = {
  mg: { label: 'Milligrams (mg)', toGram: 0.001 },
  g: { label: 'Grams (g)', toGram: 1 },
  kg: { label: 'Kilograms (kg)', toGram: 1000 },
  oz: { label: 'Ounces (oz)', toGram: 28.349523125 },
  lb: { label: 'Pounds (lb)', toGram: 453.59237 },
  t: { label: 'Metric Tons (t)', toGram: 1_000_000 },
};

const TEMP_UNITS: Record<string, { label: string }> = {
  C: { label: 'Celsius (°C)' },
  F: { label: 'Fahrenheit (°F)' },
  K: { label: 'Kelvin (K)' },
};

const STORAGE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1_000_000 || (Math.abs(n) > 0 && Math.abs(n) < 0.0001)) {
    return n.toLocaleString(undefined, { maximumSignificantDigits: 8 });
  }
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function convertTemp(val: number, from: string, to: string): number {
  let celsius = val;
  if (from === 'F') celsius = (val - 32) * (5 / 9);
  if (from === 'K') celsius = val - 273.15;

  if (to === 'F') return celsius * (9 / 5) + 32;
  if (to === 'K') return celsius + 273.15;
  return celsius;
}

export const UnitConverterTool: React.FC = () => {
  const [state, setState] = useState<ConverterState>(() =>
    safeLoadStorage(STORAGE_KEY, DEFAULT_STATE)
  );
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    safeSaveStorage(STORAGE_KEY, state);
  }, [state]);

  const unitOptions = useMemo(() => {
    if (state.category === 'storage') {
      return STORAGE_UNITS.map((u) => ({ id: u, label: u }));
    }
    if (state.category === 'length') {
      return Object.entries(LENGTH_FACTORS).map(([id, info]) => ({ id, label: info.label }));
    }
    if (state.category === 'weight') {
      return Object.entries(WEIGHT_FACTORS).map(([id, info]) => ({ id, label: info.label }));
    }
    if (state.category === 'temperature') {
      return Object.entries(TEMP_UNITS).map(([id, info]) => ({ id, label: info.label }));
    }
    return [];
  }, [state.category]);

  const convertedValue = useMemo(() => {
    const num = Number(state.value);
    if (state.value.trim() === '' || Number.isNaN(num)) return 0;

    if (state.category === 'storage') {
      const fromIdx = STORAGE_UNITS.indexOf(state.fromUnit as (typeof STORAGE_UNITS)[number]);
      const toIdx = STORAGE_UNITS.indexOf(state.toUnit as (typeof STORAGE_UNITS)[number]);
      if (fromIdx === -1 || toIdx === -1) return 0;
      const bytes = num * Math.pow(state.storageBase, fromIdx);
      return bytes / Math.pow(state.storageBase, toIdx);
    }

    if (state.category === 'length') {
      const from = LENGTH_FACTORS[state.fromUnit]?.toMeter ?? 1;
      const to = LENGTH_FACTORS[state.toUnit]?.toMeter ?? 1;
      return (num * from) / to;
    }

    if (state.category === 'weight') {
      const from = WEIGHT_FACTORS[state.fromUnit]?.toGram ?? 1;
      const to = WEIGHT_FACTORS[state.toUnit]?.toGram ?? 1;
      return (num * from) / to;
    }

    if (state.category === 'temperature') {
      return convertTemp(num, state.fromUnit, state.toUnit);
    }

    return 0;
  }, [state]);

  const storageGrid = useMemo(() => {
    if (state.category !== 'storage') return [];
    const num = Number(state.value);
    if (state.value.trim() === '' || Number.isNaN(num)) return [];
    const fromIdx = STORAGE_UNITS.indexOf(state.fromUnit as (typeof STORAGE_UNITS)[number]);
    const bytes = num * Math.pow(state.storageBase, Math.max(0, fromIdx));
    return STORAGE_UNITS.map((unit, idx) => ({
      unit,
      val: bytes / Math.pow(state.storageBase, idx),
    }));
  }, [state.category, state.value, state.fromUnit, state.storageBase]);

  const pctStats = useMemo(() => {
    const x = Number(state.pctX) || 0;
    const y = Number(state.pctY) || 0;
    const xPercentOfY = (x / 100) * y;
    const xIsWhatPctOfY = y !== 0 ? (x / y) * 100 : 0;
    const pctChange = x !== 0 ? ((y - x) / x) * 100 : 0;
    return { x, y, xPercentOfY, xIsWhatPctOfY, pctChange };
  }, [state.pctX, state.pctY]);

  const switchCategory = (category: CategoryId) => {
    setShareMessage(null);
    if (category === 'storage') {
      setState((p) => ({ ...p, category, value: '1', fromUnit: 'GB', toUnit: 'MB' }));
    } else if (category === 'length') {
      setState((p) => ({ ...p, category, value: '5', fromUnit: 'km', toUnit: 'mi' }));
    } else if (category === 'weight') {
      setState((p) => ({ ...p, category, value: '1', fromUnit: 'kg', toUnit: 'lb' }));
    } else if (category === 'temperature') {
      setState((p) => ({ ...p, category, value: '22', fromUnit: 'C', toUnit: 'F' }));
    } else {
      setState((p) => ({ ...p, category }));
    }
  };

  const handleSwap = () => {
    setState((p) => ({ ...p, fromUnit: p.toUnit, toUnit: p.fromUnit }));
  };

  const handleCopy = async () => {
    const text =
      state.category === 'percentage'
        ? `${pctStats.x}% of ${pctStats.y} = ${formatNum(pctStats.xPercentOfY)}`
        : `${state.value || 0} ${state.fromUnit} = ${formatNum(convertedValue)} ${state.toUnit}`;
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage(`Copied "${text}" to clipboard.`);
    } catch {
      setShareMessage(`Result: ${text}`);
    }
  };

  const handleTrySample = () => {
    setShareMessage(null);
    if (state.category === 'storage') {
      setState((p) => ({ ...p, value: '128', fromUnit: 'GB', toUnit: 'MB', storageBase: 1024 }));
    } else if (state.category === 'length') {
      setState((p) => ({ ...p, value: '10', fromUnit: 'km', toUnit: 'mi' }));
    } else if (state.category === 'weight') {
      setState((p) => ({ ...p, value: '2.5', fromUnit: 'kg', toUnit: 'lb' }));
    } else if (state.category === 'temperature') {
      setState((p) => ({ ...p, value: '375', fromUnit: 'F', toUnit: 'C' }));
    } else {
      setState((p) => ({ ...p, pctX: '15', pctY: '120' }));
    }
  };

  const handleReset = () => {
    safeRemoveStorage(STORAGE_KEY);
    setState(DEFAULT_STATE);
    setShareMessage(null);
  };

  return (
    <section
      aria-labelledby="converter-tool-heading"
      className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-5 sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
        <div>
          <h1
            id="converter-tool-heading"
            className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]"
          >
            Digital Storage &amp; Smart Unit Converter
          </h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Instant live conversions for storage (KB/MB/GB/TB), length, weight, temperature, and percentages.
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

      {/* Category Switch */}
      <div className="mt-6 flex flex-wrap gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 p-1.5">
        {(
          [
            { id: 'storage', label: 'Storage' },
            { id: 'length', label: 'Length' },
            { id: 'weight', label: 'Weight' },
            { id: 'temperature', label: 'Temperature' },
            { id: 'percentage', label: 'Percentage' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => switchCategory(cat.id)}
            className={`min-h-[44px] flex-1 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
              state.category === cat.id
                ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {state.category === 'percentage' ? (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pct-x"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                Value X
              </label>
              <input
                id="pct-x"
                type="number"
                step="any"
                value={state.pctX}
                onChange={(e) => setState((p) => ({ ...p, pctX: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="pct-y"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                Value Y
              </label>
              <input
                id="pct-y"
                type="number"
                step="any"
                value={state.pctY}
                onChange={(e) => setState((p) => ({ ...p, pctY: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                What is {pctStats.x}% of {pctStats.y}?
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-[#059669] tabular-nums">
                {formatNum(pctStats.xPercentOfY)}
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {pctStats.x} is what % of {pctStats.y}?
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                {formatNum(pctStats.xIsWhatPctOfY)}%
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-4">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                % Change ({pctStats.x} → {pctStats.y})
              </div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                {pctStats.pctChange >= 0 ? '+' : ''}
                {formatNum(pctStats.pctChange)}%
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {state.category === 'storage' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Unit Standard:
              </span>
              <button
                type="button"
                onClick={() => setState((p) => ({ ...p, storageBase: 1024 }))}
                className={`min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-semibold border transition ${
                  state.storageBase === 1024
                    ? 'border-[#059669] bg-[#059669]/10 text-[#059669] dark:text-emerald-400'
                    : 'border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Binary (1 KB = 1024 B)
              </button>
              <button
                type="button"
                onClick={() => setState((p) => ({ ...p, storageBase: 1000 }))}
                className={`min-h-[44px] rounded-xl px-3.5 py-2 text-sm font-semibold border transition ${
                  state.storageBase === 1000
                    ? 'border-[#059669] bg-[#059669]/10 text-[#059669] dark:text-emerald-400'
                    : 'border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Decimal (1 KB = 1000 B)
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3">
              <label
                htmlFor="conv-value"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                Amount
              </label>
              <input
                id="conv-value"
                type="number"
                step="any"
                value={state.value}
                onChange={(e) => setState((p) => ({ ...p, value: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="conv-from"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                From Unit
              </label>
              <select
                id="conv-from"
                value={state.fromUnit}
                onChange={(e) => setState((p) => ({ ...p, fromUnit: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              >
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center md:col-span-1">
              <button
                type="button"
                onClick={handleSwap}
                aria-label="Swap units"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="conv-to"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                To Unit
              </label>
              <select
                id="conv-to"
                value={state.toUnit}
                onChange={(e) => setState((p) => ({ ...p, toUnit: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              >
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Result */}
          <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Converted Result</div>
              <div className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-[#059669] tabular-nums">
                {formatNum(convertedValue)} {state.toUnit}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857]"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Copy Result</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                aria-label="Reset unit converter"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Quick All-Storage Grid */}
          {state.category === 'storage' && storageGrid.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {storageGrid.map((item) => (
                <div
                  key={item.unit}
                  className="rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3"
                >
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {item.unit}
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-[#0F172A] dark:text-slate-100 tabular-nums truncate">
                    {formatNum(item.val)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {state.category === 'percentage' && (
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857]"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span>Copy Result</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset unit converter"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <ViralShareBar actionMessage={shareMessage} />
    </section>
  );
};
