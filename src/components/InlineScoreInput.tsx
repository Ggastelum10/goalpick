import { useCallback } from 'react';
import { ChevronUp, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InlineScoreInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function InlineScoreInput({ 
  value, 
  onChange, 
  disabled = false,
  size = 'sm'
}: InlineScoreInputProps) {
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleIncrement = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && value < 15) {
      triggerHaptic();
      onChange(value + 1);
    }
  }, [disabled, value, onChange, triggerHaptic]);

  const handleDecrement = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && value > 0) {
      triggerHaptic();
      onChange(value - 1);
    }
  }, [disabled, value, onChange, triggerHaptic]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 0 && newValue <= 15) {
      onChange(newValue);
    } else if (e.target.value === '') {
      onChange(0);
    }
  }, [onChange]);

  const stopPropagation = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const buttonSize = size === 'sm' ? 'h-6 w-6 min-w-6 min-h-6' : 'h-8 w-8 min-w-8 min-h-8';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const inputSize = size === 'sm' ? 'h-7 w-8 text-sm' : 'h-9 w-10 text-base';

  // Check if value is set (0 counts as filled)
  const isFilled = value >= 0;

  return (
    <div 
      data-no-card-click="true"
      className="flex flex-col items-center gap-0.5 p-1 rounded-md select-none"
      style={{ touchAction: 'manipulation' }}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
      onPointerDown={stopPropagation}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          'rounded-md transition-colors touch-action-manipulation',
          disabled 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-primary/10 hover:text-primary active:scale-95'
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={handleIncrement}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onPointerDown={stopPropagation}
        disabled={disabled}
        tabIndex={-1}
      >
        <ChevronUp className={cn(iconSize, 'flex-shrink-0')} />
      </Button>
      
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          onTouchStart={stopPropagation}
          onPointerDown={stopPropagation}
          disabled={disabled}
          className={cn(
            inputSize,
            'text-center font-bold rounded-md border bg-background',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all touch-action-manipulation',
            disabled && 'opacity-50 cursor-not-allowed bg-muted',
            isFilled && 'border-primary/30 bg-primary/5'
          )}
          style={{ touchAction: 'manipulation' }}
        />
        {/* Filled indicator */}
        {isFilled && !disabled && (
          <Check className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
        )}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          'rounded-md transition-colors touch-action-manipulation',
          disabled 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-primary/10 hover:text-primary active:scale-95'
        )}
        style={{ touchAction: 'manipulation' }}
        onClick={handleDecrement}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onPointerDown={stopPropagation}
        disabled={disabled}
        tabIndex={-1}
      >
        <ChevronDown className={cn(iconSize, 'flex-shrink-0')} />
      </Button>
    </div>
  );
}
