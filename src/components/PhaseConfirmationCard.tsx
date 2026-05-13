import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { 
  KnockoutBracketData, 
  validateKnockoutPhase,
  getStageCompletion
} from '@/lib/knockoutBracketResolver';
import { KnockoutStage, KNOCKOUT_STAGES } from '@/lib/fifaBracketPairings';

interface PhaseConfirmationCardProps {
  stage: KnockoutStage;
  stageLabel: string;
  bracket: KnockoutBracketData;
  isConfirmed: boolean;
  isLocked: boolean;
  isPreviousComplete: boolean;
  onConfirm: () => void;
}

const STAGE_LABELS: Record<KnockoutStage, string> = {
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  third_place: '3rd Place Match',
  final: 'Final',
};

export function PhaseConfirmationCard({
  stage,
  stageLabel,
  bracket,
  isConfirmed,
  isLocked,
  isPreviousComplete,
  onConfirm,
}: PhaseConfirmationCardProps) {
  const validation = useMemo(() => 
    validateKnockoutPhase(bracket, stage),
    [bracket, stage]
  );
  
  const stats = useMemo(() => 
    getStageCompletion(bracket, stage),
    [bracket, stage]
  );
  
  const progressPercent = stats.total > 0 
    ? Math.round((validation.predictedCount / stats.total) * 100) 
    : 0;
  
  const errorCount = Object.keys(validation.matchErrors).length;
  const canConfirm = validation.isComplete && validation.isValid && !isConfirmed && !isLocked && isPreviousComplete;
  
  if (isConfirmed) {
    return (
      <Card className="bg-success/5 border-success/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-medium">{stageLabel}</span>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                Confirmed
              </Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.predicted}/{stats.total} matches
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isLocked || !isPreviousComplete) {
    return (
      <Card className="bg-muted/30 border-dashed opacity-60">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">{stageLabel}</span>
              <Badge variant="outline" className="text-muted-foreground">
                {!isPreviousComplete ? 'Complete previous stage' : 'Locked'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn(
      validation.isComplete && validation.isValid 
        ? "border-primary/50" 
        : errorCount > 0 
        ? "border-warning/50"
        : ""
    )}>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {stageLabel}
            {validation.isComplete && validation.isValid && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {validation.predictedCount}/{stats.total} matches
          </span>
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        <Progress value={progressPercent} className="h-2" />
        
        {errorCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {errorCount} match{errorCount > 1 ? 'es' : ''} need{errorCount === 1 ? 's' : ''} attention
            </span>
          </div>
        )}
        
        {validation.isComplete && !validation.isValid && (
          <div className="text-xs text-muted-foreground">
            Some matches have tied scores without penalty shootout. Enter penalties to determine winners.
          </div>
        )}
        
        {canConfirm && (
          <Button 
            onClick={onConfirm} 
            className="w-full gap-2"
            size="sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Confirm {stageLabel}
          </Button>
        )}
        
        {!validation.isComplete && !isLocked && isPreviousComplete && (
          <div className="text-xs text-muted-foreground">
            Complete all {stats.total - validation.predictedCount} remaining prediction{stats.total - validation.predictedCount !== 1 ? 's' : ''} to confirm this phase.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Phase progress overview showing all stages
 */
interface PhaseProgressOverviewProps {
  bracket: KnockoutBracketData;
  confirmedPhases: Record<KnockoutStage, boolean>;
  onConfirmPhase: (stage: KnockoutStage) => void;
  groupsConfirmed: boolean;
}

export function PhaseProgressOverview({
  bracket,
  confirmedPhases,
  onConfirmPhase,
  groupsConfirmed,
}: PhaseProgressOverviewProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Phase Progress</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {KNOCKOUT_STAGES.map((stage, idx) => {
          const prevStage = idx > 0 ? KNOCKOUT_STAGES[idx - 1] : null;
          const isPreviousComplete = prevStage 
            ? confirmedPhases[prevStage] 
            : groupsConfirmed;
          
          return (
            <PhaseConfirmationCard
              key={stage}
              stage={stage}
              stageLabel={STAGE_LABELS[stage]}
              bracket={bracket}
              isConfirmed={confirmedPhases[stage]}
              isLocked={false}
              isPreviousComplete={isPreviousComplete}
              onConfirm={() => onConfirmPhase(stage)}
            />
          );
        })}
      </div>
    </div>
  );
}
