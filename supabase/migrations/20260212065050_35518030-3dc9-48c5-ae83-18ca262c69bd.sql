
-- 1. Composite index for leaderboard sorting
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_rank 
ON public.profiles (total_points DESC NULLS LAST, exact_score_count DESC NULLS LAST, correct_outcome_count DESC NULLS LAST, goal_difference_accuracy DESC NULLS LAST);

-- 2. Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_user_league 
ON public.predictions (user_id, league_id);

CREATE INDEX IF NOT EXISTS idx_predictions_match 
ON public.predictions (match_id);

-- 3. League members index
CREATE INDEX IF NOT EXISTS idx_league_members_league_paid 
ON public.league_members (league_id, has_paid);

-- 4. Legal acceptances index
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_doc_user 
ON public.legal_acceptances (document_id, user_id);

-- 5. Server-side admin users summary function
CREATE OR REPLACE FUNCTION public.get_admin_users_summary(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points integer,
  created_at timestamptz,
  is_admin boolean,
  leagues_joined bigint,
  entry_fees_total numeric,
  platform_fees_count bigint,
  platform_fees_total numeric,
  predictions_count bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_data AS (
    SELECT 
      p.user_id,
      p.display_name,
      p.avatar_url,
      COALESCE(p.total_points, 0) as total_points,
      p.created_at,
      EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') as is_admin,
      (SELECT COUNT(*) FROM league_members lm WHERE lm.user_id = p.user_id) as leagues_joined,
      COALESCE((
        SELECT SUM(l.entry_fee) 
        FROM league_members lm 
        JOIN leagues l ON l.id = lm.league_id 
        WHERE lm.user_id = p.user_id AND lm.has_paid = true
      ), 0) as entry_fees_total,
      (SELECT COUNT(*) FROM admin_fees af WHERE af.user_id = p.user_id AND af.paid_at IS NOT NULL) as platform_fees_count,
      COALESCE((SELECT SUM(af.amount) FROM admin_fees af WHERE af.user_id = p.user_id AND af.paid_at IS NOT NULL), 0) as platform_fees_total,
      (SELECT COUNT(*) FROM predictions pred WHERE pred.user_id = p.user_id) as predictions_count,
      COUNT(*) OVER() as total_count
    FROM profiles p
    WHERE (p_search IS NULL OR p.display_name ILIKE '%' || p_search || '%')
  )
  SELECT * FROM user_data
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
