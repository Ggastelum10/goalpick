-- Create game_modes table
CREATE TABLE IF NOT EXISTS public.game_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_modes ENABLE ROW LEVEL SECURITY;

-- Anyone can view game modes
CREATE POLICY "Anyone can view game modes"
  ON public.game_modes
  FOR SELECT
  USING (true);

-- Only admins can manage game modes
CREATE POLICY "Admins can manage game modes"
  ON public.game_modes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_game_modes_updated_at
  BEFORE UPDATE ON public.game_modes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial game modes
INSERT INTO public.game_modes (code, name, description, is_enabled, sort_order)
VALUES 
  ('start_to_finish', 'Full Tournament Bracket', 'Classic bracket challenge - predict everything upfront. All predictions lock when tournament starts.', false, 1),
  ('update_every_stage', 'Phase-by-Phase', 'Dynamic bracket - update predictions as the tournament unfolds. Predictions lock per phase.', true, 2);