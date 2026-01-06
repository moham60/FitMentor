import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Dumbbell, 
  Plus, 
  Timer,
  Flame,
  TrendingUp,
  Play,
  CheckCircle,
  Target,
  ChevronRight,
  Search,
  Pause,
  RotateCcw,
  Trophy,
  Zap,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExercises, useWorkoutPlans, getMuscleGroups, getEquipmentTypes, getDifficultyColor, getGoalInfo, Exercise, WorkoutPlan } from '@/hooks/useExercises';
import ExerciseCard from '@/components/workout/ExerciseCard';

interface WorkoutSet {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ActiveExercise {
  exercise: Exercise;
  sets: WorkoutSet[];
}

const WorkoutsPage = () => {
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWorkout, setActiveWorkout] = useState<ActiveExercise[]>([]);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);

  const muscleGroups = getMuscleGroups();
  const equipmentTypes = getEquipmentTypes();
  const { exercises, loading: exercisesLoading } = useExercises(selectedMuscle, selectedEquipment, searchQuery);
  const { plans, loading: plansLoading } = useWorkoutPlans();

  const todayStats = {
    workouts: activeWorkout.length > 0 ? 1 : 0,
    duration: workoutStartTime ? Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 60000) : 0,
    calories: activeWorkout.reduce((sum, ex) => {
      const completedSets = ex.sets.filter(s => s.completed).length;
      return sum + (completedSets * 2 * ex.exercise.calories_per_minute);
    }, 0),
    exercises: activeWorkout.filter(ex => ex.sets.some(s => s.completed)).length,
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (!workoutStartTime) {
      setWorkoutStartTime(new Date());
    }
    
    const newExercise: ActiveExercise = {
      exercise,
      sets: [
        { reps: 12, weight: 0, completed: false },
        { reps: 12, weight: 0, completed: false },
        { reps: 12, weight: 0, completed: false },
      ]
    };
    
    setActiveWorkout(prev => [...prev, newExercise]);
    setShowExerciseLibrary(false);
  };

  const handleToggleSet = (exerciseIndex: number, setIndex: number) => {
    setActiveWorkout(prev => prev.map((ex, ei) => {
      if (ei === exerciseIndex) {
        return {
          ...ex,
          sets: ex.sets.map((set, si) => {
            if (si === setIndex) {
              const newCompleted = !set.completed;
              if (newCompleted) {
                // Start rest timer when set is completed
                setRestSeconds(60);
                setIsRestTimerActive(true);
              }
              return { ...set, completed: newCompleted };
            }
            return set;
          })
        };
      }
      return ex;
    }));
  };

  const handleAddSet = (exerciseIndex: number) => {
    setActiveWorkout(prev => prev.map((ex, ei) => {
      if (ei === exerciseIndex) {
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { reps: lastSet.reps, weight: lastSet.weight, completed: false }]
        };
      }
      return ex;
    }));
  };

  const handleUpdateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setActiveWorkout(prev => prev.map((ex, ei) => {
      if (ei === exerciseIndex) {
        return {
          ...ex,
          sets: ex.sets.map((set, si) => {
            if (si === setIndex) {
              return { ...set, [field]: value };
            }
            return set;
          })
        };
      }
      return ex;
    }));
  };

  const completedSetsCount = activeWorkout.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0);
  const totalSetsCount = activeWorkout.reduce((sum, ex) => sum + ex.sets.length, 0);
  const workoutProgress = totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0;

  return (
    <MainLayout 
      title="التمارين"
      subtitle="تتبع تمارينك وبناء جسمك المثالي"
    >
      {/* Today's Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{todayStats.workouts}</p>
                <p className="text-xs text-muted-foreground">تمارين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Timer className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{todayStats.duration}</p>
                <p className="text-xs text-muted-foreground">دقيقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-orange/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Flame className="w-7 h-7 text-orange" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{todayStats.calories}</p>
                <p className="text-xs text-muted-foreground">سعرة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-purple/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7 text-purple" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{todayStats.exercises}</p>
                <p className="text-xs text-muted-foreground">تمرين مكتمل</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Current Workout / Start Section */}
        <div className="lg:col-span-5 space-y-6">
          {activeWorkout.length > 0 ? (
            <Card className="animate-fade-in">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-lg">تمرين نشط</p>
                      <p className="text-sm font-normal text-muted-foreground">{todayStats.duration} دقيقة</p>
                    </div>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{Math.round(workoutProgress)}%</p>
                    <p className="text-xs text-muted-foreground">{completedSetsCount}/{totalSetsCount} مجموعات</p>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary rounded-full transition-all duration-500"
                    style={{ width: `${workoutProgress}%` }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeWorkout.map((item, exerciseIndex) => (
                  <div key={exerciseIndex} className="p-4 rounded-xl bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                          💪
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{item.exercise.name_ar}</p>
                          <p className="text-xs text-muted-foreground">{item.exercise.muscle_group}</p>
                        </div>
                      </div>
                      <span className={cn("text-xs px-2 py-1 rounded-full", getDifficultyColor(item.exercise.difficulty))}>
                        {item.exercise.difficulty === 'beginner' ? 'مبتدئ' : item.exercise.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
                      </span>
                    </div>
                    
                    {/* Sets */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground text-center">
                        <span>المجموعة</span>
                        <span>التكرارات</span>
                        <span>الوزن (kg)</span>
                        <span>✓</span>
                      </div>
                      {item.sets.map((set, setIndex) => (
                        <div key={setIndex} className="grid grid-cols-4 gap-2 items-center">
                          <span className={cn(
                            "text-center font-bold text-sm rounded-lg py-2",
                            set.completed ? "bg-accent text-accent-foreground" : "bg-muted"
                          )}>
                            {setIndex + 1}
                          </span>
                          <Input
                            type="number"
                            value={set.reps}
                            onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                            className="h-10 text-center"
                          />
                          <Input
                            type="number"
                            value={set.weight}
                            onChange={(e) => handleUpdateSet(exerciseIndex, setIndex, 'weight', parseInt(e.target.value) || 0)}
                            className="h-10 text-center"
                          />
                          <Button
                            size="sm"
                            variant={set.completed ? 'default' : 'outline'}
                            onClick={() => handleToggleSet(exerciseIndex, setIndex)}
                            className={cn(
                              "h-10 w-full transition-all",
                              set.completed && "bg-accent hover:bg-accent/90"
                            )}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddSet(exerciseIndex)}
                        className="w-full gap-2 text-primary"
                      >
                        <Plus className="w-4 h-4" />
                        أضف مجموعة
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  onClick={() => setShowExerciseLibrary(true)}
                  className="w-full bg-gradient-primary shadow-glow gap-2"
                >
                  <Plus className="w-5 h-5" />
                  أضف تمرين
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="py-12 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-primary mx-auto flex items-center justify-center shadow-glow mb-6">
                  <Dumbbell className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">ابدأ تمرينك</h3>
                <p className="text-muted-foreground mb-6">اختر تمرين من المكتبة أو ابدأ خطة جاهزة</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setShowExerciseLibrary(true)}
                    className="bg-gradient-primary shadow-glow gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    تمرين مخصص
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Play className="w-5 h-5" />
                    اختر خطة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workout Plans */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="text-xl">📋</span>
              خطط التمارين
            </h3>
            <div className="space-y-3">
              {plansLoading ? (
                [1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-16 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                plans.map((plan, index) => {
                  const goalInfo = getGoalInfo(plan.goal);
                  return (
                    <Card 
                      key={plan.id} 
                      className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl",
                            goalInfo.color === 'primary' && "bg-primary/20",
                            goalInfo.color === 'orange' && "bg-orange/20",
                            goalInfo.color === 'purple' && "bg-purple/20",
                            goalInfo.color === 'accent' && "bg-accent/20"
                          )}>
                            {goalInfo.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-foreground">{plan.name_ar}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {plan.duration_weeks} أسابيع
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {plan.days_per_week} أيام/أسبوع
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("text-xs px-2 py-1 rounded-full", getDifficultyColor(plan.difficulty))}>
                              {plan.difficulty === 'beginner' ? 'مبتدئ' : plan.difficulty === 'intermediate' ? 'متوسط' : 'متقدم'}
                            </span>
                            {plan.is_premium && (
                              <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                بريميوم
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Exercise Library */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">💪</span>
                مكتبة التمارين
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن تمرين..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-12"
                  dir="rtl"
                />
              </div>

              {/* Muscle Groups */}
              <ScrollArea className="w-full" dir="rtl">
                <div className="flex gap-2 pb-2">
                  {muscleGroups.map((muscle) => (
                    <Button
                      key={muscle.id}
                      variant={selectedMuscle === muscle.id ? 'default' : 'outline'}
                      onClick={() => setSelectedMuscle(muscle.id)}
                      size="sm"
                      className={cn(
                        "rounded-full whitespace-nowrap gap-1 transition-all",
                        selectedMuscle === muscle.id && "bg-gradient-primary shadow-glow"
                      )}
                    >
                      <span>{muscle.icon}</span>
                      {muscle.name_ar}
                    </Button>
                  ))}
                </div>
              </ScrollArea>

              {/* Equipment Filter */}
              <ScrollArea className="w-full" dir="rtl">
                <div className="flex gap-2 pb-2">
                  {equipmentTypes.map((eq) => (
                    <Button
                      key={eq.id}
                      variant={selectedEquipment === eq.id ? 'default' : 'ghost'}
                      onClick={() => setSelectedEquipment(eq.id)}
                      size="sm"
                      className="rounded-full whitespace-nowrap text-xs"
                    >
                      {eq.name_ar}
                    </Button>
                  ))}
                </div>
              </ScrollArea>

              {/* Exercise List */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {exercisesLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-muted" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : exercises.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">لا توجد تمارين</p>
                  </div>
                ) : (
                  exercises.map((exercise, index) => (
                    <div key={exercise.id} style={{ animationDelay: `${index * 0.05}s` }}>
                      <ExerciseCard 
                        exercise={exercise} 
                        onSelect={handleAddExercise}
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Exercise Library Dialog for mobile */}
      <Dialog open={showExerciseLibrary} onOpenChange={setShowExerciseLibrary}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>اختر تمرين</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="ابحث عن تمرين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
                dir="rtl"
              />
            </div>
            <ScrollArea className="w-full" dir="rtl">
              <div className="flex gap-2 pb-2">
                {muscleGroups.map((muscle) => (
                  <Button
                    key={muscle.id}
                    variant={selectedMuscle === muscle.id ? 'default' : 'outline'}
                    onClick={() => setSelectedMuscle(muscle.id)}
                    size="sm"
                    className="rounded-full whitespace-nowrap"
                  >
                    {muscle.icon} {muscle.name_ar}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {exercises.slice(0, 10).map((exercise) => (
                <Card 
                  key={exercise.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleAddExercise(exercise)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        💪
                      </div>
                      <div>
                        <p className="font-bold text-sm">{exercise.name_ar}</p>
                        <p className="text-xs text-muted-foreground">{exercise.muscle_group}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default WorkoutsPage;
