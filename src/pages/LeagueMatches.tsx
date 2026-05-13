import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';

import { LeaguePredictionModal } from '@/components/LeaguePredictionModal';
import { BracketComparisonView } from '@/components/BracketComparisonView';
import { ConfirmBracketCard } from '@/components/ConfirmBracketCard';

import { CopyPredictionsDialog } from '@/components/CopyPredictionsDialog';
import { GroupBracketView } from '@/components/GroupBracketView';
import { KnockoutBracketView } from '@/components/KnockoutBracketView';


import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMatches, Match } from '@/hooks/useMatches';
import { useLeague, PredictionMode } from '@/hooks/useLeagues';
import { useLeaguePredictions, useOriginalPredictions } from '@/hooks/useLeaguePredictions';
import { OpponentPicksDialog } from '@/components/OpponentPicksDialog';

import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { buildKnockoutBracket, ResolvedMatch } from '@/lib/knockoutBracketResolver';
import { calculateGroupStandings } from '@/lib/bracketSimulation';
import { Loader2, ArrowLeft, RefreshCw, Target, Eye, Copy, Trophy, Zap, LayoutGrid, GitBranch, Users, Dices, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { KnockoutStage } from '@/lib/fifaBracketPairings';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';



// Weighted random score generator based on real football statistics
const SCORE_WEIGHTS: [number, number, number][] = [
  [0, 0, 7], [1, 0, 15], [0, 1, 15],
  [1, 1, 10], [2, 0, 10], [0, 2, 10],
  [2, 1, 12], [1, 2, 12],
  [3, 0, 3], [0, 3, 3],
  [3, 1, 4], [1, 3, 4],
  [2, 2, 5],
  [3, 2, 3], [2, 3, 3],
  [4, 0, 1], [0, 4, 1], [4, 1, 1], [1, 4, 1],
];
const TOTAL_WEIGHT = SCORE_WEIGHTS.reduce((sum, [,,w]) => sum + w, 0);

function getRandomScore(): [number, number] {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const [h, a, w] of SCORE_WEIGHTS) {
    rand -= w;
    if (rand <= 0) return [h, a];
  }
  return [1, 0];
}

function getRandomPenalty(): [number, number] {
  const winner = Math.floor(Math.random() * 5) + 3; // 3-7
  const loser = Math.floor(Math.random() * winner);   // 0 to winner-1
  return Math.random() < 0.5 ? [winner, loser] : [loser, winner];
}

type BracketViewMode = 'group' | 'bracket';

