-- Create leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(gen_random_uuid()::text, 1, 8),
  entry_fee NUMERIC NOT NULL DEFAULT 50.00,
  currency TEXT NOT NULL DEFAULT 'MXN',
  first_place_percentage INTEGER NOT NULL DEFAULT 70,
  second_place_percentage INTEGER NOT NULL DEFAULT 20,
  third_place_percentage INTEGER NOT NULL DEFAULT 10,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create league_members table
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  has_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_payment_id TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for leagues table

-- Anyone can view public leagues
CREATE POLICY "Anyone can view public leagues"
ON public.leagues
FOR SELECT
USING (is_public = true);

-- League members can view their private leagues
CREATE POLICY "Members can view their leagues"
ON public.leagues
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_members.league_id = leagues.id
    AND league_members.user_id = auth.uid()
  )
);

-- Authenticated users can create leagues
CREATE POLICY "Users can create leagues"
ON public.leagues
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Only owners can update their leagues
CREATE POLICY "Owners can update their leagues"
ON public.leagues
FOR UPDATE
USING (auth.uid() = owner_id);

-- Only owners can delete their leagues
CREATE POLICY "Owners can delete their leagues"
ON public.leagues
FOR DELETE
USING (auth.uid() = owner_id);

-- Admins can manage all leagues
CREATE POLICY "Admins can manage all leagues"
ON public.leagues
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for league_members table

-- Anyone can view league members (for leaderboards)
CREATE POLICY "Anyone can view league members"
ON public.league_members
FOR SELECT
USING (true);

-- Users can join leagues (insert own membership)
CREATE POLICY "Users can join leagues"
ON public.league_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- League owners can update members
CREATE POLICY "League owners can update members"
ON public.league_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = league_members.league_id
    AND leagues.owner_id = auth.uid()
  )
);

-- League owners can remove members
CREATE POLICY "League owners can remove members"
ON public.league_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.leagues
    WHERE leagues.id = league_members.league_id
    AND leagues.owner_id = auth.uid()
  )
  OR auth.uid() = user_id
);

-- Admins can manage all league members
CREATE POLICY "Admins can manage all league members"
ON public.league_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on leagues
CREATE TRIGGER update_leagues_updated_at
BEFORE UPDATE ON public.leagues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_leagues_owner_id ON public.leagues(owner_id);
CREATE INDEX idx_leagues_invite_code ON public.leagues(invite_code);
CREATE INDEX idx_league_members_league_id ON public.league_members(league_id);
CREATE INDEX idx_league_members_user_id ON public.league_members(user_id);