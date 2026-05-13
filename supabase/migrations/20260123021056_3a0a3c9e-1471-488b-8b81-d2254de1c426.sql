-- Add admin_fee_paid column to league_members
ALTER TABLE public.league_members 
ADD COLUMN admin_fee_paid boolean NOT NULL DEFAULT false;

-- Create admin_fees table to track all platform fees collected
CREATE TABLE public.admin_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 1.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_fees
ALTER TABLE public.admin_fees ENABLE ROW LEVEL SECURITY;

-- Admins can view all admin fees
CREATE POLICY "Admins can view all admin fees"
ON public.admin_fees
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage admin fees
CREATE POLICY "Admins can manage admin fees"
ON public.admin_fees
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own admin fees
CREATE POLICY "Users can view own admin fees"
ON public.admin_fees
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_admin_fees_user_id ON public.admin_fees(user_id);
CREATE INDEX idx_admin_fees_league_id ON public.admin_fees(league_id);
CREATE INDEX idx_admin_fees_paid_at ON public.admin_fees(paid_at);