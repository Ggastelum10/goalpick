-- Create a public view for league members that hides sensitive payment data
-- Only the user themselves, league owners, or admins can see payment details

CREATE OR REPLACE VIEW public.league_members_public
WITH (security_invoker = on) AS
SELECT 
  lm.id,
  lm.league_id,
  lm.user_id,
  lm.role,
  lm.joined_at,
  -- Only show payment fields to the user themselves, league owner, or admins
  CASE 
    WHEN auth.uid() = lm.user_id 
      OR public.is_league_owner(lm.league_id, auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    THEN lm.has_paid 
    ELSE NULL 
  END AS has_paid,
  CASE 
    WHEN auth.uid() = lm.user_id 
      OR public.is_league_owner(lm.league_id, auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    THEN lm.admin_fee_paid 
    ELSE NULL 
  END AS admin_fee_paid,
  CASE 
    WHEN auth.uid() = lm.user_id 
      OR public.is_league_owner(lm.league_id, auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    THEN lm.stripe_payment_id 
    ELSE NULL 
  END AS stripe_payment_id
FROM public.league_members lm;

-- Grant access to the view
GRANT SELECT ON public.league_members_public TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.league_members_public IS 'Public view of league_members that hides sensitive payment data (has_paid, admin_fee_paid, stripe_payment_id) from users who are not the member themselves, the league owner, or an admin.';