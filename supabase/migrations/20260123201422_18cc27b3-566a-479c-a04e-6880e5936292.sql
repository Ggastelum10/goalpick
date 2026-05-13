-- Fix league_members RLS recursion by using a security definer function
-- The current SELECT policy queries league_members inside itself, causing infinite recursion

-- Create helper function to check if user is member of a league (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_league_member(_league_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = _league_id
      AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_league_member(uuid, uuid) TO authenticated;

-- Create helper function to check if user is owner of a league
CREATE OR REPLACE FUNCTION public.is_league_owner(_league_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.leagues
    WHERE id = _league_id
      AND owner_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_league_owner(uuid, uuid) TO authenticated;

-- Drop problematic policies
DROP POLICY IF EXISTS "League members can view their league members" ON public.league_members;

-- Recreate SELECT policy using security definer functions (no recursion)
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