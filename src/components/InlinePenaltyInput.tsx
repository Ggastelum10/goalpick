import { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlinePenaltyInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  isWinner?: boolean;
}

export function InlinePenaltyInput({ 
  value, 
  onChange, 
  disabled = false,
  isWinner = false
}: InlinePenaltyInputProps) {
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleIncrement = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && value < 20) {
      triggerHaptic();
      onChange(value + 1);
    }
  }, [disabled, value, onChange, triggerHaptic]);

  const handleDecrement = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && value > 0) {
      triggerHaptic();
      onChange(value - 1);
    }
  }, [disabled, value, onChange, triggerHaptic]);

  const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div 
      data-no-card-click="true"
      className="flex items-center gap-0.5 select-none"
      style={{ touchAction: 'manipulation' }}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <button
        type="button"
        className={cn(
          'h-5 w-5 min-h-5 min-w-5 flex items-center justify-center rounded transition-colors',
          'touch-action-manipulation',
          disabled 
            ? 'opacity-30 cursor-not-allowed text-muted-foreground' 
            : 'hover:bg-primary/10 hover:text-primary active:scale-95 text-muted-foreground'
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={handleDecrement}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        disabled={disabled}
        tabIndex={-1}
      >
        <Minus className="h-3 w-3 flex-shrink-0" />
      </button>
      
      <span className={cn(
        'w-5 text-center font-bold text-xs tabular-nums',
        disabled && 'opacity-50',
        isWinner && 'text-primary'
      )}>
        {value}
      </span>
      
      <button
        type="button"
        className={cn(
          'h-5 w-5 min-h-5 min-w-5 flex items-center justify-center rounded transition-colors',
          'touch-action-manipulation',
          disabled 
            ? 'opacity-30 cursor-not-allowed text-muted-foreground' 
            : 'hover:bg-primary/10 hover:text-primary active:scale-95 text-muted-foreground'
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={handleIncrement}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        disabled={disabled}
        tabIndex={-1}
      >
        <Plus className="h-3 w-3 flex-shrink-0" />
      </button>
    </div>
  );
}
