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
import PreOnboardingPage from "./pages/PreOnboardingPage";
import SignInPage from "./pages/SignInPage";
import OnboardingPage from "./pages/OnboardingPage";
import GoogleOnboardingPage from "./pages/GoogleOnboardingPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import ExercisesPage from "./userPages/ExercisesPage";
import NutritionPage from "./userPages/NutritionPage";
import WorkoutsPage from "./userPages/WorkoutsPage";
import InBodyPage from "./userPages/InBodyPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ClientsPage from "./coachPages/clients";
import EarningsPage from "./coachPages/earnings";
import PlansPage from "./coachPages/plans";
import PostsPage from "./pages/posts";
import UserProfilePage from "./pages/UserProfile";
import CoachProfilePage from "./pages/CoachProfile";
import ChatPage from "./pages/ChatPage";
import ChatNotificationsListener from "./components/chat/ChatNotificationsListener";

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
 * يمنع الوصول للمسارات إلا إذا كان المستخدم مسجل دخول
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * 2) PublicRoute:
 * يمنع الوصول لمسارات auth إذا كان المستخدم مسجل دخول بالفعل
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/**
 * Gate to enforce onboarding completion if needed
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, gender, age, height_cm, weight_kg, activity_level, goal, daily_calories")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setNeedsOnboarding(true);
        return;
      }

      // if profile row missing or required fields missing -> onboarding
      if (!data) {
        setNeedsOnboarding(true);
        return;
      }

      const ok =
        data.gender &&
        data.age &&
        data.height_cm &&
        data.weight_kg &&
        data.activity_level &&
        data.goal &&
        data.daily_calories;

      setNeedsOnboarding(!ok);
    };

    run();
  }, [user?.id]);

  if (loading || needsOnboarding === null) return <FullPageLoader />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

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
        path="/pre-onboarding"
        element={
          <PublicRoute>
            <PreOnboardingPage />
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

      {/**shared  */}
        <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <PostsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      {/* Protected Routes */}
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
        path="/chat"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ChatPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ChatPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/userProfile/:id"
        element={
          <ProtectedRoute>
             <OnboardingGate>
              <UserProfilePage  />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/coachProfile/:id"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <CoachProfilePage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/exercises"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ExercisesPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/nutrition"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <NutritionPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/workouts"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <WorkoutsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />

      <Route
        path="/inbody"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <InBodyPage />
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
        path="/ai-assistant"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <AIAssistantPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
  
      {/* Coach Routes */}
      <Route
        path="/coach/clients"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ClientsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach/earnings"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <EarningsPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/coach/plans"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <PlansPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
    

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ChatNotificationsListener />
            <AppRoutes />
          </BrowserRouter>

          <Toaster />
          <Sonner />
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
