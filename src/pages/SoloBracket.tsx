import { useState, useMemo, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { StandalonePredictionModal } from '@/components/StandalonePredictionModal';
import { GroupBracketView } from '@/components/GroupBracketView';
import { KnockoutBracketView } from '@/components/KnockoutBracketView';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMatches, Match } from '@/hooks/useMatches';
import { useStandalonePredictions, useStandalonePredictionCount } from '@/hooks/useStandalonePredictions';
import { useBracketViewMode } from '@/hooks/useBracketViewMode';
import { calculateGroupStandings, getSimulationStats, simulateBracket } from '@/lib/bracketSimulation';
import { ResolvedMatch, buildKnockoutBracket } from '@/lib/knockoutBracketResolver';
import { Loader2, Trophy, Target, Zap, Users, ArrowRight, LayoutGrid, GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KnockoutStage } from '@/lib/fifaBracketPairings';

export default function SoloBracket() {
  const { t } = useTranslation();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedResolvedMatch, setSelectedResolvedMatch] = useState<ResolvedMatch | null>(null);
  const { bracketViewMode, setBracketViewMode } = useBracketViewMode();
  const [tiebreakOverrides, setTiebreakOverrides] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('solo-bracket-tiebreaks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [confirmedStandings, setConfirmedStandings] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('solo-bracket-confirmed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [confirmedPhases, setConfirmedPhases] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('solo-bracket-confirmed-phases');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Fetch all matches
  const { data: allMatches, isLoading: allMatchesLoading } = useMatches();
  const { data: predictions, isLoading: predictionsLoading } = useStandalonePredictions();
  const { data: predictionCount } = useStandalonePredictionCount();
  const navigate = useNavigate();

  const isLoading = allMatchesLoading || predictionsLoading;

  // Calculate simulated standings
  const groupStandings = useMemo(() => {
    if (!allMatches || !predictions) return {};
    return calculateGroupStandings(allMatches, predictions);
  }, [allMatches, predictions]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('solo-bracket-confirmed', JSON.stringify(confirmedStandings));
  }, [confirmedStandings]);

  useEffect(() => {
    localStorage.setItem('solo-bracket-tiebreaks', JSON.stringify(tiebreakOverrides));
  }, [tiebreakOverrides]);

  useEffect(() => {
    localStorage.setItem('solo-bracket-confirmed-phases', JSON.stringify(confirmedPhases));
  }, [confirmedPhases]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!allMatches || !predictions) return null;
    const simMatches = simulateBracket(allMatches, predictions);
    return getSimulationStats(simMatches, predictions);
  }, [allMatches, predictions]);

  // Compute champion for persistent display across all view modes
  // Champion only shows when ALL groups are confirmed
  const champion = useMemo(() => {
    if (!allMatches || !predictions) return null;
    
    // Get all group names and check if all are confirmed
    const groupMatches = allMatches.filter(m => m.stage === 'group');
    const groupNames = [...new Set(groupMatches.map(m => m.group_name).filter(Boolean))] as string[];
    const allGroupsConfirmed = groupNames.length === 12 && groupNames.every(g => confirmedStandings[g]?.length > 0);
    
    if (!allGroupsConfirmed) return null;
    
    const bracket = buildKnockoutBracket(allMatches, predictions, confirmedStandings, tiebreakOverrides);
    return bracket.champion;
  }, [allMatches, predictions, confirmedStandings, tiebreakOverrides]);



  // Handle tiebreak order changes
  const handleTiebreakChange = (groupName: string, orderedTeams: string[]) => {
    setTiebreakOverrides((prev) => ({
      ...prev,
      [groupName]: orderedTeams,
    }));
    // Clear confirmation when order changes
    setConfirmedStandings((prev) => {
      const next = { ...prev };
      delete next[groupName];
      return next;
    });
  };

  // Handle group standings confirmation
  const handleConfirmGroup = (groupName: string, orderedTeams: string[]) => {
    setConfirmedStandings((prev) => ({
      ...prev,
      [groupName]: orderedTeams,
    }));
    // Sync tiebreak overrides so the displayed standings match
    setTiebreakOverrides((prev) => ({
      ...prev,
      [groupName]: orderedTeams,
    }));
  };

  // Clear phase confirmation from a stage onward (called when predictions change)
  const clearPhaseConfirmation = useCallback((stage: KnockoutStage) => {
    const stageOrder: KnockoutStage[] = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
    const idx = stageOrder.indexOf(stage);
    setConfirmedPhases((prev) => {
      const next = { ...prev };
      let changed = false;
      for (let i = idx; i < stageOrder.length; i++) {
        if (next[stageOrder[i]]) {
          delete next[stageOrder[i]];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Clear confirmation when any group match prediction changes
  const handlePredictionChange = useCallback((groupName: string, _matchId: string) => {
    setConfirmedStandings((prev) => {
      if (!prev[groupName]) return prev;
      const next = { ...prev };
      delete next[groupName];
      return next;
    });
    // Also clear stale tiebreak overrides
    setTiebreakOverrides((prev) => {
      if (!prev[groupName]) return prev;
      const next = { ...prev };
      delete next[groupName];
      return next;
    });
    // Clear all knockout phase confirmations since group standings changed
    clearPhaseConfirmation('round_of_32');
  }, [clearPhaseConfirmation]);

  // Handle bulk confirmation of multiple groups from tie resolution modal
  const handleConfirmMultipleGroups = useCallback((resolutions: Record<string, string[]>) => {
    setConfirmedStandings((prev) => ({
      ...prev,
      ...resolutions,
    }));
    // Also update tiebreak overrides to match the resolved order
    setTiebreakOverrides((prev) => ({
      ...prev,
      ...resolutions,
    }));
  }, []);

  // Check if all 12 groups are confirmed (gates the first knockout stage)
  const groupsConfirmed = useMemo(() => {
    if (!allMatches) return false;
    const groupMatches = allMatches.filter(m => m.stage === 'group');
    const groupNames = [...new Set(groupMatches.map(m => m.group_name).filter(Boolean))] as string[];
    return groupNames.length === 12 && groupNames.every(g => confirmedStandings[g]?.length > 0);
  }, [allMatches, confirmedStandings]);

  // Handle knockout phase confirmation
  const handleConfirmPhase = useCallback((stage: KnockoutStage) => {
    setConfirmedPhases((prev) => ({
      ...prev,
      [stage]: true,
    }));
  }, []);



  return (
    <Layout>
      <div className="space-y-4 md:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl">{t('soloBracket.title')}</h1>
              <Badge variant="secondary" className="gap-1">
                <Target className="h-3 w-3" />
                {t('soloBracket.personal')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {t('soloBracket.subtitle')}
            </p>
          </div>
          
          <Button onClick={() => navigate('/leagues')} variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            {t('soloBracket.joinLeague')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Info banner - How Mock Pick Works */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 md:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {t('soloBracket.howItWorks')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('soloBracket.howItWorksDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        {stats && (
          <div className="grid gap-2 md:gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="py-2 px-3 md:py-3 md:px-4">
                <CardDescription className="text-xs">{t('soloBracket.predictionsMade')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2 md:px-4 md:pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{predictionCount || 0}</span>
                  <span className="text-sm text-muted-foreground">/ {stats.totalMatches}</span>
                </div>
                <Progress 
                  value={stats.completionPercentage} 
                  className="mt-2 h-1.5" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-2 px-3 md:py-3 md:px-4">
                <CardDescription className="text-xs">{t('soloBracket.completion')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2 md:px-4 md:pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats.completionPercentage}%</span>
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-2 px-3 md:py-3 md:px-4">
                <CardDescription className="text-xs">{t('soloBracket.correctOutcomes')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2 md:px-4 md:pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats.correctOutcomes}</span>
                  <span className="text-sm text-muted-foreground">/ {stats.finishedMatches}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-2 px-3 md:py-3 md:px-4">
                <CardDescription className="text-xs">{t('soloBracket.exactScores')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2 md:px-4 md:pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{stats.exactScores}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Champion display - shows across all view modes */}
        {champion && (
          <Card className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-500" />
                {champion.flag && (
                  <img 
                    src={champion.flag} 
                    alt={champion.name}
                    className="w-10 h-7 object-cover rounded shadow ring-2 ring-yellow-500/20"
                  />
                )}
                <span className="font-bold text-xl">{champion.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t('soloBracket.yourChampion')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}



        {/* View toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Bracket View Mode Toggle */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={bracketViewMode === 'group' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setBracketViewMode('group');
              }}
              className="gap-1.5"
            >
              <LayoutGrid className="h-4 w-4" />
              {t('soloBracket.groups')}
            </Button>
            <Button
              variant={bracketViewMode === 'bracket' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBracketViewMode('bracket')}
              className="gap-1.5"
            >
              <GitBranch className="h-4 w-4" />
              {t('soloBracket.knockout')}
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : bracketViewMode === 'group' ? (
          // Group View - shows all groups with matches and standings side by side
          <GroupBracketView
            matches={allMatches || []}
            predictions={predictions || []}
            onMatchClick={setSelectedMatch}
            tiebreakOverrides={tiebreakOverrides}
            onTiebreakChange={handleTiebreakChange}
            confirmedGroups={confirmedStandings}
            onConfirmGroup={handleConfirmGroup}
            onPredictionChange={handlePredictionChange}
            onGoToKnockout={() => setBracketViewMode('bracket')}
          />
        ) : (
          // Knockout Bracket View - visual bracket tree
          <KnockoutBracketView
            matches={allMatches || []}
            predictions={predictions || []}
            confirmedStandings={confirmedStandings}
            tiebreakOverrides={tiebreakOverrides}
            groupStandings={groupStandings}
            onMatchClick={(match, resolvedMatch) => {
              setSelectedMatch(match);
              setSelectedResolvedMatch(resolvedMatch);
            }}
            onGoToGroups={() => setBracketViewMode('group')}
            onConfirmMultipleGroups={handleConfirmMultipleGroups}
            confirmedPhases={confirmedPhases}
            onConfirmPhase={handleConfirmPhase}
            groupsConfirmed={groupsConfirmed}
            onKnockoutPredictionChange={clearPhaseConfirmation}
          />
        )}
      </div>

      {/* Prediction modal */}
      {selectedMatch && (
        <StandalonePredictionModal
          match={selectedMatch}
          prediction={predictions?.find(p => p.match_id === selectedMatch.id)}
          open={!!selectedMatch}
          onPredictionSaved={(match) => {
            if (match.group_name) {
              handlePredictionChange(match.group_name, match.id);
            } else if (match.stage !== 'group') {
              clearPhaseConfirmation(match.stage as KnockoutStage);
            }
          }}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMatch(null);
              setSelectedResolvedMatch(null);
            }
          }}
        />
      )}
    </Layout>
  );
}
