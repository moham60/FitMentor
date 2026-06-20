import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export const useMealTracker = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const logMealCheckIn = async (mealType: string, targetCalories: number = 2000) => {
    if (!user?.id) {
      console.error("المستخدم غير مسجل الدخول");
      return { success: false, error: 'User not authenticated' };
    }

    setIsSaving(true);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // 1. تقنية Upsert: إنشاء خطة اليوم أو إرجاعها إذا كانت موجودة لمنع الخطأ
      const { data: planData, error: planError } = await supabase
        .from('user_meal_plans')
        .upsert(
          {
            user_id: user.id,
            plan_date: today,
            target_calories: targetCalories,
          },
          { 
            onConflict: 'user_id,plan_date' 
          }
        )
        .select()
        .single();

      if (planError) throw planError;

      // 2. إضافة الـ Check-in للوجبة المحددة
      const { error: checkinError } = await supabase
        .from('user_meal_checkins')
        .insert({
          meal_plan_id: planData.id,
          meal_type: mealType,
        });

      if (checkinError) throw checkinError;

      return { success: true };
      
    } catch (error: any) {
      console.error('[useMealTracker] Error logging meal:', error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSaving(false);
    }
  };

  return { logMealCheckIn, isSaving };
};