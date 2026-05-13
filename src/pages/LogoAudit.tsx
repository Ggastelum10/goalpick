import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';

/**
 * Internal QA page: shows the GOALPICK logo as it appears in every key surface
 * (nav sidebar, dashboard header, auth screen, onboarding modal, reset password)
 * rendered side-by-side in light + dark mode so we can visually confirm the
 * new green-G mark renders cleanly across the app.
 *
 * Route: /logo-audit (no auth gate — this is a dev/QA utility).
 */

type Surface = {
  id: string;
  label: string;
  source: string;
  bgClass: string; // background that mimics the real surface
  render: () => JSX.Element;
};

const surfaces: Surface[] = [
  {
    id: 'nav-desktop',
    label: 'Sidebar (desktop nav)',
    source: 'src/components/Navigation.tsx · line 57',
    bgClass: 'bg-card',
    render: () => (
      <div className="flex items-center justify-center p-6">
        <div className="h-20 w-20 flex items-center justify-center relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/30 to-transparent rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <img
            src={goalpickLogo}
            alt="GOALPICK Logo"
            className="h-20 w-auto object-contain relative z-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_12px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_20px_rgba(34,197,94,0.35)]"
          />
        </div>
      </div>
    ),
  },
  {
    id: 'dashboard-header',
    label: 'Dashboard header (compact)',
    source: 'src/pages/Dashboard.tsx · line 141',
    bgClass: 'bg-background',
    render: () => (
      <div className="flex flex-row items-center gap-4 p-6">
        <div className="h-12 w-12 flex items-center justify-center group relative flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img
            src={goalpickLogo}
            alt="GOALPICK Logo"
            className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_20px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <h1 className="font-display text-3xl text-gradient-brand whitespace-nowrap">
          Welcome, Player
        </h1>
      </div>
    ),
  },
  {
    id: 'auth-hero',
    label: 'Auth screen (large hero)',
    source: 'src/pages/Auth.tsx · line 90',
    bgClass: 'bg-background',
    render: () => (
      <div className="flex justify-center p-6">
        <div className="h-44 w-44 flex items-center justify-center group relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img
            src={goalpickLogo}
            alt="GOALPICK Logo"
            className="h-44 w-auto object-contain drop-shadow-[0_0_20px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_30px_rgba(34,197,94,0.4)] group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    ),
  },
  {
    id: 'onboarding-modal',
    label: 'Onboarding modal (welcome step)',
    source: 'src/components/OnboardingModal.tsx · line 222',
    bgClass: 'bg-card',
    render: () => (
      <div className="flex justify-center p-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/30 to-primary/20 rounded-full blur-2xl" />
          <img
            src={goalpickLogo}
            alt="GOALPICK"
            className="h-24 w-auto relative z-10"
          />
        </div>
      </div>
    ),
  },
  {
    id: 'reset-password',
    label: 'Reset password card',
    source: 'src/pages/ResetPassword.tsx · lines 102/137/163',
    bgClass: 'bg-background',
    render: () => (
      <div className="flex justify-center p-6">
        <img
          src={goalpickLogo}
          alt="GOALPICK Logo"
          className="h-20 w-auto object-contain"
        />
      </div>
    ),
  },
  {
    id: 'setup-screen',
    label: 'Setup / legal-acceptance modal',
    source: 'src/components/SetupScreen.tsx · line 52',
    bgClass: 'bg-card',
    render: () => (
      <div className="flex justify-center p-6">
        <img src={goalpickLogo} alt="GoalPick" className="h-10 w-auto" />
      </div>
    ),
  },
];

/**
 * Renders a surface inside an isolated theme scope (light or dark).
 * We force the theme by adding/removing the `dark` class on a wrapper div
 * — Tailwind reads dark variants from the nearest ancestor with class `dark`
 * (or absence thereof for light).
 */
function ThemedFrame({
  mode,
  bgClass,
  children,
}: {
  mode: 'light' | 'dark';
  bgClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={mode === 'dark' ? 'dark' : ''}>
      <div
        className={cn(
          'rounded-lg border border-border overflow-hidden',
          bgClass,
          'text-foreground',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function LogoAudit() {
  // Track the page-level theme just so the rest of the audit chrome reads
  // consistently. Uses the same `dark` class trick on <html>.
  const [pageTheme, setPageTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    const root = document.documentElement;
    if (pageTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [pageTheme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl py-8 px-4 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
              <Badge variant="outline">Internal QA</Badge>
            </div>
            <h1 className="text-3xl font-bold">Logo Audit</h1>
            <p className="text-muted-foreground max-w-2xl">
              Every surface that renders the GOALPICK logo, shown in both light
              and dark mode. Use this to visually confirm the green-G mark
              renders cleanly with no white-box halo, correct glow, and proper
              proportions.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              setPageTheme((t) => (t === 'light' ? 'dark' : 'light'))
            }
          >
            {pageTheme === 'light' ? (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Page: Light
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Page: Dark
              </>
            )}
          </Button>
        </div>

        {/* Master asset preview */}
        <Card>
          <CardHeader>
            <CardTitle>Master asset</CardTitle>
            <CardDescription>
              <code className="text-xs">src/assets/goalpick-logo.png</code> —
              the single source imported by every component below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThemedFrame mode="light" bgClass="bg-white">
                <div className="p-8 flex items-center justify-center">
                  <img
                    src={goalpickLogo}
                    alt="Master logo on white"
                    className="h-32 w-auto"
                  />
                </div>
              </ThemedFrame>
              <ThemedFrame mode="dark" bgClass="bg-slate-900">
                <div className="p-8 flex items-center justify-center">
                  <img
                    src={goalpickLogo}
                    alt="Master logo on dark"
                    className="h-32 w-auto"
                  />
                </div>
              </ThemedFrame>
            </div>
          </CardContent>
        </Card>

        {/* Surface grid */}
        <div className="space-y-6">
          {surfaces.map((surface) => (
            <Card key={surface.id}>
              <CardHeader>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <CardTitle className="text-lg">{surface.label}</CardTitle>
                  <code className="text-xs text-muted-foreground">
                    {surface.source}
                  </code>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Light
                    </div>
                    <ThemedFrame mode="light" bgClass={surface.bgClass}>
                      {surface.render()}
                    </ThemedFrame>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Dark
                    </div>
                    <ThemedFrame mode="dark" bgClass={surface.bgClass}>
                      {surface.render()}
                    </ThemedFrame>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Static brand assets */}
        <Card>
          <CardHeader>
            <CardTitle>Generated brand assets</CardTitle>
            <CardDescription>
              Files served from <code className="text-xs">/public</code> —
              regenerated from the master asset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[
                { src: '/favicon.png', label: 'favicon.png', size: 'h-16' },
                { src: '/pwa-192x192.png', label: 'pwa-192', size: 'h-20' },
                { src: '/pwa-512x512.png', label: 'pwa-512', size: 'h-24' },
                { src: '/email-logo.png', label: 'email-logo', size: 'h-20' },
                { src: '/og-image.png', label: 'og-image', size: 'h-16' },
                { src: '/splash-1290x2796.png', label: 'splash portrait', size: 'h-32' },
                { src: '/splash-2048x1536.png', label: 'splash landscape', size: 'h-20' },
              ].map((asset) => (
                <div
                  key={asset.src}
                  className="rounded-lg border border-border bg-slate-900 p-3 flex flex-col items-center gap-2"
                >
                  <div className="flex-1 flex items-center justify-center w-full">
                    <img
                      src={asset.src}
                      alt={asset.label}
                      className={cn('w-auto object-contain', asset.size)}
                    />
                  </div>
                  <code className="text-[10px] text-slate-300 truncate w-full text-center">
                    {asset.label}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}