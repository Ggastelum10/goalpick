-- Create chat message reactions table
CREATE TABLE public.chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  -- One reaction per user per emoji per message
  UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_chat_message_reactions_message_id ON public.chat_message_reactions(message_id);
CREATE INDEX idx_chat_message_reactions_user_id ON public.chat_message_reactions(user_id);

-- Enable RLS
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: Anyone authenticated can view reactions
CREATE POLICY "Users can view reactions"
ON public.chat_message_reactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Users can add their own reactions
CREATE POLICY "Users can add reactions"
ON public.chat_message_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON public.chat_message_reactions
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;