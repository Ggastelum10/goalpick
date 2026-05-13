import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Share, Smartphone, Monitor, CheckCircle2, ArrowRight, Check, Copy } from 'lucide-react';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';
import { Link } from 'react-router-dom';

const INSTALL_URL = 'https://cup-corner-clash.lovable.app/install';

export default function Install() {
  const { t } = useTranslation();
  const { isInstalled, isIOS, canPrompt, promptInstall } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Install GOALPICK',
          text: 'Get the GOALPICK app for football predictions!',
          url: INSTALL_URL,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(INSTALL_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">Already Installed!</h1>
            <p className="text-muted-foreground">GOALPICK is already installed on this device.</p>
            <Link to="/dashboard">
              <Button className="mt-4">
                Open App <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16 px-4 text-center">
        <img src={goalpickLogo} alt="GOALPICK" className="h-20 w-auto mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Install GOALPICK
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-lg">
          Get the full app experience — faster loading, offline access, and home screen shortcuts.
        </p>

        {canPrompt && (
          <Button size="lg" className="mt-8 text-lg px-8" onClick={promptInstall}>
            <Download className="mr-2 h-5 w-5" /> Install Now
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className={`${canPrompt ? 'mt-3' : 'mt-8'} text-lg px-8`}
          onClick={handleShare}
        >
          {copied ? (
            <><Check className="mr-2 h-5 w-5" /> Link Copied!</>
          ) : (
            <><Share className="mr-2 h-5 w-5" /> Share Install Link</>
          )}
        </Button>
      </div>

      {/* Instructions */}
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* iOS Instructions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2.5">
                <Smartphone className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">iPhone / iPad (Safari)</h2>
            </div>
            <ol className="space-y-3 text-muted-foreground ml-1">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">1</span>
                <span>Open this page in <strong className="text-foreground">Safari</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">2</span>
                <span>Tap the <Share className="inline h-4 w-4 text-foreground mx-0.5" /> <strong className="text-foreground">Share</strong> button</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">3</span>
                <span>Scroll down and tap <strong className="text-foreground">"Add to Home Screen"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">4</span>
                <span>Tap <strong className="text-foreground">"Add"</strong> to confirm</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Android / Chrome Instructions */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2.5">
                <Smartphone className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Android (Chrome)</h2>
            </div>
            <ol className="space-y-3 text-muted-foreground ml-1">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">1</span>
                <span>Open this page in <strong className="text-foreground">Chrome</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">2</span>
                <span>Tap the <strong className="text-foreground">⋮ menu</strong> (top right)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">3</span>
                <span>Tap <strong className="text-foreground">"Install app"</strong> or <strong className="text-foreground">"Add to Home screen"</strong></span>
              </li>
            </ol>
            {canPrompt && (
              <Button className="w-full mt-2" onClick={promptInstall}>
                <Download className="mr-2 h-4 w-4" /> Install Directly
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Desktop */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2.5">
                <Monitor className="h-5 w-5 text-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Desktop (Chrome / Edge)</h2>
            </div>
            <ol className="space-y-3 text-muted-foreground ml-1">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">1</span>
                <span>Look for the <Download className="inline h-4 w-4 text-foreground mx-0.5" /> <strong className="text-foreground">install icon</strong> in the address bar</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">2</span>
                <span>Click <strong className="text-foreground">"Install"</strong> to add GOALPICK to your desktop</span>
              </li>
            </ol>
            {canPrompt && (
              <Button className="w-full mt-2" onClick={promptInstall}>
                <Download className="mr-2 h-4 w-4" /> Install Directly
              </Button>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center pt-4 pb-8">
          <p className="text-muted-foreground mb-4">Already have an account?</p>
          <Link to="/auth">
            <Button variant="outline">Sign In <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
