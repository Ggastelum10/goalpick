import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteEmailParams {
  email: string;
  leagueId: string;
  leagueName: string;
  inviterName: string;
  inviteCode: string;
}

export function useInviteEmail() {
  return useMutation({
    mutationFn: async ({ email, leagueId, leagueName, inviterName, inviteCode }: InviteEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-league-invite', {
        body: {
          email,
          leagueId,
          leagueName,
          inviterName,
          inviteCode,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send invitation');
      }

      return data;
    },
    onError: (error: Error) => {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}
