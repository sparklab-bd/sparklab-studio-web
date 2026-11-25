import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { safeLoadStorage, safeRemoveStorage, safeSaveStorage } from '../../lib/storage';
import { ViralShareBar } from '../ViralShareBar';

interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  price: number;
}

interface InvoiceState {
  businessName: string;
  businessContact: string;
  clientName: string;
  clientContact: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  discount: number;
  notes: string;
  items: InvoiceItem[];
}

const STORAGE_KEY = 'spark_studio_invoice_v1';

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_INVOICE: InvoiceState = {
  businessName: 'Your Business Name',
  businessContact: 'hello@yourbusiness.com',
  clientName: 'Client Name',
  clientContact: 'client@company.com',
  invoiceNumber: 'INV-1001',
  issueDate: todayISO(0),
  dueDate: todayISO(14),
  currency: '$',
  taxRate: 0,
  discount: 0,
  notes: 'Thank you for your business! Payment due within 14 days.',
  items: [{ id: 'item-1', description: 'Consulting & Setup', qty: 1, price: 250 }],
};

const SAMPLE_INVOICE: InvoiceState = {
  businessName: 'Northside Design Studio',
  businessContact: 'billing@northsidedesign.co · Austin, TX',
  clientName: 'Greenleaf Coffee Roasters',
  clientContact: 'accounts@greenleafcoffee.com · Portland, OR',
  invoiceNumber: 'INV-2026-042',
  issueDate: todayISO(0),
  dueDate: todayISO(14),
  currency: '$',
  taxRate: 8.25,
  discount: 50,
  notes: 'Please pay via bank transfer or card within 14 days. Questions? Reply to billing@northsidedesign.co.',
  items: [
    { id: 's-1', description: 'Menu & Packaging Layout Refresh', qty: 1, price: 650 },
    { id: 's-2', description: 'Table QR Ordering Cards (Print-Ready)', qty: 12, price: 18 },
    { id: 's-3', description: 'On-Site Photography Session (Half Day)', qty: 1, price: 320 },
  ],
};

