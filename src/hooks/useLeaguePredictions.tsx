import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { PredictionMode } from './useLeagues';
import { toast } from 'sonner';
import { computeRoundAvailability } from '@/lib/tournamentTime';

export interface LeaguePrediction {
  id: string;
  user_id: string;
  match_id: string;
  league_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_home_penalty: number | null;
  predicted_away_penalty: number | null;
  points_earned: number;
  created_at: string;
  updated_at: string;
}

export interface OriginalPrediction {
  id: string;
  user_id: string;
  league_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  created_at: string;
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Group Stage',
  round_of_32: 'Round of 32',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarterfinals',
  semi_final: 'Semifinals',
  third_place: 'Third Place',
  final: 'Final',
};

// Determine if predictions are locked based on mode
export function usePredictionLockStatus(
  leagueId: string,
  predictionMode: PredictionMode,
  matchId?: string
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prediction-lock-status', leagueId, predictionMode, matchId, user?.id],
    queryFn: async () => {
      // Check if user's bracket is confirmed for this league (highest priority lock)
      if (user) {
        const { data: memberData } = await supabase
          .from('league_members')
          .select('bracket_confirmed_at')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberData?.bracket_confirmed_at) {
          return {
            isLocked: true,
            reason: 'Your bracket is confirmed and locked. Predictions cannot be modified.',
            canEdit: false,
          };
        }
      }

      // Get tournament start (first match date)
      const { data: firstMatch, error: firstMatchError } = await supabase
        .from('matches')
        .select('match_date')
        .order('match_date', { ascending: true })
        .limit(1)
        .single();

      if (firstMatchError) throw firstMatchError;

      const tournamentStarted = new Date(firstMatch.match_date) <= new Date();

      if (predictionMode === 'start_to_finish') {
        // Mode A: Lock all predictions when tournament starts
        return {
          isLocked: tournamentStarted,
          reason: tournamentStarted 
            ? 'Tournament has started. All predictions are locked.' 
            : null,
          canEdit: !tournamentStarted,
        };
      }

      // Mode B: Phase-based locking
      if (matchId) {
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .select('match_date, status, stage, home_team, away_team')
          .eq('id', matchId)
          .single();

        if (matchError) throw matchError;

        // Check if the phase has started (earliest match in the same stage)
        const { data: phaseMatches, error: phaseError } = await supabase
          .from('matches')
          .select('match_date')
          .eq('stage', match.stage)
          .order('match_date', { ascending: true })
          .limit(1);

        if (phaseError) throw phaseError;

        const firstPhaseMatch = phaseMatches?.[0];
        const phaseStarted = firstPhaseMatch
          ? new Date(firstPhaseMatch.match_date) <= new Date()
          : false;

        const matchStarted = new Date(match.match_date) <= new Date() || 
          match.status === 'live' || 
          match.status === 'finished';

        // Phase-by-Phase round-opening gate: a knockout round can only be
        // edited once the previous round has finished IRL.
        let roundNotOpen = false;
        let roundOpensAt: Date | null = null;
        if (match.stage !== 'group') {
          const { data: predecessorMatches } = await supabase
            .from('matches')
            .select('stage, match_date, status');
          if (predecessorMatches) {
            const availability = computeRoundAvailability(
              predecessorMatches as any,
              match.stage as any,
            );
            roundNotOpen = !availability.isOpen;
            roundOpensAt = availability.opensAt;
          }
        }

        // Phase-by-Phase locking model:
        // - Group stage: lock the whole phase as soon as the first group match starts
        //   (preserves existing group-stage UX where the round freezes together).
        // - Knockout stages: lock each match INDIVIDUALLY at its own kickoff so users
        //   can keep editing later games in the same round until those games start.
        const isKnockout = match.stage !== 'group';
        const phaseLockApplies = isKnockout ? false : phaseStarted;
        const isLocked = phaseLockApplies || matchStarted || roundNotOpen;
        const stageLabel = STAGE_LABELS[match.stage] || match.stage;

        return {
          isLocked,
          reason: isLocked
            ? roundNotOpen
              ? `${stageLabel} opens after the previous round ends${roundOpensAt ? ` (${roundOpensAt.toLocaleString()})` : ''}.`
              : isKnockout && matchStarted
                ? `This match has started. Predictions for ${match.home_team} vs ${match.away_team} are locked.`
                : `This phase has started. All predictions for ${stageLabel} are locked.`
            : null,
          canEdit: !isLocked,
        };
      }

      return { isLocked: false, reason: null, canEdit: true };
    },
    enabled: !!leagueId && !!predictionMode,
    staleTime: 30000,
  });
}

