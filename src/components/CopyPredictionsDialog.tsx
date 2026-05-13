import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Copy, Target } from 'lucide-react';
import { useUserLeagues } from '@/hooks/useUserLeagues';
import { useLeaguePredictionCount, useCopyPredictions } from '@/hooks/useLeaguePredictions';
import { useStandalonePredictionCount } from '@/hooks/useStandalonePredictions';
import { toast } from 'sonner';

interface CopyPredictionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetLeagueId: string;
  targetLeagueName: string;
  targetPredictionCount: number;
}

export function CopyPredictionsDialog({
  open,
  onOpenChange,
  targetLeagueId,
  targetLeagueName,
  targetPredictionCount,
}: CopyPredictionsDialogProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: userLeagues, isLoading: leaguesLoading } = useUserLeagues();
  const { data: soloPredictionCount = 0 } = useStandalonePredictionCount();
  const copyMutation = useCopyPredictions();

  // Filter out the target league from source options
  const sourceOptions = useMemo(() => {
    const options: { id: string | null; name: string; count: number }[] = [
      { id: null, name: 'Mock pick', count: soloPredictionCount },
    ];

    if (userLeagues) {
      userLeagues
        .filter(league => league.id !== targetLeagueId)
        .forEach(league => {
          options.push({
            id: league.id,
            name: league.name,
            count: 0, // Will be fetched separately
          });
        });
    }

    return options;
  }, [userLeagues, targetLeagueId, soloPredictionCount]);

  // Get the selected source's prediction count
  const selectedSourceOption = sourceOptions.find(
    opt => (opt.id === null && selectedSource === 'solo') || opt.id === selectedSource
  );

  const handleContinue = () => {
    if (!selectedSource) return;
    
    if (targetPredictionCount > 0) {
      setShowConfirmation(true);
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    const sourceId = selectedSource === 'solo' ? null : selectedSource;
    
    try {
      const result = await copyMutation.mutateAsync({
        sourceLeagueId: sourceId,
        targetLeagueId,
      });

      toast.success(
        `Copied ${result.copied + result.overwritten} predictions${
          result.overwritten > 0 ? ` (${result.overwritten} updated)` : ''
        }`
      );

      onOpenChange(false);
      setShowConfirmation(false);
      setSelectedSource(null);
    } catch (error) {
      toast.error('Failed to copy predictions');
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedSource(null);
    onOpenChange(false);
  };

  if (leaguesLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Predictions
          </DialogTitle>
          <DialogDescription>
            Copy predictions to "{targetLeagueName}"
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a source to copy predictions from:
              </p>

              <RadioGroup
                value={selectedSource || ''}
                onValueChange={(value) => setSelectedSource(value)}
              >
                {sourceOptions.map((option) => {
                  const value = option.id === null ? 'solo' : option.id;
                  const isDisabled = option.id === null && option.count === 0;

                  return (
                    <div
                      key={value}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        selectedSource === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => !isDisabled && setSelectedSource(value)}
                    >
                      <RadioGroupItem value={value} id={value} disabled={isDisabled} />
                      <Label
                        htmlFor={value}
                        className={`flex-1 flex items-center justify-between ${
                          isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <span className="font-medium">{option.name}</span>
                        {option.id === null && (
                          <Badge variant="secondary" className="gap-1">
                            <Target className="h-3 w-3" />
                            {option.count} predictions
                          </Badge>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>

              {targetPredictionCount > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This league already has {targetPredictionCount} predictions. 
                    Copying will override matching predictions.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleContinue} 
                disabled={!selectedSource || copyMutation.isPending}
              >
                {copyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning: Override Existing Predictions</strong>
                <p className="mt-2">
                  You have {targetPredictionCount} predictions in "{targetLeagueName}" already.
                </p>
                <p className="mt-1">
                  Copying will override any matching predictions. This action cannot be undone.
                </p>
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCopy}
                disabled={copyMutation.isPending}
              >
                {copyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : (
                  'Copy & Override'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
