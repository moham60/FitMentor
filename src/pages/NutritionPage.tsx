import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MealItem {
  food: FoodItem;
  quantity: number;
}

interface Meal {
  id: string;
  name: string;
  name_ar: string;
  time: string;
  icon: React.ComponentType<any>;
  color: string;
  items: MealItem[];
}

const NutritionPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedMeal, setExpandedMeal] = useState<string | null>('breakfast');
  const [dailyCaloriesTarget, setDailyCaloriesTarget] = useState(2000);
  
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

  const [meals, setMeals] = useState<Meal[]>([
    {
      id: 'breakfast',
      name: 'Breakfast',
      name_ar: 'الفطور',
      time: '7:00 - 10:00 صباحاً',
      icon: Coffee,
      color: 'bg-warning',
      items: []
    },
    {
      id: 'lunch',
      name: 'Lunch',
      name_ar: 'الغداء',
      time: '12:00 - 2:00 ظهراً',
      icon: Sun,
      color: 'bg-orange',
      items: []
    },
    {
      id: 'dinner',
      name: 'Dinner',
      name_ar: 'العشاء',
      time: '6:00 - 9:00 مساءً',
      icon: Moon,
      color: 'bg-purple',
      items: []
    },
    {
      id: 'snack',
      name: 'Snacks',
      name_ar: 'سناكس',
      time: 'طوال اليوم',
      icon: Apple,
      color: 'bg-accent',
      items: []
    },
  ]);

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

  const handleAddFood = (food: FoodItem, quantity: number, mealType: string) => {
    setMeals(prev => prev.map(meal => {
      if (meal.id === mealType) {
        return {
          ...meal,
          items: [...meal.items, { food, quantity }]
        };
      }
      return meal;
    }));
    toast.success(`تم إضافة ${food.name_ar} إلى ${meals.find(m => m.id === mealType)?.name_ar}`);
  };

  const handleRemoveFood = (mealId: string, index: number) => {
    setMeals(prev => prev.map(meal => {
      if (meal.id === mealId) {
        return {
          ...meal,
          items: meal.items.filter((_, i) => i !== index)
        };
      }
      return meal;
    }));
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

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  return (
    <MainLayout 
      title="التغذية"
      subtitle="تتبع وجباتك وحساب السعرات الحرارية"
    >
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
                <p className="text-xs text-muted-foreground">من {dailyCaloriesTarget} سعرة</p>
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
                <p className="text-xs text-muted-foreground">من {targetMacros.protein}g بروتين</p>
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
                <p className="text-xs text-muted-foreground">من {targetMacros.carbs}g كربوهيدرات</p>
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
                <p className="text-xs text-muted-foreground">من {targetMacros.fat}g دهون</p>
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
                  <p className="text-2xl font-bold text-foreground">متبقي {remainingCalories} سعرة</p>
                  <p className="text-muted-foreground">يمكنك إضافة المزيد من الطعام اليوم</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-gradient-primary shadow-glow gap-2">
                  <Sparkles className="w-4 h-4" />
                  اقترح وجبة
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
            وجبات اليوم
          </h2>
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
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{meal.name_ar}</p>
                      <p className="text-sm text-muted-foreground">{meal.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-2xl font-bold text-primary">{calculateMealCalories(meal.items)}</p>
                      <p className="text-xs text-muted-foreground">{meal.items.length} عناصر</p>
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
                  {meal.items.length > 0 ? (
                    <div className="space-y-2 pt-4">
                      {meal.items.map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 group"
                        >
                          <div className="flex items-center gap-3">
                            <Check className="w-5 h-5 text-accent" />
                            <div>
                              <p className="font-medium text-foreground">{item.food.name_ar}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity}g</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">{calculateCalories(item.food, item.quantity)}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                              onClick={() => handleRemoveFood(meal.id, index)}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground mb-2">لم يتم إضافة طعام بعد</p>
                      <p className="text-xs text-muted-foreground">اختر من قائمة الأطعمة</p>
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
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن طعام... (فول، كشري، دجاج...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-12 text-lg"
                  dir="rtl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <ScrollArea className="w-full" dir="rtl">
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
                  {cat.name_ar}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Popular Foods */}
          {selectedCategory === 'all' && !searchQuery && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-xl">⭐</span>
                الأكثر شيوعاً
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {popularFoods.slice(0, 6).map((food) => (
                  <Card 
                    key={food.id} 
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 animate-fade-in"
                    onClick={() => handleAddFood(food, food.serving_size_g, 'lunch')}
                  >
                    <CardContent className="p-3 text-center">
                      <p className="font-bold text-foreground text-sm">{food.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{food.calories_per_100g} سعرة/100g</p>
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
                قائمة الأطعمة
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {foods.length} عنصر
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
                  <p className="text-lg text-muted-foreground">لا توجد نتائج</p>
                  <p className="text-sm text-muted-foreground">جرب البحث بكلمات مختلفة</p>
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
    </MainLayout>
  );
};

export default NutritionPage;
