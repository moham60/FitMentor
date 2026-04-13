import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client"; // عدّل المسار حسب مشروعك
import { useAuth } from "@/contexts/AuthContext";

type Profile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;
  daily_calories: number | null;
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        setProfile(null);
        setLoading(false);
        fetchedRef.current = false;
        return;
      }

      // Skip if already fetched for this user
      if (fetchedRef.current) {
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!error) {
        setProfile(data as Profile);
        fetchedRef.current = true;
      }
      setLoading(false);
    };

    run();
  }, [user?.id]);

  return { profile, loading };
}
