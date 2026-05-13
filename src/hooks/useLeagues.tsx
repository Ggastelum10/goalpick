import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useIsAdmin } from './useProfile';
import { toast } from 'sonner';

export type PredictionMode = 'start_to_finish' | 'update_every_stage';

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
  1: number;
  2: number;
  3: number;
  4: number;
}

export interface League {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  entry_fee: number;
  currency: string;
  first_place_percentage: number;
  second_place_percentage: number;
  third_place_percentage: number;
  is_public: boolean;
  prediction_mode: PredictionMode;
  exact_score_points: number;
  outcome_points: number;
  stage_multipliers: StageMultipliers;
  group_position_bonuses: GroupPositionBonuses;
  platform_fees_waived?: boolean;
  show_prize_pool?: boolean;
  show_prize_distribution?: boolean;
  hide_invite_from_members?: boolean;
  logo_url?: string | null;
  logo_scale?: number | null;
  logo_offset_x?: number | null;
  logo_offset_y?: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  role: string;
  has_paid: boolean;
  stripe_payment_id: string | null;
  joined_at: string;
}

export interface LeagueWithMembers extends League {
  member_count: number;
  is_member: boolean;
  is_owner: boolean;
  has_paid: boolean;
}

export function useLeagues() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leagues', user?.id],
    queryFn: async () => {
      if (!user) return { myLeagues: [], publicLeagues: [] };

      // Fetch all leagues user is a member of
      const { data: membershipData, error: membershipError } = await supabase
        .from('league_members')
        .select('league_id, has_paid')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const memberLeagueIds = membershipData?.map(m => m.league_id) || [];
      const membershipMap = new Map(membershipData?.map(m => [m.league_id, m.has_paid]));

      // Fetch leagues user owns or is a member of
      const { data: myLeaguesData, error: myLeaguesError } = await supabase
        .from('leagues')
        .select('*')
        .or(`owner_id.eq.${user.id},id.in.(${memberLeagueIds.length > 0 ? memberLeagueIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

      if (myLeaguesError) throw myLeaguesError;

      // Fetch public leagues
      const { data: publicLeaguesData, error: publicLeaguesError } = await supabase
        .from('leagues')
        .select('*')
        .eq('is_public', true);

      if (publicLeaguesError) throw publicLeaguesError;

      // Get member counts for all leagues
      const allLeagueIds = [...new Set([
        ...(myLeaguesData?.map(l => l.id) || []),
        ...(publicLeaguesData?.map(l => l.id) || [])
      ])];

      const memberCounts: Record<string, number> = {};
      for (const leagueId of allLeagueIds) {
        const { count } = await supabase
          .from('league_members')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId)
          .eq('has_paid', true);
        memberCounts[leagueId] = count || 0;
      }

      const enrichLeague = (league: typeof myLeaguesData[number]): LeagueWithMembers => ({
        ...league,
        prediction_mode: league.prediction_mode as PredictionMode,
        stage_multipliers: league.stage_multipliers as unknown as StageMultipliers,
        group_position_bonuses: league.group_position_bonuses as unknown as GroupPositionBonuses,
        member_count: memberCounts[league.id] || 0,
        is_member: memberLeagueIds.includes(league.id),
        is_owner: league.owner_id === user.id,
        has_paid: membershipMap.get(league.id) || false,
      });

      return {
        myLeagues: (myLeaguesData || []).map(enrichLeague),
        publicLeagues: (publicLeaguesData || [])
          .filter(l => !memberLeagueIds.includes(l.id) && l.owner_id !== user.id)
          .map(enrichLeague),
      };
    },
    enabled: !!user,
  });
}

export function useLeague(leagueId: string) {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['league', leagueId, isAdmin ? 'admin' : 'user'],
    queryFn: async () => {
      const { data: league, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single();

      if (leagueError) throw leagueError;

      // Fetch members with profiles - use secure view that hides payment data from non-owners
      const { data: members, error: membersError } = await supabase
        .from('league_members_public')
        .select('*')
        .eq('league_id', leagueId);

      if (membersError) throw membersError;

      // Fetch profiles for members
      const userIds = members?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const membersWithProfiles = members?.map(member => ({
        ...member,
        profile: profilesMap.get(member.user_id),
      }));

      // Check if current user is a member
      const userMembership = members?.find(m => m.user_id === user?.id);

      const isOwner = league.owner_id === user?.id;
      const realIsMember = !!userMembership;
      const realHasPaid = userMembership?.has_paid ?? null;
      const isAdminPreview = !!isAdmin && !isOwner && !realIsMember;

      return {
        league,
        members: membersWithProfiles || [],
        isOwner,
        isMember: isAdminPreview ? true : realIsMember,
        hasPaid: isAdminPreview ? true : realHasPaid,
        isAdminPreview,
      };
    },
    enabled: !!leagueId,
  });

  // Subscribe to realtime updates for league members
  useEffect(() => {
    if (!leagueId) return;

    const channel = supabase
      .channel(`league-members-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'league_members',
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          // Refetch league data when any member changes
          queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
          
          // Show toast for payment completions (for owners viewing the page)
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as { has_paid?: boolean };
            if (newData.has_paid) {
              toast.success('A member just completed their payment!');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, queryClient]);

  return query;
}

export function useLeagueByInviteCode(inviteCode: string) {
  return useQuery({
    queryKey: ['league-invite', inviteCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (error) throw error;

      // Get member count
      const { count } = await supabase
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', data.id)
        .eq('has_paid', true);

      return { ...data, member_count: count || 0 };
    },
    enabled: !!inviteCode,
  });
}

