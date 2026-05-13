-- Add prize_pool column to leagues table for admin-managed prize pools
ALTER TABLE public.leagues
ADD COLUMN prize_pool numeric NOT NULL DEFAULT 0;

-- Add a comment explaining the field
COMMENT ON COLUMN public.leagues.prize_pool IS 'Admin-managed prize pool amount, independent of app entry fees';