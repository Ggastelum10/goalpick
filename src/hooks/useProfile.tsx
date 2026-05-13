import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  favorite_team: string | null;
  country: string | null;
  total_points: number;
  has_paid_entry: boolean;
  created_at: string;
  updated_at: string;
  // Notification preferences
  notify_match_results?: boolean;
  notify_points_change?: boolean;
  notify_standings_update?: boolean;
  notify_push_enabled?: boolean;
  notify_email_enabled?: boolean;
  // Tiebreaker stats
  exact_score_count?: number;
  correct_outcome_count?: number;
  goal_difference_accuracy?: number;
  // Onboarding
  has_completed_onboarding?: boolean;
  // Language preference
  preferred_language?: string;
  // Terms acceptance
  has_accepted_terms?: boolean;
  terms_accepted_at?: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
}
