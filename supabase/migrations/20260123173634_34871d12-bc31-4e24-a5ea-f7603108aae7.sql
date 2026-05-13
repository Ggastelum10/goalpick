-- Enable realtime for league_members table to support real-time payment status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.league_members;