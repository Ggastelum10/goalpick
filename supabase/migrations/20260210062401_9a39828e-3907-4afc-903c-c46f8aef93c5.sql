CREATE POLICY "Admins can view predictions for test leagues"
  ON public.predictions
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND league_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = predictions.league_id AND is_test = true
    )
  );