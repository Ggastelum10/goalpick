-- 1. Add logo_url column to leagues
ALTER TABLE public.leagues
ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Create public bucket for league logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('league-logos', 'league-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies on storage.objects for the league-logos bucket
-- Public read
DROP POLICY IF EXISTS "League logos are publicly accessible" ON storage.objects;
CREATE POLICY "League logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'league-logos');

-- League owner (or admin) can insert objects under their league_id folder
DROP POLICY IF EXISTS "League owners can upload their league logo" ON storage.objects;
CREATE POLICY "League owners can upload their league logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'league-logos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND l.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "League owners can update their league logo" ON storage.objects;
CREATE POLICY "League owners can update their league logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'league-logos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND l.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "League owners can delete their league logo" ON storage.objects;
CREATE POLICY "League owners can delete their league logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'league-logos'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id::text = (storage.foldername(name))[1]
        AND l.owner_id = auth.uid()
    )
  )
);