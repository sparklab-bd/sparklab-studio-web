export const ENABLE_PRO_LOCK = false;

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB guard
export const MAX_FILE_SIZE_LABEL = '30 MB';

export type ToolId = 'qr' | 'invoice' | 'csv' | 'password' | 'converter';

export interface QRCodeInstance {
  clear: () => void;
  makeCode: (text: string) => void;
}

export interface QRCodeConstructor {
  new (
    el: HTMLElement,
    options: {
      text: string;
      width: number;
      height: number;
      colorDark: string;
      colorLight: string;
      correctLevel: number;
    }
  ): QRCodeInstance;
  CorrectLevel: {
    L: number;
    M: number;
    Q: number;
    H: number;
  };
}

export interface Html2PdfChain {
  set: (opt: Record<string, unknown>) => Html2PdfChain;
  from: (element: HTMLElement) => Html2PdfChain;
  save: (filename?: string) => Promise<void>;
}

declare global {
  interface Window {
    QRCode?: QRCodeConstructor;
    html2pdf?: () => Html2PdfChain;
  }
}
