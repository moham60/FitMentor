import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FoodItem, calculateCalories, calculateMacros } from '@/hooks/useFoodItems';

interface FoodCardProps {
  food: FoodItem;
  onAddFood?: (food: FoodItem, quantity: number, mealType: string) => void;
}

const FoodCard = ({ food, onAddFood }: FoodCardProps) => {
  const [quantity, setQuantity] = useState(food.serving_size_g);
  const [selectedMeal, setSelectedMeal] = useState('lunch');
  const [isOpen, setIsOpen] = useState(false);

  const calories = calculateCalories(food, quantity);
  const macros = calculateMacros(food, quantity);

  const mealTypes = [
    { id: 'breakfast', name: 'فطور', icon: '☀️' },
    { id: 'lunch', name: 'غداء', icon: '🌤️' },
    { id: 'dinner', name: 'عشاء', icon: '🌙' },
    { id: 'snack', name: 'سناك', icon: '🍎' },
  ];

  const handleAdd = () => {
    onAddFood?.(food, quantity, selectedMeal);
    setIsOpen(false);
    setQuantity(food.serving_size_g);
  };

  const getFoodIcon = (type: string) => {
    const icons: Record<string, string> = {
      egyptian: '🇪🇬',
      healthy: '🥗',
      protein: '🥩',
      carbs: '🍚',
      fruits: '🍎',
      vegetables: '🥦',
      dairy: '🥛',
      sweets: '🍰',
      drinks: '🥤',
    };
    return icons[type] || '🍽️';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {getFoodIcon(food.food_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{food.name_ar}</p>
                <p className="text-xs text-muted-foreground truncate">{food.name_en}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-primary">{food.calories_per_100g}</span>
                  <span className="text-xs text-muted-foreground">سعرة / 100 جرام</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-3xl">{getFoodIcon(food.food_type)}</span>
            <div>
              <p className="text-xl">{food.name_ar}</p>
              <p className="text-sm font-normal text-muted-foreground">{food.name_en}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quantity Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">الكمية</span>
              <span className="text-2xl font-bold text-primary">{quantity} جرام</span>
            </div>
            <Slider
              value={[quantity]}
              onValueChange={(v) => setQuantity(v[0])}
              min={10}
              max={500}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground text-center">
              الحصة المقترحة: {food.serving_description} ({food.serving_size_g} جرام)
            </p>
          </div>

          {/* Calculated Nutrition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
              <Flame className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{calories}</p>
              <p className="text-xs text-muted-foreground">سعرة حرارية</p>
            </div>
            <div className="p-4 rounded-xl bg-orange/10 text-center">
              <Beef className="w-6 h-6 mx-auto mb-2 text-orange" />
              <p className="text-2xl font-bold text-foreground">{macros.protein}g</p>
              <p className="text-xs text-muted-foreground">بروتين</p>
            </div>
            <div className="p-4 rounded-xl bg-accent/10 text-center">
              <Wheat className="w-6 h-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold text-foreground">{macros.carbs}g</p>
              <p className="text-xs text-muted-foreground">كربوهيدرات</p>
            </div>
            <div className="p-4 rounded-xl bg-purple/10 text-center">
              <Droplet className="w-6 h-6 mx-auto mb-2 text-purple" />
              <p className="text-2xl font-bold text-foreground">{macros.fat}g</p>
              <p className="text-xs text-muted-foreground">دهون</p>
            </div>
          </div>

          {/* Meal Selection */}
          <div className="space-y-3">
            <span className="text-sm font-medium">أضف إلى وجبة</span>
            <div className="grid grid-cols-4 gap-2">
              {mealTypes.map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal.id)}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                    selectedMeal === meal.id 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-xl">{meal.icon}</span>
                  <span className="text-xs">{meal.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full bg-gradient-primary shadow-glow gap-2">
            <Plus className="w-5 h-5" />
            أضف {calories} سعرة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FoodCard;
