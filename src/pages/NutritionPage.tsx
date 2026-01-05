import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Coffee, 
  Sun, 
  Moon,
  Apple,
  Beef,
  Wheat,
  Droplet,
  ChevronDown,
  ChevronUp,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NutritionPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast');

  const dailyGoals = {
    calories: { current: 1850, target: 2400 },
    protein: { current: 120, target: 150 },
    carbs: { current: 180, target: 250 },
    fat: { current: 55, target: 80 },
  };

  const meals = [
    {
      id: 'breakfast',
      name: 'Breakfast',
      time: '7:00 - 10:00 AM',
      icon: Coffee,
      color: 'bg-warning',
      calories: { current: 450, target: 600 },
      foods: [
        { name: 'Scrambled Eggs (3)', calories: 220, protein: 18, carbs: 2, fat: 15 },
        { name: 'Whole Wheat Toast', calories: 130, protein: 4, carbs: 24, fat: 2 },
        { name: 'Orange Juice', calories: 100, protein: 2, carbs: 22, fat: 0 },
      ]
    },
    {
      id: 'lunch',
      name: 'Lunch',
      time: '12:00 - 2:00 PM',
      icon: Sun,
      color: 'bg-orange',
      calories: { current: 650, target: 700 },
      foods: [
        { name: 'Grilled Chicken Breast', calories: 280, protein: 45, carbs: 0, fat: 8 },
        { name: 'Brown Rice (1 cup)', calories: 220, protein: 5, carbs: 45, fat: 2 },
        { name: 'Steamed Vegetables', calories: 80, protein: 3, carbs: 15, fat: 1 },
        { name: 'Greek Salad', calories: 70, protein: 4, carbs: 8, fat: 3 },
      ]
    },
    {
      id: 'dinner',
      name: 'Dinner',
      time: '6:00 - 9:00 PM',
      icon: Moon,
      color: 'bg-purple',
      calories: { current: 0, target: 800 },
      foods: []
    },
  ];

  const quickAddFoods = [
    { name: 'Apple', calories: 95, icon: '🍎' },
    { name: 'Banana', calories: 105, icon: '🍌' },
    { name: 'Chicken Breast', calories: 165, icon: '🍗' },
    { name: 'Rice (1 cup)', calories: 206, icon: '🍚' },
    { name: 'Eggs (2)', calories: 156, icon: '🥚' },
    { name: 'Greek Yogurt', calories: 130, icon: '🥛' },
  ];

  return (
    <MainLayout 
      title="Nutrition"
      subtitle="Track your meals and macros"
    >
      {/* Daily Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dailyGoals.calories.current}</p>
                <p className="text-xs text-muted-foreground">of {dailyGoals.calories.target} kcal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center">
                <Beef className="w-6 h-6 text-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dailyGoals.protein.current}g</p>
                <p className="text-xs text-muted-foreground">of {dailyGoals.protein.target}g protein</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Wheat className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dailyGoals.carbs.current}g</p>
                <p className="text-xs text-muted-foreground">of {dailyGoals.carbs.target}g carbs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-purple" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple/10 flex items-center justify-center">
                <Droplet className="w-6 h-6 text-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{dailyGoals.fat.current}g</p>
                <p className="text-xs text-muted-foreground">of {dailyGoals.fat.target}g fat</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Meals */}
        <div className="lg:col-span-8 space-y-4">
          {meals.map((meal) => (
            <Card key={meal.id}>
              <button
                onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                className="w-full"
              >
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-xl">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-md", meal.color)}>
                      <meal.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-foreground">{meal.name}</p>
                      <p className="text-sm text-muted-foreground">{meal.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{meal.calories.current}</p>
                      <p className="text-xs text-muted-foreground">of {meal.calories.target} kcal</p>
                    </div>
                    {expandedMeal === meal.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>
              
              {expandedMeal === meal.id && (
                <CardContent className="pt-0 border-t border-border">
                  {meal.foods.length > 0 ? (
                    <div className="space-y-3 pt-4">
                      {meal.foods.map((food, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium text-foreground">{food.name}</p>
                            <p className="text-xs text-muted-foreground">
                              P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                            </p>
                          </div>
                          <span className="font-bold text-primary">{food.calories}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground mb-4">No foods logged yet</p>
                    </div>
                  )}
                  <Button className="w-full mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Add Food to {meal.name}
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Search Foods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for food..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Add */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Add</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickAddFoods.map((food, index) => (
                  <button
                    key={index}
                    className="p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <span className="text-2xl mb-1 block">{food.icon}</span>
                    <p className="font-medium text-sm text-foreground">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.calories} kcal</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Water Intake */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-info" />
                Water Intake
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-foreground">1.5L</span>
                <span className="text-muted-foreground">of 2.5L</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((glass) => (
                  <button
                    key={glass}
                    className={cn(
                      "w-8 h-10 rounded-lg border-2 transition-colors",
                      glass <= 6 
                        ? "border-info bg-info/20" 
                        : "border-muted hover:border-info"
                    )}
                  />
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Add Glass
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default NutritionPage;
