import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3 text-center text-sm flex items-center justify-center gap-3 shadow-lg">
      <span>A new version is available</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs"
        onClick={() => updateServiceWorker(true)}
      >
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Update
      </Button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-primary-foreground/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
