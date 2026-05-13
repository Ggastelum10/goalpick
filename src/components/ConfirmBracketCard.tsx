import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Check, Lock, Loader2, Unlock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmBracketCardProps {
  predictionCount: number;
  totalMatches: number;
  onConfirm: () => void;
  onUnconfirm?: () => void;
  isPending: boolean;
  isConfirmed: boolean;
  tournamentStarted?: boolean;
}

export function ConfirmBracketCard({
  predictionCount,
  totalMatches,
  onConfirm,
  onUnconfirm,
  isPending,
  isConfirmed,
  tournamentStarted = false,
}: ConfirmBracketCardProps) {
  const { t } = useTranslation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  
  const completionPercentage = totalMatches > 0 
    ? Math.round((predictionCount / totalMatches) * 100) 
    : 0;
  const isComplete = predictionCount === totalMatches;

  if (isConfirmed) {
    const canUnlock = !tournamentStarted && !!onUnconfirm;

    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              <span className="font-medium">
                {t('predictions.bracketConfirmed', 'Your bracket is confirmed and locked!')}
              </span>
            </div>
            {canUnlock && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowUnlockDialog(true)}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
                {t('predictions.unlockBracket', 'Unlock Bracket')}
              </Button>
            )}
          </div>
        </CardContent>

        {/* Unlock confirmation dialog */}
        <AlertDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('predictions.unlockDialogTitle', 'Unlock Your Bracket?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('predictions.unlockDialogDescription', 'This will unlock your bracket so you can edit your predictions. You will need to confirm again before the tournament starts.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('common.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => onUnconfirm?.()}>
                {t('predictions.unlockAndEdit', 'Unlock & Edit')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" />
            {t('predictions.confirmBracket', 'Confirm Your Bracket')}
          </CardTitle>
          <CardDescription>
            {t('predictions.modeAExplanation', 'Mode A requires you to confirm your bracket before the tournament starts')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{t('predictions.predictionsCompleted', 'Predictions completed')}</span>
              <span className="font-medium">{predictionCount} / {totalMatches}</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {!isComplete && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('predictions.incompleteWarning', 'You have {{remaining}} matches left to predict. We recommend completing all predictions before confirming.', {
                  remaining: totalMatches - predictionCount
                })}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {t('predictions.confirmBenefit1', 'Your bracket will be permanently locked')}
            </p>
            <p className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              {t('predictions.confirmBenefit2', 'Other league members can view your predictions')}
            </p>
          </div>

          <Button 
            onClick={() => setShowConfirmDialog(true)}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('predictions.confirming', 'Confirming...')}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                {t('predictions.confirmMyBracket', 'Confirm My Bracket')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('predictions.confirmDialogTitle', 'Confirm Your Bracket?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('predictions.confirmDialogDescription', 'This action cannot be undone. Once confirmed, your predictions will be locked and visible to other league members after the tournament starts.')}
              {!isComplete && (
                <span className="block mt-2 text-destructive font-medium">
                  {t('predictions.confirmDialogWarning', 'Warning: You have {{remaining}} unpredicted matches.', {
                    remaining: totalMatches - predictionCount
                  })}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>
              {t('predictions.confirmAndLock', 'Confirm & Lock')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
