import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dumbbell, 
  Plus, 
  Timer,
  Flame,
  TrendingUp,
  Play,
  CheckCircle,
  Target,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WorkoutsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'strength', name: 'Strength' },
    { id: 'cardio', name: 'Cardio' },
    { id: 'flexibility', name: 'Flexibility' },
    { id: 'hiit', name: 'HIIT' },
  ];

  const todayStats = {
    workouts: 2,
    duration: 45,
    calories: 320,
    exercises: 12,
  };

  const workoutPlans = [
    {
      id: 1,
      name: 'Push Day - Chest & Triceps',
      category: 'strength',
      duration: 60,
      exercises: 6,
      difficulty: 'Intermediate',
      progress: 75,
      color: 'primary'
    },
    {
      id: 2,
      name: 'HIIT Cardio Blast',
      category: 'hiit',
      duration: 30,
      exercises: 8,
      difficulty: 'Advanced',
      progress: 0,
      color: 'orange'
    },
    {
      id: 3,
      name: 'Full Body Stretch',
      category: 'flexibility',
      duration: 20,
      exercises: 10,
      difficulty: 'Beginner',
      progress: 100,
      color: 'accent'
    },
    {
      id: 4,
      name: 'Leg Day - Quads Focus',
      category: 'strength',
      duration: 55,
      exercises: 7,
      difficulty: 'Intermediate',
      progress: 0,
      color: 'purple'
    },
  ];

  const exercises = [
    { name: 'Bench Press', sets: 4, reps: '8-10', weight: '80kg', completed: true },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '30kg', completed: true },
    { name: 'Cable Flyes', sets: 3, reps: '12-15', weight: '20kg', completed: true },
    { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', weight: '25kg', completed: false },
    { name: 'Skull Crushers', sets: 3, reps: '10-12', weight: '30kg', completed: false },
    { name: 'Dips', sets: 3, reps: 'Max', weight: 'BW', completed: false },
  ];

  return (
    <MainLayout 
      title="Workouts"
      subtitle="Track your training sessions"
    >
      {/* Today's Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayStats.workouts}</p>
                <p className="text-xs text-muted-foreground">Workouts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Timer className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayStats.duration}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayStats.calories}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{todayStats.exercises}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "rounded-full whitespace-nowrap",
              selectedCategory === cat.id && "bg-gradient-primary shadow-glow"
            )}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workout Plans */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Workout Plans</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Plan
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workoutPlans
              .filter(w => selectedCategory === 'all' || w.category === selectedCategory)
              .map((workout) => (
                <Card key={workout.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        workout.color === 'primary' && "bg-primary/10 text-primary",
                        workout.color === 'orange' && "bg-orange/10 text-orange",
                        workout.color === 'accent' && "bg-accent/10 text-accent",
                        workout.color === 'purple' && "bg-purple/10 text-purple"
                      )}>
                        <Dumbbell className="w-6 h-6" />
                      </div>
                      {workout.progress === 100 ? (
                        <CheckCircle className="w-6 h-6 text-accent" />
                      ) : workout.progress > 0 ? (
                        <span className="text-sm font-bold text-primary">{workout.progress}%</span>
                      ) : (
                        <Play className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{workout.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" /> {workout.duration}min
                      </span>
                      <span>{workout.exercises} exercises</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        workout.difficulty === 'Beginner' && "bg-accent/10 text-accent",
                        workout.difficulty === 'Intermediate' && "bg-warning/10 text-warning",
                        workout.difficulty === 'Advanced' && "bg-orange/10 text-orange"
                      )}>
                        {workout.difficulty}
                      </span>
                      {workout.progress > 0 && workout.progress < 100 && (
                        <div className="flex-1 mx-4">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-primary rounded-full"
                              style={{ width: `${workout.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Current Workout */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Current Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="font-bold text-foreground">Push Day - Chest & Triceps</h3>
                <p className="text-sm text-muted-foreground">3 of 6 exercises completed</p>
              </div>
              <div className="space-y-3">
                {exercises.map((exercise, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg transition-colors",
                      exercise.completed 
                        ? "bg-accent/10 border border-accent/20" 
                        : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        exercise.completed 
                          ? "bg-accent text-accent-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {exercise.completed ? '✓' : index + 1}
                      </div>
                      <div>
                        <p className={cn(
                          "font-medium",
                          exercise.completed ? "text-accent" : "text-foreground"
                        )}>
                          {exercise.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.sets} sets × {exercise.reps} @ {exercise.weight}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4 bg-gradient-primary text-primary-foreground shadow-glow">
                Continue Workout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default WorkoutsPage;
