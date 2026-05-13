-- Add prediction_mode column to leagues table
ALTER TABLE public.leagues 
ADD COLUMN prediction_mode text NOT NULL DEFAULT 'update_every_stage' 
CHECK (prediction_mode IN ('start_to_finish', 'update_every_stage'));

-- Add comment for clarity
COMMENT ON COLUMN public.leagues.prediction_mode IS 'start_to_finish: bracket locks on first match, update_every_stage: can re-predict after each stage ends';

-- Create table to store original predictions for Mode B comparison
CREATE TABLE public.original_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  predicted_home_score integer NOT NULL,
  predicted_away_score integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, league_id, match_id)
);

-- Enable RLS
ALTER TABLE public.original_predictions ENABLE ROW LEVEL SECURITY;

-- RLS policies for original_predictions
CREATE POLICY "Users can view own original predictions"
ON public.original_predictions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own original predictions"
ON public.original_predictions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view others' original predictions after match has started (same as regular predictions)
CREATE POLICY "Users can view others original predictions after match start"
ON public.original_predictions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = original_predictions.match_id
    AND matches.match_date <= now()
  )
);

-- Add league_id to predictions table to track which league a prediction belongs to
ALTER TABLE public.predictions
ADD COLUMN league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE;