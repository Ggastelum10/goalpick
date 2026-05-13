import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Trophy, Calendar, MessageSquare, Settings, LogOut, BookOpen, Users, Eye, EyeOff, MoreHorizontal, Target, FileText, User, HelpCircle } from 'lucide-react';
import goalpickLogo from '@/assets/goalpick-logo-v2.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useProfile';
import { useViewMode } from '@/hooks/useViewMode';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const { t } = useTranslation();
  const location = useLocation();
  const { signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { isAdminViewActive, toggleViewMode } = useViewMode();

  // Primary items - shown directly in mobile nav
  const primaryNavItems = [
    { href: '/dashboard', icon: Home, label: t('nav.dashboard') },
    { href: '/solo-bracket', icon: Target, label: t('nav.soloBracket') },
    { href: '/leagues', icon: Users, label: t('nav.leagues') },
    { href: '/matches', icon: Calendar, label: t('nav.matches') },
  ];

  // Secondary items - shown in "More" menu on mobile, directly on desktop
  const secondaryNavItems = [
    { href: '/leaderboard', icon: Trophy, label: t('nav.leaderboard') },
    { href: '/chat', icon: MessageSquare, label: t('nav.chat') },
    { href: '/rules', icon: BookOpen, label: t('nav.rules') },
    { href: '/tournament-rules', icon: FileText, label: t('nav.tournamentRules') },
    { href: '/help', icon: HelpCircle, label: t('nav.helpCenter') },
    { href: '/profile', icon: User, label: t('nav.profile') },
  ];

  // All items for desktop sidebar
  const allNavItems = [...primaryNavItems, ...secondaryNavItems];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md md:relative md:border-r md:border-t-0">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide px-2 md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-4 md:pt-1 md:pb-4 md:overflow-x-visible md:overflow-y-auto md:max-h-screen">
        {/* Logo - Desktop only */}
        <div className="hidden md:block mb-0 md:mb-1 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center justify-center group">
            <div className="h-16 lg:h-20 w-16 lg:w-20 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/30 to-transparent rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src={goalpickLogo} 
                alt="GOALPICK Logo" 
                className="h-16 lg:h-20 w-auto object-contain relative z-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_12px_rgba(34,197,94,0.25)] dark:drop-shadow-[0_0_20px_rgba(34,197,94,0.35)]" 
              />
            </div>
          </Link>
        </div>

        {/* Admin View Mode Toggle - Desktop Only */}
        {isAdmin && (
          <div className="hidden md:flex items-center gap-2 px-4 py-3 mb-2 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2 flex-1">
              {isAdminViewActive ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium">
                {isAdminViewActive ? t('dashboard.adminView') : t('dashboard.userView')}
              </span>
            </div>
            <Switch 
              checked={isAdminViewActive} 
              onCheckedChange={toggleViewMode}
              className="scale-75"
            />
          </div>
        )}

        {/* Primary Nav Items - Mobile: shown directly, Desktop: show all */}
        {/* Desktop shows all items */}
        {allNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-xs transition-all duration-200 flex-shrink-0',
                'md:flex-row md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
                isActive && 'md:bg-gradient-to-r md:from-primary/15 md:to-primary/5',
                // Hide secondary items on mobile (they go in More menu)
                secondaryNavItems.some(s => s.href === item.href) && 'hidden md:flex'
              )}
            >
              {/* Active indicator for mobile */}
              {isActive && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary md:hidden" />
              )}
              
              {/* Active indicator for desktop */}
              {isActive && (
                <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
              )}
              
              <item.icon className={cn(
                'h-5 w-5 transition-transform',
                isActive && 'text-primary scale-110'
              )} />
              <span className="hidden md:inline">{item.label}</span>
              <span className="md:hidden text-[10px]">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu - Mobile Only */}
        <div className="md:hidden flex-shrink-0">
          {(() => {
            const isMoreActive = secondaryNavItems.some(s => location.pathname === s.href) || location.pathname === '/admin';
            return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-xs transition-all outline-none",
                isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                {isMoreActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full bg-primary" />
                )}
                <MoreHorizontal className={cn(
                  "h-5 w-5 transition-transform",
                  isMoreActive && "text-primary scale-110"
                )} />
                <span className="text-[10px]">{t('nav.more')}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2 bg-popover">
              {secondaryNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      to={item.href} 
                      className={cn(
                        "flex items-center gap-3 cursor-pointer",
                        isActive && "text-primary"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              
              {/* Language selector in More menu on mobile */}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <LanguageSelector variant="select" className="w-full" />
              </div>

              {/* Theme toggle */}
              <div className="px-2 py-1.5">
                <ThemeToggle variant="inline" />
              </div>
              
              {/* Admin link for admins */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <div
                    className="flex items-center gap-2 px-2 py-2"
                    onClick={(e) => e.preventDefault()}
                    onSelect={(e: any) => e.preventDefault()}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {isAdminViewActive ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium">
                        {isAdminViewActive ? t('dashboard.adminView') : t('dashboard.userView')}
                      </span>
                    </div>
                    <Switch
                      checked={isAdminViewActive}
                      onCheckedChange={toggleViewMode}
                      className="scale-75"
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/admin" 
                      className={cn(
                        "flex items-center gap-3 cursor-pointer",
                        location.pathname === '/admin' && "text-primary"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      <span>{t('nav.admin')}</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={signOut} 
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-3" />
                <span>{t('common.signOut')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            );
          })()}
        </div>

        {/* Language Selector - Desktop Only */}
        <div className="hidden md:block px-2 py-2">
          <LanguageSelector variant="dropdown" className="w-full justify-start" />
        </div>

        {/* Admin link - Desktop Only */}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              'hidden md:flex relative flex-col items-center gap-1 px-3 py-2 text-xs transition-all duration-200 flex-shrink-0',
              'md:flex-row md:gap-3 md:rounded-xl md:px-4 md:py-3 md:text-sm',
              location.pathname === '/admin'
                ? 'text-primary md:bg-gradient-to-r md:from-primary/15 md:to-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {location.pathname === '/admin' && (
              <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
            )}
            <Settings className={cn(
              'h-5 w-5 transition-transform',
              location.pathname === '/admin' && 'text-primary scale-110'
            )} />
            <span className="hidden md:inline">{t('nav.admin')}</span>
            {/* Admin badge indicator */}
            <Badge variant="outline" className="hidden md:inline-flex text-[10px] px-1.5 py-0 h-4 ml-auto">
              {t('nav.admin')}
            </Badge>
          </Link>
        )}

        {/* Sign out for desktop */}
        <div className="hidden md:block md:mt-auto md:pt-4 md:border-t md:border-border space-y-1">
          <ThemeToggle variant="menu" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            {t('common.signOut')}
          </Button>
        </div>
      </div>
    </nav>
  );
}