function formatMoney(currency: string, amount: number): string {
  return `${currency}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const InvoiceMakerTool: React.FC = () => {
  const [invoice, setInvoice] = useState<InvoiceState>(() =>
    safeLoadStorage(STORAGE_KEY, DEFAULT_INVOICE)
  );
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const pdfSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    safeSaveStorage(STORAGE_KEY, invoice);
  }, [invoice]);

  const totals = useMemo(() => {
    const subtotal = invoice.items.reduce(
      (sum, item) => sum + Math.max(0, item.qty) * Math.max(0, item.price),
      0
    );
    const discountAmt = Math.min(subtotal, Math.max(0, invoice.discount || 0));
    const taxable = Math.max(0, subtotal - discountAmt);
    const taxAmt = taxable * (Math.max(0, invoice.taxRate || 0) / 100);
    const grandTotal = taxable + taxAmt;
    return { subtotal, discountAmt, taxAmt, grandTotal };
  }, [invoice.items, invoice.discount, invoice.taxRate]);

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: `item-${Date.now()}`, description: '', qty: 1, price: 0 },
      ],
    }));
  };

  const removeItem = (id: string) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((i) => i.id !== id) : prev.items,
    }));
  };

  const handleDownloadPdf = async () => {
    setErrorMsg(null);
    const element = pdfSheetRef.current;
    if (!element) return;

    if (typeof window.html2pdf !== 'function') {
      setErrorMsg('PDF library is still loading or unavailable offline. Please try again in a moment.');
      return;
    }

    setDownloading(true);
    try {
      const safeName = (invoice.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '-');
      await window
        .html2pdf()
        .set({
          margin: 10,
          filename: `${safeName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
      setShareMessage(`Invoice ${invoice.invoiceNumber || 'PDF'} downloaded.`);
    } catch {
      setErrorMsg('Could not generate PDF. Please check your entries and try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleTrySample = () => {
    setErrorMsg(null);
    setShareMessage(null);
    setInvoice(SAMPLE_INVOICE);
  };

  const handleReset = () => {
    safeRemoveStorage(STORAGE_KEY);
    setInvoice(DEFAULT_INVOICE);
    setErrorMsg(null);
    setShareMessage(null);
  };

  return (
    <section
      aria-labelledby="invoice-tool-heading"
      className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-5 sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
        <div>
          <h1
            id="invoice-tool-heading"
            className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]"
          >
            Instant PDF Invoice Maker
          </h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Fill in your details and line items for automatic tax math and 1-click PDF download.
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

      <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Form Editor */}
        <div className="space-y-5 xl:col-span-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inv-biz-name"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Your Business Name
              </label>
              <input
                id="inv-biz-name"
                type="text"
                value={invoice.businessName}
                onChange={(e) => setInvoice((p) => ({ ...p, businessName: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="inv-biz-contact"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Your Email / Address
              </label>
              <input
                id="inv-biz-contact"
                type="text"
                value={invoice.businessContact}
                onChange={(e) => setInvoice((p) => ({ ...p, businessContact: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="inv-client-name"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Bill To (Client Name)
              </label>
              <input
                id="inv-client-name"
                type="text"
                value={invoice.clientName}
                onChange={(e) => setInvoice((p) => ({ ...p, clientName: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="inv-client-contact"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Client Email / Address
              </label>
              <input
                id="inv-client-contact"
                type="text"
                value={invoice.clientContact}
                onChange={(e) => setInvoice((p) => ({ ...p, clientContact: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label
                htmlFor="inv-number"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Invoice #
              </label>
              <input
                id="inv-number"
                type="text"
                value={invoice.invoiceNumber}
                onChange={(e) => setInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="inv-currency"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Currency
              </label>
              <select
                id="inv-currency"
                value={invoice.currency}
                onChange={(e) => setInvoice((p) => ({ ...p, currency: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              >
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="£">£ GBP</option>
                <option value="৳">৳ BDT</option>
                <option value="₹">₹ INR</option>
                <option value="¥">¥ JPY</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="inv-issue-date"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Issue Date
              </label>
              <input
                id="inv-issue-date"
                type="date"
                value={invoice.issueDate}
                onChange={(e) => setInvoice((p) => ({ ...p, issueDate: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="inv-due-date"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Due Date
              </label>
              <input
                id="inv-due-date"
                type="date"
                value={invoice.dueDate}
                onChange={(e) => setInvoice((p) => ({ ...p, dueDate: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-200">
                Line Items
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-sm font-semibold text-[#059669] dark:text-emerald-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Item</span>
              </button>
            </div>

            {invoice.items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  aria-label={`Item ${idx + 1} description`}
                  placeholder="Service or item description"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  className="col-span-12 sm:col-span-6 min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  aria-label={`Item ${idx + 1} quantity`}
                  placeholder="Qty"
                  value={item.qty}
                  onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                  className="col-span-4 sm:col-span-2 min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  step="any"
                  aria-label={`Item ${idx + 1} price`}
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                  className="col-span-6 sm:col-span-3 min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={invoice.items.length === 1}
                  aria-label={`Remove item ${idx + 1}`}
                  className="col-span-2 sm:col-span-1 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="inv-tax"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Tax Rate (%)
              </label>
              <input
                id="inv-tax"
                type="number"
                min={0}
                step="any"
                value={invoice.taxRate}
                onChange={(e) => setInvoice((p) => ({ ...p, taxRate: Number(e.target.value) }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="inv-discount"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
              >
                Discount ({invoice.currency})
              </label>
              <input
                id="inv-discount"
                type="number"
                min={0}
                step="any"
                value={invoice.discount}
                onChange={(e) => setInvoice((p) => ({ ...p, discount: Number(e.target.value) }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-base tabular-nums text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="inv-notes"
              className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1"
            >
              Notes / Payment Terms
            </label>
            <textarea
              id="inv-notes"
              rows={2}
              value={invoice.notes}
              onChange={(e) => setInvoice((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Live PDF Preview & Actions */}
        <div className="flex flex-col justify-between xl:col-span-6">
          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 p-4">
            <div ref={pdfSheetRef} className="invoice-pdf-sheet rounded-xl p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
                <div>
                  <div className="text-xl font-bold">{invoice.businessName || 'Business Name'}</div>
                  <div className="mt-1 text-sm invoice-pdf-muted">
                    {invoice.businessContact || 'Email or Address'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold invoice-pdf-accent">INVOICE</div>
                  <div className="mt-1 text-sm font-medium tabular-nums">
                    {invoice.invoiceNumber || 'INV-1001'}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold invoice-pdf-muted">Bill To</div>
                  <div className="mt-1 font-semibold">{invoice.clientName || 'Client Name'}</div>
                  <div className="invoice-pdf-muted">{invoice.clientContact}</div>
                </div>
                <div className="text-right tabular-nums">
                  <div>
                    <span className="invoice-pdf-muted">Issue Date: </span>
                    <span className="font-medium">{invoice.issueDate}</span>
                  </div>
                  <div className="mt-1">
                    <span className="invoice-pdf-muted">Due Date: </span>
                    <span className="font-medium">{invoice.dueDate}</span>
                  </div>
                </div>
              </div>

              <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                  <tr className="invoice-pdf-subtle-bg border-y">
                    <th className="py-2.5 px-2 text-left font-semibold">Description</th>
                    <th className="py-2.5 px-2 text-right font-semibold">Qty</th>
                    <th className="py-2.5 px-2 text-right font-semibold">Price</th>
                    <th className="py-2.5 px-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2.5 px-2">{item.description || 'Item'}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">{item.qty || 0}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums">
                        {formatMoney(invoice.currency, Math.max(0, item.price || 0))}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium tabular-nums">
                        {formatMoney(
                          invoice.currency,
                          Math.max(0, item.qty || 0) * Math.max(0, item.price || 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-5 ml-auto w-full max-w-xs space-y-1.5 text-sm tabular-nums">
                <div className="flex justify-between">
                  <span className="invoice-pdf-muted">Subtotal</span>
                  <span>{formatMoney(invoice.currency, totals.subtotal)}</span>
                </div>
                {totals.discountAmt > 0 && (
                  <div className="flex justify-between">
                    <span className="invoice-pdf-muted">Discount</span>
                    <span>-{formatMoney(invoice.currency, totals.discountAmt)}</span>
                  </div>
                )}
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="invoice-pdf-muted">Tax ({invoice.taxRate}%)</span>
                    <span>{formatMoney(invoice.currency, totals.taxAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total Due</span>
                  <span className="invoice-pdf-accent">
                    {formatMoney(invoice.currency, totals.grandTotal)}
                  </span>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6 border-t pt-4 text-xs invoice-pdf-muted">{invoice.notes}</div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857] disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{downloading ? 'Creating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset invoice form"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <ViralShareBar actionMessage={shareMessage} />
    </section>
  );
};
