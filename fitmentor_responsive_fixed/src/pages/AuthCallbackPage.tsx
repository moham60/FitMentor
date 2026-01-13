import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isNewUser } = useAuth();

  React.useEffect(() => {
    const run = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        navigate("/signin", { replace: true });
        return;
      }

      const user = session.user;

      // ✅ If user completed pre-onboarding BEFORE sign-up, sync metadata -> profiles after verification/login.
      if ((user.user_metadata as any)?.onboarding_completed) {
        const m = (user.user_metadata ?? {}) as Record<string, any>;

        const payload = {
          user_id: user.id,
          full_name: m.full_name ?? null,
          account_type: m.account_type ?? null,
          gender: m.gender ?? null,
          age: m.age ?? null,
          height_cm: m.height_cm ?? null,
          weight_kg: m.weight_kg ?? null,
          activity_level: m.activity_level ?? null,
          goal: m.goal ?? null,
          bmr: m.bmr ?? null,
          tdee: m.tdee ?? null,
          calories_maintain: m.calories_maintain ?? null,
          calories_mild_loss: m.calories_mild_loss ?? null,
          calories_loss: m.calories_loss ?? null,
          calories_extreme_loss: m.calories_extreme_loss ?? null,
          calories_gain: m.calories_gain ?? null,
          daily_calories: m.daily_calories ?? null,
          updated_at: new Date().toISOString(),
        };

        try {
          await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
        } catch {
          // Best-effort: ignore schema mismatch errors
        }

        navigate("/dashboard", { replace: true });
        return;
      }

      // ✅ Existing flow: for Google OAuth, route to google-onboarding if missing name/type in profiles
      const newUser = await isNewUser(user.id);
      if (newUser) {
        navigate("/google-onboarding", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    run();
  }, [navigate, isNewUser]);

  return (
    <div className="min-min-h-[100dvh] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}
