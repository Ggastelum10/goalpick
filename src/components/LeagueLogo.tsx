import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LeagueLogoProps {
  url?: string | null;
  name: string;
  size?: Size;
  className?: string;
  /** Use Crown as fallback when no url. Set false to render initials only. */
  crownFallback?: boolean;
  /** Zoom factor applied to uploaded logo (default 1). */
  scale?: number | null;
  /** Horizontal offset (-1..1, fraction of container) for uploaded logo. */
  offsetX?: number | null;
  /** Vertical offset (-1..1, fraction of container) for uploaded logo. */
  offsetY?: number | null;
}

const SIZE_CLASSES: Record<Size, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

const ICON_SIZE: Record<Size, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Visual identity of a league: shows the uploaded logo when present,
 * otherwise falls back to a Crown icon (or initials) on a tinted disc.
 */
export function LeagueLogo({
  url,
  name,
  size = 'md',
  className,
  crownFallback = true,
  scale,
  offsetX,
  offsetY,
}: LeagueLogoProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (url) {
    const s = typeof scale === 'number' && !isNaN(scale) ? scale : 1;
    const ox = typeof offsetX === 'number' && !isNaN(offsetX) ? offsetX : 0;
    const oy = typeof offsetY === 'number' && !isNaN(offsetY) ? offsetY : 0;
    const transformed = s !== 1 || ox !== 0 || oy !== 0;
    if (transformed) {
      return (
        <div
          className={cn(
            'rounded-full overflow-hidden bg-muted ring-1 ring-border flex-shrink-0',
            sizeClass,
            className,
          )}
        >
          <img
            src={url}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover"
            style={{
              transform: `translate(${ox * 100}%, ${oy * 100}%) scale(${s})`,
              transformOrigin: 'center center',
            }}
          />
        </div>
      );
    }
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        className={cn(
          'rounded-full object-cover bg-muted ring-1 ring-border flex-shrink-0',
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={cn(
        'rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold ring-1 ring-primary/20',
        sizeClass,
        className,
      )}
    >
      {crownFallback ? (
        <Crown className={cn(ICON_SIZE[size], 'text-yellow-500')} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

export default LeagueLogo;