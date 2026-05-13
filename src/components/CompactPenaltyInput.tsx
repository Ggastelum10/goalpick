import { Goal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

interface CompactPenaltyInputProps {
  homePenalty: number;
  awayPenalty: number;
  onHomePenaltyChange: (value: number) => void;
  onAwayPenaltyChange: (value: number) => void;
  disabled?: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
}

function PenaltyScoreButton({ 
  type, 
  onClick, 
  disabled 
}: { 
  type: 'increment' | 'decrement'; 
  onClick: () => void; 
  disabled?: boolean;
}) {
  const Icon = type === 'increment' ? Plus : Minus;
  
  return (
    <button
      type="button"
      className={cn(
        'h-4 w-4 flex items-center justify-center rounded transition-colors',
        disabled 
          ? 'opacity-30 cursor-not-allowed text-muted-foreground' 
          : 'hover:bg-primary/10 hover:text-primary active:scale-95 text-muted-foreground'
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      disabled={disabled}
      tabIndex={-1}
    >
      <Icon className="h-2.5 w-2.5" />
    </button>
  );
}

export function CompactPenaltyInput({ 
  homePenalty, 
  awayPenalty, 
  onHomePenaltyChange, 
  onAwayPenaltyChange, 
  disabled = false,
  homeTeamName,
  awayTeamName
}: CompactPenaltyInputProps) {
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleHomeIncrement = () => {
    if (homePenalty < 20) {
      triggerHaptic();
      onHomePenaltyChange(homePenalty + 1);
    }
  };
  
  const handleHomeDecrement = () => {
    if (homePenalty > 0) {
      triggerHaptic();
      onHomePenaltyChange(homePenalty - 1);
    }
  };
  
  const handleAwayIncrement = () => {
    if (awayPenalty < 20) {
      triggerHaptic();
      onAwayPenaltyChange(awayPenalty + 1);
    }
  };
  
  const handleAwayDecrement = () => {
    if (awayPenalty > 0) {
      triggerHaptic();
      onAwayPenaltyChange(awayPenalty - 1);
    }
  };

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  // Determine winner for highlighting
  const homeWins = homePenalty > awayPenalty;
  const awayWins = awayPenalty > homePenalty;

  return (
    <div 
      data-no-card-click="true"
      className="px-1.5 py-1 bg-muted/40 border-t flex items-center justify-center gap-1.5"
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onTouchStart={stopPropagation}
    >
      <Goal className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <span className="text-[10px] text-muted-foreground">Pen:</span>
      
      {/* Home penalty score */}
      <div className="flex items-center gap-0.5">
        <PenaltyScoreButton 
          type="decrement" 
          onClick={handleHomeDecrement} 
          disabled={disabled} 
        />
        <span className={cn(
          'w-4 text-center font-bold text-xs tabular-nums',
          disabled && 'opacity-50',
          homeWins && 'text-primary'
        )}>
          {homePenalty}
        </span>
        <PenaltyScoreButton 
          type="increment" 
          onClick={handleHomeIncrement} 
          disabled={disabled} 
        />
      </div>
      
      <span className="text-[10px] text-muted-foreground">-</span>
      
      {/* Away penalty score */}
      <div className="flex items-center gap-0.5">
        <PenaltyScoreButton 
          type="decrement" 
          onClick={handleAwayDecrement} 
          disabled={disabled} 
        />
        <span className={cn(
          'w-4 text-center font-bold text-xs tabular-nums',
          disabled && 'opacity-50',
          awayWins && 'text-primary'
        )}>
          {awayPenalty}
        </span>
        <PenaltyScoreButton 
          type="increment" 
          onClick={handleAwayIncrement} 
          disabled={disabled} 
        />
      </div>
    </div>
  );
}
