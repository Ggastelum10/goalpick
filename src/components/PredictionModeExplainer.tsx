import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, RefreshCw, CheckCircle, AlertTriangle, Eye, Trophy, Calendar } from 'lucide-react';
import { PredictionMode } from '@/hooks/useLeagues';
import { cn } from '@/lib/utils';

interface PredictionModeExplainerProps {
  mode?: PredictionMode;
  variant?: 'full' | 'compact';
  className?: string;
}

export function PredictionModeExplainer({ 
  mode, 
  variant = 'full',
  className 
}: PredictionModeExplainerProps) {
  // Show both modes for selection context
  if (!mode) {
    return (
      <div className={cn("space-y-4", className)}>
        <ModeCard mode="start_to_finish" isSelected={false} variant={variant} />
        <ModeCard mode="update_every_stage" isSelected={false} variant={variant} />
      </div>
    );
  }

  return (
    <div className={className}>
      <ModeCard mode={mode} isSelected variant={variant} />
    </div>
  );
}

function ModeCard({ 
  mode, 
  isSelected, 
  variant 
}: { 
  mode: PredictionMode; 
  isSelected: boolean;
  variant: 'full' | 'compact';
}) {
  const isModeA = mode === 'start_to_finish';
  
  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        isSelected && "border-primary bg-primary/5"
      )}>
        {isModeA ? (
          <Lock className="h-5 w-5 text-primary mt-0.5" />
        ) : (
          <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {isModeA ? 'Mode A: Full Tournament Bracket' : 'Mode B: Phase-by-Phase Bracket'}
            </p>
            {isSelected && <Badge variant="outline" className="text-xs">Active</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {isModeA 
              ? 'All predictions locked at tournament start. Compare your picks vs real results as games are played.'
              : 'Predictions lock per phase. Re-predict future phases with actual qualifiers. Original picks saved for comparison.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(isSelected && "border-primary ring-1 ring-primary/20")}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {isModeA ? (
            <Lock className="h-5 w-5 text-primary" />
          ) : (
            <RefreshCw className="h-5 w-5 text-primary" />
          )}
          <CardTitle className="text-lg">
            {isModeA ? 'Mode A: Full Tournament Bracket' : 'Mode B: Phase-by-Phase Bracket'}
          </CardTitle>
          {isSelected && <Badge>Active</Badge>}
        </div>
        <CardDescription>
          {isModeA 
            ? 'Classic bracket challenge - predict everything upfront'
            : 'Dynamic bracket - update predictions as the tournament unfolds'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isModeA ? (
          <>
            <div className="space-y-3">
              <FeatureItem 
                icon={<Calendar className="h-4 w-4" />}
                title="Fill Out Entire Bracket"
                description="Predict all matches from group stage through the final before the tournament begins."
              />
              <FeatureItem 
                icon={<Lock className="h-4 w-4" />}
                title="Locked at Kickoff"
                description="Once the first match starts, your entire bracket is locked and cannot be changed."
              />
              <FeatureItem 
                icon={<Eye className="h-4 w-4" />}
                title="Compare View"
                description="Watch how your predictions compare to real results match-by-match as the tournament progresses."
              />
              <FeatureItem 
                icon={<Trophy className="h-4 w-4" />}
                title="Scoring"
                description="Earn 5 points for exact scores, 2 points for correct outcomes. Points multiply in later stages."
              />
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Important:</strong> Make sure to complete your entire bracket before the tournament starts! 
                  Unpredicted matches will earn 0 points.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <FeatureItem 
                icon={<Calendar className="h-4 w-4" />}
                title="Fill Entire Bracket or Phase-by-Phase"
                description="Optionally predict the full tournament upfront, or fill in each phase as teams qualify."
              />
              <FeatureItem 
                icon={<RefreshCw className="h-4 w-4" />}
                title="Update After Each Phase"
                description="When a phase ends, real qualifiers replace your predictions. Re-predict future matches with actual teams."
              />
              <FeatureItem 
                icon={<Eye className="h-4 w-4" />}
                title="Original Predictions Saved"
                description="Your initial bracket is archived. Compare your original picks against your updated predictions and real results."
              />
              <FeatureItem 
                icon={<Trophy className="h-4 w-4" />}
                title="Scoring"
                description="Points are based on your active predictions. If teams don't match and you don't update, you earn 0 points."
              />
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Tip:</strong> After each phase ends, check your predictions and update for the next round using 
                  the actual qualified teams. Original picks are always visible for comparison.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureItem({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
