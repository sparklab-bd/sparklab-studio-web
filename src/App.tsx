import { useEffect, useState } from 'react';
import { ArrowLeftRight, FileSpreadsheet, FileText, KeyRound, QrCode } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CsvViewerTool } from './components/tools/CsvViewerTool';
import { InvoiceMakerTool } from './components/tools/InvoiceMakerTool';
import { PasswordGeneratorTool } from './components/tools/PasswordGeneratorTool';
import { QrGeneratorTool } from './components/tools/QrGeneratorTool';
import { UnitConverterTool } from './components/tools/UnitConverterTool';
import type { ToolId } from './lib/constants';
import { safeLoadStorage, safeSaveStorage } from './lib/storage';

const ENABLE_PRO_LOCK = false;

const ACTIVE_TOOL_KEY = 'spark_studio_active_tool_v1';

const TOOLS: Array<{
  id: ToolId;
  label: string;
  storageKey: string;
  icon: typeof QrCode;
}> = [
  { id: 'qr', label: 'QR Code', storageKey: 'spark_studio_qr_v1', icon: QrCode },
  { id: 'invoice', label: 'PDF Invoice', storageKey: 'spark_studio_invoice_v1', icon: FileText },
  { id: 'csv', label: 'CSV Viewer', storageKey: 'spark_studio_csv_v1', icon: FileSpreadsheet },
  { id: 'password', label: 'Password & PIN', storageKey: 'spark_studio_pass_prefs_v1', icon: KeyRound },
  { id: 'converter', label: 'Unit Converter', storageKey: 'spark_studio_converter_v1', icon: ArrowLeftRight },
];

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(() => {
    const saved = safeLoadStorage<ToolId>(ACTIVE_TOOL_KEY, 'qr');
    return TOOLS.some((t) => t.id === saved) ? saved : 'qr';
  });
  const [resetEpoch, setResetEpoch] = useState(0);

  useEffect(() => {
    safeSaveStorage(ACTIVE_TOOL_KEY, activeTool);
  }, [activeTool]);

  const currentToolMeta = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];

  const handleBoundaryReset = () => {
    setResetEpoch((e) => e + 1);
  };

  return (
    <div
      data-pro-lock={ENABLE_PRO_LOCK ? 'locked' : 'free'}
      className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B1120] dark:text-[#F8FAFC]"
    >
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {/* Clean 5-Tool Switcher */}
        <nav
          aria-label="Utility tools"
          className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#111827] p-2"
        >
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm sm:text-base font-semibold whitespace-nowrap shrink-0 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669] ${
                  isActive
                    ? 'bg-[#059669] text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Tool Card with Auto-Reset Error Recovery */}
        <ErrorBoundary
          key={`${activeTool}-${resetEpoch}`}
          storageKey={currentToolMeta.storageKey}
          onReset={handleBoundaryReset}
        >
          {activeTool === 'qr' && <QrGeneratorTool />}
          {activeTool === 'invoice' && <InvoiceMakerTool />}
          {activeTool === 'csv' && <CsvViewerTool />}
          {activeTool === 'password' && <PasswordGeneratorTool />}
          {activeTool === 'converter' && <UnitConverterTool />}
        </ErrorBoundary>
      </main>

      <Footer />
      <OfflineIndicator />
    </div>
  );
}
