-- Drop the existing unique constraint that doesn't account for league_id
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;

-- Create a new unique index that allows one prediction per user per match per league
-- COALESCE is used to handle NULL league_id values consistently
CREATE UNIQUE INDEX predictions_user_match_league_unique 
ON public.predictions (user_id, match_id, COALESCE(league_id, '00000000-0000-0000-0000-000000000000'::uuid));