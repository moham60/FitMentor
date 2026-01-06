import { Plus, Search, Camera, Clock, Coffee, Sun, Moon, Dumbbell, Apple, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useState } from 'react';
import { useFoodItems, getFoodCategories, calculateCalories, calculateMacros } from '@/hooks/useFoodItems';
import FoodCard from './FoodCard';
import { cn } from '@/lib/utils';

const mealTypes = [
  { id: 'breakfast', icon: Coffee, label: 'Breakfast', time: '7:00 - 10:00' },
  { id: 'lunch', icon: Sun, label: 'Lunch', time: '12:00 - 15:00' },
  { id: 'dinner', icon: Moon, label: 'Dinner', time: '18:00 - 21:00' },
  { id: 'snack', icon: Apple, label: 'Snack', time: 'Anytime' },
  { id: 'pre-workout', icon: Dumbbell, label: 'Pre-Workout', time: '30-60 min before' },
  { id: 'post-workout', icon: Dumbbell, label: 'Post-Workout', time: '30-60 min after' },
];

const NutritionView = () => {
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { foods, loading, error } = useFoodItems(selectedCategory, searchQuery);
  const categories = getFoodCategories();

  // Calculate daily totals (mock data for now)
  const dailyTotals = {
    calories: 1450,
    target: 2200,
    protein: 85,
    carbs: 165,
    fat: 52,
  };

  const remaining = dailyTotals.target - dailyTotals.calories;
  const progress = (dailyTotals.calories / dailyTotals.target) * 100;

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Nutrition</h1>
        <p className="text-muted-foreground">Track your daily meals • {foods.length} foods available</p>
      </div>

      {/* Daily Progress Card */}
      <div className="bg-gradient-card rounded-2xl p-6 border border-border/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Today's Intake</p>
            <p className="text-3xl font-display font-bold text-foreground">{dailyTotals.calories}</p>
            <p className="text-sm text-muted-foreground">of {dailyTotals.target} kcal</p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                className="fill-none stroke-muted"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                className="fill-none stroke-primary"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 2.51} 251`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-orange/20 flex items-center justify-center">
              <Beef className="w-5 h-5 text-orange" />
            </div>
            <p className="text-lg font-bold text-foreground">{dailyTotals.protein}g</p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-accent/20 flex items-center justify-center">
              <Wheat className="w-5 h-5 text-accent" />
            </div>
            <p className="text-lg font-bold text-foreground">{dailyTotals.carbs}g</p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-purple/20 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-purple" />
            </div>
            <p className="text-lg font-bold text-foreground">{dailyTotals.fat}g</p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-primary/10 rounded-xl text-center">
          <p className="text-sm text-primary font-medium">
            {remaining > 0 ? `${remaining} kcal remaining` : 'Daily goal reached! 🎉'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search foods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-secondary border-border"
        />
        <Button size="icon" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2">
          <Camera className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
              selectedCategory === category.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/50 text-muted-foreground"
            )}
          >
            <span>{category.icon}</span>
            {category.name_en}
          </button>
        ))}
      </div>

      {/* Add Meal Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {mealTypes.slice(0, 6).map((meal) => {
          const Icon = meal.icon;
          return (
            <button
              key={meal.id}
              onClick={() => setSelectedMeal(meal.id === selectedMeal ? null : meal.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                selectedMeal === meal.id
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{meal.label}</span>
            </button>
          );
        })}
      </div>

      {/* Foods List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-foreground">
            {selectedCategory === 'all' ? 'All Foods' : categories.find(c => c.id === selectedCategory)?.name_en}
          </h2>
          <span className="text-sm text-muted-foreground">{foods.length} items</span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>Error loading foods</p>
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-12">
            <Apple className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No foods found</p>
            <p className="text-sm text-muted-foreground/70">Try a different search</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {foods.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionView;
