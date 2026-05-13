ALTER TABLE public.leagues
ADD COLUMN IF NOT EXISTS hide_invite_from_members boolean NOT NULL DEFAULT false;