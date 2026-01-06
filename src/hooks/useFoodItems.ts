import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FoodItem {
  id: string;
  name_ar: string;
  name_en: string;
  category: string;
  food_type: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  serving_size_g: number;
  serving_description: string;
  image_url: string | null;
  is_popular: boolean;
}

export const useFoodItems = (category?: string, searchQuery?: string) => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFoods = async () => {
      setLoading(true);
      try {
        let query = supabase.from('food_items').select('*');
        
        if (category && category !== 'all') {
          query = query.eq('food_type', category);
        }
        
        if (searchQuery && searchQuery.trim()) {
          query = query.or(`name_ar.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%`);
        }

        const { data, error: fetchError } = await query.order('is_popular', { ascending: false });

        if (fetchError) throw fetchError;
        setFoods(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, [category, searchQuery]);

  return { foods, loading, error };
};

export const usePopularFoods = () => {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularFoods = async () => {
      const { data } = await supabase
        .from('food_items')
        .select('*')
        .eq('is_popular', true)
        .limit(12);
      
      setFoods(data || []);
      setLoading(false);
    };

    fetchPopularFoods();
  }, []);

  return { foods, loading };
};

export const getFoodCategories = () => [
  { id: 'all', name_ar: 'الكل', name_en: 'All', icon: '🍽️' },
  { id: 'egyptian', name_ar: 'مصري', name_en: 'Egyptian', icon: '🇪🇬' },
  { id: 'healthy', name_ar: 'صحي', name_en: 'Healthy', icon: '🥗' },
  { id: 'protein', name_ar: 'بروتين', name_en: 'Protein', icon: '🥩' },
  { id: 'carbs', name_ar: 'كربوهيدرات', name_en: 'Carbs', icon: '🍚' },
  { id: 'fruits', name_ar: 'فواكه', name_en: 'Fruits', icon: '🍎' },
  { id: 'vegetables', name_ar: 'خضار', name_en: 'Vegetables', icon: '🥦' },
  { id: 'dairy', name_ar: 'ألبان', name_en: 'Dairy', icon: '🥛' },
  { id: 'sweets', name_ar: 'حلويات', name_en: 'Sweets', icon: '🍰' },
  { id: 'drinks', name_ar: 'مشروبات', name_en: 'Drinks', icon: '🥤' },
];

export const calculateCalories = (food: FoodItem, quantity: number) => {
  return Math.round((food.calories_per_100g * quantity) / 100);
};

export const calculateMacros = (food: FoodItem, quantity: number) => {
  const factor = quantity / 100;
  return {
    protein: Math.round(Number(food.protein_per_100g) * factor * 10) / 10,
    carbs: Math.round(Number(food.carbs_per_100g) * factor * 10) / 10,
    fat: Math.round(Number(food.fat_per_100g) * factor * 10) / 10,
    fiber: Math.round(Number(food.fiber_per_100g) * factor * 10) / 10,
  };
};
