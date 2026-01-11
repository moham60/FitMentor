import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, User, Users, Sun, Moon, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { z } from 'zod';

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [accountType, setAccountType] = useState<'user' | 'coach'>('user');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoogleSignUp = async () => {
    if (!agreeTerms) {
      toast.error('Please agree to the Terms of Service first');
      return;
    }
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Signed up with Google successfully!');
    } catch {
      toast.error('Failed to sign up with Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleOtherSocialLogin = (provider: string) => {
    if (!agreeTerms) {
      toast.error('Please agree to the Terms of Service first');
      return;
    }
    toast.info(`${provider} login coming soon!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = signUpSchema.safeParse({ fullName, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (!agreeTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    try {
      localStorage.setItem("pending_signup", JSON.stringify({ email, password, fullName, accountType }));
      toast.success("Please complete your information so we can create your account and send you the activation link.");
      navigate("/pre-onboarding");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      
      {/* Creative Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-10 p-2.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 shadow-lg hover:bg-background transition-all duration-300"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
      </button>

      <div className="w-full max-w-[440px] relative z-0">
        <div className="bg-card/60 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl p-8 shadow-2xl ring-1 ring-black/5">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full"></div>
              <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 hover:rotate-3 duration-300">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Create Account
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Join the fitness revolution today</p>
          </div>

          {/* Account Type Selection - Segmented Style */}
          <div className="mb-8 p-1 bg-muted/50 rounded-xl border border-border/50">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setAccountType('user')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  accountType === 'user'
                    ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <User className="w-4 h-4" />
                User
              </button>
              <button
                type="button"
                onClick={() => setAccountType('coach')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  accountType === 'coach'
                    ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Coach
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                <Input
                  id="fullName"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-all duration-300 h-11"
                />
              </div>
              {errors.fullName && <p className="text-xs font-medium text-destructive mt-1 ml-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-all duration-300 h-11"
                />
              </div>
              {errors.email && <p className="text-xs font-medium text-destructive mt-1 ml-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-8 bg-background/50 border-border/50 focus:bg-background h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 pr-8 bg-background/50 border-border/50 focus:bg-background h-11"
                  />
                </div>
              </div>
            </div>
            {(errors.password || errors.confirmPassword) && (
               <p className="text-xs font-medium text-destructive mt-0 ml-1">
                 {errors.password || errors.confirmPassword}
               </p>
            )}

            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground font-normal leading-relaxed">
                By creating an account, I agree to the{' '}
                <button type="button" className="text-primary hover:text-primary/80 underline font-medium transition-colors">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-primary hover:text-primary/80 underline font-medium transition-colors">
                  Privacy Policy
                </button>
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 rounded-xl bg-gradient-to-r from-primary to-primary/90" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          {/* Social Sign Up - Custom Layout */}
          <div className="mt-8">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
                <span className="bg-background/0 backdrop-blur-md px-3 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
 {/* Google - LEFT */}
  <Button
    type="button"
    variant="outline"
    className="h-12 w-full flex items-center justify-center rounded-xl border-border/60 bg-background/50 hover:bg-white hover:border-red-200 dark:hover:bg-neutral-800 transition-all duration-300"
    onClick={handleGoogleSignUp}
    disabled={googleLoading}
  >
    {googleLoading ? (
      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
    ) : (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    )}
  </Button>

  {/* Facebook - MIDDLE */}
  <Button
    type="button"
    variant="outline"
    className="h-12 w-full flex items-center justify-center rounded-xl border-border/60 bg-background/50 hover:bg-blue-50 hover:border-[#1877F2] dark:hover:bg-blue-900/20 transition-all duration-300"
    onClick={() => handleOtherSocialLogin('Facebook')}
  >
    <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.048 0-2.733.962-2.733 2.583v1.388h5.738l-1.47 3.667h-4.268v7.98H9.101Z"/>
    </svg>
  </Button>

  {/* Apple - RIGHT */}
  <Button
    type="button"
    variant="outline"
    className="h-12 w-full flex items-center justify-center rounded-xl border-border/60 bg-background/50 hover:bg-neutral-100 hover:border-neutral-400 dark:hover:bg-neutral-800 transition-all duration-300"
    onClick={() => handleOtherSocialLogin('Apple')}
  >
    <svg className="w-5 h-5 text-foreground" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
              </Button>
            </div>
          </div>

          <Button type="button" variant="ghost" className="w-full mt-6 text-muted-foreground hover:text-foreground" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;