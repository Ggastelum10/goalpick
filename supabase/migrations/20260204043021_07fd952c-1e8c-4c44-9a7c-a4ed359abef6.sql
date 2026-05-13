-- Phase 1.1: Create scoring calculation trigger function
CREATE OR REPLACE FUNCTION public.calculate_prediction_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pred RECORD;
  base_points INTEGER;
  multiplier NUMERIC;
  final_points INTEGER;
  stage_key TEXT;
  default_exact_points INTEGER := 5;
  default_outcome_points INTEGER := 2;
  is_exact_score BOOLEAN;
  is_correct_outcome BOOLEAN;
  is_correct_gd BOOLEAN;
BEGIN
  -- Only run when match status changes to finished
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    -- Skip if no scores recorded
    IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Get stage key for multiplier lookup
    stage_key := NEW.stage::TEXT;
    
    -- For each prediction on this match
    FOR pred IN 
      SELECT 
        p.id,
        p.user_id,
        p.league_id,
        p.predicted_home_score,
        p.predicted_away_score,
        COALESCE(l.exact_score_points, default_exact_points) as exact_pts,
        COALESCE(l.outcome_points, default_outcome_points) as outcome_pts,
        COALESCE((l.stage_multipliers->>stage_key)::NUMERIC, 1) as stage_mult
      FROM predictions p
      LEFT JOIN leagues l ON p.league_id = l.id
      WHERE p.match_id = NEW.id
    LOOP
      base_points := 0;
      is_exact_score := FALSE;
      is_correct_outcome := FALSE;
      is_correct_gd := FALSE;
      
      -- Check for exact score match
      IF pred.predicted_home_score = NEW.home_score 
         AND pred.predicted_away_score = NEW.away_score THEN
        base_points := pred.exact_pts;
        is_exact_score := TRUE;
        is_correct_outcome := TRUE;
        is_correct_gd := TRUE;
      -- Check for correct outcome
      ELSIF SIGN(pred.predicted_home_score - pred.predicted_away_score) = 
            SIGN(NEW.home_score - NEW.away_score) THEN
        base_points := pred.outcome_pts;
        is_correct_outcome := TRUE;
        -- Check goal difference accuracy
        IF (pred.predicted_home_score - pred.predicted_away_score) = 
           (NEW.home_score - NEW.away_score) THEN
          is_correct_gd := TRUE;
        END IF;
      END IF;
      
      -- Apply stage multiplier
      multiplier := pred.stage_mult;
      final_points := ROUND(base_points * multiplier);
      
      -- Update prediction with points earned
      UPDATE predictions 
      SET points_earned = final_points 
      WHERE id = pred.id;
      
      -- Update profile stats
      UPDATE profiles 
      SET 
        total_points = COALESCE(total_points, 0) + final_points,
        exact_score_count = COALESCE(exact_score_count, 0) + 
          CASE WHEN is_exact_score THEN 1 ELSE 0 END,
        correct_outcome_count = COALESCE(correct_outcome_count, 0) + 
          CASE WHEN is_correct_outcome THEN 1 ELSE 0 END,
        goal_difference_accuracy = COALESCE(goal_difference_accuracy, 0) + 
          CASE WHEN is_correct_gd THEN 1 ELSE 0 END
      WHERE user_id = pred.user_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on matches table
DROP TRIGGER IF EXISTS match_finished_scoring ON matches;
CREATE TRIGGER match_finished_scoring
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_prediction_points();

-- Phase 1.2: Function to check if Mode A league predictions are locked
CREATE OR REPLACE FUNCTION public.is_mode_a_locked(p_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN p_league_id IS NULL THEN FALSE -- Solo predictions not affected
      ELSE EXISTS (
        SELECT 1 
        FROM leagues l
        WHERE l.id = p_league_id
        AND l.prediction_mode = 'start_to_finish'
        AND EXISTS (
          SELECT 1 FROM matches m WHERE m.match_date <= NOW()
        )
      )
    END;
$$;

-- Phase 1.2 & 1.3: Update RLS policies to enforce both Mode A and Mode B locks
-- First drop existing policies
DROP POLICY IF EXISTS "Users can update own predictions before match" ON predictions;
DROP POLICY IF EXISTS "Users can insert own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can update own predictions with lock checks" ON predictions;
DROP POLICY IF EXISTS "Users can insert own predictions with lock checks" ON predictions;

-- Create new UPDATE policy with Mode A and Mode B lock checks
CREATE POLICY "Users can update own predictions with lock checks"
ON predictions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND NOT is_mode_a_locked(league_id)
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = predictions.match_id
    AND matches.match_date > NOW()
    AND (matches.status IS NULL OR matches.status = 'scheduled')
  )
);

-- Create new INSERT policy with Mode A and Mode B lock checks  
CREATE POLICY "Users can insert own predictions with lock checks"
ON predictions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT is_mode_a_locked(league_id)
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = match_id
    AND matches.match_date > NOW()
    AND (matches.status IS NULL OR matches.status = 'scheduled')
  )
);