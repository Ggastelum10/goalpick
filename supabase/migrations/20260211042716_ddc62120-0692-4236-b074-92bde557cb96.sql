
ALTER TABLE public.profiles
ADD COLUMN has_accepted_terms boolean DEFAULT false,
ADD COLUMN terms_accepted_at timestamptz;
