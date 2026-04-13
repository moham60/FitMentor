import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Exercise {
  id: string;
  name_ar: string;
  name_en: string;
  muscle_group: string;
  secondary_muscles: string[] | null;
  equipment: string;
  difficulty: string;
  instructions_ar: string | null;
  instructions_en: string | null;
  tips_ar: string | null;
  tips_en: string | null;
  image_url: string | null;
  video_url: string | null;
  calories_per_minute: number;
}

export interface WorkoutPlan {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  difficulty: string;
  duration_weeks: number;
  days_per_week: number;
  goal: string;
  image_url: string | null;
  is_premium: boolean;
}

export const useExercises = (muscleGroup?: string, equipment?: string, searchQuery?: string) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      try {
        let query = supabase.from('exercise_library').select('*');
        
        if (muscleGroup && muscleGroup !== 'all') {
          query = query.eq('muscle_group', muscleGroup);
        }

        if (equipment && equipment !== 'all') {
          query = query.eq('equipment', equipment);
        }
        
        if (searchQuery && searchQuery.trim()) {
          query = query.or(`name_ar.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%`);
        }

        const { data, error: fetchError } = await query.order('muscle_group');

        if (fetchError) throw fetchError;
        setExercises(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [muscleGroup, equipment, searchQuery]);

  return { exercises, loading, error };
};

export const useWorkoutPlans = () => {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('workout_plans')
        .select('*')
        .order('difficulty');
      
      setPlans(data || []);
      setLoading(false);
    };

    fetchPlans();
  }, []);

  return { plans, loading };
};

export const getMuscleGroups = () => [
  { id: 'all', name_ar: 'الكل', name_en: 'All', icon: '💪' },
  { id: 'chest', name_ar: 'الصدر', name_en: 'Chest', icon: '🏋️' },
  { id: 'back', name_ar: 'الظهر', name_en: 'Back', icon: '🔙' },
  { id: 'shoulders', name_ar: 'الكتف', name_en: 'Shoulders', icon: '🎯' },
  { id: 'biceps', name_ar: 'البايسبس', name_en: 'Biceps', icon: '💪' },
  { id: 'triceps', name_ar: 'الترايسبس', name_en: 'Triceps', icon: '🦾' },
  { id: 'legs', name_ar: 'الأرجل', name_en: 'Legs', icon: '🦵' },
  { id: 'abs', name_ar: 'البطن', name_en: 'Abs', icon: '🎽' },
  { id: 'cardio', name_ar: 'كارديو', name_en: 'Cardio', icon: '❤️' },
];

export const getEquipmentTypes = () => [
  { id: 'all', name_ar: 'الكل', name_en: 'All' },
  { id: 'barbell', name_ar: 'بار', name_en: 'Barbell' },
  { id: 'dumbbell', name_ar: 'دامبل', name_en: 'Dumbbell' },
  { id: 'cable', name_ar: 'كيبل', name_en: 'Cable' },
  { id: 'machine', name_ar: 'جهاز', name_en: 'Machine' },
  { id: 'bodyweight', name_ar: 'وزن الجسم', name_en: 'Bodyweight' },
];

export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'bg-accent/10 text-accent';
    case 'intermediate': return 'bg-warning/10 text-warning';
    case 'advanced': return 'bg-orange/10 text-orange';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const getGoalInfo = (goal: string) => {
  switch (goal) {
    case 'muscle_gain': return { name_ar: 'بناء العضلات', name_en: 'Muscle Gain', icon: '💪', color: 'primary' };
    case 'fat_loss': return { name_ar: 'حرق الدهون', name_en: 'Fat Loss', icon: '🔥', color: 'orange' };
    case 'strength': return { name_ar: 'القوة', name_en: 'Strength', icon: '🏋️', color: 'purple' };
    case 'endurance': return { name_ar: 'التحمل', name_en: 'Endurance', icon: '🏃', color: 'accent' };
    default: return { name_ar: goal, name_en: goal, icon: '💪', color: 'muted' };
  }
};
