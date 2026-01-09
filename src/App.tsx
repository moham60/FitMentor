import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useState, useEffect } from "react";
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

// Types
import { UserRole } from "./types/user";

const queryClient = new QueryClient();

/**
 * 1. Protected Route:
 * تمنع الوصول للمسارات إلا إذا كان المستخدم مسجل دخول.
 * تدعم أيضاً التحقق من نوع الحساب (coach أو user).
 */
const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: UserRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم، اذهب لصفحة الترحيب
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // إذا تم تحديد دور (Role) وكان نوع حساب المستخدم لا يطابق هذا الدور
  // Ensure account_type defaults to 'user' if not set
  const userAccountType = user?.user_metadata?.account_type || 'user';
  if (role && userAccountType !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * 2. Public Route:
 * مخصصة لصفحات (Welcome, Login, Signup).
 * إذا كان المستخدم مسجلاً بالفعل، يتم توجيهه للـ Dashboard أو Onboarding بناءً على حالتهم.
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'google-setup' | 'incomplete' | 'complete' | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setOnboardingStatus(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('daily_calories, account_type, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setOnboardingStatus('complete'); // Assume complete if error
          return;
        }

        // Check if this is a new Google user (has user_metadata but no account_type in profile)
        const isGoogleUser = user.app_metadata?.provider === 'google';
        const hasAccountTypeInProfile = !!data?.account_type;
        const hasFullName = !!data?.full_name;

        if (isGoogleUser && (!hasAccountTypeInProfile || !hasFullName)) {
          // New Google user needs to set name and account type
          setOnboardingStatus('google-setup');
          return;
        }

        // Check if onboarding is complete (daily_calories is set and account_type exists)
        if (data?.daily_calories && data?.account_type) {
          setOnboardingStatus('complete');
        } else {
          setOnboardingStatus('incomplete');
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        setOnboardingStatus('complete');
      }
    };

    checkOnboardingStatus();
  }, [user?.id]);

  if (loading || onboardingStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If new Google user, redirect to Google onboarding
  if (onboardingStatus === 'google-setup') {
    return <Navigate to="/google-onboarding" replace />;
  }

  // If user hasn't completed onboarding, redirect them there
  if (onboardingStatus === 'incomplete') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user exists and has completed onboarding, redirect to dashboard
  if (user && onboardingStatus === 'complete') {
    return <Navigate to="/dashboard" replace />;
  }

  // If no user, show the public page
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><WelcomePage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
      <Route path="/signin" element={<PublicRoute><SignInPage /></PublicRoute>} />
      
      {/* Google OAuth Onboarding - for setting name and account type */}
      <Route path="/google-onboarding" element={<ProtectedRoute><GoogleOnboardingPage /></ProtectedRoute>} />

      {/* Onboarding - for fitness information */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      {/* Shared Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      {/* User Specific Routes */}
      <Route path="/Exercises" element={<ProtectedRoute role="user"><ExercisesPage /></ProtectedRoute>} />
      <Route path="/nutrition" element={<ProtectedRoute role="user"><NutritionPage /></ProtectedRoute>} />
      <Route path="/workouts" element={<ProtectedRoute role="user"><WorkoutsPage /></ProtectedRoute>} />
      <Route path="/inbody" element={<ProtectedRoute role="user"><InBodyPage /></ProtectedRoute>} />

      {/* Coach Specific Routes */}
      <Route path="/Plans" element={<ProtectedRoute role="coach"><Plans /></ProtectedRoute>} />
      <Route path="/Clients" element={<ProtectedRoute role="coach"><Clients /></ProtectedRoute>} />
      <Route path="/Earnings" element={<ProtectedRoute role="coach"><Earnings /></ProtectedRoute>} />
      <Route path="/Posts" element={<ProtectedRoute role="coach"><Posts /></ProtectedRoute>} />

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