import React, { useState } from 'react';
import { X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showLegalModal, setShowLegalModal] = useState(false);

  return (
    <>
      <footer className="mt-auto border-t border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0B1120]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:px-6 sm:text-left">
          <p>100% Private • Works Offline (Test in Airplane Mode) • Powered by Spark Lab</p>
          <div className="flex items-center gap-5 shrink-0">
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              className="min-h-[44px] inline-flex items-center font-medium text-[#0F172A] dark:text-slate-200 underline underline-offset-4 hover:text-[#059669] dark:hover:text-emerald-400"
            >
              Privacy &amp; Terms
            </button>
            <a
              href="mailto:support@sparklab.app?subject=Spark%20Studio%20Issue%20Report"
              className="min-h-[44px] inline-flex items-center font-medium text-[#0F172A] dark:text-slate-200 underline underline-offset-4 hover:text-[#059669] dark:hover:text-emerald-400"
            >
              Report Issue
            </a>
          </div>
        </div>
      </footer>

      {showLegalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="legal-modal-title"
                className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]"
              >
                Privacy Policy &amp; Terms of Use
              </h2>
              <button
                type="button"
                onClick={() => setShowLegalModal(false)}
                aria-label="Close Privacy and Terms modal"
                className="inline-flex min-h-[44px] min-w-[44px] -mr-2 -mt-2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-[#0F172A] dark:text-white">
                  1. Zero Data Collection
                </h3>
                <p className="mt-1">
                  Spark Studio runs 100% client-side inside your browser. Your files, QR codes,
                  invoices, CSV spreadsheets, and passwords never leave your device. We collect zero
                  personal data, zero analytics, and enforce strict network isolation. Preferences
                  and templates are stored solely in your browser&apos;s LocalStorage.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#0F172A] dark:text-white">
                  2. Provided &ldquo;AS-IS&rdquo;
                </h3>
                <p className="mt-1">
                  Spark Studio is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;
                  basis without warranties of any kind, express or implied, including fitness for a
                  particular purpose, accuracy of calculations, or uninterrupted availability.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#0F172A] dark:text-white">
                  3. $0 Liability Cap
                </h3>
                <p className="mt-1">
                  To the maximum extent permitted by applicable law, Spark Lab and its contributors
                  shall have zero liability ($0 USD maximum aggregate liability) for any direct,
                  indirect, incidental, or consequential damages arising from your use of Spark
                  Studio.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLegalModal(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-[#059669] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
