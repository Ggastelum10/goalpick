import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Share, X } from 'lucide-react';

export function PWAInstallBanner() {
  const { t } = useTranslation();
  const { showBanner, isIOS, promptInstall, dismiss } = usePWAInstall();
  const isMobile = useIsMobile();

  if (!showBanner || !isMobile) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 md:bottom-4 md:left-auto md:right-4 md:w-96">
      <Card className="border-primary/20 shadow-lg bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{t('pwa.installTitle')}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {isIOS ? t('pwa.iosInstructions') : t('pwa.installDescription')}
              </p>
              {isIOS ? (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Share className="h-4 w-4" />
                  <span>{t('pwa.iosShareHint')}</span>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={promptInstall}>
                    {t('pwa.installButton')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismiss}>
                    {t('pwa.notNow')}
                  </Button>
                </div>
              )}
              {isIOS && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={dismiss}>
                    {t('pwa.notNow')}
                  </Button>
                </div>
              )}
            </div>
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
