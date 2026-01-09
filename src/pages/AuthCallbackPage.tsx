import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isNewUser } = useAuth();

  React.useEffect(() => {
    const run = async () => {
      // تأكد session اتعملت بعد الرجوع من جوجل
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        navigate("/signin", { replace: true });
        return;
      }

      const uid = session.user.id;

      // ✅ لو أول مرة (لسه ناقص الاسم/نوع الحساب) -> GoogleOnboarding
      const newUser = await isNewUser(uid);
      if (newUser) {
        navigate("/google-onboarding", { replace: true });
        return;
      }

      // ✅ لو مش جديد -> دخله عادي
      navigate("/dashboard", { replace: true });
    };

    run();
  }, [navigate, isNewUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in...</p>
    </div>
  );
}
