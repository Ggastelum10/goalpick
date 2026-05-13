import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Minus, Trophy, Target, Eye } from 'lucide-react';
import { Match } from '@/hooks/useMatches';
import { LeaguePrediction, OriginalPrediction } from '@/hooks/useLeaguePredictions';
import { PredictionMode } from '@/hooks/useLeagues';
import { cn } from '@/lib/utils';

interface BracketComparisonViewProps {
  matches: Match[];
  predictions: LeaguePrediction[];
  originalPredictions: OriginalPrediction[];
  predictionMode: PredictionMode;
  // Phase 2: League-specific scoring rules
  exactScorePoints?: number;
  outcomePoints?: number;
  stageMultipliers?: Record<string, number>;
}

const stages = [
  { value: 'group', label: 'Group Stage' },
  { value: 'round_of_32', label: 'Round of 32' },
  { value: 'round_of_16', label: 'Round of 16' },
  { value: 'quarter_final', label: 'Quarter Finals' },
  { value: 'semi_final', label: 'Semi Finals' },
  { value: 'third_place', label: 'Third Place' },
  { value: 'final', label: 'Final' },
];

// Default stage multipliers
const DEFAULT_STAGE_MULTIPLIERS: Record<string, number> = {
  group: 1.0,
  round_of_32: 1.5,
  round_of_16: 2.0,
  quarter_final: 2.5,
  semi_final: 3.0,
  third_place: 3.0,
  final: 4.0,
};

function getPointsForPrediction(
  prediction: { predicted_home_score: number; predicted_away_score: number } | undefined,
  match: Match,
  exactScorePoints = 5,
  outcomePoints = 2,
  stageMultipliers?: Record<string, number>
): { points: number; basePoints: number; multiplier: number; type: 'exact' | 'outcome' | 'wrong' | 'pending' } {
  if (!prediction || match.home_score === null || match.away_score === null) {
    return { points: 0, basePoints: 0, multiplier: 1, type: 'pending' };
  }

  const predHome = prediction.predicted_home_score;
  const predAway = prediction.predicted_away_score;
  const actHome = match.home_score;
  const actAway = match.away_score;
  
  // Get stage multiplier
  const multipliers = stageMultipliers || DEFAULT_STAGE_MULTIPLIERS;
  const multiplier = multipliers[match.stage] ?? 1;

  // Exact score match
  if (predHome === actHome && predAway === actAway) {
    const basePoints = exactScorePoints;
    return { points: Math.round(basePoints * multiplier), basePoints, multiplier, type: 'exact' };
  }

  // Correct outcome
  const predOutcome = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
  const actOutcome = actHome > actAway ? 'home' : actHome < actAway ? 'away' : 'draw';

  if (predOutcome === actOutcome) {
    const basePoints = outcomePoints;
    return { points: Math.round(basePoints * multiplier), basePoints, multiplier, type: 'outcome' };
  }

  return { points: 0, basePoints: 0, multiplier, type: 'wrong' };
}

