import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === 'string' ? value : 0);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    // If value is a string (like "—"), just display it directly without animation
    if (typeof value === 'string') {
      setDisplayValue(value);
      return;
    }

    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * easeOutQuart);
      
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{typeof displayValue === 'string' ? displayValue : displayValue.toLocaleString()}{suffix}
    </span>
  );
}