// Phase lock status for all stages at once (powers "View Opponents' Picks")
export interface PhaseLockInfo {
  stage: string;
  label: string;
  isLocked: boolean;
  firstMatchDate: string | null;
  matchCount: number;
}

export function usePhaseLockStatus(leagueId: string) {
  return useQuery({
    queryKey: ['phaseLockStatus', leagueId],
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('stage, match_date, status')
        .order('match_date', { ascending: true });

      if (error) throw error;

      const phases = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

      return phases.map(stage => {
        const stageMatches = matches?.filter(m => m.stage === stage) || [];
        const firstMatch = stageMatches[0];
        const isLocked = firstMatch
          ? new Date(firstMatch.match_date) <= new Date()
          : false;

        return {
          stage,
          label: STAGE_LABELS[stage] || stage,
          isLocked,
          firstMatchDate: firstMatch?.match_date || null,
          matchCount: stageMatches.length,
        };
      });
    },
    enabled: !!leagueId,
    staleTime: 30000,
  });
}

// Fetch predictions for a specific league
export function useLeaguePredictions(leagueId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leaguePredictions', leagueId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId);

      if (error) throw error;
      return data as LeaguePrediction[];
    },
    enabled: !!user && !!leagueId,
  });
}

// Fetch a single prediction for a match in a league
export function useLeaguePredictionForMatch(leagueId: string, matchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leaguePrediction', leagueId, matchId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .eq('match_id', matchId)
        .maybeSingle();

      if (error) throw error;
      return data as LeaguePrediction | null;
    },
    enabled: !!user && !!leagueId && !!matchId,
  });
}

// Fetch original predictions for Mode B comparison
export function useOriginalPredictions(leagueId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['originalPredictions', leagueId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('original_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId);

      if (error) throw error;
      return data as OriginalPrediction[];
    },
    enabled: !!user && !!leagueId,
  });
}

export function useOriginalPredictionForMatch(leagueId: string, matchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['originalPrediction', leagueId, matchId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('original_predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .eq('match_id', matchId)
        .maybeSingle();

      if (error) throw error;
      return data as OriginalPrediction | null;
    },
    enabled: !!user && !!leagueId && !!matchId,
  });
}