export default function LeagueMatches() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedResolvedMatch, setSelectedResolvedMatch] = useState<ResolvedMatch | null>(null);
  const [showCompareView, setShowCompareView] = useState(false);
  
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showOpponentPicks, setShowOpponentPicks] = useState(false);
  const [bracketViewMode, setBracketViewMode] = useState<BracketViewMode>('group');
  const [selectedKnockoutStage, setSelectedKnockoutStage] = useState<KnockoutStage>('round_of_32');
  const [isRandomizing, setIsRandomizing] = useState(false);
  
  // Tiebreaker state (stored per-league in localStorage)
  const [tiebreakOverrides, setTiebreakOverrides] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(`league-${id}-tiebreaks`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const [confirmedStandings, setConfirmedStandings] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(`league-${id}-confirmed`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [confirmedPhases, setConfirmedPhases] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`league-${id}-confirmed-phases`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const { data: leagueData, isLoading: leagueLoading } = useLeague(id || '');
  const { data: allMatches, isLoading: allMatchesLoading } = useMatches();
  const { data: predictions } = useLeaguePredictions(id || '');
  const { data: originalPredictions } = useOriginalPredictions(id || '');
  

  const league = leagueData?.league;
  const predictionMode = (league?.prediction_mode || 'update_every_stage') as PredictionMode;
  const isOwner = leagueData?.isOwner;
  const hasPaid = leagueData?.hasPaid;
  const isAdminPreview = (leagueData as { isAdminPreview?: boolean } | undefined)?.isAdminPreview ?? false;
  
  const isLoading = leagueLoading || allMatchesLoading;

  // Check if bracket is confirmed (locks all editing)
  const { data: memberLockData } = useQuery({
    queryKey: ['league-member-lock', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data } = await supabase
        .from('league_members')
        .select('bracket_confirmed_at')
        .eq('league_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
    staleTime: 30000,
  });

  // Compute league-level lock: bracket confirmed OR mode A tournament started
  const isLeagueLocked = useMemo(() => {
    if (memberLockData?.bracket_confirmed_at) return true;
    if (predictionMode === 'start_to_finish' && allMatches) {
      const now = new Date();
      return allMatches.some(m => new Date(m.match_date) <= now);
    }
    return false;
  }, [memberLockData, predictionMode, allMatches]);

  // Check if tournament has started (any match kickoff <= now)
  const tournamentStarted = useMemo(() => {
    if (!allMatches) return false;
    const now = new Date();
    return allMatches.some(m => new Date(m.match_date) <= now);
  }, [allMatches]);

  // Bracket confirmation state
  const isConfirmed = !!memberLockData?.bracket_confirmed_at;
  const [bracketPending, setBracketPending] = useState(false);

  const handleConfirmBracket = useCallback(async () => {
    if (!user || !id) return;
    setBracketPending(true);
    try {
      const { error } = await supabase
        .from('league_members')
        .update({ bracket_confirmed_at: new Date().toISOString() })
        .eq('league_id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['league-member-lock', id, user.id] });
      queryClient.invalidateQueries({ queryKey: ['myBracketConfirmation', id] });
      toast.success('Bracket confirmed!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm bracket');
    } finally {
      setBracketPending(false);
    }
  }, [user, id, queryClient]);

  const handleUnconfirmBracket = useCallback(async () => {
    if (!user || !id) return;
    setBracketPending(true);
    try {
      const { error } = await supabase
        .from('league_members')
        .update({ bracket_confirmed_at: null })
        .eq('league_id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['league-member-lock', id, user.id] });
      queryClient.invalidateQueries({ queryKey: ['myBracketConfirmation', id] });
      toast.success('Bracket unlocked! You can now edit your predictions.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock bracket');
    } finally {
      setBracketPending(false);
    }
  }, [user, id, queryClient]);

  // Persist to localStorage
  useEffect(() => {
    if (id) {
      localStorage.setItem(`league-${id}-confirmed`, JSON.stringify(confirmedStandings));
    }
  }, [confirmedStandings, id]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`league-${id}-tiebreaks`, JSON.stringify(tiebreakOverrides));
    }
  }, [tiebreakOverrides, id]);

  useEffect(() => {
    if (id) {
      localStorage.setItem(`league-${id}-confirmed-phases`, JSON.stringify(confirmedPhases));
    }
  }, [confirmedPhases, id]);

  // Calculate stats from predictions
  const stats = useMemo(() => {
    if (!allMatches || !predictions) return null;
    
    const totalMatches = allMatches.length;
    const predictedCount = predictions.length;
    const completionPercentage = totalMatches > 0 ? Math.round((predictedCount / totalMatches) * 100) : 0;
    
    const finishedMatches = allMatches.filter(m => m.status === 'finished');
    let correctOutcomes = 0;
    let exactScores = 0;
    
    for (const match of finishedMatches) {
      const pred = predictions.find(p => p.match_id === match.id);
      if (!pred) continue;
      
      const actualHome = match.home_score ?? 0;
      const actualAway = match.away_score ?? 0;
      const predHome = pred.predicted_home_score;
      const predAway = pred.predicted_away_score;
      
      // Check exact score
      if (predHome === actualHome && predAway === actualAway) {
        exactScores++;
        correctOutcomes++;
      } else {
        // Check outcome (win/draw/loss)
        const actualResult = Math.sign(actualHome - actualAway);
        const predResult = Math.sign(predHome - predAway);
        if (actualResult === predResult) correctOutcomes++;
      }
    }
    
    return {
      totalMatches,
      predictedCount,
      completionPercentage,
      correctOutcomes,
      exactScores,
      finishedMatches: finishedMatches.length,
    };
  }, [allMatches, predictions]);

  // Compute champion from league predictions
  // Champion only shows when ALL groups are confirmed
  const champion = useMemo(() => {
    if (!allMatches || !predictions) return null;
    
    // Get all group names and check if all are confirmed
    const groupMatches = allMatches.filter(m => m.stage === 'group');
    const groupNames = [...new Set(groupMatches.map(m => m.group_name).filter(Boolean))] as string[];
    const allGroupsConfirmed = groupNames.length === 12 && groupNames.every(g => confirmedStandings[g]?.length > 0);
    
    if (!allGroupsConfirmed) return null;
    
    const bracket = buildKnockoutBracket(
      allMatches, 
      predictions.map(p => ({
        ...p,
        predicted_home_penalty: p.predicted_home_penalty ?? null,
        predicted_away_penalty: p.predicted_away_penalty ?? null,
      })), 
      confirmedStandings, 
      tiebreakOverrides,
      predictionMode
    );
    return bracket.champion;
  }, [allMatches, predictions, confirmedStandings, tiebreakOverrides, predictionMode]);


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

  // Clear phase confirmation from a stage onward
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

  // Groups where all matches are predicted but standings haven't been confirmed yet
  const pendingUnconfirmedGroups = useMemo(() => {
    if (!allMatches || !predictions) return [] as string[];
    const groupMatches = allMatches.filter(m => m.stage === 'group');
    const matchesByGroup: Record<string, string[]> = {};
    for (const m of groupMatches) {
      if (!m.group_name) continue;
      (matchesByGroup[m.group_name] ??= []).push(m.id);
    }
    const predictedSet = new Set(predictions.map(p => p.match_id));
    const pending: string[] = [];
    for (const [groupName, ids] of Object.entries(matchesByGroup)) {
      const allPredicted = ids.length > 0 && ids.every((mid) => predictedSet.has(mid));
      const isConfirmed = (confirmedStandings[groupName]?.length ?? 0) > 0;
      if (allPredicted && !isConfirmed) pending.push(groupName);
    }
    return pending.sort();
  }, [allMatches, predictions, confirmedStandings]);

  const handleReviewPendingGroups = useCallback(() => {
    setBracketViewMode('group');
    requestAnimationFrame(() => {
      const el = document.getElementById('groups-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  // Handle knockout phase confirmation
  const handleConfirmPhase = useCallback((stage: KnockoutStage) => {
    setConfirmedPhases((prev) => ({
      ...prev,
      [stage]: true,
    }));
  }, []);

  // Random predictions handler (admin only)
  const handleRandomPredictions = useCallback(async () => {
    if (!user || !allMatches || !id) return;
    setIsRandomizing(true);
    try {
      let targetMatches: Match[] = [];
      if (bracketViewMode === 'group') {
        targetMatches = allMatches.filter(m => m.stage === 'group');
      } else {
        targetMatches = allMatches.filter(m => m.stage === selectedKnockoutStage);
      }
      
      if (targetMatches.length === 0) {
        toast.error('No matches found for this stage');
        return;
      }

      const isKnockout = bracketViewMode === 'bracket';
      const predictionsToUpsert = targetMatches.map(match => {
        const [home, away] = getRandomScore();
        const isDraw = home === away && isKnockout;
        const [penHome, penAway] = isDraw ? getRandomPenalty() : [null, null];
        return {
          user_id: user.id,
          match_id: match.id,
          league_id: id,
          predicted_home_score: home,
          predicted_away_score: away,
          predicted_home_penalty: penHome,
          predicted_away_penalty: penAway,
        };
      });

      // Fetch existing predictions for these matches in this league
      const targetMatchIds = targetMatches.map(m => m.id);
      const { data: existing } = await supabase
        .from('predictions')
        .select('id, match_id')
        .eq('user_id', user.id)
        .eq('league_id', id)
        .in('match_id', targetMatchIds);

      const existingMap = new Map((existing || []).map(e => [e.match_id, e.id]));

      const toInsert = predictionsToUpsert.filter(p => !existingMap.has(p.match_id));
      const toUpdate = predictionsToUpsert.filter(p => existingMap.has(p.match_id));

      // Batch insert new predictions
      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('predictions').insert(toInsert);
        if (insertErr) throw insertErr;
      }

      // Update existing predictions one by one (bulk update not supported by Supabase)
      for (const pred of toUpdate) {
        const { error: updateErr } = await supabase
          .from('predictions')
          .update({
            predicted_home_score: pred.predicted_home_score,
            predicted_away_score: pred.predicted_away_score,
            predicted_home_penalty: pred.predicted_home_penalty,
            predicted_away_penalty: pred.predicted_away_penalty,
          })
          .eq('id', existingMap.get(pred.match_id)!);
        if (updateErr) throw updateErr;
      }

      queryClient.invalidateQueries({ queryKey: ['leaguePredictions'] });
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      const label = bracketViewMode === 'group' ? 'group stage' : selectedKnockoutStage.replace(/_/g, ' ');
      toast.success(`Filled ${targetMatches.length} ${label} predictions — refreshing…`);
      // Hard refresh so every dependent view (standings, brackets, leaderboard)
      // re-renders with the new predictions.
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate predictions');
      setIsRandomizing(false);
    }
  }, [user, allMatches, id, bracketViewMode, selectedKnockoutStage, queryClient]);


  const groupStandings = useMemo(() => {
    if (!allMatches || !predictions) return {};
    return calculateGroupStandings(
      allMatches,
      predictions.map(p => ({
        ...p,
        predicted_home_penalty: p.predicted_home_penalty ?? null,
        predicted_away_penalty: p.predicted_away_penalty ?? null,
      }))
    );
  }, [allMatches, predictions]);


  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!league) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-xl font-medium mb-2">{t('leagueMatches.leagueNotFound')}</h2>
          <Button onClick={() => navigate('/leagues')}>{t('leagueMatches.backToLeagues')}</Button>
        </div>
      </Layout>
    );
  }

  // Only show payment required if:
  // 1. User is explicitly marked as not paid (hasPaid === false, not undefined/null)
  // 2. User is not the owner
  // 3. User is actually a member (isMember === true)
  const isMember = leagueData?.isMember;
  if (hasPaid === false && !isOwner && isMember) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-xl font-medium mb-2">{t('leagueMatches.paymentRequired')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('leagueMatches.paymentRequiredDesc')}
          </p>
          <Button onClick={() => navigate(`/leagues/${id}`)}>{t('leagueMatches.backToLeague')}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-5">
        {isAdminPreview && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Shield className="h-4 w-4" />
            <span className="font-medium">{t('leagues.detail.adminPreview')}</span>
            <span className="text-muted-foreground">· {t('leagues.detail.adminPreviewReadOnly')}</span>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/leagues/${id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl">{league.name}</h1>
              <p className="text-muted-foreground text-sm">{t('leagueMatches.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 border-dashed border-primary/50 text-primary"
                    disabled={isRandomizing}
                  >
                    {isRandomizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Dices className="h-3 w-3" />}
                    {t('leagueMatches.randomPredictions')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('leagueMatches.randomDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('leagueMatches.randomDialog.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('leagueMatches.randomDialog.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRandomPredictions}>
                      {t('leagueMatches.randomDialog.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1"
              onClick={() => setShowCopyDialog(true)}
            >
              <Copy className="h-3 w-3" />
              {t('leagueMatches.copyFrom')}
            </Button>
            {predictionMode === 'update_every_stage' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowOpponentPicks(true)}
              >
                <Users className="h-3 w-3" />
                {t('leagueMatches.opponentsPicks')}
              </Button>
            )}
            <Button 
              variant="secondary" 
              size="sm"
              className="gap-1"
              onClick={() => setShowCompareView(true)}
            >
              <Eye className="h-3 w-3" />
              {t('leagueMatches.compare')}
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid gap-2 md:gap-3 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="py-2 px-3 md:py-3 md:px-4">
                <CardDescription className="text-xs">{t('leagueMatches.predictionsMade')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2 md:px-4 md:pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{stats.predictedCount}</span>
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
                <CardDescription className="text-xs">{t('leagueMatches.completion')}</CardDescription>
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
                <CardDescription className="text-xs">{t('leagueMatches.correctOutcomes')}</CardDescription>
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
                <CardDescription className="text-xs">{t('leagueMatches.exactScores')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 pb-2 md:px-4 md:pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold" />
                  <span className="text-2xl font-bold">{stats.exactScores}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Champion display - shows across all view modes */}
        {champion && (
          <Card className="bg-gold/10 border-gold/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-3">
                <Trophy className="h-6 w-6 text-gold" />
                {champion.flag && (
                  <img 
                    src={champion.flag} 
                    alt={champion.name}
                    className="w-10 h-7 object-cover rounded shadow ring-2 ring-gold/20"
                  />
                )}
                <span className="font-bold text-xl">{champion.name}</span>
                <span className="text-sm text-muted-foreground">
                  {t('leagueMatches.yourChampion')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prediction lock info */}
        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            {predictionMode === 'update_every_stage'
              ? t('leagueMatches.lockInfoPhase')
              : t('leagueMatches.lockInfoMatch')}
          </AlertDescription>
        </Alert>

        {/* Bracket confirmation card (Mode A / start_to_finish) */}
        {predictionMode === 'start_to_finish' && (
          <ConfirmBracketCard
            predictionCount={stats?.predictedCount || 0}
            totalMatches={stats?.totalMatches || 0}
            onConfirm={handleConfirmBracket}
            onUnconfirm={handleUnconfirmBracket}
            isPending={bracketPending}
            isConfirmed={isConfirmed}
            tournamentStarted={tournamentStarted}
          />
        )}

        {/* View mode toggle */}
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
              Groups
            </Button>
            <Button
              variant={bracketViewMode === 'bracket' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBracketViewMode('bracket')}
              className="gap-1.5"
            >
              <GitBranch className="h-4 w-4" />
              Knockout
            </Button>
          </div>
        </div>

        {/* Sticky pending-confirmation banner */}
        {pendingUnconfirmedGroups.length > 0 && (
          <div className="sticky top-2 z-30 -mx-1 px-1">
            <button
              type="button"
              onClick={handleReviewPendingGroups}
              className="group w-full flex items-center justify-between gap-3 rounded-md border border-gold/40 bg-gold/10 backdrop-blur-sm px-3 py-2 text-left shadow-sm transition-colors hover:bg-gold/15 animate-in fade-in slide-in-from-top-1"
              aria-label={t('knockoutBracket.pendingBanner.cta')}
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-gold shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {pendingUnconfirmedGroups.length === 1
                    ? t('knockoutBracket.pendingBanner.one', '1 group pending confirmation')
                    : t('knockoutBracket.pendingBanner.other', {
                        count: pendingUnconfirmedGroups.length,
                        defaultValue: `${pendingUnconfirmedGroups.length} groups pending confirmation`,
                      })}
                </span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-gold shrink-0">
                {t('knockoutBracket.pendingBanner.cta')}
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </div>
        )}

        {/* Content based on view mode */}
        {bracketViewMode === 'group' ? (
          // Group View - shows all groups with matches and standings side by side
          <div id="groups-section" className="scroll-mt-20">
          <GroupBracketView
            matches={allMatches || []}
            predictions={predictions?.map(p => ({
              ...p,
              predicted_home_penalty: p.predicted_home_penalty ?? null,
              predicted_away_penalty: p.predicted_away_penalty ?? null,
            })) || []}
            onMatchClick={setSelectedMatch}
            tiebreakOverrides={tiebreakOverrides}
            onTiebreakChange={handleTiebreakChange}
            confirmedGroups={confirmedStandings}
            onConfirmGroup={handleConfirmGroup}
            leagueId={id}
            onPredictionChange={handlePredictionChange}
            onGoToKnockout={() => setBracketViewMode('bracket')}
            isLeagueLocked={isLeagueLocked}
          />
          </div>
        ) : (
          // Knockout Bracket View - visual bracket tree
          <KnockoutBracketView
            matches={allMatches || []}
            predictions={predictions?.map(p => ({
              ...p,
              predicted_home_penalty: p.predicted_home_penalty ?? null,
              predicted_away_penalty: p.predicted_away_penalty ?? null,
            })) || []}
            confirmedStandings={confirmedStandings}
            tiebreakOverrides={tiebreakOverrides}
            groupStandings={groupStandings}
            onMatchClick={(match, resolvedMatch) => {
              setSelectedMatch(match);
              setSelectedResolvedMatch(resolvedMatch);
            }}
            onGoToGroups={() => setBracketViewMode('group')}
            onConfirmMultipleGroups={handleConfirmMultipleGroups}
            leagueId={id}
            confirmedPhases={confirmedPhases}
            onConfirmPhase={handleConfirmPhase}
            groupsConfirmed={groupsConfirmed}
            onStageChangeNotify={setSelectedKnockoutStage}
            onKnockoutPredictionChange={clearPhaseConfirmation}
            isLeagueLocked={isLeagueLocked}
            predictionMode={predictionMode}
          />
        )}
      </div>

      {/* Prediction Modal */}
      {selectedMatch && (
        <LeaguePredictionModal
          match={selectedMatch}
          leagueId={id!}
          predictionMode={predictionMode}
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

      {/* Compare View Dialog */}
      <Dialog open={showCompareView} onOpenChange={setShowCompareView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 z-10 bg-background pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Compare Predictions vs Results
            </DialogTitle>
            <DialogDescription>
              See how your predictions compare to actual match results
            </DialogDescription>
          </DialogHeader>
          <BracketComparisonView
            matches={allMatches || []}
            predictions={predictions || []}
            originalPredictions={originalPredictions || []}
            predictionMode={predictionMode}
            exactScorePoints={league?.exact_score_points}
            outcomePoints={league?.outcome_points}
            stageMultipliers={league?.stage_multipliers as Record<string, number> | undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Copy Predictions Dialog */}
      <CopyPredictionsDialog
        open={showCopyDialog}
        onOpenChange={setShowCopyDialog}
        targetLeagueId={id!}
        targetLeagueName={league?.name || ''}
        targetPredictionCount={stats?.predictedCount || 0}
      />

      {/* Opponent Picks Dialog (Mode B only) */}
      {predictionMode === 'update_every_stage' && (
        <OpponentPicksDialog
          open={showOpponentPicks}
          onOpenChange={setShowOpponentPicks}
          leagueId={id!}
        />
      )}
    </Layout>
  );
}
