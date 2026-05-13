import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export interface ChatMessage {
  id: string;
  user_id: string;
  league_id: string | null;
  match_id: string | null;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
}

// leagueId: null = community chat, string = league-specific chat
export function useChatMessages(leagueId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = leagueId ? ['chatMessages', leagueId] : ['chatMessages', 'community'];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ChatMessage[]> => {
      // Build query based on chat type
      let messagesData;
      let messagesError;

      if (leagueId === null) {
        // Community chat: league_id IS NULL
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, user_id, league_id, match_id, content, created_at')
          .is('league_id', null)
          .order('created_at', { ascending: true })
          .limit(100);
        messagesData = data;
        messagesError = error;
      } else {
        // League chat: specific league_id - use filter to avoid type issues
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, user_id, league_id, match_id, content, created_at')
          .filter('league_id', 'eq', leagueId)
          .order('created_at', { ascending: true })
          .limit(100);
        messagesData = data;
        messagesError = error;
      }

      if (messagesError) throw messagesError;
      if (!messagesData || messagesData.length === 0) return [];

      // Get unique user IDs
      const userIds = Array.from(new Set(messagesData.map((m) => m.user_id))) as string[];
      
      // Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Map profiles to messages
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      return messagesData.map((msg: any) => ({
        id: msg.id,
        user_id: msg.user_id,
        league_id: msg.league_id,
        match_id: msg.match_id,
        content: msg.content,
        created_at: msg.created_at,
        profiles: profileMap.get(msg.user_id) || { display_name: 'Unknown', avatar_url: null }
      }));
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channelName = leagueId ? `chat-${leagueId}` : 'chat-community';
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          // Filter by league_id for league chats, no filter for community (handled in query)
          ...(leagueId ? { filter: `league_id=eq.${leagueId}` } : {}),
        },
        (payload) => {
          // For community chat, only invalidate if league_id is null
          if (leagueId === null && payload.new && (payload.new as any).league_id !== null) {
            return;
          }
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, queryClient, queryKey]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ content, leagueId }: { content: string; leagueId: string | null }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          content,
          league_id: leagueId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const queryKey = variables.leagueId 
        ? ['chatMessages', variables.leagueId] 
        : ['chatMessages', 'community'];
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, leagueId }: { messageId: string; leagueId: string | null }) => {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return { messageId, leagueId };
    },
    onSuccess: (variables) => {
      const queryKey = variables.leagueId 
        ? ['chatMessages', variables.leagueId] 
        : ['chatMessages', 'community'];
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
