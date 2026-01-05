-- Create food_items table with comprehensive Egyptian and healthy foods
CREATE TABLE public.food_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL,
    food_type TEXT NOT NULL,
    calories_per_100g INTEGER NOT NULL,
    protein_per_100g DECIMAL(5,2) DEFAULT 0,
    carbs_per_100g DECIMAL(5,2) DEFAULT 0,
    fat_per_100g DECIMAL(5,2) DEFAULT 0,
    fiber_per_100g DECIMAL(5,2) DEFAULT 0,
    serving_size_g INTEGER DEFAULT 100,
    serving_description TEXT,
    image_url TEXT,
    is_popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exercise_library table for Jefit-style workouts
CREATE TABLE public.exercise_library (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    secondary_muscles TEXT[],
    equipment TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    instructions_ar TEXT,
    instructions_en TEXT,
    tips_ar TEXT,
    tips_en TEXT,
    image_url TEXT,
    video_url TEXT,
    calories_per_minute INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_plans table
CREATE TABLE public.workout_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    difficulty TEXT NOT NULL,
    duration_weeks INTEGER DEFAULT 4,
    days_per_week INTEGER DEFAULT 3,
    goal TEXT NOT NULL,
    image_url TEXT,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_plan_days table
CREATE TABLE public.workout_plan_days (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    muscle_groups TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_plan_exercises table
CREATE TABLE public.workout_plan_exercises (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_day_id UUID NOT NULL REFERENCES public.workout_plan_days(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
    sets INTEGER NOT NULL DEFAULT 3,
    reps TEXT NOT NULL DEFAULT '10-12',
    rest_seconds INTEGER DEFAULT 60,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_meal_plans table for daily meal planning
CREATE TABLE public.user_meal_plans (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_calories INTEGER NOT NULL,
    meals_count INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, plan_date)
);

-- Create user_meal_items table
CREATE TABLE public.user_meal_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    meal_plan_id UUID NOT NULL REFERENCES public.user_meal_plans(id) ON DELETE CASCADE,
    food_item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL,
    quantity_g INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_workout_sessions table
CREATE TABLE public.user_workout_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    plan_day_id UUID REFERENCES public.workout_plan_days(id),
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_exercise_sets table for tracking each set
CREATE TABLE public.user_exercise_sets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.user_workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps_completed INTEGER,
    weight_kg DECIMAL(5,2),
    is_completed BOOLEAN DEFAULT false,
    is_warmup BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exercise_sets ENABLE ROW LEVEL SECURITY;

-- Public read access for food items and exercises (reference data)
CREATE POLICY "Anyone can view food items" ON public.food_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view exercises" ON public.exercise_library FOR SELECT USING (true);
CREATE POLICY "Anyone can view workout plans" ON public.workout_plans FOR SELECT USING (true);
CREATE POLICY "Anyone can view plan days" ON public.workout_plan_days FOR SELECT USING (true);
CREATE POLICY "Anyone can view plan exercises" ON public.workout_plan_exercises FOR SELECT USING (true);

-- User-specific policies for meal plans
CREATE POLICY "Users can view own meal plans" ON public.user_meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own meal plans" ON public.user_meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plans" ON public.user_meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON public.user_meal_plans FOR DELETE USING (auth.uid() = user_id);

-- User meal items policies
CREATE POLICY "Users can view own meal items" ON public.user_meal_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_meal_plans WHERE id = meal_plan_id AND user_id = auth.uid()));
CREATE POLICY "Users can create own meal items" ON public.user_meal_items FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.user_meal_plans WHERE id = meal_plan_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own meal items" ON public.user_meal_items FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.user_meal_plans WHERE id = meal_plan_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own meal items" ON public.user_meal_items FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.user_meal_plans WHERE id = meal_plan_id AND user_id = auth.uid()));

-- User workout sessions policies
CREATE POLICY "Users can view own workout sessions" ON public.user_workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workout sessions" ON public.user_workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout sessions" ON public.user_workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout sessions" ON public.user_workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- User exercise sets policies
CREATE POLICY "Users can view own exercise sets" ON public.user_exercise_sets FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can create own exercise sets" ON public.user_exercise_sets FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.user_workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own exercise sets" ON public.user_exercise_sets FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.user_workout_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own exercise sets" ON public.user_exercise_sets FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.user_workout_sessions WHERE id = session_id AND user_id = auth.uid()));