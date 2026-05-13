
-- 1. Create is_phase_started function
CREATE OR REPLACE FUNCTION public.is_phase_started(p_stage tournament_stage)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE stage = p_stage
    AND match_date <= NOW()
  );
$$;

-- 2. Drop and recreate INSERT policy with phase-based locking for Mode B
DROP POLICY IF EXISTS "Users can insert own predictions with lock checks" ON public.predictions;

CREATE POLICY "Users can insert own predictions with lock checks"
ON public.predictions
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
  AND (NOT is_mode_a_locked(league_id))
  AND (
    (league_id IS NULL)
    OR (NOT EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = predictions.league_id
        AND lm.user_id = auth.uid()
        AND lm.bracket_confirmed_at IS NOT NULL
    ))
  )
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = predictions.match_id
    AND (matches.status IS NULL OR matches.status = 'scheduled'::match_status)
    AND (
      -- Mode B leagues: phase-based locking
      (
        predictions.league_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = predictions.league_id
          AND l.prediction_mode = 'update_every_stage'
        )
        AND NOT is_phase_started(matches.stage)
      )
      OR
      -- Solo bracket and Mode A: per-match locking
      (
        (predictions.league_id IS NULL OR EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = predictions.league_id
          AND l.prediction_mode != 'update_every_stage'
        ))
        AND matches.match_date > now()
      )
    )
  )
);

-- 3. Drop and recreate UPDATE policy with phase-based locking for Mode B
DROP POLICY IF EXISTS "Users can update own predictions with lock checks" ON public.predictions;

CREATE POLICY "Users can update own predictions with lock checks"
ON public.predictions
FOR UPDATE
USING (
  (auth.uid() = user_id)
  AND (NOT is_mode_a_locked(league_id))
  AND (
    (league_id IS NULL)
    OR (NOT EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = predictions.league_id
        AND lm.user_id = auth.uid()
        AND lm.bracket_confirmed_at IS NOT NULL
    ))
  )
  AND EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = predictions.match_id
    AND (matches.status IS NULL OR matches.status = 'scheduled'::match_status)
    AND (
      -- Mode B leagues: phase-based locking
      (
        predictions.league_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = predictions.league_id
          AND l.prediction_mode = 'update_every_stage'
        )
        AND NOT is_phase_started(matches.stage)
      )
      OR
      -- Solo bracket and Mode A: per-match locking
      (
        (predictions.league_id IS NULL OR EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = predictions.league_id
          AND l.prediction_mode != 'update_every_stage'
        ))
        AND matches.match_date > now()
      )
    )
  )
);

-- 4. Drop and recreate SELECT policy with phase-based visibility for Mode B
DROP POLICY IF EXISTS "Users can view predictions with visibility rules" ON public.predictions;

CREATE POLICY "Users can view predictions with visibility rules"
ON public.predictions
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR
  (
    league_id IS NULL
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = predictions.match_id
      AND m.match_date <= now()
    )
  )
  OR
  (
    league_id IS NOT NULL
    AND is_league_member(league_id, auth.uid())
    AND (
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
      (
        EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = predictions.league_id
          AND l.prediction_mode = 'update_every_stage'
        )
        AND EXISTS (
          SELECT 1 FROM matches m
          WHERE m.id = predictions.match_id
          AND is_phase_started(m.stage)
        )
      )
    )
  )
);

-- 5. Update original_predictions SELECT policy for phase-based visibility
DROP POLICY IF EXISTS "Users can view others original predictions after match start" ON public.original_predictions;

CREATE POLICY "Users can view others original predictions after phase start"
ON public.original_predictions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = original_predictions.match_id
    AND (
      (
        EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = original_predictions.league_id
          AND l.prediction_mode = 'update_every_stage'
        )
        AND is_phase_started(matches.stage)
      )
      OR
      (
        NOT EXISTS (
          SELECT 1 FROM leagues l
          WHERE l.id = original_predictions.league_id
          AND l.prediction_mode = 'update_every_stage'
        )
        AND matches.match_date <= now()
      )
    )
  )
);
