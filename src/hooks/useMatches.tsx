import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Match {
  id: string;
  external_id: string | null;
  home_team: string;
  away_team: string;
  home_team_flag: string | null;
  away_team_flag: string | null;
  match_date: string;
  venue: string | null;
  city: string | null;
  stage: 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final';
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  created_at: string;
  updated_at: string;
}

type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final';

export function useMatches(stage?: MatchStage) {
  return useQuery({
    queryKey: ['matches', stage],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select('*')
        .order('match_date', { ascending: true });

      if (stage) {
        query = query.eq('stage', stage);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Match[];
    },
  });
}

export function useUpcomingMatches(limit = 5) {
  return useQuery({
    queryKey: ['upcomingMatches', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .gte('match_date', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as Match[];
    },
  });
}

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;
      return data as Match;
    },
    enabled: !!matchId,
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, updates }: { matchId: string; updates: Partial<Match> }) => {
      const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingMatches'] });
    },
  });
}
