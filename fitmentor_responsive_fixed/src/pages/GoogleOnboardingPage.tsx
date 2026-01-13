import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, User, Users, Sun, Moon, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const googleOnboardingSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100, 'Full name too long'),
});

const GoogleOnboardingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, updateUserMetadata } = useAuth();

  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'coach'>('user');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!user?.id) {
      toast.error('User not found. Please sign in again.');
      navigate('/signin');
      return;
    }

    // Validate
    const result = googleOnboardingSchema.safeParse({ fullName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const trimmedFullName = fullName.trim();

      // Upsert the profiles table (creates if doesn't exist, updates if exists)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: trimmedFullName,
          account_type: accountType,
        }, { onConflict: 'user_id' });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        toast.error(profileError.message || 'Failed to save profile');
        return;
      }

      // Update user metadata with name and account type
      const { error: metadataError } = await updateUserMetadata({
        full_name: trimmedFullName,
        account_type: accountType,
      });

      if (metadataError) {
        console.error('Metadata update error:', metadataError);
        toast.error(metadataError.message || 'Failed to update profile metadata');
        return;
      }

      toast.success('Profile set up successfully!');
      // Redirect to onboarding page to complete fitness information
      navigate('/onboarding');
    } catch (err) {
      console.error('Error:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-min-h-[100dvh] bg-gradient-hero flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-50 p-3 rounded-full bg-card border-2 border-border shadow-lg hover:scale-105 transition-transform"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl p-8 lg:p-10 shadow-2xl animate-fade-in">
          {/* Logo Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
              <Dumbbell className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-2xl lg:text-3xl font-display font-bold text-center text-foreground mb-2">
            Welcome to FitMintor
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            Let's complete your profile setup
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" className="text-sm font-semibold">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12 pl-12 rounded-xl"
                  autoFocus
                />
              </div>
              {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Account Type */}
            <div>
              <Label className="text-sm font-semibold">
                Account Type <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setAccountType('user')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accountType === 'user'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <User className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-sm text-foreground">Regular User</p>
                  <p className="text-xs text-muted-foreground">Track your fitness journey</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('coach')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accountType === 'coach'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-sm text-foreground">Coach</p>
                  <p className="text-xs text-muted-foreground">Manage clients and programs</p>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-gradient-primary hover:opacity-90 text-primary-foreground text-base font-semibold rounded-xl shadow-glow transition-all"
            >
              {loading ? 'Setting up...' : 'Continue'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            You can change these details later in your settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleOnboardingPage;
