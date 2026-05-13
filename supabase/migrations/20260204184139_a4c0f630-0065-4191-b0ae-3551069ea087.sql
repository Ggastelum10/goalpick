-- Add prepaid licenses tracking columns to leagues table
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS prepaid_licenses integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_covers_fees boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.leagues.prepaid_licenses IS 'Number of prepaid platform fee licenses available for members';
COMMENT ON COLUMN public.leagues.owner_covers_fees IS 'Whether the league owner chose to cover platform fees for members';