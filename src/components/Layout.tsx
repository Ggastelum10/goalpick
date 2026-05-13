import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from './Navigation';
import { NotificationPrompt } from './NotificationPrompt';
import { PWAInstallBanner } from './PWAInstallBanner';
import { PWAUpdateBanner } from './PWAUpdateBanner';
import { SetupScreen } from './SetupScreen';
import { useSetupScreen } from '@/hooks/useSetupScreen';
import { Loader2 } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const { showSetup, isLoading: setupLoading } = useSetupScreen();
  const location = useLocation();

  if (loading || setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const target = `${location.pathname}${location.search}${location.hash}`;
    const isAuthRoute = location.pathname === '/auth';
    const redirectQS =
      !isAuthRoute && target && target !== '/'
        ? `?redirect=${encodeURIComponent(target)}`
        : '';
    return <Navigate to={`/auth${redirectQS}`} replace />;
  }

  if (showSetup) {
    return <SetupScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 md:bg-card md:border-r md:border-border">
        <Navigation />
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-16 md:ml-64 md:pb-0 overflow-x-hidden">
        <div className="container mx-auto max-w-7xl px-3 md:px-4 py-2 md:py-4">{children}</div>
        
        {/* Legal Disclaimer Footer */}
        <footer className="border-t border-border mt-8 py-4 px-3 md:px-4">
          <div className="container mx-auto max-w-7xl">
            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              {BRANDING.disclaimer}
            </p>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-1">
              © {new Date().getFullYear()} {BRANDING.appName}. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <Navigation />
      </div>

      {/* Notification prompt */}
      <NotificationPrompt />
      <PWAInstallBanner />
      <PWAUpdateBanner />
    </div>
  );
}