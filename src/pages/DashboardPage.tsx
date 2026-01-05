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
  Lightbulb,
  Scale,
  Target,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const DashboardPage = () => {
  const { user } = useAuth();
  
  // Sample data - in production, this would come from the database
  const dailyCalories = { consumed: 1850, target: 2400 };
  const macros = {
    protein: { current: 120, target: 150 },
    carbs: { current: 180, target: 250 },
    fat: { current: 55, target: 80 },
  };

  const stats = [
    { 
      label: 'Calories', 
      value: dailyCalories.consumed, 
      target: dailyCalories.target,
      icon: Flame, 
      color: 'primary',
      unit: 'kcal'
    },
    { 
      label: 'Protein', 
      value: macros.protein.current, 
      target: macros.protein.target,
      icon: Beef, 
      color: 'orange',
      unit: 'g'
    },
    { 
      label: 'Carbs', 
      value: macros.carbs.current, 
      target: macros.carbs.target,
      icon: Wheat, 
      color: 'accent',
      unit: 'g'
    },
    { 
      label: 'Fat', 
      value: macros.fat.current, 
      target: macros.fat.target,
      icon: Droplet, 
      color: 'purple',
      unit: 'g'
    },
  ];

  const meals = [
    { name: 'Breakfast', time: '8:00 AM', calories: 450, status: 'completed' },
    { name: 'Lunch', time: '1:00 PM', calories: 650, status: 'completed' },
    { name: 'Snack', time: '4:00 PM', calories: 200, status: 'completed' },
    { name: 'Dinner', time: '7:00 PM', calories: 550, status: 'pending' },
  ];

  const workouts = [
    { name: 'Upper Body', progress: 85, color: 'primary' },
    { name: 'Cardio', progress: 60, color: 'accent' },
    { name: 'Core', progress: 40, color: 'orange' },
  ];

  const insights = [
    { type: 'success', title: 'Great protein intake!', message: 'You\'re on track to hit your protein goal today.' },
    { type: 'warning', title: 'Low on carbs', message: 'Consider adding some whole grains to your next meal.' },
    { type: 'info', title: 'Workout reminder', message: 'You haven\'t logged a workout today. Time to move!' },
  ];

  const caloriePercent = Math.min((dailyCalories.consumed / dailyCalories.target) * 100, 100);
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  return (
    <MainLayout 
      title={`Welcome back, ${user?.user_metadata?.full_name?.split(' ')[0] || 'there'}!`}
      subtitle="Here's your fitness overview for today"
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Log Meal
        </Button>
        <Button variant="outline" className="gap-2">
          <Dumbbell className="w-4 h-4" />
          Start Workout
        </Button>
        <Button variant="outline" className="gap-2">
          <Scale className="w-4 h-4" />
          Log Weight
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const percent = Math.round((stat.value / stat.target) * 100);
          return (
            <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1",
                stat.color === 'primary' && "bg-gradient-primary",
                stat.color === 'orange' && "bg-orange",
                stat.color === 'accent' && "bg-accent",
                stat.color === 'purple' && "bg-purple"
              )} />
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{percent}%</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.value}/{stat.target} {stat.unit}
                    </p>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    stat.color === 'primary' && "bg-primary/10 text-primary",
                    stat.color === 'orange' && "bg-orange/10 text-orange",
                    stat.color === 'accent' && "bg-accent/10 text-accent",
                    stat.color === 'purple' && "bg-purple/10 text-purple"
                  )}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calorie Ring */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              Daily Calories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="12"
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
                <span className="text-4xl font-bold text-foreground">{dailyCalories.consumed}</span>
                <span className="text-sm text-muted-foreground">of {dailyCalories.target} kcal</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mt-6">
              {Object.entries(macros).map(([name, values]) => (
                <div key={name} className="text-center">
                  <div className="text-lg font-bold text-foreground">{values.current}g</div>
                  <div className="text-xs text-muted-foreground capitalize">{name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Meals</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {meals.map((meal, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{meal.name}</p>
                  <p className="text-xs text-muted-foreground">{meal.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{meal.calories}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    meal.status === 'completed' ? "bg-accent" : "bg-muted-foreground"
                  )} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workout Progress */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              Workout Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workouts.map((workout, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  workout.color === 'primary' && "bg-primary/10 text-primary",
                  workout.color === 'accent' && "bg-accent/10 text-accent",
                  workout.color === 'orange' && "bg-orange/10 text-orange"
                )}>
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">{workout.name}</p>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
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
                <span className="text-xl font-bold text-foreground">{workout.progress}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={cn(
                  "flex gap-4 p-4 rounded-xl border-l-4",
                  insight.type === 'success' && "bg-accent/10 border-accent",
                  insight.type === 'warning' && "bg-orange/10 border-orange",
                  insight.type === 'info' && "bg-primary/10 border-primary"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  insight.type === 'success' && "bg-accent/20 text-accent",
                  insight.type === 'warning' && "bg-orange/20 text-orange",
                  insight.type === 'info' && "bg-primary/20 text-primary"
                )}>
                  <Lightbulb className="w-5 h-5" />
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
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Weight Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-foreground">85.2</p>
              <p className="text-sm text-muted-foreground">Current weight (kg)</p>
            </div>
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <p className="font-semibold text-foreground">87.5</p>
                <p className="text-xs text-muted-foreground">Start</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-accent">-2.3</p>
                <p className="text-xs text-muted-foreground">Change</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-primary">80.0</p>
                <p className="text-xs text-muted-foreground">Goal</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  style={{ width: '31%' }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">31% to goal</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DashboardPage;
