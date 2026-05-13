CREATE POLICY "Owners can view their leagues"
ON public.leagues
FOR SELECT
USING (auth.uid() = owner_id);