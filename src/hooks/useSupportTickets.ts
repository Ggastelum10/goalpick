import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  chat_history: Array<{ role: string; content: string }>;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  chat_history?: Array<{ role: string; content: string }>;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateTicketInput {
  id: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  admin_notes?: string;
  resolved_by?: string;
}

export function useUserTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['support-tickets', 'user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user,
  });
}

export type SupportTicketWithUser = SupportTicket & { user_display_name: string };

export function useAllTickets(statusFilter?: string) {
  return useQuery({
    queryKey: ['support-tickets', 'all', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const tickets = data as SupportTicket[];
      if (tickets.length === 0) return [] as SupportTicketWithUser[];

      const userIds = [...new Set(tickets.map((t) => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) ?? []);

      return tickets.map((t) => ({
        ...t,
        user_display_name: nameMap.get(t.user_id) ?? 'Unknown',
      })) as SupportTicketWithUser[];
    },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user!.id,
          subject: input.subject,
          description: input.description,
          chat_history: input.chat_history || [],
          priority: input.priority || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTicketInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
  });
}
