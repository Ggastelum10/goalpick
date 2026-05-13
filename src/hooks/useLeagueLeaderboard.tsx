import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeagueLeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  favorite_team: string | null;
  total_points: number;
  has_paid_entry: boolean;
  rank?: number;
  // Tiebreaker stats
  exact_score_count: number;
  correct_outcome_count: number;
  goal_difference_accuracy: number;
}

export function useLeagueLeaderboard(leagueId: string | null) {
  return useQuery({
    queryKey: ['league-leaderboard', leagueId],
    queryFn: async () => {
      if (!leagueId) return [];

      // Get all paid members of the league
      const { data: members, error: memberError } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId)
        .eq('has_paid', true);

      if (memberError) throw memberError;
      if (!members || members.length === 0) return [];

      const userIds = members.map(m => m.user_id);

      // Get profiles for those members
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds)
        .order('total_points', { ascending: false })
        .order('exact_score_count', { ascending: false })
        .order('correct_outcome_count', { ascending: false })
        .order('goal_difference_accuracy', { ascending: false });

      if (profileError) throw profileError;

      // Apply tiebreaker ranking
      const entries = profiles as LeagueLeaderboardEntry[];
      let currentRank = 1;
      
      return entries.map((entry, index) => {
        if (index > 0) {
          const prev = entries[index - 1];
          const isTied = 
            entry.total_points === prev.total_points &&
            entry.exact_score_count === prev.exact_score_count &&
            entry.correct_outcome_count === prev.correct_outcome_count &&
            entry.goal_difference_accuracy === prev.goal_difference_accuracy;
          
          if (!isTied) {
            currentRank = index + 1;
          }
        }
        
        return {
          ...entry,
          rank: currentRank,
          has_paid_entry: true,
        };
      });
    },
    enabled: !!leagueId,
  });
}
