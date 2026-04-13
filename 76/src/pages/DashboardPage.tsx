import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Beef,
  Wheat,
  Droplet,
  TrendingUp,
  Dumbbell,
  Plus,
  Scale,
  Target,
  ArrowRight,
  Sparkles,
  Trophy,
  Play,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import heroNutrition from '@/assets/hero-nutrition.jpg';
import { useDashboardData } from '@/hooks/useDashboardData';

interface Profile {
  full_name: string | null;
  daily_calories: number | null;
  weight_kg: number | null;
  goal: string | null;
}




const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Use the new dashboard data hook
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboardData();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setProfileLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, daily_calories, weight_kg, goal')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('fetchProfile error:', error);
      }

      setProfile((data as Profile) ?? null);
      setProfileLoading(false);
    };

    fetchProfile();
  }, [user?.id]);
  
  const loading = profileLoading || dashboardLoading;

  // loading state (important to avoid flicker)
  if (loading) {
    return (
      <MainLayout title="Loading..." subtitle="Please wait">
        <div className="p-6 space-y-4">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 w-40 bg-muted rounded mb-4" />
              <div className="h-4 w-64 bg-muted rounded mb-2" />
              <div className="h-4 w-52 bg-muted rounded" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Use real data from database
  const dailyCalories = { 
    consumed: dashboardData.todayCalories, 
    target: dashboardData.targetCalories 
  };

  const macros = {
    protein: { 
      current: Math.round(dashboardData.todayProtein), 
      target: dashboardData.targetProtein 
    },
    carbs: { 
      current: Math.round(dashboardData.todayCarbs), 
      target: dashboardData.targetCarbs 
    },
    fat: { 
      current: Math.round(dashboardData.todayFat), 
      target: dashboardData.targetFat 
    },
  };

  const stats = [
    {
      label: 'Calories',
      value: dailyCalories.consumed,
      target: dailyCalories.target,
      icon: Flame,
      color: 'primary',
      unit: 'kcal',
    },
    {
      label: 'Protein',
      value: macros.protein.current,
      target: macros.protein.target,
      icon: Beef,
      color: 'orange',
      unit: 'g',
    },
    {
      label: 'Carbs',
      value: macros.carbs.current,
      target: macros.carbs.target,
      icon: Wheat,
      color: 'accent',
      unit: 'g',
    },
    {
      label: 'Fat',
      value: macros.fat.current,
      target: macros.fat.target,
      icon: Droplet,
      color: 'purple',
      unit: 'g',
    },
  ];

  // Use real meals data from database
  const meals = dashboardData.todayMeals.length > 0 
    ? dashboardData.todayMeals 
    : [
        { name: 'Breakfast', time: '8:00 AM', calories: 0, status: 'pending' as const, meal_type: 'breakfast' },
        { name: 'Lunch', time: '1:00 PM', calories: 0, status: 'pending' as const, meal_type: 'lunch' },
        { name: 'Snack', time: '4:00 PM', calories: 0, status: 'pending' as const, meal_type: 'snack' },
        { name: 'Dinner', time: '7:00 PM', calories: 0, status: 'pending' as const, meal_type: 'dinner' },
      ];

  // Use real workouts data from database
  const hasWorkoutsToday = dashboardData.todayWorkouts.length > 0;
  const workouts: Array<{ name: string; progress: number; color: 'primary' | 'accent' | 'orange'; icon: string }> = hasWorkoutsToday 
    ? dashboardData.todayWorkouts.map(w => ({
        name: w.name,
        progress: w.duration_minutes ? Math.min(100, Math.round((w.duration_minutes / 60) * 100)) : 50,
        color: 'primary' as const,
        icon: w.exercises_count > 0 ? '✅' : '💪',
      }))
    : [
        { name: 'No workouts yet', progress: 0, color: 'primary' as const, icon: '🏃' },
        { name: 'Start your first workout', progress: 0, color: 'accent' as const, icon: '💪' },
      ];

  // Generate insights based on real data
  const insights: Array<{ type: 'success' | 'warning' | 'info'; title: string; message: string }> = [];
  
  // Calorie insight
  const calorieProgress = (dashboardData.todayCalories / dashboardData.targetCalories) * 100;
  if (calorieProgress > 90 && calorieProgress <= 110) {
    insights.push({
      type: 'success' as const,
      title: 'Perfect calorie balance!',
      message: `You're right on track with ${dashboardData.todayCalories} out of ${dashboardData.targetCalories} calories.`
    });
  } else if (calorieProgress < 50) {
    insights.push({
      type: 'warning' as const,
      title: 'Low calorie intake',
      message: `You've only consumed ${Math.round(calorieProgress)}% of your daily target. Don't forget to eat!`
    });
  } else if (calorieProgress > 120) {
    insights.push({
      type: 'info' as const,
      title: 'High calorie intake',
      message: `You're ${Math.round(calorieProgress - 100)}% over your target. Consider lighter meals tomorrow.`
    });
  }

  // Protein insight
  const proteinProgress = (dashboardData.todayProtein / dashboardData.targetProtein) * 100;
  if (proteinProgress >= 80) {
    insights.push({
      type: 'success' as const,
      title: 'Great job on protein!',
      message: `You're on track to hit your protein goal today with ${Math.round(dashboardData.todayProtein)}g.`
    });
  } else if (proteinProgress < 50) {
    insights.push({
      type: 'warning' as const,
      title: 'Low on protein',
      message: 'Consider adding some lean meat, eggs, or protein shake to your next meal.'
    });
  }

  // Workout insight
  if (dashboardData.todayWorkouts.length === 0) {
    insights.push({
      type: 'info' as const,
      title: 'Workout reminder',
      message: "You haven't logged a workout today. Time to move!"
    });
  } else if (dashboardData.workoutStreak >= 3) {
    insights.push({
      type: 'success' as const,
      title: `${dashboardData.workoutStreak} day streak! 🔥`,
      message: 'Amazing consistency! Keep up the great work.'
    });
  }

  // Meals insight
  if (dashboardData.todayMeals.length === 0) {
    insights.push({
      type: 'info' as const,
      title: 'Start logging your meals',
      message: 'Track your nutrition to reach your fitness goals faster!'
    });
  }

  // Fill with default insights if empty
  if (insights.length === 0) {
    insights.push({
      type: 'info' as const,
      title: 'Welcome to your dashboard!',
      message: 'Start logging your meals and workouts to see personalized insights.'
    });
  }

  const quickActions = [
    { icon: Plus, label: 'Log meal', color: 'primary', path: '/nutrition' },
    { icon: Dumbbell, label: 'Workout ', color: 'accent', path: '/workouts' },
    { icon: Scale, label: 'In Body', color: 'purple', path: '/inbody' },
    { icon: Sparkles, label: 'Ask AI', color: 'orange', path: '/ai-assistant' },
  ];

  const caloriePercent = Math.min((dailyCalories.consumed / dailyCalories.target) * 100, 100);
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  const firstName =
    profile?.full_name?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'Friend';

  // Calculate yesterday's completion percentage for welcome banner
  const yesterdayCompletion = Math.min(75 + Math.random() * 20, 95); // Placeholder - can be calculated from DB

  return (
    <MainLayout
      title={`Hi, ${firstName}!`}
      subtitle="Here's your fitness summary for today"
    >
      {/* Show error message if any */}
      {dashboardError && (
        <Card className="mb-4 border-orange bg-orange/10">
          <CardContent className="p-4">
            <p className="text-orange">⚠️ {dashboardError}</p>
          </CardContent>
        </Card>
      )}

      {/* Welcome Banner */}
      <Card className="relative overflow-hidden mb-8 bg-gradient-to-r from-primary/10 via-accent/5 to-purple/10 border-none animate-fade-in">
        <div className="absolute inset-0 opacity-20">
          <img src={heroNutrition} alt="" className="w-full h-full object-cover" />
        </div>
        <CardContent className="relative py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-bounce-in">
                {dashboardData.workoutStreak >= 3 ? (
                  <Trophy className="w-10 h-10 text-white" />
                ) : (
                  <Target className="w-10 h-10 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {dashboardData.todayWorkouts.length > 0 || dashboardData.todayMeals.length > 0
                    ? "Great progress today!"
                    : "New day, new goal!"}
                </h2>
                <p className="text-muted-foreground">
                  {dashboardData.workoutStreak > 0 
                    ? `You're on a ${dashboardData.workoutStreak} day workout streak! 🔥`
                    : dashboardData.todayMeals.length > 0
                    ? `You've logged ${dashboardData.todayMeals.length} meal(s) today. Keep it up!`
                    : `Ready to crush your fitness goals today?`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              {quickActions.slice(0, 2).map((action, i) => (
                <Button
                  key={i}
                  onClick={() => navigate(action.path)}
                  className={cn(
                    "gap-2 shadow-lg hover:scale-105 transition-transform",
                    i === 0 ? "bg-gradient-primary shadow-glow" : ""
                  )}
                  variant={i === 0 ? 'default' : 'outline'}
                >
                  <action.icon className="w-5 h-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action, index) => (
          <Card
            key={index}
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in card-hover"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:shadow-glow",
                action.color === 'primary' && "bg-gradient-primary",
                action.color === 'accent' && "bg-accent",
                action.color === 'purple' && "bg-purple",
                action.color === 'orange' && "bg-orange"
              )}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <p className="font-medium text-foreground">{action.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const percent = Math.round((stat.value / stat.target) * 100);
          return (
            <Card
              key={index}
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1.5 transition-all",
                stat.color === 'primary' && "bg-gradient-primary",
                stat.color === 'orange' && "bg-orange",
                stat.color === 'accent' && "bg-accent",
                stat.color === 'purple' && "bg-purple"
              )} />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{percent}%</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.value}/{stat.target} {stat.unit}
                    </p>
                  </div>
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    stat.color === 'primary' && "bg-primary/10 text-primary",
                    stat.color === 'orange' && "bg-orange/10 text-orange",
                    stat.color === 'accent' && "bg-accent/10 text-accent",
                    stat.color === 'purple' && "bg-purple/10 text-purple"
                  )}>
                    <stat.icon className="w-7 h-7" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      stat.color === 'primary' && "bg-gradient-primary",
                      stat.color === 'orange' && "bg-orange",
                      stat.color === 'accent' && "bg-accent",
                      stat.color === 'purple' && "bg-purple"
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calorie Ring */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Flame className="w-5 h-5 text-white" />
              </div>
              Daily calories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-foreground">{dailyCalories.consumed}</span>
                <span className="text-sm text-muted-foreground">of {dailyCalories.target}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mt-6">
              {Object.entries(macros).map(([name, values]) => (
                <div key={name} className="text-center p-3 rounded-xl bg-muted/50">
                  <div className="text-xl font-bold text-foreground">{values.current}g</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {name === 'protein' ? 'Protein' : name === 'carbs' ? 'Carbs' : 'Fat'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              Today's meals
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => navigate('/nutrition')}>
              View all <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardData.todayMeals.length > 0 ? (
              meals.map((meal, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                      meal.status === 'completed' ? "bg-accent/20" : "bg-muted"
                    )}>
                      {meal.status === 'completed' ? '✅' : '⏳'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{meal.name}</p>
                      <p className="text-xs text-muted-foreground">{meal.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">{meal.calories}</span>
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No meals logged yet</p>
                <p className="text-xs text-muted-foreground mb-4">Start tracking your nutrition to see insights</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/nutrition')}
                >
                  Log your first meal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workout Progress */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              Workout progress
            </CardTitle>
            {dashboardData.weeklyWorkouts > 0 && (
              <span className="text-xs text-muted-foreground">
                {dashboardData.weeklyWorkouts} this week
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {hasWorkoutsToday ? (
              <>
                {workouts.map((workout, index) => (
                  <div key={index} className="flex items-center gap-4 group">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110",
                      workout.color === 'primary' && "bg-primary/10",
                      workout.color === 'accent' && "bg-accent/10",
                      workout.color === 'orange' && "bg-orange/10"
                    )}>
                      {workout.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-foreground">{workout.name}</p>
                        <span className="text-xl font-bold text-foreground">{workout.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            workout.color === 'primary' && "bg-gradient-primary",
                            workout.color === 'accent' && "bg-accent",
                            workout.color === 'orange' && "bg-orange"
                          )}
                          style={{ width: `${workout.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No workouts today</p>
                <p className="text-xs text-muted-foreground mb-4">Start your first workout to track your progress</p>
              </div>
            )}
            <Button
              className="w-full mt-4 bg-gradient-primary shadow-glow gap-2 hover:scale-[1.02] transition-transform"
              onClick={() => navigate('/workouts')}
            >
              <Play className="w-5 h-5" />
              {hasWorkoutsToday ? 'Continue workout' : 'Start workout'}
            </Button>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-8 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-warning" />
              </div>
              AI insights
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => navigate('/ai-assistant')}>
              Ask more <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-4 p-4 rounded-xl border-r-4 transition-all hover:scale-[1.01]",
                  insight.type === 'success' && "bg-accent/10 border-accent",
                  insight.type === 'warning' && "bg-orange/10 border-orange",
                  insight.type === 'info' && "bg-primary/10 border-primary"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  insight.type === 'success' && "bg-accent/20 text-accent",
                  insight.type === 'warning' && "bg-orange/20 text-orange",
                  insight.type === 'info' && "bg-primary/20 text-primary"
                )}>
                  {insight.type === 'success' ? '🎉' : insight.type === 'warning' ? '⚠️' : '💡'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weight Progress */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              Weight progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-foreground">
                {dashboardData.currentWeight || profile?.weight_kg || '--'}
              </p>
              <p className="text-sm text-muted-foreground">Current weight (kg)</p>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <div className="text-center p-3 rounded-xl bg-muted/50 flex-1 mx-1">
                <p className="font-semibold text-foreground">
                  {dashboardData.startWeight?.toFixed(1) || '--'}
                </p>
                <p className="text-xs text-muted-foreground">Start</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-accent/10 flex-1 mx-1">
                <p className={cn(
                  "font-semibold",
                  dashboardData.weightChange > 0 ? "text-accent" : "text-orange"
                )}>
                  {dashboardData.weightChange > 0 ? '-' : '+'}{Math.abs(dashboardData.weightChange).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">Change</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/10 flex-1 mx-1">
                <p className="font-semibold text-primary">
                  {dashboardData.goalWeight?.toFixed(1) || '--'}
                </p>
                <p className="text-xs text-muted-foreground">Goal</p>
              </div>
            </div>
            {dashboardData.startWeight && dashboardData.goalWeight && dashboardData.currentWeight && (
              <>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${Math.min(
                        Math.abs((dashboardData.startWeight - dashboardData.currentWeight) / 
                        (dashboardData.startWeight - dashboardData.goalWeight)) * 100,
                        100
                      )}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {Math.round(
                    Math.abs((dashboardData.startWeight - dashboardData.currentWeight) / 
                    (dashboardData.startWeight - dashboardData.goalWeight)) * 100
                  )}% toward goal
                </p>
              </>
            )}
            {!dashboardData.currentWeight && (
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => navigate('/inbody')}
              >
                <Scale className="w-4 h-4 mr-2" />
                Log your weight
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};


export default DashboardPage;
