-- Add notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notify_match_results boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_points_change boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_standings_update boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_push_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_enabled boolean DEFAULT true;

-- Add tiebreaker stats to profiles for enhanced leaderboard
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS exact_score_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_outcome_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS goal_difference_accuracy integer DEFAULT 0;

-- Create notification log table to track sent notifications
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL, -- 'match_result', 'points_change', 'standings_update', 'daily_summary'
  channel text NOT NULL, -- 'email', 'push'
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification logs
CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert notification logs (via service role)
CREATE POLICY "Service role can manage notification logs"
  ON public.notification_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_sent 
  ON public.notification_logs(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_type_date 
  ON public.notification_logs(notification_type, sent_at DESC);