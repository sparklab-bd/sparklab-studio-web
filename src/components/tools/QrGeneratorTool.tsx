import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Download, ImagePlus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL } from '../../lib/constants';
import { safeLoadStorage, safeRemoveStorage, safeSaveStorage } from '../../lib/storage';
import { ViralShareBar } from '../ViralShareBar';

type QrMode = 'url' | 'wifi' | 'vcard';
type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

interface QrState {
  mode: QrMode;
  urlText: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiSecurity: WifiSecurity;
  wifiHidden: boolean;
  vcardName: string;
  vcardPhone: string;
  vcardEmail: string;
  vcardOrg: string;
  colorDark: string;
  colorLight: string;
  size: number;
  logoDataUrl: string | null;
}

const STORAGE_KEY = 'spark_studio_qr_v1';

const DEFAULT_STATE: QrState = {
  mode: 'url',
  urlText: 'https://sparkstudio.app',
  wifiSsid: '',
  wifiPassword: '',
  wifiSecurity: 'WPA',
  wifiHidden: false,
  vcardName: '',
  vcardPhone: '',
  vcardEmail: '',
  vcardOrg: '',
  colorDark: '#0F172A',
  colorLight: '#FFFFFF',
  size: 1024,
  logoDataUrl: null,
};

const SAMPLE_LOGO_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="#059669"/><circle cx="94" cy="26" r="7" fill="#FFFFFF"/><text x="58" y="75" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="48" fill="#FFFFFF">SU</text></svg>'
  );

