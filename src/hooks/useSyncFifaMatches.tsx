import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResponse {
  success: boolean;
  message?: string;
  synced?: number;
  error?: string;
}

export function useSyncFifaMatches() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const { data, error } = await supabase.functions.invoke('scrape-fifa-matches');
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data as SyncResponse;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Matches synced successfully');
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['upcomingMatches'] });
      } else {
        toast.error(data.error || 'Failed to sync matches');
      }
    },
    onError: (error: Error) => {
      toast.error(`Match sync failed: ${error.message}`);
    },
  });
}