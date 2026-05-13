import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: Date;
  className?: string;
  urgentThreshold?: number; // minutes
  /**
   * Size preset for the timer.
   * - `sm` (default): legacy responsive Tailwind sizes (xs → base).
   * - `md`: larger fixed responsive sizes.
   * - `fluid`: CSS clamp()-based sizes that scale continuously with the
   *   viewport so the timer never overflows its parent container.
   */
  size?: 'sm' | 'md' | 'fluid';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  targetDate,
  className,
  urgentThreshold = 60,
  size = 'sm',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - Date.now();
      
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    const updateTimer = () => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      const totalMinutes = newTimeLeft.days * 24 * 60 + newTimeLeft.hours * 60 + newTimeLeft.minutes;
      setIsUrgent(totalMinutes < urgentThreshold && totalMinutes > 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, urgentThreshold]);

  const digitClass =
    size === 'md'
      ? 'font-display text-base sm:text-xl md:text-2xl leading-none'
      : size === 'fluid'
        ? 'font-display leading-none'
        : 'font-display text-xs sm:text-sm md:text-base leading-none';

  const unitClass =
    size === 'md'
      ? 'text-[8px] sm:text-[10px] md:text-[11px] text-muted-foreground uppercase leading-none'
      : size === 'fluid'
        ? 'text-muted-foreground uppercase leading-none'
        : 'text-[6px] sm:text-[7px] md:text-[8px] text-muted-foreground uppercase';

  const sepClass =
    size === 'md'
      ? 'text-muted-foreground font-display text-base sm:text-xl md:text-2xl leading-none'
      : size === 'fluid'
        ? 'text-muted-foreground font-display leading-none'
        : 'text-muted-foreground font-display text-xs sm:text-sm md:text-base leading-none';

  // Fluid mode uses CSS clamp(min, vw, max) via inline style so the digits
  // shrink/grow continuously and never overflow narrow containers.
  const digitStyle: React.CSSProperties | undefined =
    size === 'fluid' ? { fontSize: 'clamp(1.25rem, 6vw, 3rem)' } : undefined;
  const unitStyle: React.CSSProperties | undefined =
    size === 'fluid' ? { fontSize: 'clamp(0.5rem, 1.4vw, 0.75rem)' } : undefined;
  const sepStyle: React.CSSProperties | undefined =
    size === 'fluid' ? { fontSize: 'clamp(1.25rem, 6vw, 3rem)' } : undefined;

  const formatUnit = (value: number, unit: string) => (
    <div className="flex flex-col items-center min-w-0">
      <span
        className={cn(digitClass, isUrgent && 'text-accent animate-pulse')}
        style={digitStyle}
      >
        {value.toString().padStart(2, '0')}
      </span>
      <span className={unitClass} style={unitStyle}>
        {unit}
      </span>
    </div>
  );

  if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-start gap-0.5 sm:gap-1 min-w-0 max-w-full', className)}>
      {timeLeft.days > 0 && (
        <>
          {formatUnit(timeLeft.days, 'd')}
          <span className={sepClass} style={sepStyle}>:</span>
        </>
      )}
      {formatUnit(timeLeft.hours, 'h')}
      <span className={sepClass} style={sepStyle}>:</span>
      {formatUnit(timeLeft.minutes, 'm')}
      {timeLeft.days === 0 && (
        <>
          <span className={sepClass} style={sepStyle}>:</span>
          {formatUnit(timeLeft.seconds, 's')}
        </>
      )}
    </div>
  );
}
