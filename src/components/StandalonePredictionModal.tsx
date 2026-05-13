import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { useSubmitStandalonePrediction } from '@/hooks/useStandalonePredictions';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { Loader2, Minus, Plus, Lock } from 'lucide-react';
import { parseISO, isPast } from 'date-fns';
import { MatchTime } from '@/components/MatchTime';

interface StandalonePredictionModalProps {
  match: Match;
  prediction?: Prediction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPredictionSaved?: (match: Match) => void;
}

interface ScoreSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

function ScoreSelector({ value, onChange, disabled }: ScoreSelectorProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
      >
        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
      </Button>
      <span className="text-2xl sm:text-4xl font-display min-w-[40px] sm:min-w-[50px] text-center">{value}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-10 sm:w-10"
        onClick={() => onChange(Math.min(15, value + 1))}
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
  isPending: boolean;
  prediction?: Prediction | null;
}

function PredictionContent({
  match,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  isLocked,
  onSubmit,
  isPending,
  prediction,
}: PredictionContentProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Match info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          <MatchTime date={match.match_date} variant="long" showZone />
        </p>
        {match.venue && <p>{match.venue}, {match.city}</p>}
      </div>

      {/* Teams with flags */}
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            {match.home_team_flag && (
              <img src={match.home_team_flag} alt="" className="h-5 w-5 sm:h-6 sm:w-6 rounded" />
            )}
            <span className="font-medium text-sm sm:text-base">{match.home_team}</span>
          </div>
        </div>
        <span className="text-lg sm:text-2xl font-bold text-muted-foreground">vs</span>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            {match.away_team_flag && (
              <img src={match.away_team_flag} alt="" className="h-5 w-5 sm:h-6 sm:w-6 rounded" />
            )}
            <span className="font-medium text-sm sm:text-base">{match.away_team}</span>
          </div>
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

      {/* Info box */}
      <div className="bg-muted/50 rounded-lg p-3 text-center text-sm text-muted-foreground">
        <p>🎯 Mock pick predictions help you explore possible tournament outcomes</p>
        <p className="mt-1">Import them to a league anytime!</p>
      </div>

      {/* Submit button */}
      {!isLocked && (
        <Button 
          className="w-full" 
          onClick={onSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : prediction ? (
            'Update Prediction'
          ) : (
            'Save Prediction'
          )}
        </Button>
      )}
    </div>
  );
}

export function StandalonePredictionModal({ 
  match, 
  prediction, 
  open, 
  onOpenChange,
  onPredictionSaved,
}: StandalonePredictionModalProps) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const submitPrediction = useSubmitStandalonePrediction();
  const isMobile = useIsMobile();
  
  const matchStarted = isPast(parseISO(match.match_date));
  const isLocked = matchStarted || match.status !== 'scheduled';

  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.predicted_home_score);
      setAwayScore(prediction.predicted_away_score);
    } else {
      setHomeScore(0);
      setAwayScore(0);
    }
  }, [prediction, open]);

  const handleSubmit = async () => {
    if (isLocked) {
      toast.error('This match has already started');
      return;
    }

    try {
      await submitPrediction.mutateAsync({
        matchId: match.id,
        homeScore,
        awayScore,
      });
      toast.success('Prediction saved to your Mock pick!');
      onPredictionSaved?.(match);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save prediction');
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
    isPending: submitPrediction.isPending,
    prediction,
  };

  const headerContent = (
    <>
      <div className="flex items-center justify-center gap-2">
        Mock pick Prediction
        {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
      </div>
    </>
  );

  const descriptionContent = isLocked 
    ? 'This match has started. Predictions are locked.'
    : 'Make your prediction for this match';

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-xl px-4 pb-8">
          <SheetHeader className="text-center pb-2">
            <SheetTitle className="font-display text-xl">
              {headerContent}
            </SheetTitle>
            <SheetDescription>
              {descriptionContent}
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
          <DialogTitle className="flex items-center justify-center gap-2">
            {headerContent}
          </DialogTitle>
          <DialogDescription className="text-center">
            {descriptionContent}
          </DialogDescription>
        </DialogHeader>
        <PredictionContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
}
