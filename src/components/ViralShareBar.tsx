import React, { useState } from 'react';
import { Check, Mail, Share2 } from 'lucide-react';

interface ViralShareBarProps {
  actionMessage: string | null;
}

export const ViralShareBar: React.FC<ViralShareBarProps> = ({ actionMessage }) => {
  const [showFallbackLinks, setShowFallbackLinks] = useState(false);

  if (!actionMessage) return null;

  const shareTitle = 'Spark Studio — Private Offline Utility Tools';
  const shareText =
    'I just used Spark Studio for QR codes, PDF invoices, CSV tables & more — 100% private and works offline.';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or Web Share blocked inside iframe; reveal direct links
      }
    }
    setShowFallbackLinks((prev) => !prev);
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(
    `${shareText}\n\n${shareUrl}`
  )}`;

  return (
    <div className="mt-5 rounded-xl border border-[#059669]/25 bg-[#059669]/5 dark:bg-[#059669]/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-base font-medium text-[#0F172A] dark:text-[#F8FAFC]">
          <Check className="h-5 w-5 text-[#059669] shrink-0" aria-hidden="true" />
          <span>{actionMessage}</span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#059669]/30 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-[#059669] dark:text-emerald-400 whitespace-nowrap shrink-0 transition hover:bg-emerald-50 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <span>Share via WhatsApp / Email</span>
        </button>
      </div>

      {showFallbackLinks && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#059669]/15 pt-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#059669] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#047857]"
          >
            <span>Open WhatsApp</span>
          </a>
          <a
            href={emailHref}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span>Open Email App</span>
          </a>
        </div>
      )}

      <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">
        Need a pro email signature or quotation?{' '}
        <a
          href="#"
          className="font-semibold text-[#059669] dark:text-emerald-400 underline underline-offset-2 hover:text-[#047857]"
        >
          Try Spark Office
        </a>
      </p>
    </div>
  );
};
