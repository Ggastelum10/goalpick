-- Add is_test flag to leagues
ALTER TABLE public.leagues ADD COLUMN is_test boolean NOT NULL DEFAULT false;

-- Create index for filtering test leagues
CREATE INDEX idx_leagues_is_test ON public.leagues(is_test) WHERE is_test = true;

-- Create test_user_profiles table for virtual test players
CREATE TABLE public.test_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  avatar_seed integer NOT NULL DEFAULT floor(random() * 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_user_profiles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage test profiles
CREATE POLICY "Admins can manage test profiles"
  ON public.test_user_profiles
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));