export function useCreateLeague() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      entry_fee: number;
      expected_members: number;
      currency: string;
      first_place_percentage: number;
      second_place_percentage: number;
      third_place_percentage: number;
      is_public: boolean;
      prediction_mode: PredictionMode;
      exact_score_points: number;
      outcome_points: number;
      stage_multipliers: StageMultipliers;
      group_position_bonuses: GroupPositionBonuses;
      owner_covers_fees?: boolean;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Calculate prize pool from entry fee and expected members
      const prize_pool = data.entry_fee * data.expected_members;

      const insertData = {
        name: data.name,
        description: data.description,
        entry_fee: data.entry_fee,
        expected_members: data.expected_members,
        currency: data.currency,
        first_place_percentage: data.first_place_percentage,
        second_place_percentage: data.second_place_percentage,
        third_place_percentage: data.third_place_percentage,
        is_public: data.is_public,
        prediction_mode: data.prediction_mode,
        exact_score_points: data.exact_score_points,
        outcome_points: data.outcome_points,
        stage_multipliers: { ...data.stage_multipliers },
        group_position_bonuses: { '1': data.group_position_bonuses[1], '2': data.group_position_bonuses[2], '3': data.group_position_bonuses[3], '4': data.group_position_bonuses[4] },
        prize_pool,
        owner_id: user.id,
        owner_covers_fees: data.owner_covers_fees || false,
        prepaid_licenses: 0, // Will be updated after Stripe payment if owner_covers_fees is true
      } satisfies Record<string, unknown>;

      const { data: league, error } = await supabase
        .from('leagues')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Add owner as a paid member
      await supabase.from('league_members').insert({
        league_id: league.id,
        user_id: user.id,
        role: 'owner',
        has_paid: true,
        admin_fee_paid: true, // Owner's fee is waived
      });

      return { league, owner_covers_fees: data.owner_covers_fees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('League created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create league: ${error.message}`);
    },
  });
}

export function usePurchaseLicenses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leagueId, licenseCount }: { leagueId: string; licenseCount: number }) => {
      const { data, error } = await supabase.functions.invoke('purchase-league-licenses', {
        body: { league_id: leagueId, license_count: licenseCount },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ['league', variables.leagueId] });
    },
    onError: (error) => {
      toast.error(`Failed to purchase licenses: ${error.message}`);
    },
  });
}

export function useUpdateLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stage_multipliers,
      group_position_bonuses,
      ...rest
    }: Partial<League> & {
      id: string;
      prize_pool?: number;
      expected_members?: number;
    }) => {
      const updateData: Record<string, unknown> = { ...rest };
      if (stage_multipliers) {
        updateData.stage_multipliers = stage_multipliers;
      }
      if (group_position_bonuses) {
        updateData.group_position_bonuses = { '1': group_position_bonuses[1], '2': group_position_bonuses[2], '3': group_position_bonuses[3], '4': group_position_bonuses[4] };
      }
      const { error } = await supabase
        .from('leagues')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['league', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      queryClient.invalidateQueries({ queryKey: ['user-leagues'] });
      toast.success('League updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update league: ${error.message}`);
    },
  });
}

export function useDeleteLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leagueId: string) => {
      const { error } = await supabase
        .from('leagues')
        .delete()
        .eq('id', leagueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
      toast.success('League deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete league: ${error.message}`);
    },
  });
}

export function useJoinLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leagueId: string) => {
      const { data, error } = await supabase.functions.invoke('create-league-payment', {
        body: { league_id: leagueId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, leagueId) => {
      // If prepaid license was used, no URL will be returned
      if (data.prepaid) {
        toast.success('Joined league using prepaid license!');
        queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
        queryClient.invalidateQueries({ queryKey: ['leagues'] });
      } else if (data.waived) {
        toast.success('Joined league - platform fees waived!');
        queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
        queryClient.invalidateQueries({ queryKey: ['leagues'] });
        queryClient.invalidateQueries({ queryKey: ['membership-check'] });
      } else if (data.url) {
        // Redirect in same tab for seamless return experience
        window.location.href = data.url;
      }
    },
    onError: (error, leagueId) => {
      // Handle "already paid" case gracefully
      if (error.message.includes('already paid')) {
        queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
        queryClient.invalidateQueries({ queryKey: ['leagues'] });
        toast.success('You are already a member of this league!');
        return;
      }
      toast.error(`Failed to join league: ${error.message}`);
    },
  });
}

export function useLeagueLeaderboard(leagueId: string) {
  return useQuery({
    queryKey: ['league-leaderboard', leagueId],
    queryFn: async () => {
      // Get paid members of the league - use secure view
      // has_paid will be true for paid members, null for those hidden from non-owners
      const { data: members, error: membersError } = await supabase
        .from('league_members_public')
        .select('user_id, has_paid')
        .eq('league_id', leagueId)
        .eq('has_paid', true);

      if (membersError) throw membersError;

      const userIds = members?.map(m => m.user_id) || [];

      if (userIds.length === 0) return [];

      // Get profiles for those members
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds)
        .order('total_points', { ascending: false });

      if (profilesError) throw profilesError;

      return (profiles || []).map((profile, index) => ({
        ...profile,
        rank: index + 1,
      }));
    },
    enabled: !!leagueId,
  });
}
