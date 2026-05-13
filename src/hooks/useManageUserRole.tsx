import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePromoteToAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role: 'admin' },
          { onConflict: 'user_id,role' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-list'] });
      toast.success('User promoted to admin');
    },
    onError: (error) => {
      console.error('Failed to promote user:', error);
      toast.error('Failed to promote user to admin');
    },
  });
}

export function useRemoveAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-list'] });
      toast.success('Admin role removed');
    },
    onError: (error) => {
      console.error('Failed to remove admin:', error);
      toast.error('Failed to remove admin role');
    },
  });
}
