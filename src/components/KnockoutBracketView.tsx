import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Match } from '@/hooks/useMatches';
import { Prediction } from '@/hooks/usePredictions';
import { buildKnockoutBracket, getStageCompletion, isGroupStageComplete, getNextIncompleteStage, validateKnockoutPhase, ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { KNOCKOUT_STAGES, KnockoutStage } from '@/lib/fifaBracketPairings';
import { KnockoutMatchNode } from './KnockoutMatchNode';
import { FullBracketView } from './FullBracketView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, AlertTriangle, ChevronRight, ChevronLeft, Crown, Lock, CheckCircle2, LayoutGrid, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupStanding } from '@/lib/bracketSimulation';
import { TieResolutionModal, computeTiedGroupsData } from './TieResolutionModal';
import { RoundOpeningCard } from './RoundOpeningCard';
import { computeRoundAvailability, STAGE_PREDECESSOR } from '@/lib/tournamentTime';
import type { PredictionMode } from '@/hooks/useLeagues';

interface KnockoutBracketViewProps {
  matches: Match[];
  predictions: Prediction[];
  confirmedStandings?: Record<string, string[]>;
  tiebreakOverrides?: Record<string, string[]>;
  onMatchClick: (match: Match | null, resolvedMatch: ResolvedMatch) => void;
  onGoToGroups?: () => void;
  onConfirmMultipleGroups?: (resolutions: Record<string, string[]>) => void;
  groupStandings?: Record<string, GroupStanding[]>;
  leagueId?: string;
  confirmedPhases?: Record<string, boolean>;
  onConfirmPhase?: (stage: KnockoutStage) => void;
  groupsConfirmed?: boolean;
  onStageChangeNotify?: (stage: KnockoutStage) => void;
  onKnockoutPredictionChange?: (stage: KnockoutStage) => void;
  isLeagueLocked?: boolean;
  /**
   * League prediction mode. When `update_every_stage` (Phase-by-Phase),
   * each knockout round is gated on the previous tournament round having
   * actually finished — see `computeRoundAvailability`.
   */
  predictionMode?: PredictionMode;
}

// Stage labels are now handled via translation keys
const STAGE_LABEL_KEYS: Record<KnockoutStage, string> = {
  round_of_32: 'knockoutView.roundOf32',
  round_of_16: 'knockoutView.roundOf16',
  quarter_final: 'knockoutView.quarterFinals',
  semi_final: 'knockoutView.semiFinals',
  third_place: 'knockoutView.thirdPlace',
  final: 'knockoutView.final',
};

const STAGE_SHORT_LABELS: Record<KnockoutStage, string> = {
  round_of_32: 'R32',
  round_of_16: 'R16',
  quarter_final: 'QF',
  semi_final: 'SF',
  third_place: '3rd',
  final: 'Final',
};

type ViewMode = 'full' | 'stage';

export function KnockoutBracketView({ 
  matches, 
  predictions, 
  confirmedStandings,
  tiebreakOverrides,
  onMatchClick,
  onGoToGroups,
  onConfirmMultipleGroups,
  groupStandings,
  leagueId,
  confirmedPhases,
  onConfirmPhase,
  groupsConfirmed,
  onStageChangeNotify,
  onKnockoutPredictionChange,
  isLeagueLocked,
  predictionMode,
}: KnockoutBracketViewProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('stage');
  const [selectedStage, setSelectedStageInternal] = useState<KnockoutStage>('round_of_32');
  
  const setSelectedStage = (stage: KnockoutStage) => {
    setSelectedStageInternal(stage);
    onStageChangeNotify?.(stage);
  };
  const [showTieModal, setShowTieModal] = useState(false);
  
  const bracket = useMemo(() => 
    buildKnockoutBracket(matches, predictions, confirmedStandings, tiebreakOverrides, predictionMode),
    [matches, predictions, confirmedStandings, tiebreakOverrides, predictionMode]
  );
  
  const groupsComplete = useMemo(() => 
    isGroupStageComplete(bracket.standings),
    [bracket.standings]
  );
  
  // Check for unconfirmed ties that need resolution
  const unconfirmedTiedGroups = useMemo(() => {
    if (!confirmedStandings) return [];
    
    const groupMatches = matches.filter(m => m.stage === 'group');
    const groups: Record<string, { matches: string[]; hasTies: boolean; isComplete: boolean }> = {};
    
    // Group matches by group name
    groupMatches.forEach(match => {
      const groupName = match.group_name || 'Unknown';
      if (!groups[groupName]) {
        groups[groupName] = { matches: [], hasTies: false, isComplete: false };
      }
      groups[groupName].matches.push(match.id);
    });
    
    // Check each group for ties and completion
    const unconfirmed: string[] = [];
    for (const [groupName, groupData] of Object.entries(groups)) {
      const predictedCount = predictions.filter(p => groupData.matches.includes(p.match_id)).length;
      const isComplete = predictedCount === groupData.matches.length;
      
      if (!isComplete) continue;
      
      // Check if group has ties by examining standings
      const groupStandings = bracket.standings[groupName];
      if (!groupStandings) continue;
      
      // Simple tie detection - check consecutive teams with same points/GD/GF
      let hasTies = false;
      for (let i = 0; i < groupStandings.length - 1; i++) {
        const curr = groupStandings[i];
        const next = groupStandings[i + 1];
        if (
          curr.points === next.points &&
          curr.goalDiff === next.goalDiff &&
          curr.goalsFor === next.goalsFor
        ) {
          hasTies = true;
          break;
        }
      }
      
      if (hasTies && !confirmedStandings[groupName]) {
        unconfirmed.push(groupName);
      }
    }
    
    return unconfirmed.sort();
  }, [matches, predictions, bracket.standings, confirmedStandings]);
  
  // Stage progress stats
  const stageStats = useMemo(() => {
    const stats: Record<KnockoutStage, { predicted: number; total: number; ready: boolean }> = {} as any;
    for (const stage of KNOCKOUT_STAGES) {
      stats[stage] = getStageCompletion(bracket, stage);
    }
    return stats;
  }, [bracket]);
  
  // Auto-select the next incomplete stage only on initial mount
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (groupsComplete && !hasAutoSelected.current) {
      const nextStage = getNextIncompleteStage(bracket);
      setSelectedStage(nextStage);
      hasAutoSelected.current = true;
    }
  }, [groupsComplete, bracket]);
  
  // Compute tied groups data for the modal (must be before early returns)
  const tiedGroupsData = useMemo(() => {
    if (!groupStandings || unconfirmedTiedGroups.length === 0) return [];
    return computeTiedGroupsData(groupStandings, unconfirmedTiedGroups);
  }, [groupStandings, unconfirmedTiedGroups]);

  // Find actual match from matches array
  const findActualMatch = (matchId: string): Match | null => {
    return matches.find(m => m.id === matchId) || null;
  };
  
  if (!groupsComplete) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-full bg-muted">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t('knockoutBracket.completeGroupFirst')}</h3>
              <p className="text-muted-foreground mt-1 max-w-md">
                {t('knockoutBracket.completeGroupFirstDesc')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }



  // Handle bulk confirmation from modal
  const handleTieResolution = (resolutions: Record<string, string[]>) => {
    if (onConfirmMultipleGroups) {
      onConfirmMultipleGroups(resolutions);
    }
  };

  // Show warning for unconfirmed tied groups
  if (unconfirmedTiedGroups.length > 0) {
    return (
      <>
        <Card className="border-dashed border-2 border-warning/50">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-4 rounded-full bg-warning/10">
                <AlertTriangle className="h-10 w-10 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('knockoutBracket.confirmGroupStandings')}</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
                  {t('knockoutBracket.confirmGroupStandingsDesc')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {unconfirmedTiedGroups.map(group => (
                    <Badge key={group} variant="outline" className="bg-warning/10 border-warning/30">
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                {onConfirmMultipleGroups && tiedGroupsData.length > 0 && (
                  <Button onClick={() => setShowTieModal(true)} className="gap-2">
                    <ListChecks className="h-4 w-4" />
                    {t('knockoutBracket.resolveTies')}
                  </Button>
                )}
                {onGoToGroups && (
                  <Button onClick={onGoToGroups} variant="outline" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    {t('knockoutBracket.goToGroupsView')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {tiedGroupsData.length > 0 && (
          <TieResolutionModal
            open={showTieModal}
            onOpenChange={setShowTieModal}
            tiedGroups={tiedGroupsData}
            onConfirm={handleTieResolution}
          />
        )}
      </>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Champion display */}
      {bracket.champion && (
        <Card className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent animate-pulse" />
          <CardContent className="py-5 relative">
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
                <Trophy className="h-4 w-4" />
                <span className="text-xs font-semibold tracking-wider uppercase">{t('knockoutBracket.worldCupChampion')}</span>
                <Trophy className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              {bracket.champion.flag && (
                <img 
                  src={bracket.champion.flag} 
                  alt={bracket.champion.name}
                  className="w-12 h-8 object-cover rounded shadow-lg ring-2 ring-yellow-500/30"
                />
              )}
              <span className="font-bold text-2xl">{bracket.champion.name}</span>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              {t('knockoutBracket.yourPredictedWinner')}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* View mode toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          <Button
            variant={viewMode === 'stage' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('stage')}
          >
            {t('knockoutBracket.byStage')}
          </Button>
          <Button
            variant={viewMode === 'full' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('full')}
          >
            {t('knockoutBracket.fullBracket')}
          </Button>
        </div>
        
        {/* Stage progress summary - condensed for header */}
        <div className="flex gap-1 flex-wrap">
          {KNOCKOUT_STAGES.map((stage) => {
            const stats = stageStats[stage];
            const isComplete = stats.predicted === stats.total && stats.total > 0;
            const isPhaseConfirmed = confirmedPhases?.[stage] ?? false;
            return (
              <Badge 
                key={stage}
                variant={isPhaseConfirmed ? 'default' : isComplete ? 'secondary' : 'outline'}
                className={cn("gap-0.5 text-xs", isPhaseConfirmed && "bg-primary")}
              >
                {isPhaseConfirmed && <CheckCircle2 className="h-3 w-3" />}
                {STAGE_SHORT_LABELS[stage]}
              </Badge>
            );
          })}
        </div>
      </div>
      
      {viewMode === 'stage' ? (
        <StageView 
          bracket={bracket}
          matches={matches}
          selectedStage={selectedStage}
          onStageChange={setSelectedStage}
          stageStats={stageStats}
          leagueId={leagueId}
          confirmedPhases={confirmedPhases}
          onConfirmPhase={onConfirmPhase}
          groupsConfirmed={groupsConfirmed}
          onKnockoutPredictionChange={onKnockoutPredictionChange}
          isLeagueLocked={isLeagueLocked}
          predictionMode={predictionMode}
          onMatchClick={(resolvedMatch) => {
            onMatchClick(findActualMatch(resolvedMatch.matchId), resolvedMatch);
          }}
        />
      ) : (
        <FullBracketView 
          bracket={bracket}
          leagueId={leagueId}
          onMatchClick={(resolvedMatch) => {
            onMatchClick(findActualMatch(resolvedMatch.matchId), resolvedMatch);
          }}
        />
      )}
    </div>
  );
}

// Stage-by-stage view
function StageView({ 
  bracket, 
  matches,
  selectedStage, 
  onStageChange,
  stageStats,
  leagueId,
  confirmedPhases,
  onConfirmPhase,
  groupsConfirmed,
  onKnockoutPredictionChange,
  isLeagueLocked,
  predictionMode,
  onMatchClick 
}: {
  bracket: ReturnType<typeof buildKnockoutBracket>;
  matches: Match[];
  selectedStage: KnockoutStage;
  onStageChange: (stage: KnockoutStage) => void;
  stageStats: Record<KnockoutStage, { predicted: number; total: number; ready: boolean }>;
  leagueId?: string;
  confirmedPhases?: Record<string, boolean>;
  onConfirmPhase?: (stage: KnockoutStage) => void;
  groupsConfirmed?: boolean;
  onKnockoutPredictionChange?: (stage: KnockoutStage) => void;
  isLeagueLocked?: boolean;
  predictionMode?: PredictionMode;
  onMatchClick: (match: ResolvedMatch) => void;
}) {
  const { t } = useTranslation();
  const currentMatches = bracket[selectedStage];
  const stats = stageStats[selectedStage];
  
  const stageOrder: KnockoutStage[] = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
  const currentIndex = stageOrder.indexOf(selectedStage);
  const previousStage = currentIndex > 0 ? stageOrder[currentIndex - 1] : null;

  // Phase-by-Phase mode: gate each round on the previous tournament round
  // having actually finished in real life. Recomputed every render so it
  // unlocks live as match statuses flip to 'finished' (or the +2h cutoff passes).
  const isPhaseByPhase = predictionMode === 'update_every_stage';

  // `tick` increments whenever the wall-clock crosses a stage's `opensAt`,
  // forcing the availability memos below to recompute and the UI to unlock
  // without needing a refetch or stage change. Implemented as a single
  // self-rescheduling timeout — no continuous polling.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isPhaseByPhase) return;
    const now = Date.now();
    let nextOpenMs = Infinity;
    for (const s of stageOrder) {
      const avail = computeRoundAvailability(matches, s);
      if (!avail.isOpen && avail.opensAt) {
        const ms = avail.opensAt.getTime();
        if (ms > now && ms < nextOpenMs) nextOpenMs = ms;
      }
    }
    if (nextOpenMs === Infinity) return;
    // Cap at 24h to be safe against very large delays / setTimeout overflow,
    // and add a tiny buffer so we land just past the boundary.
    const delay = Math.min(nextOpenMs - now + 250, 24 * 60 * 60 * 1000);
    const timer = setTimeout(() => setTick((t) => t + 1), delay);
    return () => clearTimeout(timer);
  }, [isPhaseByPhase, matches, tick]);

  const roundAvailability = useMemo(
    () => (isPhaseByPhase ? computeRoundAvailability(matches, selectedStage) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPhaseByPhase, matches, selectedStage, tick]
  );
  const isRoundLockedByTournament = isPhaseByPhase && roundAvailability ? !roundAvailability.isOpen : false;

  // Per-stage availability (used to mark stage-selector buttons as locked)
  const stageAvailability = useMemo(() => {
    if (!isPhaseByPhase) return null;
    const map: Partial<Record<KnockoutStage, boolean>> = {};
    for (const s of stageOrder) {
      map[s] = computeRoundAvailability(matches, s).isOpen;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhaseByPhase, matches, tick]);
  
  // Phase confirmation logic
  const isCurrentPhaseConfirmed = confirmedPhases?.[selectedStage] ?? false;
  const isPreviousPhaseConfirmed = previousStage 
    ? (confirmedPhases?.[previousStage] ?? false) 
    : (groupsConfirmed ?? true);
  
  // Validate current phase for the confirm button
  const phaseValidation = useMemo(() => 
    validateKnockoutPhase(bracket, selectedStage),
    [bracket, selectedStage]
  );
  
  const canConfirmPhase =
    phaseValidation.isComplete &&
    phaseValidation.isValid &&
    !isCurrentPhaseConfirmed &&
    isPreviousPhaseConfirmed &&
    !isRoundLockedByTournament;
  
  // Stage is locked if previous phase not confirmed (when phase confirmation is active)
  const isPreviousComplete = previousStage 
    ? (confirmedPhases 
        ? (confirmedPhases[previousStage] ?? false)
        : stageStats[previousStage].predicted === stageStats[previousStage].total && stageStats[previousStage].total > 0)
    : (confirmedPhases ? (groupsConfirmed ?? true) : true);
  
  return (
    <div className="space-y-4">
      {/* Stage selector buttons */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {KNOCKOUT_STAGES.map((stage) => {
            const stageStat = stageStats[stage];
            const isActive = stage === selectedStage;
            const stageIdx = stageOrder.indexOf(stage);
            const prevStage = stageIdx > 0 ? stageOrder[stageIdx - 1] : null;
            const isPhaseConfirmed = confirmedPhases?.[stage] ?? false;
            const isLockedByConfirmation = confirmedPhases
              ? prevStage 
                ? !(confirmedPhases[prevStage] ?? false)
                : !(groupsConfirmed ?? true)
              : prevStage 
                ? !(stageStats[prevStage].predicted === stageStats[prevStage].total && stageStats[prevStage].total > 0)
                : false;
            const isLockedByTournament = stageAvailability ? !(stageAvailability[stage] ?? true) : false;
            const isLocked = isLockedByConfirmation || isLockedByTournament;
            
            const button = (
              <Button
                key={stage}
                variant={isActive ? 'default' : isPhaseConfirmed ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => onStageChange(stage)}
                aria-label={
                  isLockedByTournament && !isPhaseConfirmed
                    ? t('knockoutBracket.roundOpensIn.lockedShort')
                    : undefined
                }
                className={cn(
                  "gap-1.5 shrink-0",
                  isLocked && !isActive && "opacity-50"
                )}
              >
                {isPhaseConfirmed && <CheckCircle2 className="h-3.5 w-3.5" />}
                {isLocked && !isPhaseConfirmed && <Lock className="h-3.5 w-3.5" />}
                {STAGE_SHORT_LABELS[stage]}
                <span className="text-xs opacity-70">
                  ({stageStat.predicted}/{stageStat.total})
                </span>
              </Button>
            );

            if (isLockedByTournament && !isPhaseConfirmed) {
              return (
                <TooltipProvider key={stage} delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="bottom">
                      {t('knockoutBracket.roundOpensIn.lockedShort')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return button;
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Phase-by-Phase: locked-round banner with countdown */}
      {isRoundLockedByTournament && roundAvailability && (
        <RoundOpeningCard
          stage={selectedStage}
          opensAt={roundAvailability.opensAt}
          stageLabel={t(STAGE_LABEL_KEYS[selectedStage])}
          previousLabel={
            roundAvailability.opensAfterStage === 'group'
              ? t('knockoutView.groupStage')
              : t(STAGE_LABEL_KEYS[roundAvailability.opensAfterStage as KnockoutStage])
          }
        />
      )}
      
      {/* Stage header */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {t(STAGE_LABEL_KEYS[selectedStage])}
                {isCurrentPhaseConfirmed && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('knockoutBracket.confirmed')}
                  </Badge>
                )}
                {!isPreviousComplete && <Lock className="h-4 w-4 text-muted-foreground" />}
              </CardTitle>
              <CardDescription>
                {isCurrentPhaseConfirmed
                  ? t('knockoutBracket.allMatchesConfirmed', { count: stats.total })
                  : stats.ready 
                    ? t('knockoutBracket.matchesPredicted', { predicted: phaseValidation.predictedCount, total: stats.total })
                    : t('knockoutBracket.completePreToUnlock')
                }
              </CardDescription>
            </div>
            <Progress 
              value={stats.total > 0 ? (phaseValidation.predictedCount / stats.total) * 100 : 0} 
              className="w-24 h-2"
            />
          </div>
        </CardHeader>
      </Card>
      
      {/* Match grid */}
      <div className={cn(
        "grid gap-3",
        selectedStage === 'final' || selectedStage === 'third_place' 
          ? "grid-cols-1 max-w-md mx-auto"
          : selectedStage === 'semi_final'
          ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
          : selectedStage === 'quarter_final'
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {currentMatches.map((match, idx) => (
          <KnockoutMatchNode
            key={`${selectedStage}-${idx}-${match.matchId}`}
            match={match}
            actualMatchId={match.matchId}
            onClick={() => onMatchClick(match)}
            isLocked={!stats.ready || !isPreviousComplete || !!isLeagueLocked || isRoundLockedByTournament}
            leagueId={leagueId}
            onPredictionSaved={() => onKnockoutPredictionChange?.(selectedStage)}
          />
        ))}
      </div>
      
      {/* Phase Confirmation Card */}
      {onConfirmPhase && (
        <Card className={cn(
          "transition-colors",
          isCurrentPhaseConfirmed 
            ? "bg-primary/5 border-primary/30" 
            : canConfirmPhase 
            ? "border-primary/50" 
            : Object.keys(phaseValidation.matchErrors).length > 0 
            ? "border-warning/50" 
            : ""
        )}>
          <CardContent className="py-4">
            {isCurrentPhaseConfirmed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('knockoutBracket.stageConfirmed', { stage: t(STAGE_LABEL_KEYS[selectedStage]) })}</span>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {stats.total}/{stats.total} matches
                </Badge>
              </div>
            ) : isRoundLockedByTournament ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{t('knockoutBracket.roundOpensIn.confirmDisabled')}</span>
                </div>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block">
                        <Button
                          disabled
                          className="w-full gap-2 pointer-events-none"
                          variant="outline"
                        >
                          <Lock className="h-4 w-4" />
                          {t('knockoutBracket.roundOpensIn.lockedShort')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {t('knockoutBracket.roundOpensIn.confirmDisabled')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : !isPreviousComplete ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-5 w-5" />
                <span>{t('knockoutBracket.completePrevStage')}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {phaseValidation.predictedCount}/{stats.total} matches predicted
                  </span>
                  <Progress 
                    value={stats.total > 0 ? (phaseValidation.predictedCount / stats.total) * 100 : 0} 
                    className="w-32 h-2"
                  />
                </div>
                
                {Object.keys(phaseValidation.matchErrors).length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {Object.keys(phaseValidation.matchErrors).length === 1 
                        ? t('knockoutBracket.matchesNeedAttention', { count: 1 })
                        : t('knockoutBracket.matchesNeedAttentionPlural', { count: Object.keys(phaseValidation.matchErrors).length })
                      }
                    </span>
                  </div>
                )}
                
                {phaseValidation.isComplete && !phaseValidation.isValid && (
                  <div className="text-xs text-muted-foreground">
                    {t('knockoutBracket.penaltyHint')}
                  </div>
                )}
                
                {canConfirmPhase ? (
                  <Button 
                    onClick={() => onConfirmPhase(selectedStage)} 
                    className="w-full gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('knockoutBracket.confirmStage', { stage: t(STAGE_LABEL_KEYS[selectedStage]) })}
                  </Button>
                ) : !phaseValidation.isComplete && (
                  <div className="text-xs text-muted-foreground">
                    {(stats.total - phaseValidation.predictedCount) === 1
                      ? t('knockoutBracket.completeRemaining', { count: 1 })
                      : t('knockoutBracket.completeRemainingPlural', { count: stats.total - phaseValidation.predictedCount })
                    }
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="ghost"
          onClick={() => {
            const idx = stageOrder.indexOf(selectedStage);
            if (idx > 0) onStageChange(stageOrder[idx - 1]);
          }}
          disabled={selectedStage === 'round_of_32'}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> {t('knockoutBracket.previousRound')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const idx = stageOrder.indexOf(selectedStage);
            if (idx < stageOrder.length - 1) onStageChange(stageOrder[idx + 1]);
          }}
          disabled={selectedStage === 'final'}
          className="gap-1"
        >
          {t('knockoutBracket.nextRound')} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

