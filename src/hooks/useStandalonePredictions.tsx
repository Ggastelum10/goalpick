import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Prediction } from './usePredictions';

// Hook for standalone predictions (league_id = null)
export function useStandalonePredictions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['standalonePredictions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .is('league_id', null);

      if (error) throw error;
      return data as Prediction[];
    },
    enabled: !!user,
  });
}

export function useStandalonePredictionForMatch(matchId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['standalonePrediction', user?.id, matchId],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .is('league_id', null)
        .maybeSingle();

      if (error) throw error;
      return data as Prediction | null;
    },
    enabled: !!user && !!matchId,
  });
}

export function useSubmitStandalonePrediction() {
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

      // First check if prediction exists
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .is('league_id', null)
        .maybeSingle();

      if (existing) {
        // Update existing
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
        // Insert new
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
      // Invalidate standalone prediction caches
      queryClient.invalidateQueries({ queryKey: ['standalonePredictions'] });
      queryClient.invalidateQueries({ queryKey: ['standalonePrediction', user?.id, variables.matchId] });
      queryClient.invalidateQueries({ queryKey: ['standalonePredictionCount'] });
      
      // Also invalidate the caches used by GroupBracketView's inline editing
      queryClient.invalidateQueries({ queryKey: ['userPredictions'] });
      queryClient.invalidateQueries({ queryKey: ['prediction', user?.id, variables.matchId] });
    },
  });
}

export function useImportPredictionsToLeague() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ leagueId }: { leagueId: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Get all standalone predictions
      const { data: standalonePreds, error: fetchError } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .is('league_id', null);

      if (fetchError) throw fetchError;
      if (!standalonePreds || standalonePreds.length === 0) {
        return { imported: 0 };
      }

      // Insert predictions for the league
      const leaguePredictions = standalonePreds.map(p => ({
        user_id: user.id,
        match_id: p.match_id,
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
        league_id: leagueId,
      }));

      const { error: insertError } = await supabase
        .from('predictions')
        .upsert(leaguePredictions, {
          onConflict: 'user_id,match_id,league_id',
          ignoreDuplicates: false,
        });

      if (insertError) throw insertError;

      return { imported: leaguePredictions.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['leaguePredictions'] });
    },
  });
}

export function useStandalonePredictionCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['standalonePredictionCount', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('league_id', null);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });
}
