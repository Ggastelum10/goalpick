import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RotateCcw, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export interface StageMultipliers {
  group: number;
  round_of_32: number;
  round_of_16: number;
  quarter_final: number;
  semi_final: number;
  third_place: number;
  final: number;
}

export interface GroupPositionBonuses {
  1: number;
  2: number;
  3: number;
  4: number;
}

export interface ScoringRulesData {
  exact_score_points: number;
  outcome_points: number;
  stage_multipliers: StageMultipliers;
  group_position_bonuses: GroupPositionBonuses;
}

export const DEFAULT_SCORING_RULES: ScoringRulesData = {
  exact_score_points: 5,
  outcome_points: 2,
  stage_multipliers: {
    group: 1.0,
    round_of_32: 1.5,
    round_of_16: 2.0,
    quarter_final: 2.5,
    semi_final: 3.0,
    third_place: 3.0,
    final: 4.0,
  },
  group_position_bonuses: {
    1: 10,
    2: 7,
    3: 4,
    4: 2,
  },
};

// Validation limits
const LIMITS = {
  exact_score: { min: 1, max: 20 },
  outcome: { min: 1, max: 10 },
  multiplier: { min: 0.5, max: 10 },
  bonus: { min: 0, max: 50 },
};

interface ScoringRulesCardProps {
  value: ScoringRulesData;
  onChange: (data: ScoringRulesData) => void;
}

export function ScoringRulesCard({ value, onChange }: ScoringRulesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const isCustom = JSON.stringify(value) !== JSON.stringify(DEFAULT_SCORING_RULES);

  const handleReset = () => {
    onChange(DEFAULT_SCORING_RULES);
  };

  const clamp = (val: number, min: number, max: number) => {
    if (isNaN(val)) return min;
    return Math.max(min, Math.min(max, val));
  };

  const updateExactScore = (val: number) => {
    onChange({ ...value, exact_score_points: clamp(val, LIMITS.exact_score.min, LIMITS.exact_score.max) });
  };

  const updateOutcome = (val: number) => {
    onChange({ ...value, outcome_points: clamp(val, LIMITS.outcome.min, LIMITS.outcome.max) });
  };

  const updateMultiplier = (stage: keyof StageMultipliers, val: number) => {
    onChange({
      ...value,
      stage_multipliers: {
        ...value.stage_multipliers,
        [stage]: clamp(val, LIMITS.multiplier.min, LIMITS.multiplier.max),
      },
    });
  };

  const updateBonus = (position: 1 | 2 | 3 | 4, val: number) => {
    onChange({
      ...value,
      group_position_bonuses: {
        ...value.group_position_bonuses,
        [position]: clamp(val, LIMITS.bonus.min, LIMITS.bonus.max),
      },
    });
  };

  // Sample calculation for preview
  const sampleGroupExact = value.exact_score_points * value.stage_multipliers.group;
  const sampleFinalExact = value.exact_score_points * value.stage_multipliers.final;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <CardTitle>{t('leagues.scoringRules.title')}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm px-2 py-0.5 rounded-full",
                  isCustom ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {isCustom ? t('leagues.scoringRules.custom') : t('leagues.scoringRules.default')}
                </span>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
            <CardDescription>
              {t('leagues.scoringRules.description')}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Match Scoring */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t('leagues.scoringRules.matchScoring')}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exact_score" className="text-sm text-muted-foreground">
                    {t('leagues.scoringRules.exactScore')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="exact_score"
                      type="number"
                      min={LIMITS.exact_score.min}
                      max={LIMITS.exact_score.max}
                      value={value.exact_score_points}
                      onChange={(e) => updateExactScore(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">{t('leagues.scoringRules.pts')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outcome" className="text-sm text-muted-foreground">
                    {t('leagues.scoringRules.correctOutcome')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="outcome"
                      type="number"
                      min={LIMITS.outcome.min}
                      max={LIMITS.outcome.max}
                      value={value.outcome_points}
                      onChange={(e) => updateOutcome(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">{t('leagues.scoringRules.pts')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Multipliers */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t('leagues.scoringRules.stageMultipliers')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  ['group', 'group'],
                  ['round_of_32', 'r32'],
                  ['round_of_16', 'r16'],
                  ['quarter_final', 'qf'],
                  ['semi_final', 'sf'],
                  ['third_place', 'thirdPlace'],
                  ['final', 'final'],
                ] as [keyof StageMultipliers, string][]).map(([key, labelKey]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t(`leagues.scoringRules.stages.${labelKey}`)}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={LIMITS.multiplier.min}
                        max={LIMITS.multiplier.max}
                        step="0.5"
                        value={value.stage_multipliers[key]}
                        onChange={(e) => updateMultiplier(key, Number(e.target.value))}
                        className="w-16 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">×</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group Position Bonuses */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t('leagues.scoringRules.bonuses.title')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('leagues.scoringRules.bonuses.help')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  [1, 'first'],
                  [2, 'second'],
                  [3, 'third'],
                  [4, 'fourth'],
                ] as [1 | 2 | 3 | 4, string][]).map(([position, labelKey]) => (
                  <div key={position} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t(`leagues.scoringRules.bonuses.${labelKey}`)}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={LIMITS.bonus.min}
                        max={LIMITS.bonus.max}
                        value={value.group_position_bonuses[position]}
                        onChange={(e) => updateBonus(position, Number(e.target.value))}
                        className="w-16 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">{t('leagues.scoringRules.pts')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Calculation Preview */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p className="font-medium text-muted-foreground">{t('leagues.scoringRules.example.title')}</p>
              <p>
                {t('leagues.scoringRules.example.group')} <span className="font-semibold">{sampleGroupExact} {t('leagues.scoringRules.pts')}</span>
              </p>
              <p>
                {t('leagues.scoringRules.example.final')} <span className="font-semibold">{sampleFinalExact} {t('leagues.scoringRules.pts')}</span>
              </p>
            </div>

            {/* Reset Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isCustom}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {t('leagues.scoringRules.reset')}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
