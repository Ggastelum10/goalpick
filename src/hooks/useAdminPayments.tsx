import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  id: string;
  user_id: string;
  league_id: string;
  league_name: string;
  entry_fee: number;
  currency: string;
  has_paid: boolean;
  stripe_payment_id: string | null;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

interface AdminFee {
  id: string;
  user_id: string;
  league_id: string;
  league_name: string;
  amount: number;
  currency: string;
  stripe_payment_id: string | null;
  paid_at: string | null;
  display_name: string;
  avatar_url: string | null;
}

interface PaymentStats {
  totalLeagues: number;
  totalMembers: number;
  paidMembers: number;
  pendingMembers: number;
  totalRevenue: number;
  totalPlatformFees: number;
  totalPlatformFeeCount: number;
}

export function useAdminPayments() {
  return useQuery({
    queryKey: ['admin-payments'],
    queryFn: async (): Promise<{ payments: PaymentData[]; stats: PaymentStats; platformFees: AdminFee[] }> => {
      // Fetch all leagues
      const { data: leagues, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name, entry_fee, currency');

      if (leaguesError) throw leaguesError;

      // Fetch all league members
      const { data: members, error: membersError } = await supabase
        .from('league_members')
        .select('*');

      if (membersError) throw membersError;

      // Fetch all admin fees
      const { data: adminFees, error: adminFeesError } = await supabase
        .from('admin_fees')
        .select('*')
        .order('paid_at', { ascending: false });

      if (adminFeesError) throw adminFeesError;

      // Fetch all profiles
      const userIds = [...new Set([
        ...members.map(m => m.user_id),
        ...(adminFees || []).map(f => f.user_id)
      ])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create lookup maps
      const leagueMap = new Map(leagues.map(l => [l.id, l]));
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      // Build payment data
      const payments: PaymentData[] = members.map(member => {
        const league = leagueMap.get(member.league_id);
        const profile = profileMap.get(member.user_id);

        return {
          id: member.id,
          user_id: member.user_id,
          league_id: member.league_id,
          league_name: league?.name || 'Unknown League',
          entry_fee: league?.entry_fee || 0,
          currency: league?.currency || 'MXN',
          has_paid: member.has_paid,
          stripe_payment_id: member.stripe_payment_id,
          joined_at: member.joined_at,
          display_name: profile?.display_name || 'Unknown User',
          avatar_url: profile?.avatar_url || null,
        };
      });

      // Build platform fees data
      const platformFees: AdminFee[] = (adminFees || []).map(fee => {
        const league = leagueMap.get(fee.league_id);
        const profile = profileMap.get(fee.user_id);

        return {
          id: fee.id,
          user_id: fee.user_id,
          league_id: fee.league_id,
          league_name: league?.name || 'Unknown League',
          amount: fee.amount,
          currency: fee.currency,
          stripe_payment_id: fee.stripe_payment_id,
          paid_at: fee.paid_at,
          display_name: profile?.display_name || 'Unknown User',
          avatar_url: profile?.avatar_url || null,
        };
      });

      // Calculate stats
      const paidMembers = members.filter(m => m.has_paid);
      const totalRevenue = paidMembers.reduce((sum, member) => {
        const league = leagueMap.get(member.league_id);
        return sum + (league?.entry_fee || 0);
      }, 0);

      const totalPlatformFees = (adminFees || []).reduce((sum, fee) => sum + Number(fee.amount), 0);

      const stats: PaymentStats = {
        totalLeagues: leagues.length,
        totalMembers: members.length,
        paidMembers: paidMembers.length,
        pendingMembers: members.length - paidMembers.length,
        totalRevenue,
        totalPlatformFees,
        totalPlatformFeeCount: (adminFees || []).length,
      };

      return { payments, stats, platformFees };
    },
  });
}
