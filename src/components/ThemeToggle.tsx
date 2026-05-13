import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  /**
   * "icon"   — round icon button, fits in tight nav rows.
   * "menu"   — full-width labelled trigger with dropdown of Dark / Light / System.
   * "inline" — compact labelled segmented control (used in mobile More menu).
   */
  variant?: 'icon' | 'menu' | 'inline';
  className?: string;
}

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System (dark)', icon: Monitor },
];

export function ThemeToggle({ variant = 'menu', className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        className={cn('h-9 w-9', className)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === 'inline') {
    // Segmented control — three pills side by side. Good for the mobile More menu.
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5 w-full',
          className,
        )}
      >
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <OptIcon className="h-3.5 w-3.5" />
              <span>{opt.value === 'system' ? 'Auto' : opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // variant === 'menu'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-foreground',
            className,
          )}
        >
          <Icon className="h-5 w-5" />
          <span>Theme</span>
          <span className="ml-auto text-xs text-muted-foreground capitalize">
            {theme === 'system' ? 'auto' : theme}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => {
          const OptIcon = opt.icon;
          return (
            <DropdownMenuCheckboxItem
              key={opt.value}
              checked={theme === opt.value}
              onCheckedChange={() => setTheme(opt.value)}
              className="cursor-pointer"
            >
              <OptIcon className="h-4 w-4 mr-2" />
              {opt.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}