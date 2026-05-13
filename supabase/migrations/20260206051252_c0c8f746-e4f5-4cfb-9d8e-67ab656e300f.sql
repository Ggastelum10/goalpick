-- Add bracket_confirmed_at column to league_members for Mode A confirmation
ALTER TABLE league_members 
ADD COLUMN bracket_confirmed_at timestamp with time zone DEFAULT NULL;

-- Drop the existing SELECT policy on predictions
DROP POLICY IF EXISTS "Users can view predictions with time restrictions" ON predictions;

-- Create new comprehensive visibility policy
CREATE POLICY "Users can view predictions with visibility rules"
ON predictions FOR SELECT
USING (
  -- Own predictions always visible
  auth.uid() = user_id
  OR
  -- Solo Bracket predictions: visible after match starts (no league_id)
  (
    league_id IS NULL
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
      AND m.match_date <= now()
    )
  )
  OR
  -- League predictions: visibility based on mode
  (
    league_id IS NOT NULL
    AND is_league_member(league_id, auth.uid())
    AND (
      -- Mode A (start_to_finish): Tournament started AND prediction owner confirmed their bracket
      EXISTS (
        SELECT 1 FROM leagues l
        WHERE l.id = predictions.league_id
        AND l.prediction_mode = 'start_to_finish'
        AND is_mode_a_locked(l.id)
        AND EXISTS (
          SELECT 1 FROM league_members lm
          WHERE lm.league_id = l.id
          AND lm.user_id = predictions.user_id
          AND lm.bracket_confirmed_at IS NOT NULL
        )
      )
      OR
      -- Mode B (update_every_stage): Match has started
      (
        EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = predictions.league_id
          AND l.prediction_mode = 'update_every_stage'
        )
        AND EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = predictions.match_id
          AND m.match_date <= now()
        )
      )
    )
  )
);

-- Update INSERT policy to prevent Mode A inserts after confirmation
DROP POLICY IF EXISTS "Users can insert own predictions with lock checks" ON predictions;

CREATE POLICY "Users can insert own predictions with lock checks"
ON predictions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT is_mode_a_locked(league_id)
  -- Mode A: prevent inserts after user confirms their bracket
  AND (
    league_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = predictions.league_id
      AND lm.user_id = auth.uid()
      AND lm.bracket_confirmed_at IS NOT NULL
    )
  )
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = predictions.match_id
    AND matches.match_date > now()
    AND (matches.status IS NULL OR matches.status = 'scheduled')
  )
);

-- Update UPDATE policy to prevent Mode A updates after confirmation
DROP POLICY IF EXISTS "Users can update own predictions with lock checks" ON predictions;

CREATE POLICY "Users can update own predictions with lock checks"
ON predictions FOR UPDATE
USING (
  auth.uid() = user_id
  AND NOT is_mode_a_locked(league_id)
  -- Mode A: prevent updates after user confirms their bracket
  AND (
    league_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = predictions.league_id
      AND lm.user_id = auth.uid()
      AND lm.bracket_confirmed_at IS NOT NULL
    )
  )
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = predictions.match_id
    AND matches.match_date > now()
    AND (matches.status IS NULL OR matches.status = 'scheduled')
  )
);