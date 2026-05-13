ALTER TABLE public.leagues
ADD COLUMN platform_fees_waived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leagues.platform_fees_waived IS
'When true, the platform/app-access fee is waived for all members joining this league. Admin-toggleable only.';