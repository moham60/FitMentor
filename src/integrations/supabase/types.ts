export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      body_measurements: {
        Row: {
          bmi: number | null
          bmr: number | null
          body_fat_percentage: number | null
          bone_mass_kg: number | null
          created_at: string
          id: string
          measurement_date: string
          muscle_mass_kg: number | null
          user_id: string
          water_percentage: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bmr?: number | null
          body_fat_percentage?: number | null
          bone_mass_kg?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          muscle_mass_kg?: number | null
          user_id: string
          water_percentage?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bmr?: number | null
          body_fat_percentage?: number | null
          bone_mass_kg?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          muscle_mass_kg?: number | null
          user_id?: string
          water_percentage?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      exercise_library: {
        Row: {
          calories_per_minute: number | null
          created_at: string
          difficulty: string
          equipment: string
          id: string
          image_url: string | null
          instructions_ar: string | null
          instructions_en: string | null
          muscle_group: string
          name_ar: string
          name_en: string
          secondary_muscles: string[] | null
          tips_ar: string | null
          tips_en: string | null
          video_url: string | null
        }
        Insert: {
          calories_per_minute?: number | null
          created_at?: string
          difficulty: string
          equipment: string
          id?: string
          image_url?: string | null
          instructions_ar?: string | null
          instructions_en?: string | null
          muscle_group: string
          name_ar: string
          name_en: string
          secondary_muscles?: string[] | null
          tips_ar?: string | null
          tips_en?: string | null
          video_url?: string | null
        }
        Update: {
          calories_per_minute?: number | null
          created_at?: string
          difficulty?: string
          equipment?: string
          id?: string
          image_url?: string | null
          instructions_ar?: string | null
          instructions_en?: string | null
          muscle_group?: string
          name_ar?: string
          name_en?: string
          secondary_muscles?: string[] | null
          tips_ar?: string | null
          tips_en?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          reps: number | null
          sets: number | null
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          reps?: number | null
          sets?: number | null
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          reps?: number | null
          sets?: number | null
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          calories_per_100g: number
          carbs_per_100g: number | null
          category: string
          created_at: string
          fat_per_100g: number | null
          fiber_per_100g: number | null
          food_type: string
          id: string
          image_url: string | null
          is_popular: boolean | null
          name_ar: string
          name_en: string
          protein_per_100g: number | null
          serving_description: string | null
          serving_size_g: number | null
        }
        Insert: {
          calories_per_100g: number
          carbs_per_100g?: number | null
          category: string
          created_at?: string
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          food_type: string
          id?: string
          image_url?: string | null
          is_popular?: boolean | null
          name_ar: string
          name_en: string
          protein_per_100g?: number | null
          serving_description?: string | null
          serving_size_g?: number | null
        }
        Update: {
          calories_per_100g?: number
          carbs_per_100g?: number | null
          category?: string
          created_at?: string
          fat_per_100g?: number | null
          fiber_per_100g?: number | null
          food_type?: string
          id?: string
          image_url?: string | null
          is_popular?: boolean | null
          name_ar?: string
          name_en?: string
          protein_per_100g?: number | null
          serving_description?: string | null
          serving_size_g?: number | null
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          id: string
          meal_date: string
          meal_type: string
          name: string
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          meal_date?: string
          meal_type: string
          name: string
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          meal_date?: string
          meal_type?: string
          name?: string
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          activity_level: string | null
          age: number | null
          avatar_url: string | null
          created_at: string
          daily_calories: number | null
          full_name: string | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          account_type?: string | null
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          daily_calories?: number | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          account_type?: string | null
          activity_level?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string
          daily_calories?: number | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_exercise_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_completed: boolean | null
          is_warmup: boolean | null
          reps_completed: number | null
          session_id: string
          set_number: number
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          is_completed?: boolean | null
          is_warmup?: boolean | null
          reps_completed?: number | null
          session_id: string
          set_number: number
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_completed?: boolean | null
          is_warmup?: boolean | null
          reps_completed?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_exercise_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_meal_items: {
        Row: {
          created_at: string
          food_item_id: string
          id: string
          meal_plan_id: string
          meal_type: string
          quantity_g: number
        }
        Insert: {
          created_at?: string
          food_item_id: string
          id?: string
          meal_plan_id: string
          meal_type: string
          quantity_g?: number
        }
        Update: {
          created_at?: string
          food_item_id?: string
          id?: string
          meal_plan_id?: string
          meal_type?: string
          quantity_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_meal_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_meal_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "user_meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_meal_plans: {
        Row: {
          created_at: string
          id: string
          meals_count: number | null
          plan_date: string
          target_calories: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meals_count?: number | null
          plan_date?: string
          target_calories: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meals_count?: number | null
          plan_date?: string
          target_calories?: number
          user_id?: string
        }
        Relationships: []
      }
      user_workout_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          notes: string | null
          plan_day_id: string | null
          session_date: string
          start_time: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          plan_day_id?: string | null
          session_date?: string
          start_time?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          plan_day_id?: string | null
          session_date?: string
          start_time?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_sessions_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_plan_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          muscle_groups: string[] | null
          name_ar: string
          name_en: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          muscle_groups?: string[] | null
          name_ar: string
          name_en: string
          plan_id: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          muscle_groups?: string[] | null
          name_ar?: string
          name_en?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plan_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_index: number
          plan_day_id: string
          reps: string
          rest_seconds: number | null
          sets: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index: number
          plan_day_id: string
          reps?: string
          rest_seconds?: number | null
          sets?: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          plan_day_id?: string
          reps?: string
          rest_seconds?: number | null
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_plan_exercises_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "workout_plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          days_per_week: number | null
          description_ar: string | null
          description_en: string | null
          difficulty: string
          duration_weeks: number | null
          goal: string
          id: string
          image_url: string | null
          is_premium: boolean | null
          name_ar: string
          name_en: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number | null
          description_ar?: string | null
          description_en?: string | null
          difficulty: string
          duration_weeks?: number | null
          goal: string
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          name_ar: string
          name_en: string
        }
        Update: {
          created_at?: string
          days_per_week?: number | null
          description_ar?: string | null
          description_en?: string | null
          difficulty?: string
          duration_weeks?: number | null
          goal?: string
          id?: string
          image_url?: string | null
          is_premium?: boolean | null
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories_burned: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          name: string
          notes: string | null
          user_id: string
          workout_date: string
          workout_type: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name: string
          notes?: string | null
          user_id: string
          workout_date?: string
          workout_type: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
          workout_date?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
