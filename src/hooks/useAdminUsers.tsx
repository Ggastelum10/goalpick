import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: 'admin' | 'user';
  created_at: string;
  leagues_joined: number;
  entry_fees_total: number;
  platform_fees_count: number;
  platform_fees_total: number;
  total_points: number;
  predictions_count: number;
}

export interface AdminUsersStats {
  totalUsers: number;
  adminCount: number;
  activeUsers: number;
}

export function useAdminUsers(page: number = 0, pageSize: number = 50, search?: string) {
  return useQuery({
    queryKey: ['admin-users', page, pageSize, search],
    queryFn: async () => {
      // Use the server-side DB function for aggregation
      const { data: dbUsers, error: dbError } = await supabase.rpc('get_admin_users_summary', {
        p_limit: pageSize,
        p_offset: page * pageSize,
        p_search: search || null,
      });

      if (dbError) throw dbError;

      const totalCount = dbUsers?.[0]?.total_count || 0;

      // Fetch user emails via edge function (paginated)
      let userEmails: Record<string, string> = {};
      try {
        const userIds = (dbUsers || []).map((u: any) => u.user_id);
        const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-admin-users', {
          body: { userIds },
        });
        if (!emailsError && emailsData?.userEmails) {
          userEmails = emailsData.userEmails;
        }
      } catch (e) {
        console.error('Failed to fetch user emails:', e);
      }

      // Build user list
      const users: AdminUser[] = (dbUsers || []).map((u: any) => ({
        user_id: u.user_id,
        display_name: u.display_name || '',
        email: userEmails[u.user_id] || '',
        avatar_url: u.avatar_url,
        role: u.is_admin ? 'admin' : 'user',
        created_at: u.created_at,
        leagues_joined: Number(u.leagues_joined) || 0,
        entry_fees_total: Number(u.entry_fees_total) || 0,
        platform_fees_count: Number(u.platform_fees_count) || 0,
        platform_fees_total: Number(u.platform_fees_total) || 0,
        total_points: u.total_points || 0,
        predictions_count: Number(u.predictions_count) || 0,
      }));

      // Calculate stats
      const stats: AdminUsersStats = {
        totalUsers: Number(totalCount),
        adminCount: users.filter(u => u.role === 'admin').length,
        activeUsers: users.filter(u => u.predictions_count > 0).length,
      };

      return { users, stats, totalCount: Number(totalCount), pageSize };
    },
  });
}

export function useAdminList() {
  return useQuery({
    queryKey: ['admin-list'],
    queryFn: async () => {
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) {
        return [];
      }

      const adminUserIds = adminRoles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', adminUserIds);

      if (profilesError) throw profilesError;

      return profiles || [];
    },
  });
}