function MatchComparisonCard({
  match,
  prediction,
  originalPrediction,
  predictionMode,
  exactScorePoints = 5,
  outcomePoints = 2,
  stageMultipliers,
}: {
  match: Match;
  prediction?: LeaguePrediction;
  originalPrediction?: OriginalPrediction;
  predictionMode: PredictionMode;
  exactScorePoints?: number;
  outcomePoints?: number;
  stageMultipliers?: Record<string, number>;
}) {
  const hasResult = match.home_score !== null && match.away_score !== null;
  const currentPredResult = getPointsForPrediction(prediction, match, exactScorePoints, outcomePoints, stageMultipliers);
  const originalPredResult = getPointsForPrediction(originalPrediction, match, exactScorePoints, outcomePoints, stageMultipliers);

  // For Mode B, show original prediction comparison
  const showOriginalComparison = predictionMode === 'update_every_stage' && originalPrediction;
  // Check if prediction was updated from original
  const wasUpdated = showOriginalComparison && prediction && (
    prediction.predicted_home_score !== originalPrediction!.predicted_home_score ||
    prediction.predicted_away_score !== originalPrediction!.predicted_away_score
  );

  return (
    <Card className={cn(
      "transition-all",
      hasResult && currentPredResult.type === 'exact' && "ring-2 ring-green-500/50 bg-green-500/5",
      hasResult && currentPredResult.type === 'outcome' && "ring-1 ring-yellow-500/50 bg-yellow-500/5",
      hasResult && currentPredResult.type === 'wrong' && "bg-red-500/5"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Match header */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{match.group_name || match.stage}</span>
          {hasResult && (
            <Badge variant={currentPredResult.type === 'exact' ? 'default' : currentPredResult.type === 'outcome' ? 'secondary' : 'outline'} className="text-xs">
              {currentPredResult.type === 'exact' && '+5 pts'}
              {currentPredResult.type === 'outcome' && '+2 pts'}
              {currentPredResult.type === 'wrong' && '0 pts'}
            </Badge>
          )}
        </div>

        {/* Teams and scores grid */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
          {/* Home team */}
          <div className="text-right">
            <p className="font-medium text-sm truncate">{match.home_team}</p>
          </div>

          {/* Scores column */}
          <div className="flex flex-col items-center gap-1">
            {/* Real result */}
            {hasResult && (
              <div className="flex items-center gap-1.5 text-lg font-bold bg-primary/10 px-3 py-1 rounded">
                <span>{match.home_score}</span>
                <span className="text-muted-foreground">-</span>
                <span>{match.away_score}</span>
              </div>
            )}

            {/* Your prediction */}
            {prediction && (
              <div className="flex items-center gap-1.5 text-sm">
                {hasResult ? (
                  currentPredResult.type === 'exact' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : currentPredResult.type === 'outcome' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-yellow-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )
                ) : (
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={cn(
                  "font-medium",
                  !hasResult && "text-muted-foreground"
                )}>
                  {prediction.predicted_home_score} - {prediction.predicted_away_score}
                </span>
                <span className="text-xs text-muted-foreground">
                  {wasUpdated ? '(updated)' : '(your pick)'}
                </span>
              </div>
            )}

            {/* Original prediction (Mode B only) */}
            {showOriginalComparison && wasUpdated && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>
                  {originalPrediction!.predicted_home_score} - {originalPrediction!.predicted_away_score}
                </span>
                <span>(original)</span>
              </div>
            )}

            {/* No prediction made */}
            {!prediction && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Minus className="h-3.5 w-3.5" />
                <span>No prediction</span>
              </div>
            )}
          </div>

          {/* Away team */}
          <div className="text-left">
            <p className="font-medium text-sm truncate">{match.away_team}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BracketComparisonView({
  matches,
  predictions,
  originalPredictions,
  predictionMode,
  exactScorePoints = 5,
  outcomePoints = 2,
  stageMultipliers,
}: BracketComparisonViewProps) {
  // Calculate stats using league-specific scoring rules
  const stats = useMemo(() => {
    let totalPoints = 0;
    let exactMatches = 0;
    let outcomeMatches = 0;
    let wrongPredictions = 0;
    let pendingPredictions = 0;
    let predictedCount = 0;

    matches.forEach(match => {
      const prediction = predictions.find(p => p.match_id === match.id);
      if (!prediction) return;
      
      predictedCount++;
      const result = getPointsForPrediction(prediction, match, exactScorePoints, outcomePoints, stageMultipliers);
      totalPoints += result.points;
      
      if (result.type === 'exact') exactMatches++;
      else if (result.type === 'outcome') outcomeMatches++;
      else if (result.type === 'wrong') wrongPredictions++;
      else pendingPredictions++;
    });

    return { totalPoints, exactMatches, outcomeMatches, wrongPredictions, pendingPredictions, predictedCount };
  }, [matches, predictions, exactScorePoints, outcomePoints, stageMultipliers]);

  // Group matches by stage
  const matchesByStage = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    stages.forEach(s => {
      grouped[s.value] = matches.filter(m => m.stage === s.value);
    });
    return grouped;
  }, [matches]);

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">Total Points</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Exact</span>
            </div>
            <p className="text-2xl font-bold">{stats.exactMatches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Outcome</span>
            </div>
            <p className="text-2xl font-bold">{stats.outcomeMatches}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-sm">Predicted</span>
            </div>
            <p className="text-2xl font-bold">{stats.predictedCount}/{matches.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mode explanation */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Comparison View</p>
              <p className="text-sm text-muted-foreground">
                Your current predictions are shown, with original picks displayed for any matches you updated after seeing real results.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matches by stage */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto mb-4 sticky top-[64px] z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <TabsTrigger value="all">All Stages</TabsTrigger>
          {stages.map(stage => {
            const stageMatches = matchesByStage[stage.value] || [];
            if (stageMatches.length === 0) return null;
            return (
              <TabsTrigger key={stage.value} value={stage.value}>
                {stage.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-6">
              {stages.map(stage => {
                const stageMatches = matchesByStage[stage.value] || [];
                if (stageMatches.length === 0) return null;

                return (
                  <div key={stage.value} className="space-y-3">
                    <h3 className="font-semibold text-lg sticky top-[112px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-2 border-b border-border">
                      {stage.label}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {stageMatches.map(match => (
                        <MatchComparisonCard
                          key={match.id}
                          match={match}
                          prediction={predictions.find(p => p.match_id === match.id)}
                          originalPrediction={originalPredictions.find(p => p.match_id === match.id)}
                          predictionMode={predictionMode}
                          exactScorePoints={exactScorePoints}
                          outcomePoints={outcomePoints}
                          stageMultipliers={stageMultipliers}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </TabsContent>

        {stages.map(stage => {
          const stageMatches = matchesByStage[stage.value] || [];
          if (stageMatches.length === 0) return null;

          return (
            <TabsContent key={stage.value} value={stage.value}>
              <div className="grid gap-3 md:grid-cols-2">
                  {stageMatches.map(match => (
                    <MatchComparisonCard
                      key={match.id}
                      match={match}
                      prediction={predictions.find(p => p.match_id === match.id)}
                      originalPrediction={originalPredictions.find(p => p.match_id === match.id)}
                      predictionMode={predictionMode}
                      exactScorePoints={exactScorePoints}
                      outcomePoints={outcomePoints}
                      stageMultipliers={stageMultipliers}
                    />
                  ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
