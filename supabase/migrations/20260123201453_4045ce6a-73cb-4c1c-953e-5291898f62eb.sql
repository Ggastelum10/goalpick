-- Drop the old recursive policy and recreate with the security definer functions
DROP POLICY IF EXISTS "League members can view their league members" ON public.league_members;

-- Create a new non-recursive SELECT policy
CREATE POLICY "League members can view their league members"
ON public.league_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_league_member(league_id, auth.uid())
  OR public.is_league_owner(league_id, auth.uid())
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';