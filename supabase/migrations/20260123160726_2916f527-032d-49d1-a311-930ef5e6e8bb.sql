-- Add expected_members column to leagues table
ALTER TABLE public.leagues ADD COLUMN expected_members integer NOT NULL DEFAULT 10;