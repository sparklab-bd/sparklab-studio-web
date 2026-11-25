import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/90 px-3.5 py-2 text-sm font-medium text-amber-900 dark:text-amber-100 shadow-md"
    >
      <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
      <span>Offline Mode — All tools work locally</span>
    </div>
  );
};
