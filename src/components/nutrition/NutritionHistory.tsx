import React, { useState } from 'react';
import { Calendar } from '../ui/calendar';
import { Card } from '../ui/card';
import { Target, Utensils, Loader2 } from 'lucide-react'; // تم حذف Flame
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNutritionHistory } from '@/hooks/useNutritionHistory';

const NutritionHistory = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // استدعاء الهوك الجديد لجلب البيانات الحقيقية من الداتابيز تلقائياً للمستخدم الحالي
  const { history, loading, error } = useNutritionHistory();
  
  const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
  const dayData = dateStr ? history[dateStr] : null;

  // إعدادات وتعديلات الألوان للأيام في الكاليندر بناءً على حالة الهدف
  const modifiers = {
    goalReached: (d: Date) => {
      const str = format(d, 'yyyy-MM-dd');
      return history[str]?.goalReached === true;
    },
    goalMissed: (d: Date) => {
      const str = format(d, 'yyyy-MM-dd');
      return history[str]?.goalReached === false;
    }
  };

  const modifiersStyles = {
    goalReached: {
      color: 'hsl(var(--primary))',
      fontWeight: 'bold',
      borderBottom: '2px solid hsl(var(--primary))'
    },
    goalMissed: {
      color: 'hsl(var(--destructive))',
      fontWeight: 'bold',
      borderBottom: '2px solid hsl(var(--destructive))'
    }
  };

  // 1. حالة التحميل: تظهر أثناء جلب السجل من Supabase
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">جاري تحميل السجل الغذائي...</p>
      </div>
    );
  }

  // 2. حالة الخطأ: تظهر إذا حدثت مشكلة في الاتصال بالشبكة أو السيرفر
  if (error) {
    return (
      <div className="text-center py-12 text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
        <p className="font-medium">حدث خطأ أثناء تحميل البيانات: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Monthly Tracker Calendar */}
      <Card className="p-4 bg-gradient-card border-border/50">
        <h2 className="text-lg font-display font-bold mb-4 text-center">Monthly Tracker</h2>
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border bg-card/50"
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
          />
        </div>
        <div className="flex justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Goal Reached</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Goal Missed</span>
          </div>
        </div>
      </Card>

      {/* تفاصيل اليوم المختار */}
      {dayData ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-semibold text-lg flex items-center justify-between">
            <span>{format(date!, 'MMMM d, yyyy')}</span>
            {dayData.goalReached ? (
              <span className="text-sm px-2 py-1 bg-primary/20 text-primary rounded-full">Success 🎉</span>
            ) : (
              <span className="text-sm px-2 py-1 bg-destructive/20 text-destructive rounded-full">Missed</span>
            )}
          </h3>

          <div className="flex justify-center">
            {/* السعرات المستهلكة الفعليه - تم توسيطها وجعلها أكبر */}
            <Card className="p-6 bg-secondary/50 border-border/50 w-full flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Utensils className="w-5 h-5" />
                <span className="text-base font-medium">Consumed Calories</span>
              </div>
              <p className="text-4xl font-bold font-display text-primary">
                {dayData.consumed} <span className="text-lg font-normal text-muted-foreground">kcal</span>
              </p>
            </Card>
          </div>

          {/* البار الخاص بالتقدم والهدف اليومي */}
          <Card className="p-4 bg-gradient-card border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Daily Target</span>
              </div>
              <span className="font-medium">{dayData.target} kcal</span>
            </div>
            
            <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden mt-3">
              <div 
                className={cn(
                  "absolute top-0 left-0 h-full transition-all duration-500",
                  dayData.goalReached ? "bg-primary" : "bg-destructive"
                )}
                style={{ width: `${Math.min((dayData.consumed / dayData.target) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-center mt-3 text-muted-foreground">
              {dayData.goalReached 
                ? `${dayData.target - dayData.consumed} kcal under limit`
                : `${dayData.consumed - dayData.target} kcal over limit`}
            </p>
          </Card>
        </div>
      ) : (
        /* في حال لم يقم المستخدم بأي تسجيل أو لم يتناول وجبات في التاريخ المحدد */
        <Card className="p-6 text-center border-border/50 bg-card/30 rounded-2xl">
          <p className="text-sm text-muted-foreground">لا توجد أي وجبات حقيقية مسجلة أو Check-ins لهذا اليوم.</p>
        </Card>
      )}
    </div>
  );
};

export default NutritionHistory;