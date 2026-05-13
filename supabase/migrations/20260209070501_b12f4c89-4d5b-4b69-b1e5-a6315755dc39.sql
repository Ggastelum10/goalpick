-- Hide test leagues from non-admin users by updating the public leagues policy
DROP POLICY IF EXISTS "Anyone can view public leagues" ON public.leagues;
CREATE POLICY "Anyone can view public non-test leagues" 
  ON public.leagues 
  FOR SELECT 
  USING (is_public = true AND is_test = false);