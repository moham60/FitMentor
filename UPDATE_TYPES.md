# تحديث Supabase Types

## المشكلة
الأخطاء الظاهرة في ملف `plans.tsx` هي أخطاء TypeScript فقط، لأن الجداول الجديدة (`coach_plans` و `plan_muscles`) غير موجودة في ملف الـ types.

## الحل

### الطريقة 1: تحديث Types تلقائياً
بعد تطبيق الـ Migration، قم بتشغيل:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

أو إذا كنت تستخدم Supabase Cloud:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### الطريقة 2: التحديث اليدوي
أضف الـ types التالية إلى `src/types/supabase.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      // ... الجداول الموجودة
      coach_plans: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          type: 'basic' | 'gold' | 'premium';
          description: string | null;
          price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          name: string;
          type: 'basic' | 'gold' | 'premium';
          description?: string | null;
          price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          name?: string;
          type?: 'basic' | 'gold' | 'premium';
          description?: string | null;
          price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      plan_muscles: {
        Row: {
          id: string;
          plan_id: string;
          muscle_id: string;
          muscle_name: string;
          exercise_count: number;
          sets: number;
          reps: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          muscle_id: string;
          muscle_name: string;
          exercise_count?: number;
          sets?: number;
          reps?: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          muscle_id?: string;
          muscle_name?: string;
          exercise_count?: number;
          sets?: number;
          reps?: string;
          order_index?: number;
          created_at?: string;
        };
      };
    };
  };
}
```

## ملاحظة
الكود يعمل بشكل طبيعي حالياً باستخدام `@ts-ignore`. الأخطاء هي فقط تحذيرات TypeScript ولا تؤثر على عمل التطبيق.
