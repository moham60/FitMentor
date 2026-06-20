import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// 1. تعريف واجهة (Interface) تخبر TypeScript بشكل البيانات القادمة من الداتابيز
interface DailyNutritionData {
  user_id: string;
  plan_date: string;
  target_calories: number;
  consumed_calories: number;
}

export const useNutritionHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) {
        setHistory({});
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 2. استخدام "as any" لتخطي خطأ اسم الجدول
        // واستخدام "returns" لتعريف الأعمدة (خصائص البيانات)
        const { data, error: fetchError } = await supabase
          .from('daily_nutrition_history' as any)
          .select('*')
          .eq('user_id', user.id)
          .returns<DailyNutritionData[]>();

        if (fetchError) throw fetchError;

        if (data) {
          const historyMap: Record<string, any> = {};
          data.forEach((day) => {
            const consumed = Math.round(day.consumed_calories);
            historyMap[day.plan_date] = {
              target: day.target_calories,
              consumed: consumed,
              burned: 0,
              goalReached: consumed <= day.target_calories && consumed > 0,
            };
          });
          setHistory(historyMap);
        }
      } catch (err: any) {
        console.error("[useNutritionHistory] Error:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id]);

  return { history, loading, error };
};