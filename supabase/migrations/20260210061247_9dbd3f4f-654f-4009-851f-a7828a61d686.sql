
-- Allow admins to insert predictions for test leagues
CREATE POLICY "Admins can insert predictions for test leagues"
  ON public.predictions
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND league_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = predictions.league_id AND is_test = true
    )
  );

-- Allow admins to delete predictions for test leagues
CREATE POLICY "Admins can delete predictions for test leagues"
  ON public.predictions
  FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND league_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = predictions.league_id AND is_test = true
    )
  );

-- Allow admins to update predictions for test leagues (for scoring trigger)
CREATE POLICY "Admins can update predictions for test leagues"
  ON public.predictions
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND league_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = predictions.league_id AND is_test = true
    )
  );
