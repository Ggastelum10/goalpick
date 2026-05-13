CREATE POLICY "Admins can manage league logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'league-logos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'league-logos' AND public.has_role(auth.uid(), 'admin'));