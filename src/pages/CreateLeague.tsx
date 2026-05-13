import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { useCreateLeague, usePurchaseLicenses } from '@/hooks/useLeagues';
import { ScoringRulesCard, DEFAULT_SCORING_RULES } from '@/components/ScoringRulesCard';
import type { ScoringRulesData } from '@/components/ScoringRulesCard';
import { PlatformFeesCard } from '@/components/PlatformFeesCard';
import { useEnabledGameModes } from '@/hooks/useGameModes';

import type { PredictionMode } from '@/hooks/useLeagues';

const initialFormData = {
  name: '',
  description: '',
  entry_fee: 50,
  expected_members: 10,
  currency: 'MXN',
  first_place_percentage: 70,
  second_place_percentage: 20,
  third_place_percentage: 10,
  is_public: false,
  prediction_mode: '' as PredictionMode,
  cover_member_fees: false,
};

const initialScoringRules: ScoringRulesData = DEFAULT_SCORING_RULES;

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Trophy, Users, Loader2, Info, Lock, Globe, Gamepad2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function CreateLeague() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createLeague = useCreateLeague();
  const purchaseLicenses = usePurchaseLicenses();
  const { data: enabledGameModes = [], isLoading: isLoadingModes } = useEnabledGameModes();

  const [formData, setFormData] = useState(initialFormData);
  const [scoringRules, setScoringRules] = useState<ScoringRulesData>(initialScoringRules);

  // Reset form when component mounts (handles browser back button)
  useEffect(() => {
    setFormData(initialFormData);
    setScoringRules(initialScoringRules);
  }, []);

  // Auto-select first enabled game mode when modes are loaded
  useEffect(() => {
    if (enabledGameModes.length > 0 && !formData.prediction_mode) {
      setFormData(prev => ({
        ...prev,
        prediction_mode: enabledGameModes[0].code as PredictionMode
      }));
    }
  }, [enabledGameModes, formData.prediction_mode]);

  // Auto-calculate prize pool based on entry fee and expected members
  const calculatedPrizePool = formData.entry_fee * formData.expected_members;

  // Calculate individual prize amounts
  const firstPlacePrize = (calculatedPrizePool * formData.first_place_percentage) / 100;
  const secondPlacePrize = (calculatedPrizePool * formData.second_place_percentage) / 100;
  const thirdPlacePrize = (calculatedPrizePool * formData.third_place_percentage) / 100;

  const handlePrizeDistribution = (place: 'first' | 'second', value: number) => {
    // Clamp value to valid range
    const clampedValue = Math.max(0, Math.min(100, value));
    
    let first = formData.first_place_percentage;
    let second = formData.second_place_percentage;
    let third = formData.third_place_percentage;
    
    if (place === 'first') {
      first = clampedValue;
      // Calculate remaining for 2nd and 3rd
      const remaining = 100 - first;
      
      if (second + third > remaining) {
        // Proportionally reduce 2nd and 3rd, keeping their ratio
        const totalOthers = second + third;
        if (totalOthers > 0) {
          const ratio = second / totalOthers;
          second = Math.round(remaining * ratio);
          third = remaining - second;
        } else {
          second = 0;
          third = remaining;
        }
      } else if (second + third < remaining) {
        // Give extra to 3rd place
        third = remaining - second;
      }
    } else if (place === 'second') {
      // 2nd place max is whatever is left after 1st
      const maxSecond = 100 - first;
      second = Math.max(0, Math.min(maxSecond, clampedValue));
      // 3rd gets the remainder
      third = 100 - first - second;
    }
    
    // Final safety clamps - ensure no negative values
    first = Math.max(0, first);
    second = Math.max(0, second);
    third = Math.max(0, third);
    
    setFormData({
      ...formData,
      first_place_percentage: first,
      second_place_percentage: second,
      third_place_percentage: third,
    });
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    navigate('/leagues');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('leagues.create.toasts.nameRequired'));
      return;
    }

    const total = formData.first_place_percentage + formData.second_place_percentage + formData.third_place_percentage;
    if (Math.abs(total - 100) > 0.1) {
      toast.error(t('leagues.create.toasts.totalMustBe100'));
      return;
    }

    // Validate game mode is selected and valid
    if (!formData.prediction_mode) {
      toast.error(t('leagues.create.toasts.noModesContact'));
      return;
    }

    const isValidMode = enabledGameModes.some(mode => mode.code === formData.prediction_mode);
    if (!isValidMode) {
      toast.error(t('leagues.create.toasts.modeUnavailable'));
      return;
    }

    try {
      const result = await createLeague.mutateAsync({
        ...formData,
        first_place_percentage: Math.round(formData.first_place_percentage),
        second_place_percentage: Math.round(formData.second_place_percentage),
        third_place_percentage: Math.round(formData.third_place_percentage),
        exact_score_points: scoringRules.exact_score_points,
        outcome_points: scoringRules.outcome_points,
        stage_multipliers: scoringRules.stage_multipliers,
        group_position_bonuses: scoringRules.group_position_bonuses,
        owner_covers_fees: formData.cover_member_fees,
      });
      
      // If owner wants to cover fees, redirect to Stripe to purchase licenses
      if (formData.cover_member_fees && formData.expected_members > 1) {
        const licenseCount = formData.expected_members - 1; // Minus owner
        const purchaseResult = await purchaseLicenses.mutateAsync({
          leagueId: result.league.id,
          licenseCount,
        });
        
        // If we get a URL, Stripe will handle the redirect
        if (!purchaseResult.url) {
          navigate(`/leagues/${result.league.id}`);
        }
      } else {
        navigate(`/leagues/${result.league.id}`);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leagues')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('leagues.create.header.title')}</h1>
            <p className="text-muted-foreground">{t('leagues.create.header.subtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('leagues.create.details.title')}
              </CardTitle>
              <CardDescription>{t('leagues.create.details.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('leagues.create.details.name')}</Label>
                <Input
                  id="name"
                  placeholder={t('leagues.create.details.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('leagues.create.details.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('leagues.create.details.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">{t('leagues.create.type.label')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                      !formData.is_public ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                    )}
                    onClick={() => setFormData({ ...formData, is_public: false })}
                  >
                    <div className={cn(
                      "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      !formData.is_public ? "border-primary" : "border-muted-foreground/40"
                    )}>
                      {!formData.is_public && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="font-medium text-sm">{t('leagues.create.type.private')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('leagues.create.type.privateDesc')}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                      formData.is_public ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                    )}
                    onClick={() => setFormData({ ...formData, is_public: true })}
                  >
                    <div className={cn(
                      "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      formData.is_public ? "border-primary" : "border-muted-foreground/40"
                    )}>
                      {formData.is_public && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        <span className="font-medium text-sm">{t('leagues.create.type.public')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('leagues.create.type.publicDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Mode Selector - only show when multiple modes are enabled */}
          {enabledGameModes.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  {t('leagues.create.gameMode.title')}
                </CardTitle>
                <CardDescription>
                  {t('leagues.create.gameMode.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enabledGameModes.map((mode) => (
                    <div
                      key={mode.id}
                      className={cn(
                        "relative flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                        formData.prediction_mode === mode.code 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-muted-foreground/50"
                      )}
                      onClick={() => setFormData({ ...formData, prediction_mode: mode.code as PredictionMode })}
                    >
                      <div className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        formData.prediction_mode === mode.code ? "border-primary" : "border-muted-foreground/40"
                      )}>
                        {formData.prediction_mode === mode.code && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="font-medium text-sm">{mode.name}</span>
                        {mode.description && (
                          <p className="text-xs text-muted-foreground">
                            {mode.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning when no game modes are available */}
          {!isLoadingModes && enabledGameModes.length === 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{t('leagues.create.gameMode.noneAvailable')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {t('leagues.create.entry.title')}
              </CardTitle>
              <CardDescription>
                {t('leagues.create.entry.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="entry_fee">{t('leagues.create.entry.entryFee')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p>{t('leagues.create.entry.entryFeeTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="entry_fee"
                    type="number"
                    min="0"
                    step="10"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">{t('leagues.create.entry.perMember')}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="expected_members">{t('leagues.create.entry.size')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p>{t('leagues.create.entry.sizeTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="expected_members"
                    type="number"
                    min="3"
                    step="1"
                    value={formData.expected_members}
                    onChange={(e) => setFormData({ ...formData, expected_members: Math.max(3, Number(e.target.value)) })}
                  />
                  <p className="text-xs text-muted-foreground">{t('leagues.create.entry.expectedMembers')}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="prize_pool">{t('leagues.create.entry.prizePool')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p>{t('leagues.create.entry.prizePoolTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted flex items-center">
                    <span className="font-medium">{calculatedPrizePool.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('leagues.create.entry.autoCalculated')}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="currency">{t('leagues.create.entry.currency')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p>{t('leagues.create.entry.currencyTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger id="currency">
                      <SelectValue placeholder={t('leagues.create.entry.selectCurrency')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">{t('leagues.create.currencies.MXN')}</SelectItem>
                      <SelectItem value="USD">{t('leagues.create.currencies.USD')}</SelectItem>
                      <SelectItem value="EUR">{t('leagues.create.currencies.EUR')}</SelectItem>
                      <SelectItem value="GBP">{t('leagues.create.currencies.GBP')}</SelectItem>
                      <SelectItem value="CAD">{t('leagues.create.currencies.CAD')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>{t('leagues.create.prizeDistribution.label')}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={formData.first_place_percentage === 70 && formData.second_place_percentage === 20 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, first_place_percentage: 70, second_place_percentage: 20, third_place_percentage: 10 })}
                    >
                      70/20/10
                    </Button>
                    <Button
                      type="button"
                      variant={formData.first_place_percentage === 60 && formData.second_place_percentage === 25 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, first_place_percentage: 60, second_place_percentage: 25, third_place_percentage: 15 })}
                    >
                      60/25/15
                    </Button>
                    <Button
                      type="button"
                      variant={formData.first_place_percentage === 50 && formData.second_place_percentage === 30 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, first_place_percentage: 50, second_place_percentage: 30, third_place_percentage: 20 })}
                    >
                      50/30/20
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-yellow-500">🥇</span> {t('leagues.create.prizeDistribution.first')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {formData.currency} {firstPlacePrize.toLocaleString()}
                        </span>
                        <span className="font-medium w-12 text-right">{Math.round(formData.first_place_percentage)}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[formData.first_place_percentage]}
                      onValueChange={([value]) => handlePrizeDistribution('first', value)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-gray-400">🥈</span> {t('leagues.create.prizeDistribution.second')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {formData.currency} {secondPlacePrize.toLocaleString()}
                        </span>
                        <span className="font-medium w-12 text-right">{Math.round(formData.second_place_percentage)}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[formData.second_place_percentage]}
                      onValueChange={([value]) => handlePrizeDistribution('second', value)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-amber-600">🥉</span> {t('leagues.create.prizeDistribution.third')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {formData.currency} {thirdPlacePrize.toLocaleString()}
                        </span>
                        <span className="font-medium w-12 text-right">{Math.round(formData.third_place_percentage)}%</span>
                      </div>
                    </div>
                    <Slider
                      value={[formData.third_place_percentage]}
                      min={0}
                      max={100}
                      step={5}
                      disabled
                    />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {t('leagues.create.prizeDistribution.total', { value: Math.round(formData.first_place_percentage + formData.second_place_percentage + formData.third_place_percentage) })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Rules */}
          <ScoringRulesCard value={scoringRules} onChange={setScoringRules} />

          {/* Platform Fees */}
          <PlatformFeesCard 
            expectedMembers={formData.expected_members}
            coverMemberFees={formData.cover_member_fees}
            onCoverMemberFeesChange={(checked) => setFormData({ ...formData, cover_member_fees: checked })}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              {t('leagues.create.actions.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createLeague.isPending || isLoadingModes || enabledGameModes.length === 0}
            >
              {createLeague.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('leagues.create.actions.creating')}
                </>
              ) : (
                t('leagues.create.actions.create')
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