// Submit a prediction for a league (with correct league isolation)
export function useSubmitLeaguePrediction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      leagueId,
      matchId,
      homeScore,
      awayScore,
      saveAsOriginal = false,
    }: {
      leagueId: string;
      matchId: string;
      homeScore: number;
      awayScore: number;
      saveAsOriginal?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      console.debug('[LeaguePrediction] Saving:', { leagueId, matchId, homeScore, awayScore });
      // Check if prediction exists for this specific league
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .eq('league_id', leagueId)
        .maybeSingle();

      let data;
      if (existing) {
        // Update existing prediction
        const { data: updated, error } = await supabase
          .from('predictions')
          .update({
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        data = updated;
      } else {
        // Insert new prediction
        const { data: inserted, error } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            league_id: leagueId,
            match_id: matchId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
          })
          .select()
          .single();

        if (error) throw error;
        data = inserted;
      }

      // For Mode B, save original prediction if it's the first time
      if (saveAsOriginal) {
        const { data: existingOriginal } = await supabase
          .from('original_predictions')
          .select('id')
          .eq('user_id', user.id)
          .eq('league_id', leagueId)
          .eq('match_id', matchId)
          .maybeSingle();

        if (!existingOriginal) {
          await supabase.from('original_predictions').insert({
            user_id: user.id,
            league_id: leagueId,
            match_id: matchId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
          });
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaguePredictions', variables.leagueId] });
      queryClient.invalidateQueries({ queryKey: ['leaguePrediction', variables.leagueId, variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['originalPredictions', variables.leagueId] });
      queryClient.invalidateQueries({ queryKey: ['originalPrediction', variables.leagueId, variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['leaguePredictionCount'] });
    },
  });
}

// Auto-save hook for league predictions (similar to standalone but league-aware)
// Now includes penalty support for knockout matches
export type LeagueSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSaveLeaguePrediction(leagueId: string, matchId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [homeScore, setHomeScoreState] = useState<number | null>(null);
  const [awayScore, setAwayScoreState] = useState<number | null>(null);
  const [homePenalty, setHomePenaltyState] = useState<number | null>(null);
  const [awayPenalty, setAwayPenaltyState] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<LeagueSaveStatus>('idle');
  
  // Use refs for stable callbacks and current values
  const scoreRef = useRef({ 
    home: null as number | null, 
    away: null as number | null, 
    homePenalty: null as number | null, 
    awayPenalty: null as number | null 
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const prevLeagueIdRef = useRef<string>(leagueId);
  const prevMatchIdRef = useRef<string>(matchId);

  // Fetch existing prediction for this league
  const { data: existingPrediction, isLoading } = useLeaguePredictionForMatch(leagueId, matchId);

  // Reset state when league or match changes
  useEffect(() => {
    if (prevLeagueIdRef.current !== leagueId || prevMatchIdRef.current !== matchId) {
      setHomeScoreState(null);
      setAwayScoreState(null);
      setHomePenaltyState(null);
      setAwayPenaltyState(null);
      setSaveStatus('idle');
      lastSavedRef.current = '';
      scoreRef.current = { home: null, away: null, homePenalty: null, awayPenalty: null };
      prevLeagueIdRef.current = leagueId;
      prevMatchIdRef.current = matchId;
    }
  }, [leagueId, matchId]);

  // Set initial values from existing prediction
  useEffect(() => {
    if (existingPrediction) {
      const home = existingPrediction.predicted_home_score;
      const away = existingPrediction.predicted_away_score;
      const homePen = existingPrediction.predicted_home_penalty ?? null;
      const awayPen = existingPrediction.predicted_away_penalty ?? null;
      
      setHomeScoreState(home);
      setAwayScoreState(away);
      setHomePenaltyState(homePen);
      setAwayPenaltyState(awayPen);
      
      scoreRef.current = { home, away, homePenalty: homePen, awayPenalty: awayPen };
      lastSavedRef.current = `${home}-${away}-${homePen ?? ''}-${awayPen ?? ''}`;
    } else if (!isLoading) {
      setHomeScoreState(null);
      setAwayScoreState(null);
      setHomePenaltyState(null);
      setAwayPenaltyState(null);
      scoreRef.current = { home: null, away: null, homePenalty: null, awayPenalty: null };
      lastSavedRef.current = '';
    }
  }, [existingPrediction, isLoading]);

  // Dirty flag to track unsaved changes
  const isDirtyRef = useRef(false);

  // Perform the actual save operation
  const performSave = useCallback(async () => {
    if (!user) return;
    
    const { home, away, homePenalty: homePen, awayPenalty: awayPen } = scoreRef.current;
    const currentValue = `${home}-${away}-${homePen ?? ''}-${awayPen ?? ''}`;
    
    // Skip if nothing changed
    if (currentValue === lastSavedRef.current) {
      isDirtyRef.current = false;
      return;
    }
    if (home === null && away === null) {
      isDirtyRef.current = false;
      return;
    }

    setSaveStatus('saving');

    try {
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .eq('league_id', leagueId)
        .maybeSingle();

      let savedData;
      if (existing) {
        const { data, error } = await supabase
          .from('predictions')
          .update({
            predicted_home_score: home ?? 0,
            predicted_away_score: away ?? 0,
            predicted_home_penalty: homePen,
            predicted_away_penalty: awayPen,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        savedData = data;
      } else {
        const { data, error } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            league_id: leagueId,
            match_id: matchId,
            predicted_home_score: home ?? 0,
            predicted_away_score: away ?? 0,
            predicted_home_penalty: homePen,
            predicted_away_penalty: awayPen,
          })
          .select()
          .single();

        if (error) throw error;
        savedData = data;
        
        // Save as original prediction for Mode B comparison
        const { data: existingOriginal } = await supabase
          .from('original_predictions')
          .select('id')
          .eq('user_id', user.id)
          .eq('league_id', leagueId)
          .eq('match_id', matchId)
          .maybeSingle();
          
        if (!existingOriginal) {
          await supabase.from('original_predictions').insert({
            user_id: user.id,
            league_id: leagueId,
            match_id: matchId,
            predicted_home_score: home ?? 0,
            predicted_away_score: away ?? 0,
          });
        }
      }

      lastSavedRef.current = currentValue;
      isDirtyRef.current = false;
      setSaveStatus('saved');
      
      // Optimistically update specific cache entry
      queryClient.setQueryData(
        ['leaguePrediction', leagueId, matchId, user.id], 
        savedData
      );
      
      // Immediately update the predictions list cache so counters reflect the change
      queryClient.setQueryData<LeaguePrediction[]>(
        ['leaguePredictions', leagueId, user.id],
        (old) => {
          if (!old) return [savedData as LeaguePrediction];
          const idx = old.findIndex(p => p.match_id === matchId);
          if (idx >= 0) {
            const updated = [...old];
            updated[idx] = savedData as LeaguePrediction;
            return updated;
          }
          return [...old, savedData as LeaguePrediction];
        }
      );
      
      // Debounced broader invalidations (refetch from server for full consistency)
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
      
      savedTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
        queryClient.invalidateQueries({ queryKey: ['leaguePredictions', leagueId] });
        queryClient.invalidateQueries({ queryKey: ['leaguePredictionCount', leagueId] });
        queryClient.invalidateQueries({ queryKey: ['originalPredictions', leagueId] });
      }, 2000);
    } catch (err: any) {
      isDirtyRef.current = false;
      setSaveStatus('error');
      
      // Revert local state to last successfully saved values
      const existing = existingPrediction;
      if (existing) {
        setHomeScoreState(existing.predicted_home_score);
        setAwayScoreState(existing.predicted_away_score);
        setHomePenaltyState(existing.predicted_home_penalty ?? null);
        setAwayPenaltyState(existing.predicted_away_penalty ?? null);
        scoreRef.current = {
          home: existing.predicted_home_score,
          away: existing.predicted_away_score,
          homePenalty: existing.predicted_home_penalty ?? null,
          awayPenalty: existing.predicted_away_penalty ?? null,
        };
      } else {
        setHomeScoreState(null);
        setAwayScoreState(null);
        setHomePenaltyState(null);
        setAwayPenaltyState(null);
        scoreRef.current = { home: null, away: null, homePenalty: null, awayPenalty: null };
      }
      
      toast.error('Could not save prediction', {
        description: 'The phase may have started or your bracket is locked.',
      });
    }
  }, [user, leagueId, matchId, queryClient]);

  // Schedule a debounced save - only show saving status when actually saving
  const scheduleSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isDirtyRef.current = true;
    
    timeoutRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        performSave();
      }
    }, 1000);
  }, [performSave]);

  // Stable setters that update both state and ref
  const setHomeScore = useCallback((score: number | null) => {
    setHomeScoreState(score);
    scoreRef.current.home = score;
    scheduleSave();
  }, [scheduleSave]);

  const setAwayScore = useCallback((score: number | null) => {
    setAwayScoreState(score);
    scoreRef.current.away = score;
    scheduleSave();
  }, [scheduleSave]);

  const setHomePenalty = useCallback((penalty: number | null) => {
    setHomePenaltyState(penalty);
    scoreRef.current.homePenalty = penalty;
    scheduleSave();
  }, [scheduleSave]);

  const setAwayPenalty = useCallback((penalty: number | null) => {
    setAwayPenaltyState(penalty);
    scoreRef.current.awayPenalty = penalty;
    scheduleSave();
  }, [scheduleSave]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return {
    homeScore,
    awayScore,
    homePenalty,
    awayPenalty,
    setHomeScore,
    setAwayScore,
    setHomePenalty,
    setAwayPenalty,
    saveStatus,
    isAuthenticated: !!user,
    isLoading,
  };
}

