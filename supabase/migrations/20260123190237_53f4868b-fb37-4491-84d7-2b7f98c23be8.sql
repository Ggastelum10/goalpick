-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view league members" ON public.league_members;

-- Create a more restrictive SELECT policy
-- Users can only see league members if:
-- 1. They are viewing their own membership record
-- 2. They are a member of the same league
-- 3. They are the owner of the league
CREATE POLICY "League members can view their league members"
ON public.league_members
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.league_members lm 
    WHERE lm.league_id = league_members.league_id 
    AND lm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.leagues 
    WHERE leagues.id = league_members.league_id 
    AND leagues.owner_id = auth.uid()
  )
);