import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardData {
  // Nutrition data
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayMeals: {
    name: string;
    time: string;
    calories: number;
    status: 'completed' | 'pending';
    meal_type: string;
  }[];

  // Workout data
  todayWorkouts: {
    id: string;
    name: string;
    duration_minutes: number | null;
    completed_at: string | null;
    exercises_count: number;
  }[];
  weeklyWorkouts: number;
  workoutStreak: number;

  // Body measurements
  currentWeight: number | null;
  previousWeight: number | null;
  weightChange: number;
  startWeight: number | null;
  goalWeight: number | null;
  
  // Profile data
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    todayCalories: 0,
    todayProtein: 0,
    todayCarbs: 0,
    todayFat: 0,
    todayMeals: [],
    todayWorkouts: [],
    weeklyWorkouts: 0,
    workoutStreak: 0,
    currentWeight: null,
    previousWeight: null,
    weightChange: 0,
    startWeight: null,
    goalWeight: null,
    targetCalories: 2400,
    targetProtein: 180,
    targetCarbs: 240,
    targetFat: 67,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Fetch profile with calories
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('daily_calories, weight_kg, goal')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        const targetCalories = profile?.daily_calories || 2400;
        
        // Calculate macro targets (protein: 30%, carbs: 40%, fat: 30%)
        const targetProtein = Math.round((targetCalories * 0.3) / 4);
        const targetCarbs = Math.round((targetCalories * 0.4) / 4);
        const targetFat = Math.round((targetCalories * 0.3) / 9);

        // Fetch today's meals
        const { data: meals, error: mealsError } = await supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .eq('meal_date', today)
          .order('created_at', { ascending: true });

        if (mealsError) console.error('Meals error:', mealsError);

        // Calculate today's nutrition totals
        const todayCalories = meals?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0;
        const todayProtein = meals?.reduce((sum, meal) => sum + (meal.protein_g || 0), 0) || 0;
        const todayCarbs = meals?.reduce((sum, meal) => sum + (meal.carbs_g || 0), 0) || 0;
        const todayFat = meals?.reduce((sum, meal) => sum + (meal.fat_g || 0), 0) || 0;

        // Format meals for display
        const todayMeals = meals?.map(meal => ({
          name: meal.name,
          time: new Date(meal.created_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          calories: meal.calories || 0,
          status: 'completed' as const,
          meal_type: meal.meal_type,
        })) || [];

        // Fetch today's workouts
        const { data: workouts, error: workoutsError } = await supabase
          .from('workouts')
          .select(`
            id,
            name,
            duration_minutes,
            exercises:exercises(count)
          `)
          .eq('user_id', user.id)
          .gte('workout_date', today)
          .order('created_at', { ascending: false });

        if (workoutsError) console.error('Workouts error:', workoutsError);

        const todayWorkouts = workouts?.map(w => ({
          id: w.id,
          name: w.name,
          duration_minutes: w.duration_minutes,
          completed_at: null,
          exercises_count: Array.isArray(w.exercises) ? w.exercises.length : 0,
        })) || [];

        // Fetch weekly workouts count
        const { count: weeklyCount } = await supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('workout_date', weekAgo);

        // Calculate workout streak (simplified - count consecutive days with workouts)
        const { data: recentWorkouts } = await supabase
          .from('workouts')
          .select('workout_date')
          .eq('user_id', user.id)
          .order('workout_date', { ascending: false })
          .limit(30);

        let streak = 0;
        if (recentWorkouts && recentWorkouts.length > 0) {
          const uniqueDates = [...new Set(recentWorkouts.map(w => w.workout_date))].sort().reverse();
          
          for (let i = 0; i < uniqueDates.length; i++) {
            const currentDate = new Date(uniqueDates[i]);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - i);
            
            if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
              streak++;
            } else {
              break;
            }
          }
        }

        // Fetch body measurements for weight tracking
        const { data: measurements, error: measurementsError } = await supabase
          .from('body_measurements')
          .select('weight_kg, measurement_date')
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false })
          .limit(2);

        if (measurementsError) console.error('Measurements error:', measurementsError);

        const currentWeight = measurements?.[0]?.weight_kg || profile?.weight_kg || null;
        const previousWeight = measurements?.[1]?.weight_kg || null;
        const weightChange = currentWeight && previousWeight ? previousWeight - currentWeight : 0;

        // Get start weight (oldest measurement or profile weight)
        const { data: oldestMeasurement } = await supabase
          .from('body_measurements')
          .select('weight_kg')
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: true })
          .limit(1)
          .single();

        const startWeight = oldestMeasurement?.weight_kg || currentWeight;
        
        // Calculate goal weight based on user's goal
        let goalWeight = currentWeight;
        if (currentWeight && profile?.goal) {
          if (profile.goal.includes('lose') || profile.goal.includes('loss')) {
            goalWeight = currentWeight - 10; // Example: lose 10kg
          } else if (profile.goal.includes('gain')) {
            goalWeight = currentWeight + 5; // Example: gain 5kg
          }
        }

        setData({
          todayCalories,
          todayProtein,
          todayCarbs,
          todayFat,
          todayMeals,
          todayWorkouts,
          weeklyWorkouts: weeklyCount || 0,
          workoutStreak: streak,
          currentWeight,
          previousWeight,
          weightChange,
          startWeight,
          goalWeight,
          targetCalories,
          targetProtein,
          targetCarbs,
          targetFat,
        });

      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Set up real-time subscriptions for live updates
    const mealsChannel = supabase
      .channel('dashboard-meals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meals',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const workoutsChannel = supabase
      .channel('dashboard-workouts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workouts',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    const measurementsChannel = supabase
      .channel('dashboard-measurements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'body_measurements',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(workoutsChannel);
      supabase.removeChannel(measurementsChannel);
    };
  }, [user?.id]);

  return { data, loading, error };
};
