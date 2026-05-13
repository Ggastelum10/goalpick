-- Add league_id column if not exists (safe to run again)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'chat_messages' 
                   AND column_name = 'league_id') THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_chat_messages_league_id ON public.chat_messages(league_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON public.chat_messages;

-- Community messages (league_id IS NULL) are visible to all authenticated users
-- League messages are only visible to league members
CREATE POLICY "Users can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  league_id IS NULL 
  OR EXISTS (
    SELECT 1 FROM public.league_members 
    WHERE league_members.league_id = chat_messages.league_id 
    AND league_members.user_id = auth.uid()
  )
);

-- Users can send messages to community (null) or leagues they belong to
CREATE POLICY "Users can insert chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND (
    league_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.league_members 
      WHERE league_members.league_id = chat_messages.league_id 
      AND league_members.user_id = auth.uid()
    )
  )
);