CREATE OR REPLACE FUNCTION public.calculate_prediction_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pred RECORD;
  exact_pts INTEGER;
  outcome_pts INTEGER;
  stage_mult NUMERIC;
  total_pts INTEGER;
  is_exact BOOLEAN;
  is_outcome BOOLEAN;
  is_gd_correct BOOLEAN;
BEGIN
  -- ========================================
  -- HANDLE MATCH RESET (status changes FROM finished)
  -- ========================================
  IF OLD.status = 'finished' AND (NEW.status IS NULL OR NEW.status != 'finished') THEN
    FOR pred IN 
      SELECT 
        p.id, 
        p.user_id, 
        p.points_earned,
        (p.predicted_home_score = OLD.home_score AND p.predicted_away_score = OLD.away_score) as was_exact,
        (SIGN(p.predicted_home_score - p.predicted_away_score) = SIGN(OLD.home_score - OLD.away_score)) as was_outcome,
        ((p.predicted_home_score - p.predicted_away_score) = (OLD.home_score - OLD.away_score)) as was_gd_correct
      FROM predictions p
      WHERE p.match_id = NEW.id
    LOOP
      UPDATE predictions SET points_earned = 0 WHERE id = pred.id;
      
      UPDATE profiles SET 
        total_points = GREATEST(0, COALESCE(total_points, 0) - COALESCE(pred.points_earned, 0)),
        exact_score_count = GREATEST(0, COALESCE(exact_score_count, 0) - CASE WHEN pred.was_exact THEN 1 ELSE 0 END),
        correct_outcome_count = GREATEST(0, COALESCE(correct_outcome_count, 0) - CASE WHEN pred.was_outcome THEN 1 ELSE 0 END),
        goal_difference_accuracy = GREATEST(0, COALESCE(goal_difference_accuracy, 0) - CASE WHEN pred.was_gd_correct THEN 1 ELSE 0 END)
      WHERE user_id = pred.user_id;
    END LOOP;
    
    RETURN NEW;
  END IF;

  -- ========================================
  -- HANDLE MATCH COMPLETION (status changes TO finished)
  -- ========================================
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN
    IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
      RETURN NEW;
    END IF;

    FOR pred IN 
      SELECT 
        p.id,
        p.user_id,
        p.league_id,
        p.predicted_home_score,
        p.predicted_away_score,
        l.exact_score_points as league_exact_pts,
        l.outcome_points as league_outcome_pts,
        l.stage_multipliers as league_stage_mult
      FROM predictions p
      LEFT JOIN leagues l ON p.league_id = l.id
      WHERE p.match_id = NEW.id
    LOOP
      -- Use league settings or defaults for solo bracket
      exact_pts := COALESCE(pred.league_exact_pts, 5);
      outcome_pts := COALESCE(pred.league_outcome_pts, 2);
      
      -- Get stage multiplier
      IF pred.league_stage_mult IS NOT NULL THEN
        stage_mult := COALESCE((pred.league_stage_mult->>NEW.stage::text)::numeric, 1);
      ELSE
        -- Default stage multipliers for solo bracket
        stage_mult := CASE NEW.stage::text
          WHEN 'group' THEN 1
          WHEN 'round_of_32' THEN 1.5
          WHEN 'round_of_16' THEN 2
          WHEN 'quarter_final' THEN 2.5
          WHEN 'semi_final' THEN 3
          WHEN 'third_place' THEN 3
          WHEN 'final' THEN 4
          ELSE 1
        END;
      END IF;

      is_exact := (pred.predicted_home_score = NEW.home_score AND pred.predicted_away_score = NEW.away_score);
      is_outcome := (SIGN(pred.predicted_home_score - pred.predicted_away_score) = SIGN(NEW.home_score - NEW.away_score));
      is_gd_correct := ((pred.predicted_home_score - pred.predicted_away_score) = (NEW.home_score - NEW.away_score));

      IF is_exact THEN
        total_pts := ROUND(exact_pts * stage_mult);
      ELSIF is_outcome THEN
        total_pts := ROUND(outcome_pts * stage_mult);
      ELSE
        total_pts := 0;
      END IF;

      UPDATE predictions SET points_earned = total_pts WHERE id = pred.id;

      UPDATE profiles SET
        total_points = COALESCE(total_points, 0) + total_pts,
        exact_score_count = COALESCE(exact_score_count, 0) + CASE WHEN is_exact THEN 1 ELSE 0 END,
        correct_outcome_count = COALESCE(correct_outcome_count, 0) + CASE WHEN is_outcome AND NOT is_exact THEN 1 ELSE 0 END,
        goal_difference_accuracy = COALESCE(goal_difference_accuracy, 0) + CASE WHEN is_gd_correct AND NOT is_exact THEN 1 ELSE 0 END
      WHERE user_id = pred.user_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;