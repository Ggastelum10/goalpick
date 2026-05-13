import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface LeagueMemberPrediction {
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

/**
 * Fetch a specific league member's predictions.
 * RLS policies control visibility - will only return predictions if:
 * - Mode A: Tournament started AND member has confirmed their bracket
 * - Mode B: Match has started
 */
export function useLeagueMemberPredictions(leagueId: string, memberId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leagueMemberPredictions', leagueId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', memberId);

      if (error) throw error;
      return data as LeagueMemberPrediction[];
    },
    enabled: !!user && !!leagueId && !!memberId,
  });
}

/**
 * Check if a member's bracket is viewable based on confirmation status.
 * Used for Mode A leagues to determine if "View Bracket" button should be shown.
 */
export function useMemberBracketConfirmation(leagueId: string, memberId: string) {
  return useQuery({
    queryKey: ['memberBracketConfirmation', leagueId, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('league_members')
        .select('bracket_confirmed_at')
        .eq('league_id', leagueId)
        .eq('user_id', memberId)
        .maybeSingle();

      if (error) throw error;
      return {
        isConfirmed: !!data?.bracket_confirmed_at,
        confirmedAt: data?.bracket_confirmed_at,
      };
    },
    enabled: !!leagueId && !!memberId,
  });
}

/**
 * Get the current user's bracket confirmation status for a league.
 */
export function useMyBracketConfirmation(leagueId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myBracketConfirmation', leagueId, user?.id],
    queryFn: async () => {
      if (!user) return { isConfirmed: false, confirmedAt: null };

      const { data, error } = await supabase
        .from('league_members')
        .select('bracket_confirmed_at')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return {
        isConfirmed: !!data?.bracket_confirmed_at,
        confirmedAt: data?.bracket_confirmed_at,
      };
    },
    enabled: !!user && !!leagueId,
  });
}

/**
 * Confirm the current user's bracket for Mode A.
 */
export function useConfirmBracket() {
  const { user } = useAuth();

  return async (leagueId: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('league_members')
      .update({ bracket_confirmed_at: new Date().toISOString() })
      .eq('league_id', leagueId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  };
}

/**
 * Unconfirm (unlock) the current user's bracket.
 * Only allowed before the tournament starts.
 */
export function useUnconfirmBracket() {
  const { user } = useAuth();

  return async (leagueId: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('league_members')
      .update({ bracket_confirmed_at: null })
      .eq('league_id', leagueId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  };
}

/**
 * Fetch all league members' predictions for a specific stage.
 * Used for "View Opponents' Picks" dialog.
 * RLS enforces visibility server-side.
 */
export interface OpponentPrediction {
  user_id: string;
  display_name: string;
  match_id: string;
  home_team: string;
  away_team: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number | null;
}

export function useLeaguePhaseOpponentPredictions(
  leagueId: string,
  stage: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['leaguePhaseOpponentPredictions', leagueId, stage],
    queryFn: async () => {
      // Get all matches for this stage
      const { data: stageMatches, error: matchError } = await supabase
        .from('matches')
        .select('id, home_team, away_team, match_date')
        .eq('stage', stage as any)
        .order('match_date', { ascending: true });

      if (matchError) throw matchError;
      if (!stageMatches || stageMatches.length === 0) return [];

      const matchIds = stageMatches.map(m => m.id);

      // Get all predictions for these matches in this league
      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('user_id, match_id, predicted_home_score, predicted_away_score, points_earned')
        .eq('league_id', leagueId)
        .in('match_id', matchIds);

      if (predError) throw predError;

      // Get league member profiles
      const { data: members, error: memberError } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId);

      if (memberError) throw memberError;

      const memberIds = members?.map(m => m.user_id) || [];

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', memberIds);

      if (profileError) throw profileError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      const matchMap = new Map(stageMatches.map(m => [m.id, m]));

      // Build result grouped by member
      return (predictions || []).map(p => ({
        user_id: p.user_id,
        display_name: profileMap.get(p.user_id) || 'Unknown',
        match_id: p.match_id,
        home_team: matchMap.get(p.match_id)?.home_team || 'TBD',
        away_team: matchMap.get(p.match_id)?.away_team || 'TBD',
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
        points_earned: p.points_earned,
      })) as OpponentPrediction[];
    },
    enabled: !!leagueId && !!stage && enabled,
    staleTime: 30000,
  });
}
