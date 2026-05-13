-- Fix chat RLS recursion by moving league-membership checks into a SECURITY DEFINER function
-- (prevents infinite recursion when policies query league_members)

CREATE OR REPLACE FUNCTION public.can_access_league_chat(_league_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.league_members lm
      WHERE lm.league_id = _league_id
        AND lm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.leagues l
      WHERE l.id = _league_id
        AND l.owner_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_league_chat(uuid) TO authenticated;

-- Recreate chat_messages policies to use the function
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON public.chat_messages;

CREATE POLICY "Users can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  league_id IS NULL
  OR public.can_access_league_chat(league_id)
);

CREATE POLICY "Users can insert chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    league_id IS NULL
    OR public.can_access_league_chat(league_id)
  )
);

-- Ask the API layer to refresh cached schema metadata
NOTIFY pgrst, 'reload schema';
