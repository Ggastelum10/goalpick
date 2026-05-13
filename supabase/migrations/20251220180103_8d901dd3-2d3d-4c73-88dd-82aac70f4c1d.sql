-- Create group_standings table for storing actual final group positions
CREATE TABLE public.group_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  team TEXT NOT NULL,
  final_position INTEGER NOT NULL CHECK (final_position BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_name, team),
  UNIQUE(group_name, final_position)
);

-- Enable RLS
ALTER TABLE public.group_standings ENABLE ROW LEVEL SECURITY;

-- Anyone can view group standings
CREATE POLICY "Anyone can view group standings"
ON public.group_standings
FOR SELECT
USING (true);

-- Admins can manage group standings
CREATE POLICY "Admins can manage group standings"
ON public.group_standings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));