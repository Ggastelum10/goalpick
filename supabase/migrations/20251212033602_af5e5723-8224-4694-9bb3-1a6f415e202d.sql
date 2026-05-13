-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for match status
CREATE TYPE public.match_status AS ENUM ('scheduled', 'live', 'finished', 'postponed');

-- Create enum for tournament stage
CREATE TYPE public.tournament_stage AS ENUM ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  favorite_team TEXT,
  country TEXT,
  total_points INTEGER DEFAULT 0,
  has_paid_entry BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create pool_settings table (admin configurable)
CREATE TABLE public.pool_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_fee DECIMAL(10, 2) DEFAULT 20.00,
  first_place_percentage INTEGER DEFAULT 70,
  second_place_percentage INTEGER DEFAULT 20,
  third_place_percentage INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_flag TEXT,
  away_team_flag TEXT,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT,
  city TEXT,
  stage tournament_stage NOT NULL DEFAULT 'group',
  group_name TEXT,
  home_score INTEGER,
  away_score INTEGER,
  status match_status DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, match_id)
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_value INTEGER DEFAULT 0
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, achievement_id)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create match_reminders table
CREATE TABLE public.match_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  reminded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, match_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reminders ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pool_settings_updated_at BEFORE UPDATE ON public.pool_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (only admins can modify, users can view own)
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pool_settings
CREATE POLICY "Anyone can view pool settings" ON public.pool_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage pool settings" ON public.pool_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for matches
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins can manage matches" ON public.matches FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for predictions
CREATE POLICY "Users can view all predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Users can insert own predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions before match" ON public.predictions FOR UPDATE USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.matches 
    WHERE matches.id = predictions.match_id 
    AND matches.match_date > now()
  )
);

-- RLS Policies for achievements
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_achievements
CREATE POLICY "Anyone can view user achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "System can insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for match_reminders
CREATE POLICY "Users can view own reminders" ON public.match_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reminders" ON public.match_reminders FOR ALL USING (auth.uid() = user_id);

-- Insert default pool settings
INSERT INTO public.pool_settings (entry_fee, first_place_percentage, second_place_percentage, third_place_percentage)
VALUES (20.00, 70, 20, 10);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, points_value) VALUES
('Oracle', 'Get 3 exact score predictions in a row', '🔮', 50),
('Underdog Lover', 'Successfully predict an upset', '🐕', 30),
('Perfect Day', 'Get all predictions right in a matchday', '⭐', 100),
('Fortune Teller', 'Predict a 0-0 draw correctly', '🎱', 40),
('Hot Streak', '5 consecutive correct winner predictions', '🔥', 75),
('Early Bird', 'Submit all group stage predictions early', '🐦', 25),
('Champion Caller', 'Correctly predict the tournament winner', '🏆', 200);

-- Enable realtime for chat and leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;