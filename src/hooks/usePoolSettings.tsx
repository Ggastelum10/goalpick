import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PoolSettings {
  id: string;
  entry_fee: number;
  first_place_percentage: number;
  second_place_percentage: number;
  third_place_percentage: number;
  platform_fee_amount: number;
  platform_fee_currency: string;
  created_at: string;
  updated_at: string;
}

export function usePoolSettings() {
  return useQuery({
    queryKey: ['poolSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PoolSettings | null;
    },
  });
}

export function useUpdatePoolSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<PoolSettings>) => {
      const { data: existing } = await supabase
        .from('pool_settings')
        .select('id')
        .limit(1)
        .single();

      if (!existing) throw new Error('Pool settings not found');

      const { data, error } = await supabase
        .from('pool_settings')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poolSettings'] });
    },
  });
}

export function usePaidUsersCount() {
  return useQuery({
    queryKey: ['paidUsersCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('has_paid_entry', true);

      if (error) throw error;
      return count ?? 0;
    },
  });
}
