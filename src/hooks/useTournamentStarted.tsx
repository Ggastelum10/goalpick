import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTournamentStarted() {
  return useQuery({
    queryKey: ['tournament-started'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('match_date')
        .order('match_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const firstMatchDate = data?.match_date ? new Date(data.match_date) : null;
      const hasStarted = firstMatchDate ? firstMatchDate.getTime() <= Date.now() : false;

      return { hasStarted, firstMatchDate };
    },
    staleTime: 60_000,
  });
}