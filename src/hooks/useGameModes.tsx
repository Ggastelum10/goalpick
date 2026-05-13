import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GameMode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useGameModes() {
  return useQuery({
    queryKey: ['game-modes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_modes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as GameMode[];
    },
  });
}

export function useEnabledGameModes() {
  return useQuery({
    queryKey: ['game-modes', 'enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_modes')
        .select('*')
        .eq('is_enabled', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as GameMode[];
    },
  });
}

export function useUpdateGameMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('game_modes')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as GameMode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-modes'] });
      toast({
        title: data.is_enabled ? 'Game mode enabled' : 'Game mode disabled',
        description: `${data.name} has been ${data.is_enabled ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating game mode',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
