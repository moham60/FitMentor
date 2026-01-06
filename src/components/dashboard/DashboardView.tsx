import { Play, Plus, TrendingUp, Flame, Target } from 'lucide-react';
import CalorieRing from '../ui/CalorieRing';
import MacroBar from '../ui/MacroBar';
import { Button } from '../ui/button';

const DashboardView = () => {
  const userData = {
    name: 'Ahmed',
    calories: { consumed: 1450, target: 2200 },
    macros: {
      protein: { current: 95, target: 154 },
      carbs: { current: 120, target: 200 },
      fat: { current: 45, target: 65 },
    },
    weight: { current: 78, previous: 79.5 },
    streak: 12,
  };

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-muted-foreground text-sm">Good morning</p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {userData.name} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-accent/20 rounded-full px-3 py-1.5">
          <Flame className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-accent">{userData.streak} days</span>
        </div>
      </div>

      {/* Calorie Ring Card */}
      <div className="bg-gradient-card rounded-2xl p-6 border border-border/50 shadow-card mb-6">
        <div className="flex flex-col items-center">
          <CalorieRing 
            consumed={userData.calories.consumed} 
            target={userData.calories.target} 
          />
          
          <div className="flex justify-center gap-8 mt-6 w-full">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {userData.calories.consumed}
              </p>
              <p className="text-xs text-muted-foreground">Consumed</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {userData.calories.target}
              </p>
              <p className="text-xs text-muted-foreground">Target</p>
            </div>
          </div>
        </div>
      </div>

      {/* Macros Card */}
      <div className="bg-gradient-card rounded-2xl p-5 border border-border/50 shadow-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Macros</h2>
        </div>
        <div className="space-y-4">
          <MacroBar 
            label="Protein" 
            current={userData.macros.protein.current} 
            target={userData.macros.protein.target}
            color="primary"
          />
          <MacroBar 
            label="Carbs" 
            current={userData.macros.carbs.current} 
            target={userData.macros.carbs.target}
            color="warning"
          />
          <MacroBar 
            label="Fat" 
            current={userData.macros.fat.current} 
            target={userData.macros.fat.target}
            color="accent"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button 
          variant="secondary" 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-secondary/80 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium">Log Meal</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-secondary/80 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-accent" />
          </div>
          <span className="font-medium">Start Workout</span>
        </Button>
      </div>

      {/* Weight Progress */}
      <div className="bg-gradient-card rounded-2xl p-5 border border-border/50 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <h2 className="font-display font-semibold text-foreground">Weight Progress</h2>
          </div>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-4xl font-display font-bold text-foreground">
            {userData.weight.current}
          </span>
          <span className="text-muted-foreground">kg</span>
          <span className="text-success text-sm ml-auto">
            -{(userData.weight.previous - userData.weight.current).toFixed(1)} kg
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