function escapeWifiValue(val: string): string {
  return val.replace(/([\\;,:"])/g, '\\$1');
}

function buildPayload(state: QrState): string {
  if (state.mode === 'wifi') {
    const ssid = escapeWifiValue(state.wifiSsid.trim() || 'GuestWiFi');
    const pass = escapeWifiValue(state.wifiPassword);
    const hiddenStr = state.wifiHidden ? 'H:true;' : '';
    if (state.wifiSecurity === 'nopass') {
      return `WIFI:T:nopass;S:${ssid};${hiddenStr};`;
    }
    return `WIFI:T:${state.wifiSecurity};S:${ssid};P:${pass};${hiddenStr};`;
  }

  if (state.mode === 'vcard') {
    const name = state.vcardName.trim() || 'Alex Rivera';
    const parts = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      state.vcardOrg.trim() ? `ORG:${state.vcardOrg.trim()}` : '',
      state.vcardPhone.trim() ? `TEL:${state.vcardPhone.trim()}` : '',
      state.vcardEmail.trim() ? `EMAIL:${state.vcardEmail.trim()}` : '',
      'END:VCARD',
    ].filter(Boolean);
    return parts.join('\n');
  }

  return state.urlText.trim() || 'https://sparkstudio.app';
}

export const QrGeneratorTool: React.FC = () => {
  const [state, setState] = useState<QrState>(() => safeLoadStorage(STORAGE_KEY, DEFAULT_STATE));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [libReady, setLibReady] = useState<boolean>(() => typeof window.QRCode !== 'undefined');

  const scratchRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const toPersist = { ...state };
    if (toPersist.logoDataUrl && toPersist.logoDataUrl.length > 400_000) {
      toPersist.logoDataUrl = null;
    }
    safeSaveStorage(STORAGE_KEY, toPersist);
  }, [state]);

  useEffect(() => {
    if (libReady) return;
    const timer = window.setInterval(() => {
      if (typeof window.QRCode !== 'undefined') {
        setLibReady(true);
        window.clearInterval(timer);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [libReady]);

  const renderQrCanvas = useCallback(() => {
    if (!libReady || !window.QRCode || !scratchRef.current || !canvasRef.current) return;

    const scratch = scratchRef.current;
    while (scratch.firstChild) {
      scratch.removeChild(scratch.firstChild);
    }

    const payload = buildPayload(state);
    const targetSize = state.size;

    try {
      new window.QRCode(scratch, {
        text: payload,
        width: targetSize,
        height: targetSize,
        colorDark: state.colorDark,
        colorLight: state.colorLight,
        correctLevel: window.QRCode.CorrectLevel.H,
      });

      const generatedCanvas = scratch.querySelector('canvas');
      const outputCanvas = canvasRef.current;
      outputCanvas.width = targetSize;
      outputCanvas.height = targetSize;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = state.colorLight;
      ctx.fillRect(0, 0, targetSize, targetSize);

      const drawLogoOverlay = () => {
        if (!state.logoDataUrl) return;
        const img = new Image();
        img.onload = () => {
          const padSize = Math.round(targetSize * 0.24);
          const padX = Math.round((targetSize - padSize) / 2);
          const padY = Math.round((targetSize - padSize) / 2);
          const radius = Math.round(padSize * 0.18);

          ctx.save();
          ctx.fillStyle = state.colorLight;
          ctx.beginPath();
          ctx.roundRect(padX, padY, padSize, padSize, radius);
          ctx.fill();

          const innerMargin = Math.round(padSize * 0.12);
          const logoSize = padSize - innerMargin * 2;
          ctx.drawImage(img, padX + innerMargin, padY + innerMargin, logoSize, logoSize);
          ctx.restore();
        };
        img.src = state.logoDataUrl;
      };

      if (generatedCanvas) {
        ctx.drawImage(generatedCanvas, 0, 0, targetSize, targetSize);
        drawLogoOverlay();
      } else {
        const generatedImg = scratch.querySelector('img');
        if (generatedImg) {
          generatedImg.onload = () => {
            ctx.drawImage(generatedImg, 0, 0, targetSize, targetSize);
            drawLogoOverlay();
          };
        }
      }
      setErrorMsg(null);
    } catch {
      setErrorMsg('Text is too long for a QR code. Try shortening it.');
    }
  }, [libReady, state]);

  useEffect(() => {
    renderQrCanvas();
  }, [renderQrCanvas]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File exceeds the ${MAX_FILE_SIZE_LABEL} safety limit.`);
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid PNG, JPG, SVG, or WebP image.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setState((prev) => ({ ...prev, logoDataUrl: reader.result as string }));
      }
    };
    reader.onerror = () => setErrorMsg('Could not read the selected image file.');
    reader.readAsDataURL(file);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `spark-qr-${state.mode}.png`;
    link.href = dataUrl;
    link.click();
    setShareMessage('High-res QR code downloaded as PNG.');
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setShareMessage('QR code image copied to clipboard.');
          return;
        }
      } catch {
        // Fallback below
      }
    }
    handleDownloadPng();
  };

  const handleTrySample = () => {
    setErrorMsg(null);
    setShareMessage(null);
    setState({
      ...DEFAULT_STATE,
      mode: 'wifi',
      wifiSsid: 'SparkCafe_Guest',
      wifiPassword: 'FreshEspresso2026',
      wifiSecurity: 'WPA',
      colorDark: '#0F172A',
      colorLight: '#FFFFFF',
      size: 1024,
      logoDataUrl: SAMPLE_LOGO_DATA_URL,
    });
  };

  const handleReset = () => {
    safeRemoveStorage(STORAGE_KEY);
    setState(DEFAULT_STATE);
    setErrorMsg(null);
    setShareMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section
      aria-labelledby="qr-tool-heading"
      className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-5 sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] dark:border-slate-800 pb-5">
        <div>
          <h1
            id="qr-tool-heading"
            className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC]"
          >
            Custom Logo QR Code Generator
          </h1>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Create crisp QR codes for links, Wi-Fi, or contacts with custom colors and a center logo.
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

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-5 lg:col-span-7">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 p-1.5">
            {(
              [
                { id: 'url', label: 'URL / Text' },
                { id: 'wifi', label: 'Wi-Fi' },
                { id: 'vcard', label: 'Contact' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setState((prev) => ({ ...prev, mode: tab.id }))}
                className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  state.mode === tab.id
                    ? 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mode Inputs */}
          {state.mode === 'url' && (
            <div>
              <label
                htmlFor="qr-url-input"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                Website URL or Text
              </label>
              <input
                id="qr-url-input"
                type="text"
                value={state.urlText}
                onChange={(e) => setState((prev) => ({ ...prev, urlText: e.target.value }))}
                placeholder="https://example.com"
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              />
            </div>
          )}

          {state.mode === 'wifi' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="wifi-ssid"
                  className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Network Name (SSID)
                </label>
                <input
                  id="wifi-ssid"
                  type="text"
                  value={state.wifiSsid}
                  onChange={(e) => setState((prev) => ({ ...prev, wifiSsid: e.target.value }))}
                  placeholder="GuestWiFi"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="wifi-security"
                  className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Security Type
                </label>
                <select
                  id="wifi-security"
                  value={state.wifiSecurity}
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, wifiSecurity: e.target.value as WifiSecurity }))
                  }
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                >
                  <option value="WPA">WPA / WPA2 / WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">No Password</option>
                </select>
              </div>

              {state.wifiSecurity !== 'nopass' && (
                <div className="sm:col-span-2">
                  <label
                    htmlFor="wifi-pass"
                    className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                  >
                    Wi-Fi Password
                  </label>
                  <input
                    id="wifi-pass"
                    type="text"
                    value={state.wifiPassword}
                    onChange={(e) => setState((prev) => ({ ...prev, wifiPassword: e.target.value }))}
                    placeholder="Enter network password"
                    className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {state.mode === 'vcard' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="vcard-name"
                  className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="vcard-name"
                  type="text"
                  value={state.vcardName}
                  onChange={(e) => setState((prev) => ({ ...prev, vcardName: e.target.value }))}
                  placeholder="Alex Rivera"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="vcard-org"
                  className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Business / Company
                </label>
                <input
                  id="vcard-org"
                  type="text"
                  value={state.vcardOrg}
                  onChange={(e) => setState((prev) => ({ ...prev, vcardOrg: e.target.value }))}
                  placeholder="Rivera Bakery"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="vcard-phone"
                  className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Phone Number
                </label>
                <input
                  id="vcard-phone"
                  type="tel"
                  value={state.vcardPhone}
                  onChange={(e) => setState((prev) => ({ ...prev, vcardPhone: e.target.value }))}
                  placeholder="+1 555 234 5678"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="vcard-email"
                  className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="vcard-email"
                  type="email"
                  value={state.vcardEmail}
                  onChange={(e) => setState((prev) => ({ ...prev, vcardEmail: e.target.value }))}
                  placeholder="hello@company.com"
                  className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Colors, Size & Center Logo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            <div>
              <label
                htmlFor="qr-fg-color"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                QR Color
              </label>
              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5">
                <input
                  id="qr-fg-color"
                  type="color"
                  value={state.colorDark}
                  onChange={(e) => setState((prev) => ({ ...prev, colorDark: e.target.value }))}
                  className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  {state.colorDark.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="qr-bg-color"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                Background
              </label>
              <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5">
                <input
                  id="qr-bg-color"
                  type="color"
                  value={state.colorLight}
                  onChange={(e) => setState((prev) => ({ ...prev, colorLight: e.target.value }))}
                  className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  {state.colorLight.toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="qr-size"
                className="block text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-1.5"
              >
                Resolution
              </label>
              <select
                id="qr-size"
                value={state.size}
                onChange={(e) => setState((prev) => ({ ...prev, size: Number(e.target.value) }))}
                className="w-full min-h-[44px] rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base text-[#0F172A] dark:text-white focus:border-[#059669] focus:outline-none"
              >
                <option value={512}>512 × 512 px</option>
                <option value={1024}>1024 × 1024 px</option>
                <option value={2048}>2048 × 2048 px</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="qr-logo-upload"
            />
            <label
              htmlFor="qr-logo-upload"
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ImagePlus className="h-4 w-4 text-[#059669]" aria-hidden="true" />
              <span>{state.logoDataUrl ? 'Change Center Logo' : 'Add Center Logo (Optional)'}</span>
            </label>

            {state.logoDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setState((prev) => ({ ...prev, logoDataUrl: null }));
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Remove Logo</span>
              </button>
            )}
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Preview & Actions Column */}
        <div className="flex flex-col items-center justify-between rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 p-6 lg:col-span-5">
          <div className="flex flex-col items-center justify-center w-full">
            <div ref={scratchRef} className="hidden" aria-hidden="true" />
            <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-700 bg-white p-4 shadow-xs">
              {!libReady ? (
                <div className="flex h-56 w-56 items-center justify-center text-sm text-slate-500">
                  Loading QR engine...
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  aria-label="Generated QR Code Preview"
                  className="h-56 w-56 sm:h-64 sm:w-64 object-contain"
                />
              )}
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              Export size: {state.size} × {state.size} px · High Error Correction
            </p>
          </div>

          <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!libReady}
              className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#059669] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#047857] disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={!libReady}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-base font-semibold text-[#0F172A] dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              <span>Copy</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset QR generator"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
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
