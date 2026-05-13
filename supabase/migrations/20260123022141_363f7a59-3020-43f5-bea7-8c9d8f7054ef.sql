-- Allow authenticated users to view any league (needed for invite link flow)
-- Private leagues are still "private" in the UI browse list, but can be accessed via invite code
CREATE POLICY "Authenticated users can view any league for joining"
ON public.leagues
FOR SELECT
TO authenticated
USING (true);