// Get prediction count for a specific league
export function useLeaguePredictionCount(leagueId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leaguePredictionCount', leagueId, user?.id],
    queryFn: async () => {
      if (!user) return 0;

      let query = supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (leagueId) {
        query = query.eq('league_id', leagueId);
      } else {
        query = query.is('league_id', null);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}

// Copy predictions between leagues
export function useCopyPredictions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sourceLeagueId, // null for Mock Pick
      targetLeagueId,
    }: {
      sourceLeagueId: string | null;
      targetLeagueId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch source predictions
      let sourceQuery = supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id);

      if (sourceLeagueId) {
        sourceQuery = sourceQuery.eq('league_id', sourceLeagueId);
      } else {
        sourceQuery = sourceQuery.is('league_id', null);
      }

      const { data: sourcePreds, error: sourceError } = await sourceQuery;
      if (sourceError) throw sourceError;
      if (!sourcePreds || sourcePreds.length === 0) {
        return { copied: 0, overwritten: 0 };
      }

      // Check existing target predictions
      const { data: existingTarget, error: targetError } = await supabase
        .from('predictions')
        .select('match_id')
        .eq('user_id', user.id)
        .eq('league_id', targetLeagueId);

      if (targetError) throw targetError;

      const existingMatchIds = new Set(existingTarget?.map(p => p.match_id) || []);
      let overwritten = 0;
      let created = 0;

      // Process each prediction
      for (const pred of sourcePreds) {
        const exists = existingMatchIds.has(pred.match_id);

        if (exists) {
          // Update existing
          const { error } = await supabase
            .from('predictions')
            .update({
              predicted_home_score: pred.predicted_home_score,
              predicted_away_score: pred.predicted_away_score,
            })
            .eq('user_id', user.id)
            .eq('match_id', pred.match_id)
            .eq('league_id', targetLeagueId);

          if (error) throw error;
          overwritten++;
        } else {
          // Insert new
          const { error } = await supabase
            .from('predictions')
            .insert({
              user_id: user.id,
              match_id: pred.match_id,
              league_id: targetLeagueId,
              predicted_home_score: pred.predicted_home_score,
              predicted_away_score: pred.predicted_away_score,
            });

          if (error) throw error;
          created++;
        }
      }

      return { copied: created, overwritten };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leaguePredictions', variables.targetLeagueId] });
      queryClient.invalidateQueries({ queryKey: ['leaguePredictionCount'] });
    },
  });
}

// Get stage completion status for Mode B
export function useStageCompletionStatus() {
  return useQuery({
    queryKey: ['stageCompletionStatus'],
    queryFn: async () => {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('id, stage, status, match_date')
        .order('match_date', { ascending: true });

      if (error) throw error;

      const stages = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
      const stageStatus: Record<string, { total: number; finished: number; allFinished: boolean; started: boolean }> = {};

      for (const stage of stages) {
        const stageMatches = matches?.filter(m => m.stage === stage) || [];
        const finishedMatches = stageMatches.filter(m => m.status === 'finished');
        const startedMatches = stageMatches.filter(
          m => new Date(m.match_date) <= new Date() || m.status === 'live' || m.status === 'finished'
        );

        stageStatus[stage] = {
          total: stageMatches.length,
          finished: finishedMatches.length,
          allFinished: stageMatches.length > 0 && finishedMatches.length === stageMatches.length,
          started: startedMatches.length > 0,
        };
      }

      return stageStatus;
    },
    staleTime: 60000, // Cache for 1 minute
  });
}
