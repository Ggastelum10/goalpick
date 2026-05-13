import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StageMultipliers {
  group: number;
  round_of_32: number;
  round_of_16: number;
  quarter_final: number;
  semi_final: number;
  third_place: number;
  final: number;
}

export interface GroupPositionBonuses {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
}

export interface UserLeague {
  id: string;
  name: string;
  entry_fee: number;
  currency: string;
  member_count: number;
  is_owner: boolean;
  prediction_mode: 'start_to_finish' | 'update_every_stage';
  exact_score_points: number;
  outcome_points: number;
  stage_multipliers: StageMultipliers;
  group_position_bonuses: GroupPositionBonuses;
  first_place_percentage: number;
  second_place_percentage: number;
  third_place_percentage: number;
  prize_pool: number;
  expected_members: number;
  logo_url?: string | null;
  joined_at?: string;
}

export const DEFAULT_STAGE_MULTIPLIERS: StageMultipliers = {
  group: 1,
  round_of_32: 1.5,
  round_of_16: 2,
  quarter_final: 2.5,
  semi_final: 3,
  third_place: 3,
  final: 4,
};

export const DEFAULT_GROUP_BONUSES: GroupPositionBonuses = {
  '1': 10,
  '2': 7,
  '3': 4,
  '4': 2,
};

export const DEFAULT_EXACT_SCORE_POINTS = 5;
export const DEFAULT_OUTCOME_POINTS = 2;

export function useUserLeagues() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-leagues', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get leagues where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('league_members')
        .select(`
          league_id,
          joined_at,
          leagues (
            id,
            name,
            entry_fee,
            currency,
            owner_id,
            prediction_mode,
            exact_score_points,
            outcome_points,
            stage_multipliers,
            group_position_bonuses,
            first_place_percentage,
            second_place_percentage,
            third_place_percentage,
            prize_pool,
            expected_members,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .eq('has_paid', true)
        .order('joined_at', { ascending: true });

      if (memberError) throw memberError;

      // Get member counts for each league
      const leagueIds = memberships?.map(m => m.league_id) || [];
      
      if (leagueIds.length === 0) return [];

      const { data: counts, error: countError } = await supabase
        .from('league_members')
        .select('league_id')
        .in('league_id', leagueIds)
        .eq('has_paid', true);

      if (countError) throw countError;

      // Count members per league
      const memberCounts: Record<string, number> = {};
      counts?.forEach(c => {
        memberCounts[c.league_id] = (memberCounts[c.league_id] || 0) + 1;
      });

      return memberships?.map(m => ({
        id: m.leagues?.id || m.league_id,
        name: m.leagues?.name || 'Unknown League',
        entry_fee: m.leagues?.entry_fee || 0,
        currency: m.leagues?.currency || 'MXN',
        member_count: memberCounts[m.league_id] || 0,
        is_owner: m.leagues?.owner_id === user.id,
        prediction_mode: (m.leagues?.prediction_mode as 'start_to_finish' | 'update_every_stage') || 'update_every_stage',
        exact_score_points: m.leagues?.exact_score_points ?? DEFAULT_EXACT_SCORE_POINTS,
        outcome_points: m.leagues?.outcome_points ?? DEFAULT_OUTCOME_POINTS,
        stage_multipliers: (m.leagues?.stage_multipliers as unknown as StageMultipliers) ?? DEFAULT_STAGE_MULTIPLIERS,
        group_position_bonuses: (m.leagues?.group_position_bonuses as unknown as GroupPositionBonuses) ?? DEFAULT_GROUP_BONUSES,
        first_place_percentage: m.leagues?.first_place_percentage ?? 70,
        second_place_percentage: m.leagues?.second_place_percentage ?? 20,
        third_place_percentage: m.leagues?.third_place_percentage ?? 10,
        prize_pool: m.leagues?.prize_pool ?? 0,
        expected_members: m.leagues?.expected_members ?? 10,
        logo_url: (m.leagues as { logo_url?: string | null })?.logo_url ?? null,
        joined_at: m.joined_at,
      })) as UserLeague[];
    },
    enabled: !!user,
  });
}
