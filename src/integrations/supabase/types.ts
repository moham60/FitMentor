export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      body_measurements: {
        Row: {
          bmi: number | null;
          bmr: number | null;
          body_fat_percentage: number | null;
          bone_mass_kg: number | null;
          created_at: string;
          id: string;
          measurement_date: string;
          muscle_mass_kg: number | null;
          user_id: string;
          water_percentage: number | null;
          weight_kg: number | null;
        };
        Insert: {
          bmi?: number | null;
          bmr?: number | null;
          body_fat_percentage?: number | null;
          bone_mass_kg?: number | null;
          created_at?: string;
          id?: string;
          measurement_date?: string;
          muscle_mass_kg?: number | null;
          user_id: string;
          water_percentage?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          bmi?: number | null;
          bmr?: number | null;
          body_fat_percentage?: number | null;
          bone_mass_kg?: number | null;
          created_at?: string;
          id?: string;
          measurement_date?: string;
          muscle_mass_kg?: number | null;
          user_id?: string;
          water_percentage?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };

      inbody_results: {
        Row: {
          created_at: string;
          id: string;
          raw_path: string;
          result: {
            weight_kg: number;
            pbf_percent: number;
            smm_kg: number;
            height_cm: number;
            bmi: number;
            bmr_kcal: number;
            inbody_score: number;
            tbw_l: number;
            protein_kg: number;
            minerals_kg: number;
            bfm_kg: number;
            lean_ra_kg: number;
            lean_la_kg: number;
            lean_trunk_kg: number;
            lean_rl_kg: number;
            lean_ll_kg: number;
            fat_ra_kg: number;
            fat_la_kg: number;
            fat_trunk_kg: number;
            fat_rl_kg: number;
            fat_ll_kg: number;
            whr: number;
            vfl: number;
            test_date: string | null;
          };
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          raw_path: string;
          result: {
            weight_kg: number;
            pbf_percent: number;
            smm_kg: number;
            height_cm: number;
            bmi: number;
            bmr_kcal: number;
            inbody_score: number;
            tbw_l: number;
            protein_kg: number;
            minerals_kg: number;
            bfm_kg: number;
            lean_ra_kg: number;
            lean_la_kg: number;
            lean_trunk_kg: number;
            lean_rl_kg: number;
            lean_ll_kg: number;
            fat_ra_kg: number;
            fat_la_kg: number;
            fat_trunk_kg: number;
            fat_rl_kg: number;
            fat_ll_kg: number;
            whr: number;
            vfl: number;
            test_date: string | null;
          };
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          raw_path?: string;
          result?: {
            weight_kg: number;
            pbf_percent: number;
            smm_kg: number;
            height_cm: number;
            bmi: number;
            bmr_kcal: number;
            inbody_score: number;
            tbw_l: number;
            protein_kg: number;
            minerals_kg: number;
            bfm_kg: number;
            lean_ra_kg: number;
            lean_la_kg: number;
            lean_trunk_kg: number;
            lean_rl_kg: number;
            lean_ll_kg: number;
            fat_ra_kg: number;
            fat_la_kg: number;
            fat_trunk_kg: number;
            fat_rl_kg: number;
            fat_ll_kg: number;
            whr: number;
            vfl: number;
            test_date: string | null;
          };
          user_id?: string | null;
        };
        Relationships: [];
      };

      exercise_library: {
        Row: {
          calories_per_minute: number | null;
          created_at: string;
          difficulty: string;
          equipment: string;
          id: string;
          image_url: string | null;
          instructions_ar: string | null;
          instructions_en: string | null;
          muscle_group: string;
          name_ar: string;
          name_en: string;
          secondary_muscles: string[] | null;
          tips_ar: string | null;
          tips_en: string | null;
          video_url: string | null;
        };
        Insert: {
          calories_per_minute?: number | null;
          created_at?: string;
          difficulty: string;
          equipment: string;
          id?: string;
          image_url?: string | null;
          instructions_ar?: string | null;
          instructions_en?: string | null;
          muscle_group: string;
          name_ar: string;
          name_en: string;
          secondary_muscles?: string[] | null;
          tips_ar?: string | null;
          tips_en?: string | null;
          video_url?: string | null;
        };
        Update: {
          calories_per_minute?: number | null;
          created_at?: string;
          difficulty?: string;
          equipment?: string;
          id?: string;
          image_url?: string | null;
          instructions_ar?: string | null;
          instructions_en?: string | null;
          muscle_group?: string;
          name_ar?: string;
          name_en?: string;
          secondary_muscles?: string[] | null;
          tips_ar?: string | null;
          tips_en?: string | null;
          video_url?: string | null;
        };
        Relationships: [];
      };

      exercises: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          reps: number | null;
          sets: number | null;
          user_id: string;
          weight_kg: number | null;
          workout_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          reps?: number | null;
          sets?: number | null;
          user_id: string;
          weight_kg?: number | null;
          workout_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          reps?: number | null;
          sets?: number | null;
          user_id?: string;
          weight_kg?: number | null;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          }
        ];
      };

      food_items: {
        Row: {
          calories_per_100g: number;
          carbs_per_100g: number | null;
          category: string;
          created_at: string;
          fat_per_100g: number | null;
          fiber_per_100g: number | null;
          food_type: string;
          id: string;
          image_url: string | null;
          is_popular: boolean | null;
          name_ar: string;
          name_en: string;
          protein_per_100g: number | null;
          serving_description: string | null;
          serving_size_g: number | null;
        };
        Insert: {
          calories_per_100g: number;
          carbs_per_100g?: number | null;
          category: string;
          created_at?: string;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          food_type: string;
          id?: string;
          image_url?: string | null;
          is_popular?: boolean | null;
          name_ar: string;
          name_en: string;
          protein_per_100g?: number | null;
          serving_description?: string | null;
          serving_size_g?: number | null;
        };
        Update: {
          calories_per_100g?: number;
          carbs_per_100g?: number | null;
          category?: string;
          created_at?: string;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          food_type?: string;
          id?: string;
          image_url?: string | null;
          is_popular?: boolean | null;
          name_ar?: string;
          name_en?: string;
          protein_per_100g?: number | null;
          serving_description?: string | null;
          serving_size_g?: number | null;
        };
        Relationships: [];
      };

      meals: {
        Row: {
          calories: number;
          carbs_g: number | null;
          created_at: string;
          fat_g: number | null;
          fiber_g: number | null;
          id: string;
          meal_date: string;
          meal_type: string;
          name: string;
          protein_g: number | null;
          target_calories: number | null;
          user_id: string;
        };
        Insert: {
          calories?: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          fiber_g?: number | null;
          id?: string;
          meal_date?: string;
          meal_type: string;
          name: string;
          protein_g?: number | null;
          target_calories?: number | null;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number | null;
          created_at?: string;
          fat_g?: number | null;
          fiber_g?: number | null;
          id?: string;
          meal_date?: string;
          meal_type?: string;
          name?: string;
          protein_g?: number | null;
          target_calories?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          account_type: string | null;
          activity_level: string | null;
          age: number | null;
          avatar_url: string | null;
          created_at: string;
          daily_calories: number | null;
          full_name: string | null;
          gender: string | null;
          goal: string | null;
          height_cm: number | null;
          id: string;
          plan_id: string | null;
          plan_expires_at: string | null;
          plan_started_at: string | null;
          plan_status: string | null;
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          account_type?: string | null;
          activity_level?: string | null;
          age?: number | null;
          avatar_url?: string | null;
          created_at?: string;
          daily_calories?: number | null;
          full_name?: string | null;
          gender?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id?: string;
          plan_id?: string | null;
          plan_expires_at?: string | null;
          plan_started_at?: string | null;
          plan_status?: string | null;
          updated_at?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          account_type?: string | null;
          activity_level?: string | null;
          age?: number | null;
          avatar_url?: string | null;
          created_at?: string;
          daily_calories?: number | null;
          full_name?: string | null;
          gender?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id?: string;
          plan_id?: string | null;
          plan_expires_at?: string | null;
          plan_started_at?: string | null;
          plan_status?: string | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };

      posts: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          image_url: string | null;
          tags: string[] | null;
          updated_at: string;
          user_id: string;
          visibility: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          tags?: string[] | null;
          updated_at?: string;
          user_id: string;
          visibility?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          tags?: string[] | null;
          updated_at?: string;
          user_id?: string;
          visibility?: string;
        };
        Relationships: [];
      };

      user_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
        };
        Relationships: [];
      };

      post_comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          }
        ];
      };

      post_likes: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          }
        ];
      };

      user_meal_plans: {
        Row: {
          created_at: string;
          id: string;
          meals_count: number | null;
          plan_date: string;
          target_calories: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          meals_count?: number | null;
          plan_date?: string;
          target_calories: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          meals_count?: number | null;
          plan_date?: string;
          target_calories?: number;
          user_id?: string;
        };
        Relationships: [];
      };

      user_meal_items: {
        Row: {
          created_at: string;
          food_item_id: string;
          id: string;
          meal_plan_id: string;
          meal_type: string;
          quantity_g: number;
        };
        Insert: {
          created_at?: string;
          food_item_id: string;
          id?: string;
          meal_plan_id: string;
          meal_type: string;
          quantity_g?: number;
        };
        Update: {
          created_at?: string;
          food_item_id?: string;
          id?: string;
          meal_plan_id?: string;
          meal_type?: string;
          quantity_g?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_meal_items_food_item_id_fkey";
            columns: ["food_item_id"];
            isOneToOne: false;
            referencedRelation: "food_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_meal_items_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "user_meal_plans";
            referencedColumns: ["id"];
          }
        ];
      };

      user_meal_checkins: {
        Row: {
          checked_at: string;
          id: string;
          meal_plan_id: string;
          meal_type: string;
        };
        Insert: {
          checked_at?: string;
          id?: string;
          meal_plan_id: string;
          meal_type: string;
        };
        Update: {
          checked_at?: string;
          id?: string;
          meal_plan_id?: string;
          meal_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_meal_checkins_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "user_meal_plans";
            referencedColumns: ["id"];
          }
        ];
      };
    };

    // ✅ أهم جزء هنا: تعريف الـ Views اللي هتستخدمها صفحة البوست
    Views: {
      posts_with_author: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          image_url: string | null;
          visibility: string;
          tags: string[] | null;
          created_at: string;
          author_full_name: string | null;
          author_avatar_url: string | null;
        };
        Relationships: [];
      };

      post_likes_with_user: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
          user_full_name: string | null;
          user_avatar_url: string | null;
        };
        Relationships: [];
      };

      post_comments_with_user: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
          user_full_name: string | null;
          user_avatar_url: string | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      get_follow_counts: {
        Args: {
          target_user_id: string;
        };
        Returns: {
          followers_count: number;
          following_count: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
    ? U
    : never
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
