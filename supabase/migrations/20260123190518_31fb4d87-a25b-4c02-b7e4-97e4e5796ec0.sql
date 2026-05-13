-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all predictions" ON public.predictions;

-- Create a restrictive SELECT policy
-- Users can see:
-- 1. Their own predictions at any time
-- 2. Other users' predictions only after the match has started (match_date <= now())
CREATE POLICY "Users can view predictions with time restrictions"
ON public.predictions
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = predictions.match_id 
    AND matches.match_date <= now()
  )
);