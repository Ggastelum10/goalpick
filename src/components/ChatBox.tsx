import { useState, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Send, Loader2, AlertTriangle, Globe, SmilePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useChatMessages, useSendMessage, useDeleteMessage, ChatMessage } from '@/hooks/useChat';
import { useMessageReactions, useToggleReaction, REACTION_EMOJIS, MessageReaction } from '@/hooks/useMessageReactions';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface ChatBoxProps {
  leagueId: string | null;
  className?: string;
  isCommunity?: boolean;
  isLeagueOwner?: boolean;
}

export function ChatBox({ leagueId, className, isCommunity = false, isLeagueOwner = false }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const { data: messages, isLoading } = useChatMessages(leagueId);
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const canModerate = !!isAdmin || isLeagueOwner;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get all message IDs for fetching reactions
  const messageIds = useMemo(() => messages?.map(m => m.id) || [], [messages]);
  const { data: reactions } = useMessageReactions(messageIds);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await sendMessage.mutateAsync({ content: message.trim(), leagueId });
    setMessage('');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {isCommunity && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="text-xs text-warning">
            <span className="font-semibold">Public Chat</span> — Messages are visible to all Goalpick users. Only your username is shown.
          </div>
        </div>
      )}
      <div className="bg-muted/50 border-b border-border px-4 py-1.5 text-[11px] text-muted-foreground text-center">
        Be respectful — no hate speech, insults, or inappropriate behavior. Violations may result in a ban.
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{isCommunity ? 'Be the first to say hello to the community!' : 'No messages yet. Start the conversation!'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages?.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isOwn={msg.user_id === user?.id}
                hideAvatar={isCommunity}
                reactions={reactions?.[msg.id] || []}
                onDelete={() => deleteMessage.mutate({ messageId: msg.id, leagueId })}
                isDeleting={deleteMessage.isPending}
                canModerate={canModerate}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isCommunity ? "Say something to the community..." : "Type a message..."}
            className="flex-1"
            maxLength={500}
          />
          <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  hideAvatar?: boolean;
  reactions: MessageReaction[];
  onDelete: () => void;
  isDeleting: boolean;
  canModerate?: boolean;
}

function MessageBubble({ message, isOwn, hideAvatar = false, reactions, onDelete, isDeleting, canModerate = false }: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const toggleReaction = useToggleReaction();
  const initials = message.profiles?.display_name?.slice(0, 2).toUpperCase() || '??';

  const handleReaction = (emoji: string) => {
    toggleReaction.mutate({ messageId: message.id, emoji });
    setShowPicker(false);
  };
  
  return (
    <div className={cn('flex gap-2 group', isOwn && 'flex-row-reverse')}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        {!hideAvatar && <AvatarImage src={message.profiles?.avatar_url || undefined} />}
        <AvatarFallback className="text-xs bg-primary/20 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[70%] flex flex-col', isOwn && 'items-end')}>
        <div className={cn('flex items-baseline gap-2 mb-1', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-medium">{message.profiles?.display_name}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
        </div>
        
        <div className="relative">
          <div
            className={cn(
              'rounded-2xl px-4 py-2 text-sm',
              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            {message.content}
          </div>
          
          {/* Action buttons - appear on hover */}
          <div className={cn(
            'absolute -bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isOwn ? '-left-3 flex-row-reverse' : '-right-3'
          )}>
            {/* Reaction button */}
            <Popover open={showPicker} onOpenChange={setShowPicker}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'h-6 w-6 rounded-full bg-background border border-border shadow-sm',
                    'flex items-center justify-center hover:bg-muted'
                  )}
                >
                  <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" side="top" align={isOwn ? 'start' : 'end'}>
                <div className="flex gap-1">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center text-lg transition-transform hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Delete button - own messages, or admins/league owners */}
            {(isOwn || canModerate) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className={cn(
                      'h-6 w-6 rounded-full bg-background border border-border shadow-sm',
                      'flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30'
                    )}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete message?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This message will be permanently deleted for everyone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Display reactions */}
        {reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn && 'justify-end')}>
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                  'border transition-colors',
                  reaction.hasReacted 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'bg-muted border-border hover:bg-muted/80'
                )}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
