import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Flame,
  Sparkles,
  X,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFoodItems, usePopularFoods, getFoodCategories, FoodItem, calculateCalories, calculateMacros } from '@/hooks/useFoodItems';
import FoodCard from '@/components/nutrition/FoodCard';
import NutritionHistory from '@/components/nutrition/NutritionHistory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MealItem {
  id?: string;
  food: FoodItem;
  quantity: number;
}

interface Meal {
  id: string;
  name: string;
  time: string;
  icon: React.ComponentType<any>;
  color: string;
  items: MealItem[];
}

type MacroKey = 'protein' | 'carbs' | 'fat';

type MacroSuggestion = {
  food: FoodItem;
  quantity: number;
  focus: MacroKey;
  calories: number;
  macros: { protein: number; carbs: number; fat: number };
};

const NutritionPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast');
  const [dailyCaloriesTarget, setDailyCaloriesTarget] = useState(2000);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MacroSuggestion[]>([]);
  const [suggestMealId, setSuggestMealId] = useState<string>('lunch');

  const [mealPlanId, setMealPlanId] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [checkedMeals, setCheckedMeals] = useState<Set<string>>(new Set());
  
  const categories = getFoodCategories();
  const { foods, loading } = useFoodItems(selectedCategory, debouncedSearch);
  const { foods: popularFoods } = usePopularFoods();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch user's daily calories target
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('daily_calories')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.daily_calories) {
        setDailyCaloriesTarget(data.daily_calories);
      }
    };
    fetchProfile();
  }, [user]);

  const getLocalISODate = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [meals, setMeals] = useState<Meal[]>([
    {
      id: 'breakfast',
      name: 'Breakfast',
      time: '7:00 - 10:00 AM',
      icon: Coffee,
      color: 'bg-warning',
      items: []
    },
    {
      id: 'lunch',
      name: 'Lunch',
      time: '12:00 - 2:00 PM',
      icon: Sun,
      color: 'bg-orange',
      items: []
    },
    {
      id: 'dinner',
      name: 'Dinner',
      time: '6:00 - 9:00 PM',
      icon: Moon,
      color: 'bg-purple',
      items: []
    },
    {
      id: 'snack',
      name: 'Snacks',
      time: 'All day',
      icon: Apple,
      color: 'bg-accent',
      items: []
    },
  ]);

  // Load or create today's meal plan + items
  useEffect(() => {
    const loadPlan = async () => {
      if (!user) {
        setMealPlanId(null);
        setPlanLoading(false);
        return;
      }

      setPlanLoading(true);
      try {
        const today = getLocalISODate();

        const existing = await supabase
          .from('user_meal_plans')
          .select('id, target_calories')
          .eq('user_id', user.id)
          .eq('plan_date', today)
          .maybeSingle();

        if (existing.error) throw existing.error;

        let planId = existing.data?.id ?? null;

        if (!planId) {
          const created = await supabase
            .from('user_meal_plans')
            .insert({
              user_id: user.id,
              plan_date: today,
              target_calories: dailyCaloriesTarget,
              meals_count: 4,
            })
            .select('id')
            .single();

          if (created.error) throw created.error;
          planId = created.data.id;
        } else if (existing.data?.target_calories !== dailyCaloriesTarget) {
          await supabase
            .from('user_meal_plans')
            .update({ target_calories: dailyCaloriesTarget })
            .eq('id', planId);
        }

        setMealPlanId(planId);

        const itemsRes = await supabase
          .from('user_meal_items')
          .select('id, meal_type, quantity_g, food:food_items(*)')
          .eq('meal_plan_id', planId);

        if (itemsRes.error) throw itemsRes.error;

        const itemsByMeal: Record<string, MealItem[]> = {};
        for (const row of itemsRes.data ?? []) {
          const mealType = row.meal_type;
          const food = (row as any).food as FoodItem | null;
          if (!food) continue;
          if (!itemsByMeal[mealType]) itemsByMeal[mealType] = [];
          itemsByMeal[mealType].push({
            id: row.id,
            food,
            quantity: row.quantity_g,
          });
        }

        setMeals(prev =>
          prev.map(m => ({
            ...m,
            items: itemsByMeal[m.id] ?? [],
          }))
        );

        const checkinsRes = await supabase
          .from('user_meal_checkins')
          .select('meal_type')
          .eq('meal_plan_id', planId);
        if (checkinsRes.error) throw checkinsRes.error;
        setCheckedMeals(new Set((checkinsRes.data ?? []).map(r => r.meal_type)));
      } catch (err: any) {
        toast.error(err?.message ?? 'Failed to load meal plan');
      } finally {
        setPlanLoading(false);
      }
    };

    loadPlan();
    // Re-load when calories target changes so target_calories stays in sync
  }, [user, dailyCaloriesTarget]);

  const calculateMealCalories = (items: MealItem[]) => {
    return items.reduce((sum, item) => sum + calculateCalories(item.food, item.quantity), 0);
  };

  const calculateTotalCalories = () => {
    return meals.reduce((sum, meal) => sum + calculateMealCalories(meal.items), 0);
  };

  const calculateTotalMacros = () => {
    let protein = 0, carbs = 0, fat = 0;
    meals.forEach(meal => {
      meal.items.forEach(item => {
        const macros = calculateMacros(item.food, item.quantity);
        protein += macros.protein;
        carbs += macros.carbs;
        fat += macros.fat;
      });
    });
    return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
  };

  const handleAddFood = async (food: FoodItem, quantity: number, mealType: string) => {
    if (!user || !mealPlanId) {
      toast.error('Please sign in to save meals.');
      return;
    }

    const targetMeal = meals.find(m => m.id === mealType);

    // Optimistic UI
    const optimisticId = `optimistic-${Date.now()}`;
    setMeals(prev =>
      prev.map(meal =>
        meal.id === mealType
          ? { ...meal, items: [...meal.items, { id: optimisticId, food, quantity }] }
          : meal
      )
    );

    try {
      const inserted = await supabase
        .from('user_meal_items')
        .insert({
          meal_plan_id: mealPlanId,
          meal_type: mealType,
          food_item_id: food.id,
          quantity_g: quantity,
        })
        .select('id')
        .single();

      if (inserted.error) throw inserted.error;

      setMeals(prev =>
        prev.map(meal => {
          if (meal.id !== mealType) return meal;
          return {
            ...meal,
            items: meal.items.map(it =>
              it.id === optimisticId ? { ...it, id: inserted.data.id } : it
            ),
          };
        })
      );

      toast.success(`Added ${food.name_en || food.name_ar} to ${targetMeal?.name ?? 'meal'}`);
    } catch (err: any) {
      // Rollback optimistic
      setMeals(prev =>
        prev.map(meal =>
          meal.id === mealType
            ? { ...meal, items: meal.items.filter(it => it.id !== optimisticId) }
            : meal
        )
      );
      toast.error(err?.message ?? 'Failed to add food');
    }
  };

  const handleRemoveFood = async (mealId: string, itemId: string | undefined) => {
    if (!itemId) return;

    // Optimistic UI
    let removedItem: MealItem | undefined;
    setMeals(prev =>
      prev.map(meal => {
        if (meal.id !== mealId) return meal;
        removedItem = meal.items.find(it => it.id === itemId);
        return { ...meal, items: meal.items.filter(it => it.id !== itemId) };
      })
    );

    try {
      if (!user || !mealPlanId || itemId.startsWith('optimistic-')) return;
      const res = await supabase.from('user_meal_items').delete().eq('id', itemId);
      if (res.error) throw res.error;
    } catch (err: any) {
      // Rollback optimistic
      if (removedItem) {
        setMeals(prev =>
          prev.map(meal =>
            meal.id === mealId ? { ...meal, items: [...meal.items, removedItem!] } : meal
          )
        );
      }
      toast.error(err?.message ?? 'Failed to remove item');
    }
  };

  const toggleMealCheckin = async (mealId: string) => {
    if (!user) {
      toast.error('Please sign in to use check-ins.');
      return;
    }

    if (planLoading) {
      toast.message("Loading today's plan…");
      return;
    }

    if (!mealPlanId) {
      toast.error("Couldn't find today's plan. Please refresh and try again.");
      return;
    }

    const isChecked = checkedMeals.has(mealId);
    const next = new Set(checkedMeals);
    if (isChecked) next.delete(mealId);
    else next.add(mealId);
    setCheckedMeals(next);

    try {
      if (isChecked) {
        const del = await supabase
          .from('user_meal_checkins')
          .delete()
          .eq('meal_plan_id', mealPlanId)
          .eq('meal_type', mealId);
        if (del.error) throw del.error;
      } else {
        const ins = await supabase
          .from('user_meal_checkins')
          .insert({ meal_plan_id: mealPlanId, meal_type: mealId });
        if (ins.error) throw ins.error;
      }
    } catch (err: any) {
      // rollback
      setCheckedMeals(checkedMeals);
      toast.error(err?.message ?? 'Failed to update check-in');
    }
  };

  const totalCalories = calculateTotalCalories();
  const remainingCalories = dailyCaloriesTarget - totalCalories;
  const totalMacros = calculateTotalMacros();
  const caloriePercent = Math.min((totalCalories / dailyCaloriesTarget) * 100, 100);

  // Calculate target macros based on calories (rough estimate)
  const targetMacros = {
    protein: Math.round(dailyCaloriesTarget * 0.3 / 4), // 30% of calories from protein
    carbs: Math.round(dailyCaloriesTarget * 0.4 / 4), // 40% from carbs
    fat: Math.round(dailyCaloriesTarget * 0.3 / 9), // 30% from fat
  };

  const remainingMacros = {
    protein: Math.max(targetMacros.protein - totalMacros.protein, 0),
    carbs: Math.max(targetMacros.carbs - totalMacros.carbs, 0),
    fat: Math.max(targetMacros.fat - totalMacros.fat, 0),
  };

  const getFocusMacro = (): MacroKey => {
    const proteinRatio = targetMacros.protein ? remainingMacros.protein / targetMacros.protein : 0;
    const carbsRatio = targetMacros.carbs ? remainingMacros.carbs / targetMacros.carbs : 0;
    const fatRatio = targetMacros.fat ? remainingMacros.fat / targetMacros.fat : 0;

    const entries: Array<[MacroKey, number]> = [
      ['protein', proteinRatio],
      ['carbs', carbsRatio],
      ['fat', fatRatio],
    ];

    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  };

  const buildSuggestions = async (focus: MacroKey): Promise<MacroSuggestion[]> => {
    const macroFieldByKey: Record<MacroKey, 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'> = {
      protein: 'protein_per_100g',
      carbs: 'carbs_per_100g',
      fat: 'fat_per_100g',
    };

    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .order(macroFieldByKey[focus], { ascending: false })
      .limit(12);

    if (error) throw error;

    const foodsList = (data ?? []) as FoodItem[];
    const focusRemaining = remainingMacros[focus];
    const perMealGoal = Math.max(10, Math.round(Math.min(focusRemaining, targetMacros[focus] * 0.25)));

    const suggestionsList: MacroSuggestion[] = [];
    for (const food of foodsList) {
      const macroPer100 = Number(food[macroFieldByKey[focus]]);
      if (!Number.isFinite(macroPer100) || macroPer100 <= 0) continue;

      const gramsNeeded = Math.round((perMealGoal / (macroPer100 / 100)) / 10) * 10;
      const quantity = Math.min(Math.max(gramsNeeded, 50), 300);

      const macros = calculateMacros(food, quantity);
      const calories = calculateCalories(food, quantity);

      suggestionsList.push({
        food,
        quantity,
        focus,
        calories,
        macros: { protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
      });

      if (suggestionsList.length >= 6) break;
    }

    return suggestionsList;
  };

  const handleSuggestMeal = async () => {
    const mealId = expandedMeal ?? 'lunch';
    setSuggestMealId(mealId);
    setSuggestOpen(true);
    setSuggestLoading(true);
    try {
      const focus = getFocusMacro();
      const next = await buildSuggestions(focus);
      setSuggestions(next);
      if (next.length === 0) {
        toast.message('No suggestions found for your remaining macros.');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to generate suggestions');
    } finally {
      setSuggestLoading(false);
    }
  };

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  return (
    <MainLayout 
      title="Nutrition"
      subtitle="Track your meals and calories"
    >
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
      {/* Daily Summary - Beautiful Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-primary" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalCalories}</p>
                <p className="text-xs text-muted-foreground">of {dailyCaloriesTarget} kcal</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-primary rounded-full transition-all duration-1000"
                style={{ width: `${caloriePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-orange/20 flex items-center justify-center">
                <Beef className="w-7 h-7 text-orange" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalMacros.protein}g</p>
                <p className="text-xs text-muted-foreground">of {targetMacros.protein}g protein</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((totalMacros.protein / targetMacros.protein) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
                <Wheat className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalMacros.carbs}g</p>
                <p className="text-xs text-muted-foreground">of {targetMacros.carbs}g carbs</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((totalMacros.carbs / targetMacros.carbs) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple" />
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-purple/20 flex items-center justify-center">
                <Droplet className="w-7 h-7 text-purple" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalMacros.fat}g</p>
                <p className="text-xs text-muted-foreground">of {targetMacros.fat}g fat</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((totalMacros.fat / targetMacros.fat) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remaining Calories Banner */}
      {remainingCalories > 0 && (
        <Card className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-purple/10 border-none animate-fade-in">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{remainingCalories} kcal remaining</p>
                  <p className="text-muted-foreground">You can still add more food today</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Remaining macros: {remainingMacros.protein}g P • {remainingMacros.carbs}g C • {remainingMacros.fat}g F
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-gradient-primary shadow-glow gap-2" onClick={handleSuggestMeal}>
                  <Sparkles className="w-4 h-4" />
                  Suggest a meal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Meals */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            Today's meals
          </h2>
          {planLoading && (
            <Card className="animate-pulse">
              <CardContent className="py-6 text-muted-foreground">Loading today's plan…</CardContent>
            </Card>
          )}
          {meals.map((meal, mealIndex) => (
            <Card key={meal.id} className="animate-fade-in overflow-hidden" style={{ animationDelay: `${mealIndex * 0.1}s` }}>
              <button
                onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}
                className="w-full"
              >
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg", meal.color)}>
                      <meal.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-foreground">{meal.name}</p>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border",
                            checkedMeals.has(meal.id)
                              ? "bg-accent/15 border-accent text-accent"
                              : "bg-muted/40 border-border text-muted-foreground"
                          )}
                        >
                          {checkedMeals.has(meal.id) ? 'Checked in' : 'Not checked'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{meal.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-2xl font-bold text-primary">{calculateMealCalories(meal.items)}</p>
                      <p className="text-xs text-muted-foreground">{meal.items.length} items</p>
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
                <CardContent className="pt-0 border-t border-border animate-fade-in">
                  <div className="pt-4 flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Check in after you finish this meal.
                    </p>
                    <Button
                      size="sm"
                      variant={checkedMeals.has(meal.id) ? 'outline' : 'default'}
                      className="gap-2"
                      disabled={planLoading || !mealPlanId || !user}
                      onClick={() => toggleMealCheckin(meal.id)}
                    >
                      <Check className="w-4 h-4" />
                      {checkedMeals.has(meal.id) ? 'Undo check-in' : 'Check in'}
                    </Button>
                  </div>

                  {meal.items.length > 0 ? (
                    <div className="space-y-2 pt-4">
                      {meal.items.map((item) => (
                        <div 
                          key={item.id ?? `${item.food.id}-${item.quantity}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 group"
                        >
                          <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-accent" />
                            <div>
                              <p className="font-medium text-foreground">{item.food.name_en || item.food.name_ar}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity}g</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">{calculateCalories(item.food, item.quantity)}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                              onClick={() => handleRemoveFood(meal.id, item.id)}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground mb-2">No food added yet</p>
                      <p className="text-xs text-muted-foreground">Pick something from the food list</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Food Search & Categories */}
        <div className="lg:col-span-7 space-y-6">
          {/* Search */}
          <Card className="sticky top-0 z-10">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for food... (beans, chicken, rice...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-4">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "rounded-full whitespace-nowrap gap-2 transition-all duration-300",
                    selectedCategory === cat.id && "bg-gradient-primary shadow-glow scale-105"
                  )}
                >
                  <span className="text-lg">{cat.icon}</span>
                  {cat.name_en}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Popular Foods */}
          {selectedCategory === 'all' && !searchQuery && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-xl">⭐</span>
                Popular
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {popularFoods.slice(0, 6).map((food) => (
                  <Card 
                    key={food.id} 
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 animate-fade-in"
                    onClick={() => handleAddFood(food, food.serving_size_g, 'lunch')}
                  >
                    <CardContent className="p-3 text-center">
                      <p className="font-bold text-foreground text-sm">{food.name_en || food.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{food.calories_per_100g} kcal/100g</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Food List */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-xl">🍴</span>
                Food list
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {foods.length} items
              </span>
            </h3>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
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
                ))}
              </div>
            ) : foods.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-muted-foreground">No results</p>
                  <p className="text-sm text-muted-foreground">Try different keywords</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {foods.map((food, index) => (
                  <div key={food.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <FoodCard food={food} onAddFood={handleAddFood} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="history">
        <div className="max-w-3xl mx-auto">
          <NutritionHistory />
        </div>
        </TabsContent>
      </Tabs>

      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Meal suggestions</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Add to:</span>
              {meals.map((meal) => (
                <Button
                  key={meal.id}
                  size="sm"
                  variant={suggestMealId === meal.id ? 'default' : 'outline'}
                  onClick={() => setSuggestMealId(meal.id)}
                >
                  {meal.name}
                </Button>
              ))}
            </div>

            <Card className="bg-muted/30">
              <CardContent className="py-4 text-sm text-muted-foreground">
                Macro split is based on 30% protein / 40% carbs / 30% fat.
                Targets: {targetMacros.protein}g P, {targetMacros.carbs}g C, {targetMacros.fat}g F.
              </CardContent>
            </Card>

            {suggestLoading ? (
              <div className="py-10 text-center text-muted-foreground">Generating suggestions…</div>
            ) : suggestions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No suggestions available.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((s) => (
                  <Card key={`${s.food.id}-${s.focus}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{s.food.name_en || s.food.name_ar}</p>
                          <p className="text-xs text-muted-foreground">Suggested: {s.quantity}g • {s.calories} kcal</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            P {s.macros.protein}g • C {s.macros.carbs}g • F {s.macros.fat}g
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 gap-2"
                          onClick={() => handleAddFood(s.food, s.quantity, suggestMealId)}
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default NutritionPage;
