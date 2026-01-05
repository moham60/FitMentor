-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  account_type TEXT DEFAULT 'user',
  gender TEXT,
  age INTEGER,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  activity_level TEXT,
  goal TEXT,
  daily_calories INTEGER DEFAULT 2000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create meals table
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  name TEXT NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g DECIMAL(6,2) DEFAULT 0,
  carbs_g DECIMAL(6,2) DEFAULT 0,
  fat_g DECIMAL(6,2) DEFAULT 0,
  fiber_g DECIMAL(6,2) DEFAULT 0,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Meals policies
CREATE POLICY "Users can view their own meals"
ON public.meals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meals"
ON public.meals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meals"
ON public.meals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals"
ON public.meals FOR DELETE
USING (auth.uid() = user_id);

-- Create workouts table
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  workout_type TEXT NOT NULL, -- strength, cardio, flexibility, etc.
  duration_minutes INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  notes TEXT,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- Workouts policies
CREATE POLICY "Users can view their own workouts"
ON public.workouts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workouts"
ON public.workouts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts"
ON public.workouts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts"
ON public.workouts FOR DELETE
USING (auth.uid() = user_id);

-- Create exercises table
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sets INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  weight_kg DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Exercises policies
CREATE POLICY "Users can view their own exercises"
ON public.exercises FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercises"
ON public.exercises FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises"
ON public.exercises FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises"
ON public.exercises FOR DELETE
USING (auth.uid() = user_id);

-- Create weight_logs table for tracking weight over time
CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_kg DECIMAL(5,2) NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- Weight logs policies
CREATE POLICY "Users can view their own weight logs"
ON public.weight_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weight logs"
ON public.weight_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight logs"
ON public.weight_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight logs"
ON public.weight_logs FOR DELETE
USING (auth.uid() = user_id);

-- Create body_measurements table for InBody data
CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight_kg DECIMAL(5,2),
  muscle_mass_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  water_percentage DECIMAL(4,2),
  bone_mass_kg DECIMAL(4,2),
  bmi DECIMAL(4,2),
  bmr INTEGER,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

-- Body measurements policies
CREATE POLICY "Users can view their own body measurements"
ON public.body_measurements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body measurements"
ON public.body_measurements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body measurements"
ON public.body_measurements FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body measurements"
ON public.body_measurements FOR DELETE
USING (auth.uid() = user_id);

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'user')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();