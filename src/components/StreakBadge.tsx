import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export function StreakBadge({ streak, className }: StreakBadgeProps) {
  if (streak < 3) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-gradient-to-r from-accent/20 to-gold/20',
        'text-accent text-xs font-medium',
        'animate-pulse',
        className
      )}
    >
      <Flame className="h-3 w-3" />
      <span>{streak}</span>
    </div>
  );
}
