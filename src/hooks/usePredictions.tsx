import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useState, useRef, useCallback, useEffect } from 'react';

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_home_penalty: number | null;
  predicted_away_penalty: number | null;
  points_earned: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch SOLO predictions only (league_id = null).
 * For league-specific predictions, use useLeaguePredictions from useLeaguePredictions.tsx
 */
export function useUserPredictions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['userPredictions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .is('league_id', null); // CRITICAL: Only fetch solo predictions

      if (error) throw error;
      return data as Prediction[];
    },
    enabled: !!user,
  });
}

/**
 * Fetch SOLO prediction for a specific match (league_id = null).
 * For league-specific predictions, use useLeaguePredictionForMatch from useLeaguePredictions.tsx
 */
export function usePredictionForMatch(matchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['prediction', user?.id, matchId],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .is('league_id', null) // CRITICAL: Only fetch solo predictions
        .maybeSingle();

      if (error) throw error;
      return data as Prediction | null;
    },
    enabled: !!user && !!matchId,
  });
}

export function useSubmitPrediction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      matchId,
      homeScore,
      awayScore,
    }: {
      matchId: string;
      homeScore: number;
      awayScore: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      console.debug('[SoloPrediction] Saving:', { matchId, homeScore, awayScore, leagueId: null });

      // First check if prediction exists (for null league_id)
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .is('league_id', null)
        .maybeSingle();

      if (existing) {
        // Update existing prediction
        const { data, error } = await supabase
          .from('predictions')
          .update({
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new prediction
        const { data, error } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            match_id: matchId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
            league_id: null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPredictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction', user?.id, variables.matchId] });
    },
  });
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSavePrediction(matchId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [localHomeScore, setLocalHomeScore] = useState<number | null>(null);
  const [localAwayScore, setLocalAwayScore] = useState<number | null>(null);
  const [localHomePenalty, setLocalHomePenalty] = useState<number | null>(null);
  const [localAwayPenalty, setLocalAwayPenalty] = useState<number | null>(null);
  
  // Use refs for stable callbacks - prevents function recreation
  const scoreRef = useRef({ 
    home: null as number | null, 
    away: null as number | null, 
    homePenalty: null as number | null, 
    awayPenalty: null as number | null 
  });
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const savedTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const matchIdRef = useRef(matchId);

  // Initialize local scores from existing prediction
  const { data: existingPrediction } = usePredictionForMatch(matchId);

  useEffect(() => {
    if (existingPrediction && !isInitialized.current) {
      const home = existingPrediction.predicted_home_score;
      const away = existingPrediction.predicted_away_score;
      const homePen = existingPrediction.predicted_home_penalty;
      const awayPen = existingPrediction.predicted_away_penalty;
      
      setLocalHomeScore(home);
      setLocalAwayScore(away);
      setLocalHomePenalty(homePen);
      setLocalAwayPenalty(awayPen);
      
      // Keep ref in sync
      scoreRef.current = { home, away, homePenalty: homePen, awayPenalty: awayPen };
      isInitialized.current = true;
    }
  }, [existingPrediction]);

  // Reset initialization flag when matchId changes
  useEffect(() => {
    if (matchIdRef.current !== matchId) {
      isInitialized.current = false;
      matchIdRef.current = matchId;
    }
  }, [matchId]);

  // Dirty flag to track unsaved changes
  const isDirtyRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async ({
      homeScore,
      awayScore,
      homePenalty,
      awayPenalty,
    }: {
      homeScore: number;
      awayScore: number;
      homePenalty: number | null;
      awayPenalty: number | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if prediction exists
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .is('league_id', null)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('predictions')
          .update({
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
            predicted_home_penalty: homePenalty,
            predicted_away_penalty: awayPenalty,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            match_id: matchId,
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
            predicted_home_penalty: homePenalty,
            predicted_away_penalty: awayPenalty,
            league_id: null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onMutate: () => {
      setSaveStatus('saving');
    },
    onSuccess: (data) => {
      isDirtyRef.current = false;
      setSaveStatus('saved');
      
      // Optimistically update specific cache entry instead of broad invalidation
      queryClient.setQueryData(['prediction', user?.id, matchId], data);
      
      // Debounced broader invalidations for related views
      if (savedTimer.current) {
        clearTimeout(savedTimer.current);
      }
      
      savedTimer.current = setTimeout(() => {
        setSaveStatus('idle');
        // Only invalidate lists after user stops editing
        queryClient.invalidateQueries({ queryKey: ['userPredictions'] });
        queryClient.invalidateQueries({ queryKey: ['standalonePredictions'] });
        queryClient.invalidateQueries({ queryKey: ['standalonePredictionCount'] });
      }, 2000);
    },
    onError: () => {
      isDirtyRef.current = false;
      setSaveStatus('error');
    },
  });

  // Stable debounced save function - uses refs so it never changes
  const triggerDebouncedSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    isDirtyRef.current = true;

    debounceTimer.current = setTimeout(() => {
      const { home, away, homePenalty, awayPenalty } = scoreRef.current;
      if (isDirtyRef.current && home !== null && away !== null) {
        mutation.mutate({ 
          homeScore: home, 
          awayScore: away, 
          homePenalty, 
          awayPenalty 
        });
      }
    }, 1000);
  }, [mutation]);

  // Stable setters that update both state and ref
  const setHomeScore = useCallback((score: number) => {
    setLocalHomeScore(score);
    scoreRef.current.home = score;
    triggerDebouncedSave();
  }, [triggerDebouncedSave]);

  const setAwayScore = useCallback((score: number) => {
    setLocalAwayScore(score);
    scoreRef.current.away = score;
    triggerDebouncedSave();
  }, [triggerDebouncedSave]);

  const setHomePenalty = useCallback((penalty: number) => {
    setLocalHomePenalty(penalty);
    scoreRef.current.homePenalty = penalty;
    triggerDebouncedSave();
  }, [triggerDebouncedSave]);

  const setAwayPenalty = useCallback((penalty: number) => {
    setLocalAwayPenalty(penalty);
    scoreRef.current.awayPenalty = penalty;
    triggerDebouncedSave();
  }, [triggerDebouncedSave]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  return {
    homeScore: localHomeScore,
    awayScore: localAwayScore,
    homePenalty: localHomePenalty,
    awayPenalty: localAwayPenalty,
    setHomeScore,
    setAwayScore,
    setHomePenalty,
    setAwayPenalty,
    saveStatus,
    isAuthenticated: !!user,
  };
}

export function useAllPredictionsForMatch(matchId: string) {
  return useQuery({
    queryKey: ['allPredictions', matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('match_id', matchId);

      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });
}
