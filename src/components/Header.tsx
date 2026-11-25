import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const APPS_LIST = [
  { name: 'Spark Office', href: '#', current: false },
  { name: 'Spark PDF', href: '#', current: false },
  { name: 'Spark Image', href: '#', current: false },
  { name: 'Spark Studio', href: '#', current: true },
];

export const Header: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [appsOpen, setAppsOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAppsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAppsOpen(false);
        setShowInstallGuide(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === 'unavailable') {
        setShowInstallGuide(true);
      }
      return;
    }
    setShowInstallGuide(true);
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E2E8F0] dark:border-slate-800 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Header Left: Brand Mark + Bold Wordmark */}
          <a
            href="#"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] rounded-lg"
          >
            <span
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#059669] text-white shadow-xs shrink-0"
              aria-hidden="true"
            >
              <span className="text-sm font-bold tracking-tight">SU</span>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
              Spark Studio
            </span>
          </a>

          {/* Header Right: Apps Pill Dropdown + Install App */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setAppsOpen((prev) => !prev)}
                aria-expanded={appsOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-[#0F172A] dark:text-slate-100 whitespace-nowrap shrink-0 transition hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
              >
                <span>Apps</span>
                <span aria-hidden="true" className="text-xs leading-none">
                  ▾
                </span>
              </button>

              {appsOpen && (
                <div
                  role="menu"
                  aria-label="Spark Suite Apps"
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-[#111827] p-1.5 shadow-lg z-50"
                >
                  {APPS_LIST.map((app) => (
                    <a
                      key={app.name}
                      href={app.href}
                      role="menuitem"
                      onClick={() => setAppsOpen(false)}
                      className={`flex min-h-[44px] items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                        app.current
                          ? 'bg-[#059669]/10 text-[#059669] dark:text-emerald-400'
                          : 'text-[#0F172A] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{app.name}</span>
                      {app.current && <Check className="h-4 w-4" aria-hidden="true" />}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition hover:bg-[#047857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* iOS Safari / Browser 2-Line Install Guide Modal */}
      {showInstallGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="install-guide-title"
                className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]"
              >
                Install Spark Studio
              </h2>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                aria-label="Close install guide"
                className="inline-flex min-h-[44px] min-w-[44px] -mr-2 -mt-2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-base text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-[#0F172A] dark:text-white">1.</span>
                    <span>
                      Tap the <Share className="inline h-4 w-4 mx-0.5 text-[#059669]" aria-hidden="true" />{' '}
                      <strong>Share</strong> button in Safari&apos;s toolbar.
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-[#0F172A] dark:text-white">2.</span>
                    <span>
                      Tap <strong>Add to Home Screen</strong> to use offline.
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <span className="font-semibold text-[#0F172A] dark:text-white">1.</span> Open your
                    browser menu (or tap Share on iOS Safari).
                  </p>
                  <p>
                    <span className="font-semibold text-[#0F172A] dark:text-white">2.</span> Select{' '}
                    <strong>Install App</strong> or <strong>Add to Home Screen</strong> for offline use.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#059669] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857]"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
