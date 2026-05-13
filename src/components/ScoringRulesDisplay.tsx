import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import type { StageMultipliers, GroupPositionBonuses } from './ScoringRulesCard';

interface ScoringRulesDisplayProps {
  exactScorePoints: number;
  outcomePoints: number;
  stageMultipliers: StageMultipliers;
  groupPositionBonuses: GroupPositionBonuses;
}

const STAGE_LABELS: Record<keyof StageMultipliers, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Finals',
  semi_final: 'Semi Finals',
  third_place: 'Third Place',
  final: 'Final',
};

export function ScoringRulesDisplay({
  exactScorePoints,
  outcomePoints,
  stageMultipliers,
  groupPositionBonuses,
}: ScoringRulesDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Scoring Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Match Scoring */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Match Scoring</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Exact Score</p>
              <p className="text-lg font-bold">{exactScorePoints} pts</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Correct Outcome</p>
              <p className="text-lg font-bold">{outcomePoints} pts</p>
            </div>
          </div>
        </div>

        {/* Stage Multipliers */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Stage Multipliers</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            {(Object.entries(stageMultipliers) as [keyof StageMultipliers, number][]).map(([stage, multiplier]) => (
              <div key={stage} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground text-xs">
                  {stage === 'round_of_32' ? 'R32' : 
                   stage === 'round_of_16' ? 'R16' :
                   stage === 'quarter_final' ? 'QF' :
                   stage === 'semi_final' ? 'SF' :
                   stage === 'third_place' ? '3rd' :
                   stage.charAt(0).toUpperCase() + stage.slice(1)}
                </span>
                <span className="font-semibold">{multiplier}×</span>
              </div>
            ))}
          </div>
        </div>

        {/* Group Position Bonuses */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Group Position Bonuses</h4>
          <p className="text-xs text-muted-foreground">
            Earned when your predicted group standings match the actual results
          </p>
          <div className="grid grid-cols-4 gap-2">
            {([
              [1, '🥇'],
              [2, '🥈'],
              [3, '🥉'],
              [4, '4️⃣'],
            ] as [1 | 2 | 3 | 4, string][]).map(([position, emoji]) => (
              <div key={position} className="text-center p-2 bg-muted/30 rounded">
                <span className="text-lg">{emoji}</span>
                <p className="font-semibold text-sm">{groupPositionBonuses[position]} pts</p>
              </div>
            ))}
          </div>
        </div>

        {/* Example */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <p className="font-medium text-primary mb-1">Example</p>
          <p className="text-muted-foreground">
            Predicting the Final score exactly earns{' '}
            <span className="font-semibold text-foreground">
              {exactScorePoints * stageMultipliers.final} pts
            </span>{' '}
            ({exactScorePoints} × {stageMultipliers.final}×)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
