import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, Target, Sparkles, Activity, Star, Dumbbell, Flame, Heart, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sun, Moon } from 'lucide-react';
import heroWorkout from '@/assets/hero-workout.jpg';

// --- Custom Brand SVGs for sleek look ---
// Google "G" official-style icon
const GoogleIcon = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 533.5 544.3"
    width={size}
    height={size}
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M533.5 278.4c0-18.4-1.5-36.1-4.3-53.3H272v100.9h146.9c-6.3 34-25 62.8-53.3 82v68.2h86.2c50.5-46.5 81.7-115.1 81.7-197.8z"
    />
    <path
      fill="#34A853"
      d="M272 544.3c72.6 0 133.6-24.1 178.1-65.6l-86.2-68.2c-24 16.1-54.7 25.6-91.9 25.6-70.1 0-129.5-47.3-150.7-110.9H32.1v69.6C76.3 482.1 167.6 544.3 272 544.3z"
    />
    <path
      fill="#FBBC05"
      d="M121.3 325.2c-10.8-32-10.8-66.6 0-98.6V157H32.1c-37.4 74.8-37.4 163.5 0 238.3l89.2-70.1z"
    />
    <path
      fill="#EA4335"
      d="M272 107.7c39.5-.6 77.6 14 106.7 40.9l79.3-79.3C409.5 24.7 344.7-1 272 0 167.6 0 76.3 62.2 32.1 157l89.2 69.6C142.5 155 201.9 107.7 272 107.7z"
    />
  </svg>
);


const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style={{ fill: '#1877F2' }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
);

const AppleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
);


const WelcomePage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signInWithGoogle } = useAuth(); // Note: You'll need similar functions for FB/Apple later
  const [googleLoading, setGoogleLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Generalized handler for social sign-ins (placeholder for now)
  const handleSocialSignIn = async (provider) => {
    toast.info(`Connecting to ${provider}...`);
    if (provider === 'google') {
         setGoogleLoading(true);
        try {
            const { error } = await signInWithGoogle();
            if (error) throw error;
        } catch (err) {
            toast.error('Failed to connect to Google');
        } finally {
            setGoogleLoading(false);
        }
    }
    // Add FB/Apple logic here later
  };


  const features = [
    { icon: TrendingUp, title: 'AI Progress Tracking', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Target, title: 'Smart Nutrition', color: 'text-green-500', bg: 'bg-green-500/10' },
    { icon: Sparkles, title: 'AI Coach', color: 'text-purple-500', bg: 'bg-purple-500/10' }
  ];

  return (
    <div className="min-min-h-[100dvh] bg-background text-foreground relative overflow-x-hidden selection:bg-primary/30">
      
      {/* --- Background & Nav remain the same as before --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border/50 py-4' : 'py-6 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    FitMintor
                </span>
            </div>
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-secondary/50 hover:bg-secondary backdrop-blur-sm border border-border transition-all duration-300 hover:scale-105 active:scale-95">
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
            </button>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <div className="relative z-10 container max-w-7xl mx-auto px-4 pt-32 pb-12 min-min-h-[100dvh] flex flex-col lg:flex-row items-center gap-16">
        
        {/* Left Side: Auth & Value Prop */}
        <div className="flex-1 w-full max-w-xl space-y-8 animate-fade-in-up">
            
            {/* Headline Section (Same as before) */}
            <div className="space-y-6 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-bounce-slow">
                    <Sparkles className="w-4 h-4" />
                    <span>#1 AI Fitness Companion</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tight">
                    Fitness Evolved <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-accent">
                        Powered by AI
                    </span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                    Experience the future of personal training. FitMintor builds adaptive workouts and nutrition plans tailored specifically to your DNA and goals.
                </p>
            </div>

            {/* --- UPDATED AUTH CARD --- */}
            <div className="bg-card/40 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl ring-1 ring-black/5">
                <div className="space-y-6">
                    {/* Primary Action */}
                    <Button
                        onClick={() => navigate('/signup')}
                        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold rounded-2xl shadow-lg shadow-primary/25 transition-all duration-300 hover:translate-y-[-2px] group"
                    >
                        Create Account
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    {/* Divider */}
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-border/50"></div>
                        <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Or continue with</span>
                        <div className="flex-grow border-t border-border/50"></div>
                    </div>

                    {/* Social Icons Row - The new aesthetic part */}
                    <div className="grid grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => handleSocialSignIn('google')}
                            disabled={googleLoading}
                            className="h-14 rounded-2xl border-border/60 bg-background/50 hover:bg-background/80 hover:scale-105 transition-all duration-300"
                        >
                             <GoogleIcon />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSocialSignIn('facebook')}
                            className="h-14 rounded-2xl border-border/60 bg-background/50 hover:bg-background/80 hover:scale-105 transition-all duration-300"
                        >
                            <FacebookIcon />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSocialSignIn('apple')}
                            className="h-14 rounded-2xl border-border/60 bg-background/50 hover:bg-background/80 hover:scale-105 transition-all duration-300"
                        >
                            <AppleIcon />
                        </Button>
                    </div>

                    {/* Secondary Action */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/signin')}
                        className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    >
                        Already have an account? <span className="font-semibold ml-1 text-primary">Sign In</span>
                    </Button>
                </div>
            </div>
        </div>

        {/* Right Side (Phone Mockup) remains the same */}
        <div className="flex-1 relative hidden lg:block">
            <div className="relative w-[380px] mx-auto z-10 transform transition-transform hover:scale-[1.02] duration-500">
                <div className="absolute -inset-1 bg-gradient-to-b from-primary/30 to-purple-600/30 rounded-[3rem] blur-sm"></div>
                <div className="relative bg-background border-[8px] border-slate-900 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[9/19]">
                    <img src={heroWorkout} alt="App Screenshot" className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-8 left-6 right-6 text-white">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-xs font-medium uppercase tracking-wider">Workout Active</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-1">Full Body Crush</h3>
                        <p className="text-white/80 text-sm">45 mins • High Intensity</p>
                    </div>
                </div>

                {/* Floating Widgets */}
                <div className="absolute top-20 -right-20 bg-card/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border/50 animate-[float_4s_ease-in-out_infinite]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center"><Heart className="w-5 h-5 text-red-500 fill-current" /></div>
                        <div><p className="text-xs text-muted-foreground">New Post</p><p className="text-lg font-bold">50 Likes</p></div>
                    </div>
                </div>
                <div className="absolute bottom-32 -left-16 bg-card/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border/50 animate-[float_5s_ease-in-out_infinite_1s]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center"><Flame className="w-5 h-5 text-orange-500" /></div>
                        <div><p className="text-xs text-muted-foreground">Calories</p><p className="text-lg font-bold">840 kcal</p></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {/* Footer styles remain */}
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        .animate-bounce-slow { animation: bounce 3s infinite; }
      `}</style>
    </div>
  );
};

export default WelcomePage;