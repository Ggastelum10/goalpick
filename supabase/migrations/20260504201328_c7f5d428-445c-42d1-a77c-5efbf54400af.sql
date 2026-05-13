
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS logo_scale numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS logo_offset_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_offset_y numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.clamp_league_logo_transform()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.logo_scale IS NULL THEN NEW.logo_scale := 1; END IF;
  IF NEW.logo_offset_x IS NULL THEN NEW.logo_offset_x := 0; END IF;
  IF NEW.logo_offset_y IS NULL THEN NEW.logo_offset_y := 0; END IF;
  NEW.logo_scale := LEAST(3, GREATEST(0.5, NEW.logo_scale));
  NEW.logo_offset_x := LEAST(1, GREATEST(-1, NEW.logo_offset_x));
  NEW.logo_offset_y := LEAST(1, GREATEST(-1, NEW.logo_offset_y));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clamp_league_logo_transform_trg ON public.leagues;
CREATE TRIGGER clamp_league_logo_transform_trg
BEFORE INSERT OR UPDATE ON public.leagues
FOR EACH ROW EXECUTE FUNCTION public.clamp_league_logo_transform();
