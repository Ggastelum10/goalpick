-- Add penalty score columns to predictions table for knockout stage tiebreakers
ALTER TABLE public.predictions
ADD COLUMN predicted_home_penalty integer DEFAULT NULL,
ADD COLUMN predicted_away_penalty integer DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.predictions.predicted_home_penalty IS 'Penalty shootout score for home team (only used in knockout stages when scores are tied)';
COMMENT ON COLUMN public.predictions.predicted_away_penalty IS 'Penalty shootout score for away team (only used in knockout stages when scores are tied)';