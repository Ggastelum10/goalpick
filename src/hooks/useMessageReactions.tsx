import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

export interface MessageReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

export interface ReactionsByMessage {
  [messageId: string]: MessageReaction[];
}

export function useMessageReactions(messageIds: string[]) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['messageReactions', messageIds.sort().join(',')];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ReactionsByMessage> => {
      if (!messageIds.length) return {};

      const { data, error } = await supabase
        .from('chat_message_reactions')
        .select('id, message_id, user_id, emoji')
        .in('message_id', messageIds);

      if (error) throw error;
      if (!data) return {};

      // Group reactions by message and emoji
      const result: ReactionsByMessage = {};
      
      for (const messageId of messageIds) {
        const messageReactions = data.filter((r: any) => r.message_id === messageId);
        const emojiMap = new Map<string, { count: number; hasReacted: boolean }>();
        
        for (const reaction of messageReactions) {
          const existing = emojiMap.get(reaction.emoji) || { count: 0, hasReacted: false };
          existing.count++;
          if (reaction.user_id === user?.id) {
            existing.hasReacted = true;
          }
          emojiMap.set(reaction.emoji, existing);
        }
        
        result[messageId] = Array.from(emojiMap.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          hasReacted: data.hasReacted,
        }));
      }
      
      return result;
    },
    enabled: messageIds.length > 0,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!messageIds.length) return;

    const channel = supabase
      .channel('reactions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_message_reactions',
        },
        (payload) => {
          const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;
          if (messageIds.includes(messageId)) {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds, queryClient, queryKey]);

  return query;
}

export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if user already has this reaction
      const { data: existing } = await supabase
        .from('chat_message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add reaction
        const { error } = await supabase
          .from('chat_message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          } as any);
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: () => {
      // Invalidate all reaction queries
      queryClient.invalidateQueries({ queryKey: ['messageReactions'] });
    },
  });
}

// Common emoji reactions
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
