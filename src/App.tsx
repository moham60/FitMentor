import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Pages
import WelcomePage from "./pages/WelcomePage";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import OnboardingPage from "./pages/OnboardingPage";
import GoogleOnboardingPage from "./pages/GoogleOnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import NutritionPage from "./userPages/NutritionPage";
import WorkoutsPage from "./userPages/WorkoutsPage";
import InBodyPage from "./userPages/InBodyPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ExercisesPage from "./userPages/ExercisesPage";
import GoalsPage from "./pages/GoalsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Posts from "./coachPages/posts";
import Clients from "./coachPages/clients";
import Plans from "./coachPages/plans";
import Earnings from "./coachPages/earnings";

// ✅ NEW: Auth Callback Page
import AuthCallbackPage from "./pages/AuthCallbackPage"; // عدّل المسار لو مختلف

// Types
import { UserRole } from "./types/user";

const queryClient = new QueryClient();

/**
 * Loader UI
 */
const FullPageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
  </div>
);

/**
 * 1) ProtectedRoute:
 * يمنع الوصول للمسارات إلا إذا كان المستخدم مسجل دخول.
 * يدعم أيضا التحقق من نوع الحساب (coach أو user).
 */
const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: UserRole }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  if (!user) return <Navigate to="/" replace />;

  const userAccountType = user?.user_metadata?.account_type || "user";
  if (role && userAccountType !== role) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

/**
 * 2) OnboardingGate:
 * - لو Google user ولسه الاسم/نوع الحساب مش متسجلين في profiles -> /google-onboarding
 * - لو بيانات fitness ناقصة -> /onboarding
 * - غير كده يسمح بدخول الصفحة
 *
 * IMPORTANT: هذا الجارد يستخدم فقط للصفحات "بعد تسجيل الدخول" مثل dashboard وباقي الصفحات،
 * ولا يستخدم لصفحة /google-onboarding أو /onboarding نفسها.
 */
const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"loading" | "google-setup" | "incomplete" | "complete">("loading");

  const isGoogleUser = useMemo(() => user?.app_metadata?.provider === "google", [user?.app_metadata?.provider]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        // لو مش مسجل دخول، الجارد ده مش المفروض يشتغل أصلاً (ProtectedRoute هيمنع)
        setStatus("complete");
        return;
      }

      setStatus("loading");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, account_type, daily_calories")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // لو حصل مشكلة في القراءة، الأفضل ما نحبسش المستخدم في لوب
        console.error("OnboardingGate profiles read error:", error);
        setStatus("complete");
        return;
      }

      const hasFullName = !!data?.full_name;
      const hasAccountType = !!data?.account_type;

      // ✅ أول مرة فقط لجوجل: لو الاسم/النوع ناقصين
      if (isGoogleUser && (!hasFullName || !hasAccountType)) {
        setStatus("google-setup");
        return;
      }

      // ✅ لو بيانات fitness ناقصة (مثلاً daily_calories مش متسجل)
      if (!data?.daily_calories || !hasAccountType) {
        setStatus("incomplete");
        return;
      }

      setStatus("complete");
    };

    run();
  }, [user?.id, isGoogleUser]);

  if (loading || status === "loading") return <FullPageLoader />;

  if (status === "google-setup") return <Navigate to="/google-onboarding" replace />;

  if (status === "incomplete") return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
};

/**
 * 3) PublicRoute:
 * صفحات public (Welcome/Login/Signup)
 * لو المستخدم مسجل دخول بالفعل -> يروح dashboard (والجارد هناك هيتولى موضوع onboarding)
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* ✅ OAuth Callback Route */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Public Routes */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <WelcomePage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUpPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signin"
        element={
          <PublicRoute>
            <SignInPage />
          </PublicRoute>
        }
      />

      {/* Google OAuth Onboarding - for setting name and account type */}
      <Route
        path="/google-onboarding"
        element={
          <ProtectedRoute>
            <GoogleOnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Onboarding - for fitness information */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Shared Protected Routes (with onboarding gate) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <DashboardPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <AIAssistantPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <GoalsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ProfilePage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <SettingsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      {/* User Specific Routes */}
      <Route
        path="/Exercises"
        element={
          <ProtectedRoute role="user">
            <OnboardingGate>
              <ExercisesPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nutrition"
        element={
          <ProtectedRoute role="user">
            <OnboardingGate>
              <NutritionPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workouts"
        element={
          <ProtectedRoute role="user">
            <OnboardingGate>
              <WorkoutsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbody"
        element={
          <ProtectedRoute role="user">
            <OnboardingGate>
              <InBodyPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      {/* Coach Specific Routes */}
      <Route
        path="/Plans"
        element={
          <ProtectedRoute role="coach">
            <OnboardingGate>
              <Plans />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Clients"
        element={
          <ProtectedRoute role="coach">
            <OnboardingGate>
              <Clients />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Earnings"
        element={
          <ProtectedRoute role="coach">
            <OnboardingGate>
              <Earnings />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/Posts"
        element={
          <ProtectedRoute role="coach">
            <OnboardingGate>
              <Posts />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      {/* 404 Page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
