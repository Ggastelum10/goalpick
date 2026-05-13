-- Add platform fee configuration columns to pool_settings
ALTER TABLE public.pool_settings 
ADD COLUMN IF NOT EXISTS platform_fee_amount numeric DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS platform_fee_currency text DEFAULT 'USD';