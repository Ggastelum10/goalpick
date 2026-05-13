CREATE POLICY "Members can update own bracket confirmation"
ON public.league_members
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);