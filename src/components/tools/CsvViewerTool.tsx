import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Copy, Download, FileSpreadsheet, RotateCcw, Search, Sparkles } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from '../../lib/constants';
import { safeLoadStorage, safeRemoveStorage, safeSaveStorage } from '../../lib/storage';
import { ViralShareBar } from '../ViralShareBar';

const STORAGE_KEY = 'spark_studio_csv_v1';
const PAGE_SIZE = 100;

const SAMPLE_CSV = `Order ID,Customer,Product,Quantity,Total ($),Status
1041,Maya Lin,Espresso Beans (1kg),3,72.00,Delivered
1042,Jordan Patel,Pour-Over Kettle,1,58.50,Shipped
1043,Elena Gomez,Ceramic Mug Set,4,96.00,Delivered
1044,Noah Brooks,Cold Brew Bottle,2,44.00,Processing
1045,Priya Nair,Matcha Ceremonial Tin,2,64.00,Delivered
1046,Liam O'Connor,Paper Filters (200pk),5,35.00,Shipped
1047,Sofia Rossi,French Press 1L,1,42.00,Delivered
1048,Daniel Kim,Oat Barista Case,2,54.00,Processing`;

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  if (tabs > commas && tabs > semis) return '\t';
  if (semis > commas) return ';';
  return ',';
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(trimmed);
  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const next = trimmed[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell);
  matrix.push(row);

  const nonEmpty = matrix.filter((r) => r.some((val) => val.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h, idx) => h.trim() || `Column ${idx + 1}`);
  const rows = nonEmpty.slice(1).map((r) => headers.map((_, idx) => (r[idx] ?? '').trim()));
  return { headers, rows };
}

export const CsvViewerTool: React.FC = () => {
  const [csvText, setCsvText] = useState<string>(() => safeLoadStorage(STORAGE_KEY, ''));
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const [showRawInput, setShowRawInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (csvText.length <= 400_000) {
      safeSaveStorage(STORAGE_KEY, csvText);
    }
  }, [csvText]);

  const parsed = useMemo(() => parseCsv(csvText), [csvText]);

  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = parsed.rows;
    if (q) {
      result = result.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      result = [...result].sort((a, b) => {
        const av = a[sortCol] ?? '';
        const bv = b[sortCol] ?? '';
        const an = Number(av.replace(/,/g, ''));
        const bn = Number(bv.replace(/,/g, ''));
        if (av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn)) {
          return sortAsc ? an - bn : bn - an;
        }
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return result;
  }, [parsed.rows, searchQuery, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / PAGE_SIZE));
  const visibleRows = filteredAndSortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setShareMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File exceeds the ${MAX_FILE_SIZE_LABEL} safety limit.`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
        setPage(0);
        setSortCol(null);
      }
    };
    reader.onerror = () => setErrorMsg('Could not read the CSV file.');
    reader.readAsText(file);
  };

  const toJsonString = (): string => {
    const objects = filteredAndSortedRows.map((r) => {
      const obj: Record<string, string> = {};
      parsed.headers.forEach((header, idx) => {
        obj[header] = r[idx] ?? '';
      });
      return obj;
    });
    return JSON.stringify(objects, null, 2);
  };

  const handleCopyJson = async () => {
    if (parsed.headers.length === 0) return;
    try {
      await navigator.clipboard.writeText(toJsonString());
      setShareMessage(`Copied ${filteredAndSortedRows.length} rows as JSON.`);
    } catch {
      handleDownloadJson();
    }
  };

  const handleDownloadJson = () => {
    if (parsed.headers.length === 0) return;
    const blob = new Blob([toJsonString()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spark-data.json';
    link.click();
    URL.revokeObjectURL(url);
    setShareMessage(`Downloaded ${filteredAndSortedRows.length} rows as JSON.`);
  };

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
    setPage(0);
  };

  const handleTrySample = () => {
    setErrorMsg(null);
    setShareMessage(null);
    setCsvText(SAMPLE_CSV);
    setSearchQuery('');
    setSortCol(null);
    setPage(0);
  };

  const handleReset = () => {
    safeRemoveStorage(STORAGE_KEY);
    setCsvText('');
    setSearchQuery('');
    setSortCol(null);
    setPage(0);
    setErrorMsg(null);
    setShareMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section
      aria-labelledby="csv-tool-heading"
      className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-5 sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
        <div>
          <h1
            id="csv-tool-heading"
            className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]"
          >
            CSV to JSON &amp; Clean Table Viewer
          </h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Open or paste any CSV file to search and sort a clean table or export JSON in 1 click.
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

      {/* Upload & Paste Bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          id="csv-file-upload"
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="csv-file-upload"
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857]"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          <span>Choose CSV File</span>
        </label>

        <button
          type="button"
          onClick={() => setShowRawInput((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-base font-medium text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <span>{showRawInput ? 'Hide CSV Text' : 'Paste CSV Text'}</span>
        </button>

        {parsed.headers.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-base font-semibold text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span>Copy JSON</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-base font-semibold text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download JSON</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              aria-label="Clear CSV data"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {errorMsg && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {errorMsg}
        </p>
      )}

      {showRawInput && (
        <div className="mt-4">
          <label
            htmlFor="csv-raw-textarea"
            className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
          >
            Raw CSV Content (max {MAX_FILE_SIZE_LABEL} for file uploads)
          </label>
          <textarea
            id="csv-raw-textarea"
            rows={6}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setPage(0);
            }}
            placeholder="Name,Email,Plan&#10;Alex,alex@example.com,Pro"
            className="w-full rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 p-3.5 font-mono text-sm text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
          />
        </div>
      )}

      {/* Search & Clean Table */}
      {parsed.headers.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search table rows"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search any column..."
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">
              {filteredAndSortedRows.length} rows · {parsed.headers.length} columns
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-slate-800">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800">
                <tr>
                  {parsed.headers.map((header, idx) => (
                    <th key={`${header}-${idx}`} className="p-0">
                      <button
                        type="button"
                        onClick={() => handleSort(idx)}
                        className="flex w-full min-h-[44px] items-center justify-between gap-2 px-4 py-2.5 font-semibold text-[#0F172A] dark:text-slate-100 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span>{header}</span>
                        <ArrowUpDown
                          className={`h-3.5 w-3.5 shrink-0 ${
                            sortCol === idx ? 'text-[#059669]' : 'text-slate-400'
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={parsed.headers.length}
                      className="px-4 py-8 text-center text-base text-slate-500 dark:text-slate-400"
                    >
                      No matching rows found.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-slate-900/50 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-4 py-3 text-base text-[#0F172A] dark:text-slate-200 tabular-nums whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 px-4 py-2 text-sm font-medium text-[#0F172A] dark:text-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 px-4 py-2 text-sm font-medium text-[#0F172A] dark:text-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-900/50 p-10 text-center">
          <p className="text-base font-medium text-[#0F172A] dark:text-slate-200">
            No CSV loaded yet
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choose a file (up to {MAX_FILE_SIZE_LABEL}), paste CSV text, or click Try Sample above.
          </p>
        </div>
      )}

      <ViralShareBar actionMessage={shareMessage} />
    </section>
  );
};
