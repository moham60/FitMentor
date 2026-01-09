import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
// Pages
import WelcomePage from "./pages/WelcomePage";
import SignUpPage from "./pages/SignUpPage";
import SignInPage from "./pages/SignInPage";
import OnboardingPage from "./pages/OnboardingPage";
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
import { UserRole } from "./types/user";
import Earnings from "./coachPages/earnings";
const queryClient = new QueryClient();

// Protected Route wrapper
const ProtectedRoute = ({ children,role }: { children: React.ReactNode,role?:UserRole }, ) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }
 
  if (role&&user?.user_metadata.account_type != role) {
    return <Navigate to="/dashboard" replace/>
  }
  return <>{children}</>;
};

// Public Route wrapper (redirects to dashboard if logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><WelcomePage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
      <Route path="/signin" element={<PublicRoute><SignInPage /></PublicRoute>} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      
      {/*Shared Protected Routes */}

      <Route path="/dashboard" element={<ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute>
        <AIAssistantPage />
      </ProtectedRoute>} />
    
      <Route path="/goals" element={<ProtectedRoute>
        <GoalsPage />
      </ProtectedRoute>} />

      <Route path="/profile" element={<ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>} />
      {/**user Protected Routes */}
      <>
      <Route path="/Exercises" element={<ProtectedRoute role="user">
        <ExercisesPage />
      </ProtectedRoute>} />
        <Route path="/nutrition" element={
          <ProtectedRoute role="user">
          <NutritionPage />
        </ProtectedRoute>} />
        <Route path="/workouts" element={
          <ProtectedRoute role="user">
            <WorkoutsPage />
          </ProtectedRoute>
        } />
        <Route path="/inbody" element={
          <ProtectedRoute role="user">
            <InBodyPage />
          </ProtectedRoute>
        } />
      </>
      
    

    
      
        <>
      <Route path="/Plans" element={<ProtectedRoute role="coach"><Plans /></ProtectedRoute>} />
        <Route path="/Clients" element={<ProtectedRoute role="coach" ><Clients /></ProtectedRoute>} />
        <Route path="Earnings" element={<ProtectedRoute role="coach">
          <Earnings />
        </ProtectedRoute>}/>
      <Route path="/Posts" element={<ProtectedRoute role="coach"><Posts /></ProtectedRoute>} />
        </>
      
       
      
      {/* 404 */}
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
