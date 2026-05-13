import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactScoreInputProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function CompactScoreInput({ 
  value, 
  onChange, 
  disabled = false
}: CompactScoreInputProps) {
  const [isPressed, setIsPressed] = useState<'up' | 'down' | null>(null);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleIncrement = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    triggerHaptic();
    const newValue = value === null ? 0 : Math.min(15, value + 1);
    onChange(newValue);
  }, [disabled, value, onChange, triggerHaptic]);

  const handleDecrement = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    if (value === null) return;
    if (value > 0) {
      triggerHaptic();
      onChange(value - 1);
    }
  }, [disabled, value, onChange, triggerHaptic]);

  const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handlePointerDown = useCallback((direction: 'up' | 'down') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsPressed(direction);
    }
  }, [disabled]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(null);
  }, []);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setIsPressed(null);
  }, []);

  // Determine if this is a "filled" state (value is a number, including 0)
  const isFilled = value !== null;

  return (
    <div 
      data-no-card-click="true"
      className={cn(
        "flex flex-col items-center gap-0 select-none",
        // Add touch-action to prevent browser gestures
        "touch-action-manipulation"
      )}
      style={{ touchAction: 'manipulation' }}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onPointerDown={stopPropagation}
    >
      {/* Increment button - increased size for better touch targets */}
      <button
        type="button"
        className={cn(
          'h-6 w-7 min-h-6 min-w-7 flex items-center justify-center rounded-t transition-all duration-75',
          'touch-action-manipulation',
          disabled 
            ? 'opacity-30 cursor-not-allowed text-muted-foreground' 
            : 'hover:bg-primary/10 hover:text-primary text-muted-foreground active:scale-95',
          isPressed === 'up' && !disabled && 'scale-90 bg-primary/20 text-primary'
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={handleIncrement}
        onPointerDown={handlePointerDown('up')}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        disabled={disabled}
        tabIndex={-1}
      >
        <ChevronUp className="h-4 w-4 flex-shrink-0" />
      </button>
      
      {/* Score display with filled state indicator */}
      <div className={cn(
        'relative w-7 text-center py-0.5 rounded-sm transition-colors',
        isFilled && 'bg-primary/5 ring-1 ring-primary/20'
      )}>
        <span className={cn(
          'font-bold text-sm tabular-nums block',
          disabled && 'opacity-50',
          isFilled && 'text-foreground',
          !isFilled && 'text-muted-foreground'
        )}>
          {value === null ? '-' : value}
        </span>
        {/* Small checkmark indicator for filled state */}
        {isFilled && !disabled && (
          <Check className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-primary" />
        )}
      </div>
      
      {/* Decrement button - increased size for better touch targets */}
      <button
        type="button"
        className={cn(
          'h-6 w-7 min-h-6 min-w-7 flex items-center justify-center rounded-b transition-all duration-75',
          'touch-action-manipulation',
          disabled 
            ? 'opacity-30 cursor-not-allowed text-muted-foreground' 
            : 'hover:bg-primary/10 hover:text-primary text-muted-foreground active:scale-95',
          isPressed === 'down' && !disabled && 'scale-90 bg-primary/20 text-primary'
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={handleDecrement}
        onPointerDown={handlePointerDown('down')}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        disabled={disabled}
        tabIndex={-1}
      >
        <ChevronDown className="h-4 w-4 flex-shrink-0" />
      </button>
    </div>
  );
}
