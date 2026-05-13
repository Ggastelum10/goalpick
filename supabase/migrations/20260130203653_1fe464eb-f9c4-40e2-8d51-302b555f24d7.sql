-- Add customizable scoring rules columns to leagues table
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS exact_score_points integer NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS outcome_points integer NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS stage_multipliers jsonb NOT NULL DEFAULT '{
  "group": 1.0,
  "round_of_32": 1.5,
  "round_of_16": 2.0,
  "quarter_final": 2.5,
  "semi_final": 3.0,
  "third_place": 3.0,
  "final": 4.0
}'::jsonb,
ADD COLUMN IF NOT EXISTS group_position_bonuses jsonb NOT NULL DEFAULT '{
  "1": 10,
  "2": 7,
  "3": 4,
  "4": 2
}'::jsonb;

-- Add check constraints to enforce limits
ALTER TABLE public.leagues 
ADD CONSTRAINT check_exact_score_points CHECK (exact_score_points >= 1 AND exact_score_points <= 20),
ADD CONSTRAINT check_outcome_points CHECK (outcome_points >= 1 AND outcome_points <= 10);