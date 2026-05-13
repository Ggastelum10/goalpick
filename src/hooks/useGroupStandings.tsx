import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GroupStanding {
  id: string;
  group_name: string;
  team: string;
  final_position: number;
  created_at: string;
}

export function useGroupStandings() {
  return useQuery({
    queryKey: ['groupStandings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_standings')
        .select('*')
        .order('group_name')
        .order('final_position');

      if (error) throw error;
      return data as GroupStanding[];
    },
  });
}

export function useGroupStandingsByGroup(groupName: string) {
  return useQuery({
    queryKey: ['groupStandings', groupName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_standings')
        .select('*')
        .eq('group_name', groupName)
        .order('final_position');

      if (error) throw error;
      return data as GroupStanding[];
    },
    enabled: !!groupName,
  });
}

export function useUpsertGroupStandings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (standings: { group_name: string; team: string; final_position: number }[]) => {
      // Delete existing standings for the groups being updated
      const groupNames = [...new Set(standings.map(s => s.group_name))];
      
      for (const groupName of groupNames) {
        const { error: deleteError } = await supabase
          .from('group_standings')
          .delete()
          .eq('group_name', groupName);
        
        if (deleteError) throw deleteError;
      }

      // Insert new standings
      const { data, error } = await supabase
        .from('group_standings')
        .insert(standings)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupStandings'] });
    },
  });
}
