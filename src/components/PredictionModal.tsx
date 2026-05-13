import { useState } from 'react';
import { isPast } from 'date-fns';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Match } from '@/hooks/useMatches';
import { Prediction, useSubmitPrediction } from '@/hooks/usePredictions';

interface PredictionModalProps {
  match: Match;
  prediction?: Prediction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTeamFlag = (team: string, flagUrl?: string | null, isMobile?: boolean) => {
  const sizeClasses = isMobile ? 'h-8 w-12' : 'h-12 w-16';
  if (flagUrl) {
    return (
      <img 
        src={flagUrl} 
        alt={team} 
        className={`${sizeClasses} object-cover rounded-lg shadow-md ring-1 ring-border/50`} 
      />
    );
  }
  return (
    <div className={`${sizeClasses} bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold shadow-md`}>
      {team.slice(0, 3).toUpperCase()}
    </div>
  );
};

interface ScoreSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

function ScoreSelector({ value, onChange, disabled }: ScoreSelectorProps) {
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleDecrement = () => {
    if (value > 0) {
      triggerHaptic();
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < 15) {
      triggerHaptic();
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10"
        onClick={handleDecrement}
        disabled={disabled || value === 0}
      >
        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
      <span className="text-2xl sm:text-4xl font-display min-w-[40px] sm:min-w-[50px] text-center">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10"
        onClick={handleIncrement}
        disabled={disabled}
      >
        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
    </div>
  );
}

interface PredictionContentProps {
  match: Match;
  homeScore: number;
  setHomeScore: (score: number) => void;
  awayScore: number;
  setAwayScore: (score: number) => void;
  isLocked: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  prediction?: Prediction | null;
  isMobile: boolean;
}

function PredictionContent({
  match,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  isLocked,
  onSubmit,
  onCancel,
  isPending,
  prediction,
  isMobile,
}: PredictionContentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Teams */}
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 flex flex-col items-center text-center">
          {getTeamFlag(match.home_team, match.home_team_flag, isMobile)}
          <p className="mt-2 font-semibold text-sm sm:text-lg">{match.home_team}</p>
        </div>
        <span className="text-lg sm:text-2xl text-muted-foreground font-display">VS</span>
        <div className="flex-1 flex flex-col items-center text-center">
          {getTeamFlag(match.away_team, match.away_team_flag, isMobile)}
          <p className="mt-2 font-semibold text-sm sm:text-lg">{match.away_team}</p>
        </div>
      </div>

      {/* Score selectors */}
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        <ScoreSelector
          value={homeScore}
          onChange={setHomeScore}
          disabled={isLocked}
        />
        <span className="text-xl sm:text-3xl text-muted-foreground">-</span>
        <ScoreSelector
          value={awayScore}
          onChange={setAwayScore}
          disabled={isLocked}
        />
      </div>

      {isLocked && (
        <p className="text-center text-sm text-destructive">
          This match has already started. Predictions are locked.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={isLocked || isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : prediction ? (
            'Update Prediction'
          ) : (
            'Submit Prediction'
          )}
        </Button>
      </div>
    </div>
  );
}

export function PredictionModal({ match, prediction, open, onOpenChange }: PredictionModalProps) {
  const [homeScore, setHomeScore] = useState(prediction?.predicted_home_score ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.predicted_away_score ?? 0);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const submitPrediction = useSubmitPrediction();

  const isLocked = isPast(new Date(match.match_date));

  const handleSubmit = async () => {
    try {
      await submitPrediction.mutateAsync({
        matchId: match.id,
        homeScore,
        awayScore,
      });
      toast({
        title: '✅ Prediction saved!',
        description: `${match.home_team} ${homeScore} - ${awayScore} ${match.away_team}`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save prediction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const contentProps: PredictionContentProps = {
    match,
    homeScore,
    setHomeScore,
    awayScore,
    setAwayScore,
    isLocked,
    onSubmit: handleSubmit,
    onCancel: () => onOpenChange(false),
    isPending: submitPrediction.isPending,
    prediction,
    isMobile,
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl px-4 pb-8">
          <SheetHeader className="text-center pb-2">
            <SheetTitle className="font-display text-xl">
              Make Your Prediction
            </SheetTitle>
            <SheetDescription>
              Predictions lock at kickoff
            </SheetDescription>
          </SheetHeader>
          <PredictionContent {...contentProps} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-2xl">
            Make Your Prediction
          </DialogTitle>
          <DialogDescription className="text-center">
            Predictions lock at kickoff
          </DialogDescription>
        </DialogHeader>
        <PredictionContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
}
