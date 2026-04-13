import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Target,
  Scale,
  Flame,
  Dumbbell,
  TrendingDown,
  TrendingUp,
  Check,
  Plus,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GoalsPage = () => {
  const goals = [
    {
      id: 1,
      type: 'weight',
      title: 'Reach Target Weight',
      icon: Scale,
      current: 85.2,
      target: 80,
      unit: 'kg',
      progress: 69,
      color: 'primary',
      deadline: '2024-03-01',
    },
    {
      id: 2,
      type: 'calories',
      title: 'Daily Calorie Goal',
      icon: Flame,
      current: 1850,
      target: 2400,
      unit: 'kcal',
      progress: 77,
      color: 'orange',
      deadline: 'Daily',
    },
    {
      id: 3,
      type: 'workout',
      title: 'Workouts This Week',
      icon: Dumbbell,
      current: 3,
      target: 5,
      unit: 'sessions',
      progress: 60,
      color: 'accent',
      deadline: 'Weekly',
    },
    {
      id: 4,
      type: 'bodyFat',
      title: 'Body Fat Reduction',
      icon: TrendingDown,
      current: 18.2,
      target: 15,
      unit: '%',
      progress: 40,
      color: 'purple',
      deadline: '2024-04-01',
    },
  ];

  const achievements = [
    { title: 'First Workout', icon: '🏋️', unlocked: true },
    { title: '7-Day Streak', icon: '🔥', unlocked: true },
    { title: '10kg Lost', icon: '⚖️', unlocked: false },
    { title: 'Protein Master', icon: '🥩', unlocked: true },
    { title: '30-Day Streak', icon: '🏆', unlocked: false },
    { title: 'Macro King', icon: '👑', unlocked: false },
  ];

  return (
    <MainLayout 
      title="Goals"
      subtitle="Track and achieve your fitness goals"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Goals List */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Active Goals</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Goal
            </Button>
          </div>
          
          <div className="space-y-4">
            {goals.map((goal) => (
              <Card key={goal.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                      goal.color === 'primary' && "bg-primary/10 text-primary",
                      goal.color === 'orange' && "bg-orange/10 text-orange",
                      goal.color === 'accent' && "bg-accent/10 text-accent",
                      goal.color === 'purple' && "bg-purple/10 text-purple"
                    )}>
                      <goal.icon className="w-7 h-7" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-foreground">{goal.title}</h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span>Current: <strong className="text-foreground">{goal.current}{goal.unit}</strong></span>
                        <span>Target: <strong className="text-primary">{goal.target}{goal.unit}</strong></span>
                        <span>Due: {goal.deadline}</span>
                      </div>
                      
                      <div className="relative">
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              goal.color === 'primary' && "bg-gradient-primary",
                              goal.color === 'orange' && "bg-orange",
                              goal.color === 'accent' && "bg-accent",
                              goal.color === 'purple' && "bg-purple"
                            )}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <span className="absolute right-0 -top-5 text-sm font-bold text-foreground">
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Goal Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-accent/10">
                  <p className="text-3xl font-bold text-accent">3</p>
                  <p className="text-xs text-muted-foreground">On Track</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-orange/10">
                  <p className="text-3xl font-bold text-orange">1</p>
                  <p className="text-xs text-muted-foreground">Needs Work</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((achievement, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 transition-all",
                      achievement.unlocked 
                        ? "bg-primary/10 border-2 border-primary shadow-glow" 
                        : "bg-muted/50 opacity-50"
                    )}
                  >
                    <span className="text-2xl mb-1">{achievement.icon}</span>
                    <p className="text-[10px] font-medium text-foreground leading-tight">
                      {achievement.title}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>💡 Goal Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Set SMART goals: Specific, Measurable, Achievable, Relevant, Time-bound</p>
              <p>• Break large goals into smaller milestones</p>
              <p>• Track your progress daily</p>
              <p>• Celebrate small wins along the way</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default GoalsPage;
