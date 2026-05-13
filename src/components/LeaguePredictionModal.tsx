import { useState, useEffect } from 'react';
import { Minus, Plus, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Match } from '@/hooks/useMatches';
import { PredictionMode } from '@/hooks/useLeagues';
import { 
  LeaguePrediction, 
  OriginalPrediction,
  useSubmitLeaguePrediction,
  usePredictionLockStatus,
  useLeaguePredictionForMatch,
  useOriginalPredictionForMatch
} from '@/hooks/useLeaguePredictions';

interface LeaguePredictionModalProps {
  match: Match;
  leagueId: string;
  predictionMode: PredictionMode;
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
  isLoading: boolean;
  lockStatus: { isLocked: boolean; reason?: string } | undefined;
  predictionMode: PredictionMode;
  originalPrediction: OriginalPrediction | null | undefined;
  prediction: LeaguePrediction | null | undefined;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function PredictionContent({
  match,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  isLocked,
  isLoading,
  lockStatus,
  predictionMode,
  originalPrediction,
  prediction,
  onSubmit,
  onCancel,
  isPending,
}: PredictionContentProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8 sm:py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Teams */}
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 text-center">
          <p className="font-semibold text-base sm:text-lg">{match.home_team}</p>
        </div>
        <span className="text-lg sm:text-2xl text-muted-foreground font-display">VS</span>
        <div className="flex-1 text-center">
          <p className="font-semibold text-base sm:text-lg">{match.away_team}</p>
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

      {/* Original prediction comparison for Mode B */}
      {predictionMode === 'update_every_stage' && originalPrediction && prediction && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Your original prediction:
          </p>
          <p className="text-sm font-medium">
            {match.home_team} {originalPrediction.predicted_home_score} - {originalPrediction.predicted_away_score} {match.away_team}
          </p>
        </div>
      )}

      {isLocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {lockStatus?.reason || 'This phase has started. Predictions are locked.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={isLocked || isPending || isLoading}
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

export function LeaguePredictionModal({ 
  match, 
  leagueId,
  predictionMode,
  open, 
  onOpenChange,
  onPredictionSaved,
}: LeaguePredictionModalProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const submitPrediction = useSubmitLeaguePrediction();
  
  const { data: prediction, isLoading: predictionLoading } = useLeaguePredictionForMatch(leagueId, match.id);
  const { data: originalPrediction } = useOriginalPredictionForMatch(leagueId, match.id);
  const { data: lockStatus, isLoading: lockLoading } = usePredictionLockStatus(leagueId, predictionMode, match.id);

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Initialize scores when prediction loads
  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.predicted_home_score);
      setAwayScore(prediction.predicted_away_score);
    } else {
      setHomeScore(0);
      setAwayScore(0);
    }
  }, [prediction]);

  const isLocked = lockStatus?.isLocked || false;
  const isLoading = predictionLoading || lockLoading;

  const handleSubmit = async () => {
    if (isLocked) {
      toast({
        title: 'Prediction Locked',
        description: lockStatus?.reason || 'This prediction cannot be modified.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await submitPrediction.mutateAsync({
        leagueId,
        matchId: match.id,
        homeScore,
        awayScore,
        // For Mode B, save as original if this is the first prediction
        saveAsOriginal: predictionMode === 'update_every_stage' && !originalPrediction,
      });
      toast({
        title: '✅ Prediction saved!',
        description: `${match.home_team} ${homeScore} - ${awayScore} ${match.away_team}`,
      });
      onPredictionSaved?.(match);
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
    isLoading,
    lockStatus,
    predictionMode,
    originalPrediction,
    prediction,
    onSubmit: handleSubmit,
    onCancel: () => onOpenChange(false),
    isPending: submitPrediction.isPending,
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
              Predictions lock when each match starts
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
            Predictions lock when each match starts
          </DialogDescription>
        </DialogHeader>
        <PredictionContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
}
