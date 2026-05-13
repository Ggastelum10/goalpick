import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminLeague {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
  entry_fee: number;
  currency: string;
  is_test: boolean;
  platform_fees_waived: boolean;
  logo_url: string | null;
  logo_scale: number | null;
  logo_offset_x: number | null;
  logo_offset_y: number | null;
  owner_display_name: string;
  member_count: number;
  total_platform_fees: number;
  members: AdminLeagueMember[];
}

export interface AdminLeagueMember {
  id: string;
  user_id: string;
  admin_fee_paid: boolean;
  has_paid: boolean;
  joined_at: string;
  display_name: string;
}

export function useAdminLeagues() {
  return useQuery({
    queryKey: ['admin-leagues'],
    queryFn: async () => {
      // Fetch all leagues
      const { data: leagues, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name, created_at, owner_id, entry_fee, currency, is_test, platform_fees_waived, logo_url, logo_scale, logo_offset_x, logo_offset_y')
        .order('created_at', { ascending: false });

      if (leaguesError) throw leaguesError;
      if (!leagues?.length) return [];

      // Fetch all league members
      const { data: members, error: membersError } = await supabase
        .from('league_members')
        .select('id, league_id, user_id, admin_fee_paid, has_paid, joined_at');

      if (membersError) throw membersError;

      // Fetch all profiles for display names
      const userIds = new Set([
        ...leagues.map(l => l.owner_id),
        ...(members || []).map(m => m.user_id),
      ]);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      // Fetch admin_fees aggregated per league
      const { data: adminFees, error: feesError } = await supabase
        .from('admin_fees')
        .select('league_id, amount, paid_at');

      if (feesError) throw feesError;

      const feesByLeague = new Map<string, number>();
      (adminFees || []).forEach(f => {
        if (f.paid_at) {
          feesByLeague.set(f.league_id, (feesByLeague.get(f.league_id) || 0) + Number(f.amount));
        }
      });

      // Assemble
      const result: AdminLeague[] = leagues.map(league => {
        const leagueMembers = (members || [])
          .filter(m => m.league_id === league.id)
          .map(m => ({
            id: m.id,
            user_id: m.user_id,
            admin_fee_paid: m.admin_fee_paid,
            has_paid: m.has_paid,
            joined_at: m.joined_at,
            display_name: profileMap.get(m.user_id) || 'Unknown',
          }));

        return {
          ...league,
          owner_display_name: profileMap.get(league.owner_id) || 'Unknown',
          member_count: leagueMembers.length,
          total_platform_fees: feesByLeague.get(league.id) || 0,
          members: leagueMembers,
        };
      });

      return result;
    },
  });
}

export function useWaivePlatformFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leagueId, userId }: { leagueId: string; userId: string }) => {
      // Update league_members
      const { error: memberError } = await supabase
        .from('league_members')
        .update({ admin_fee_paid: true })
        .eq('league_id', leagueId)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Check if admin_fees record exists
      const { data: existing } = await supabase
        .from('admin_fees')
        .select('id')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('admin_fees')
          .update({ paid_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_fees')
          .insert({ league_id: leagueId, user_id: userId, amount: 0, paid_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
      toast.success('Platform fee waived successfully');
    },
    onError: () => {
      toast.error('Failed to waive platform fee');
    },
  });
}

export function useDeleteLeague() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leagueId: string) => {
      // Delete in FK order
      const tables = [
        'predictions',
        'original_predictions',
        'admin_fees',
        'chat_messages',
        'league_members',
      ] as const;

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('league_id', leagueId);
        if (error) throw new Error(`Failed to delete from ${table}: ${error.message}`);
      }

      const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
      if (error) throw new Error(`Failed to delete league: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
      toast.success('League deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useToggleLeagueFeeWaiver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leagueId, waived }: { leagueId: string; waived: boolean }) => {
      // 1. Flip the league flag
      const { error: leagueError } = await supabase
        .from('leagues')
        .update({ platform_fees_waived: waived })
        .eq('id', leagueId);

      if (leagueError) throw leagueError;

      // 2. When ENABLING the waiver, backfill all existing members so they
      //    immediately appear as paid (matches future joiners' state).
      if (waived) {
        const { error: memberError } = await supabase
          .from('league_members')
          .update({ admin_fee_paid: true, has_paid: true })
          .eq('league_id', leagueId);

        if (memberError) throw memberError;
      }
      // When DISABLING, we leave existing members as-is (no retroactive billing).
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
      toast.success(
        variables.waived
          ? 'Platform fees waived for this league'
          : 'Platform fees re-enabled for this league',
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update fee waiver');
    },
  });
}

export function useUpdateLeagueLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leagueId, file }: { leagueId: string; file: File }) => {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${leagueId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('league-logos')
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('league-logos').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updateError } = await supabase
        .from('leagues')
        .update({ logo_url: publicUrl })
        .eq('id', leagueId);
      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
      toast.success('League logo updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update logo');
    },
  });
}

export function useRemoveLeagueLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leagueId, currentUrl }: { leagueId: string; currentUrl: string | null }) => {
      const { error } = await supabase
        .from('leagues')
        .update({ logo_url: null })
        .eq('id', leagueId);
      if (error) throw error;

      // Best-effort delete of the previous object
      if (currentUrl) {
        const marker = '/league-logos/';
        const idx = currentUrl.indexOf(marker);
        if (idx !== -1) {
          const path = currentUrl.substring(idx + marker.length).split('?')[0];
          await supabase.storage.from('league-logos').remove([path]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leagues'] });
      toast.success('League logo removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove logo');
    },
  });
}
