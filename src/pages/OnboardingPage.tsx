import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, User, Activity, Target, Flame, Users, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
type Gender = 'male' | 'female';
type GoalId = 'weight_loss' | 'maintenance' | 'muscle_gain';

const nameSchema = z.string().trim().min(2, 'Full name is required').max(100, 'Full name too long');

function roundCal(n: number) {
  return Math.round(n);
}

function activityFactor(level: ActivityLevel) {
  switch (level) {
    case 'sedentary':
      return 1.2;
    case 'light':
      return 1.375;
    case 'moderate':
      return 1.55;
    case 'very':
      return 1.725;
    case 'extra':
      return 1.9;
    default:
      return 1.2;
  }
}

/**
 * Mifflin-St Jeor BMR
 * male:   10W + 6.25H - 5A + 5
 * female: 10W + 6.25H - 5A - 161
 */
function calculateCaloriePlan(params: {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}) {
  const { gender, age, heightCm, weightKg, activityLevel } = params;

  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * activityFactor(activityLevel);

  // نظام جديد: 3 أهداف فقط
  const maintenance = tdee * 1.0;     // Maintain weight
  const weightLoss = tdee * 0.8;      // 80% - خسارة وزن آمنة
  const muscleGain = tdee * 1.15;     // +15% - زيادة عضلات

  return {
    bmr: roundCal(bmr),
    tdee: roundCal(tdee),
    maintenance: roundCal(maintenance),
    weightLoss: roundCal(weightLoss),
    muscleGain: roundCal(muscleGain),
  };
}

function formatBmi(bmi: number) {
  return Math.round(bmi * 10) / 10;
}

function bmiFromMetric(heightCm: number, weightKg: number) {
  const heightM = heightCm / 100;
  if (heightM <= 0) return NaN;
  return weightKg / (heightM * heightM);
}

function recommendedGoalFromBmi(bmi: number): {
  goalId: GoalId;
  categoryAr: string;
  messageAr: string;
} {
  if (bmi < 18.5) {
    return {
      goalId: 'muscle_gain',
      categoryAr: 'نحافة',
      messageAr: 'بنرشح لك زيادة وزن بشكل صحي وبناء عضلات علشان توصل لوزن أفضل.',
    };
  }

  if (bmi < 25) {
    return {
      goalId: 'maintenance',
      categoryAr: 'وزن طبيعي',
      messageAr: 'وزنك ضمن المعدل الطبيعي؛ بنرشح لك الحفاظ على الوزن والتركيز على تحسين اللياقة.',
    };
  }

  // BMI >= 25 (زيادة وزن أو سمنة)
  return {
    goalId: 'weight_loss',
    categoryAr: bmi < 30 ? 'زيادة وزن' : 'سمنة',
    messageAr: 'بناءً على بياناتك، بنرشح لك خسارة وزن بشكل آمن وصحي.',
  };
}

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signUp } = useAuth();

  // Check if user is coming from pending_signup (regular user flow)
  const pendingRaw = localStorage.getItem('pending_signup');
  const pending = useMemo(
    () =>
      pendingRaw
        ? (JSON.parse(pendingRaw) as {
            email: string;
            password: string;
            fullName: string;
            accountType: 'user' | 'coach';
          })
        : null,
    [pendingRaw]
  );

  // State to check if user needs name/account type
  const [needsNameAndType, setNeedsNameAndType] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // For Google OAuth users only
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'coach'>('user');
  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});

  const [currentStep, setCurrentStep] = useState(0); // 0 = name/type, 1 = gender/age, 2 = body, 3 = activity, 4 = goal
  const [saving, setSaving] = useState(false);

  // Form data
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<GoalId | null>(null);

  // Check if user already has name and account type
  useEffect(() => {
    const checkProfile = async () => {
      // If coming from pending_signup, skip to fitness steps
      if (pending) {
        setNeedsNameAndType(false);
        setCurrentStep(1); // Start from gender/age step
        setLoadingProfile(false);
        return;
      }

      // If no user yet, wait
      if (!user) {
        navigate('/signin', { replace: true });
        return;
      }

      // Check if user has account_type in profile
      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check if account_type exists and is valid
      const hasAccountType = data?.account_type && 
                             typeof data.account_type === 'string' && 
                             data.account_type.trim().length > 0;

      // If account_type is missing, user needs to complete Step 0 (name + type)
      if (!hasAccountType) {
        setNeedsNameAndType(true);
        setCurrentStep(0);
      } else {
        // User has account_type, skip to fitness steps
        setNeedsNameAndType(false);
        setCurrentStep(1);
      }
      setLoadingProfile(false);
    };

    checkProfile();
  }, [user, pending, navigate]);

  const totalSteps = needsNameAndType ? 5 : 4; // If needs name/type, add 1 step
  const actualStep = currentStep; // 0-based now
  const displayStep = actualStep + 1; // for UI display
  
  const progressSteps = needsNameAndType ? [0, 1, 2, 3, 4] : [1, 2, 3, 4];
  const progressWidth = needsNameAndType 
    ? (actualStep / 4) * 100 
    : ((actualStep - 1) / 3) * 100;
  
  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: '🪑' },
    { id: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', icon: '🚶' },
    { id: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', icon: '🏃' },
    { id: 'very', label: 'Very Active', description: 'Hard exercise 6-7 days/week', icon: '🏋️' },
    { id: 'extra', label: 'Extra Active', description: 'Very hard exercise & physical job', icon: '💪' },
  ] as const;

  const goals = [
    { id: 'weight_loss', label: 'Weight Loss', description: 'Lose weight safely • 80% TDEE', icon: '🔥', color: 'text-destructive' },
    { id: 'maintenance', label: 'Maintenance', description: 'Maintain current weight • 100% TDEE', icon: '⚖️', color: 'text-primary' },
    { id: 'muscle_gain', label: 'Muscle Gain', description: 'Build muscle mass • 115% TDEE', icon: '💪', color: 'text-accent' },
  ] as const;

  const parsedAge = useMemo(() => {
    const n = Number(age);
    return Number.isFinite(n) ? n : NaN;
  }, [age]);

  const parsedHeight = useMemo(() => {
    const n = Number(height);
    return Number.isFinite(n) ? n : NaN;
  }, [height]);

  const parsedWeight = useMemo(() => {
    const n = Number(weight);
    return Number.isFinite(n) ? n : NaN;
  }, [weight]);

  // ✅ نحسب الخطة لما تبقى البيانات مكتملة
  const plan = useMemo(() => {
    if (!gender) return null;
    if (!activityLevel) return null;
    if (!Number.isFinite(parsedAge) || !Number.isFinite(parsedHeight) || !Number.isFinite(parsedWeight)) return null;
    if (parsedAge <= 0 || parsedHeight <= 0 || parsedWeight <= 0) return null;

    return calculateCaloriePlan({
      gender,
      age: parsedAge,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      activityLevel,
    });
  }, [gender, activityLevel, parsedAge, parsedHeight, parsedWeight]);

  const bmi = useMemo(() => {
    if (!Number.isFinite(parsedHeight) || !Number.isFinite(parsedWeight)) return NaN;
    if (parsedHeight <= 0 || parsedWeight <= 0) return NaN;
    return bmiFromMetric(parsedHeight, parsedWeight);
  }, [parsedHeight, parsedWeight]);

  const goalRecommendation = useMemo(() => {
    if (!Number.isFinite(bmi)) return null;
    if (bmi < 10 || bmi > 80) return null;
    return recommendedGoalFromBmi(bmi);
  }, [bmi]);

  const recommendedGoalId = goalRecommendation?.goalId ?? null;

  useEffect(() => {
    if (currentStep !== (needsNameAndType ? 4 : 4)) return;
    if (goal) return;
    if (!recommendedGoalId) return;
    setGoal(recommendedGoalId);
  }, [currentStep, goal, recommendedGoalId, needsNameAndType]);

  const selectedDailyCalories = useMemo(() => {
    if (!plan || !goal) return null;

    switch (goal) {
      case 'weight_loss':
        return plan.weightLoss;
      case 'muscle_gain':
        return plan.muscleGain;
      case 'maintenance':
      default:
        return plan.maintenance;
    }
  }, [plan, goal]);

  const validateCurrentStep = () => {
    // Step 0: Name and Account Type (only for Google OAuth users)
    if (currentStep === 0 && needsNameAndType) {
      setNameErrors({});
      // Validate name
      const result = nameSchema.safeParse(fullName);
      if (!result.success) {
        setNameErrors({ fullName: 'Full name is required (min 2 characters)' });
        toast.error('Please enter your full name');
        return false;
      }
      // Account type is already selected with default 'user'
      return true;
    }

    if (currentStep === (needsNameAndType ? 1 : 1)) {
      if (!gender) {
        toast.error('Please select your gender');
        return false;
      }(needsNameAndType ? 2 : 2)
      if (!age.trim()) {
        toast.error('Please enter your age');
        return false;
      }
      if (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        toast.error('Please enter a valid age (10 - 100)');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!height.trim()) {
        toast.error('Please enter your height');
        return false;
      }
      if (!weight.trim()) {
        toast.error('Please enter your weight');
        return false;
      }
      if (!Number.isFinite(parsedHeight) || parsedHeight < 80 || parsedHeight > 250) {
        toast.error('Please enter a valid height (80 - 250 cm)');
        return false;
      }
      if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
        toast.error('Please enter a valid weight (20 - 300 kg)');
        return false;
      }
      return true;
    }

    if (currentStep === (needsNameAndType ? 3 : 3)) {
      if (!activityLevel) {
        toast.error('Please select your activity level');
        return false;
      }
      return true;
    }

    if (currentStep === (needsNameAndType ? 4 : 4)) {
      if (!goal) {
        toast.error('Please select your goal');
        return false;
      }
      if (!plan) {
        toast.error('Missing data to calculate calories. Please complete previous steps.');
        return false;
      }
      return true;
    }

    return true;
  };

  const saveProfile = async () => {
    if (!plan || !selectedDailyCalories) {
      toast.error('Unable to calculate calories');
      return;
    }

    setSaving(true);
    try {
      // Case 1: Regular signup with pending data
      if (pending) {
        const extraData = {
          onboarding_completed: true,
          gender,
          age: parsedAge,
          height_cm: parsedHeight,
          weight_kg: parsedWeight,
          activity_level: activityLevel,
          goal,
          bmr: plan.bmr,
          tdee: plan.tdee,
          calories_maintain: plan.maintenance,
          calories_loss: plan.weightLoss,
          calories_gain: plan.muscleGain,
          daily_calories: selectedDailyCalories,
        } satisfies Record<string, unknown>;

        const { error } = await signUp(
          pending.email,
          pending.password,
          pending.fullName,
          pending.accountType,
          extraData,
          `${window.location.origin}/auth/callback`
        );

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            toast.error('Email already registered. Please login.');
          } else {
            toast.error(error.message);
          }
          return;
        }

        localStorage.removeItem('pending_signup');
        toast.success('Account created! Check your email to verify.');
        navigate('/signin', { replace: true });
        return;
      }

      // Case 2: Google OAuth user - update profile
      if (!user?.id) {
        toast.error('Please sign in first');
        navigate('/signin');
        return;
      }

      // Save name and account type if this was needed (Google OAuth users)
      if (needsNameAndType) {
        // Update user metadata to include account_type for instant access
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName.trim(),
            account_type: accountType,
          }
        });

        if (metaError) {
          console.error('Error updating user metadata:', metaError);
        }

        // Also save to profiles table
        const { error: nameTypeError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            full_name: fullName.trim(),
            account_type: accountType,
          }, { onConflict: 'user_id' });

        if (nameTypeError) {
          toast.error(nameTypeError.message || 'Failed to save profile');
          return;
        }
      }

      // Now save fitness data
      const payload = {
        user_id: user.id,
        gender,
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        activity_level: activityLevel,
        goal,
        bmr: plan.bmr,
        tdee: plan.tdee,
        calories_maintain: plan.maintenance,
        calories_loss: plan.weightLoss,
        calories_gain: plan.muscleGain,
        daily_calories: selectedDailyCalories,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Profile saved successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong while saving your profile');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    if (!validateCurrentStep()) return;

    if (currentStep < totalSteps) {
      setCurrentStep((s) => s + 1);
      return;
    }

    await saveProfile();
  };

  const prevStep = () => {
    if (saving) return;
    const minStep = needsNameAndType ? 0 : 1;
    if (currentStep > minStep) setCurrentStep((s) => s - 1);
  };

  // Loading state
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-50 p-3 rounded-full bg-card border-2 border-border shadow-lg hover:scale-105 transition-transform"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-3xl p-8 lg:p-12 shadow-2xl animate-fade-in">
          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex justify-between mb-4">
              {progressSteps.map((step, idx) => {
                const isCompleted = currentStep > step;
                const isCurrent = currentStep === step;
                
                return (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative z-10',
                        isCompleted
                          ? 'bg-accent text-accent-foreground'
                          : isCurrent
                          ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? <Check className="w-5 h-5" /> : (idx + 1)}
                    </div>
                    <span
                      className={cn(
                        'text-xs mt-2 font-medium',
                        isCurrent ? 'text-primary' : 'text-muted-foreground'
                      )}
                    >
                      {needsNameAndType ? (
                        <>
                          {step === 0 && 'Info'}
                          {step === 1 && 'Profile'}
                          {step === 2 && 'Body'}
                          {step === 3 && 'Activity'}
                          {step === 4 && 'Goal'}
                        </>
                      ) : (
                        <>
                          {step === 1 && 'Profile'}
                          {step === 2 && 'Body'}
                          {step === 3 && 'Activity'}
                          {step === 4 && 'Goal'}
                        </>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progressWidth}%` }} />
            </div>
          </div>

          {/* Step 0: Name & Account Type (Only for Google OAuth users) */}
          {currentStep === 0 && needsNameAndType && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <Dumbbell className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">Welcome to FitMentor</h2>
                <p className="text-muted-foreground mt-2">Complete your profile to get started</p>
              </div>

              <div className="space-y-5">
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
                  {nameErrors.fullName && <p className="text-destructive text-xs mt-1">{nameErrors.fullName}</p>}
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
              </div>
            </div>
          )}

          {/* Step 1 */}
          {currentStep === (needsNameAndType ? 1 : 1) && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">Tell us about yourself</h2>
                <p className="text-muted-foreground mt-2">This helps us personalize your experience</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold">Gender</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={cn(
                        'p-6 rounded-xl border-2 transition-all text-center',
                        gender === 'male' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-4xl mb-2 block">👨</span>
                      <p className="font-semibold text-foreground">Male</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={cn(
                        'p-6 rounded-xl border-2 transition-all text-center',
                        gender === 'female' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-4xl mb-2 block">👩</span>
                      <p className="font-semibold text-foreground">Female</p>
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="age" className="text-sm font-semibold">
                    Age
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter your age"
                      className="h-14 text-lg rounded-xl pr-16"
                      min={10}
                      max={100}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      years
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === (needsNameAndType ? 2 : 2) && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">Your body measurements</h2>
                <p className="text-muted-foreground mt-2">We'll use this to calculate your daily needs</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="height" className="text-sm font-semibold">
                    Height
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="Enter your height"
                      className="h-14 text-lg rounded-xl pr-16"
                      min={80}
                      max={250}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      cm
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight" className="text-sm font-semibold">
                    Weight
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="weight"
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Enter your weight"
                      className="h-14 text-lg rounded-xl pr-16"
                      min={20}
                      max={300}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === (needsNameAndType ? 3 : 3) && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Flame className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">Your activity level</h2>
                <p className="text-muted-foreground mt-2">How active are you in your daily life?</p>
              </div>

              <div className="space-y-3">
                {activityLevels.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setActivityLevel(level.id)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4',
                      activityLevel === level.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-2xl">{level.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{level.label}</p>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    {activityLevel === level.id && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === (needsNameAndType ? 4 : 4) && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">What's your goal?</h2>
                <p className="text-muted-foreground mt-2">We'll create a personalized plan for you</p>
              </div>

              {/* Goal Recommendation */}
              {goalRecommendation && (
                <div className="mb-6 p-5 rounded-2xl border border-primary/30 bg-primary/5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-primary" dir="rtl">الهدف المُرشَّح</p>
                      <p className="mt-1 text-sm text-foreground" dir="rtl">
                        {goalRecommendation.messageAr}
                      </p>
                      {Number.isFinite(bmi) && (
                        <p className="mt-2 text-xs text-muted-foreground" dir="rtl">
                          BMI: <span className="font-semibold text-foreground">{formatBmi(bmi)}</span> • التصنيف:{' '}
                          <span className="font-semibold text-foreground">{goalRecommendation.categoryAr}</span>
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => setGoal(goalRecommendation.goalId)}
                    >
                      اختيار
                    </Button>
                  </div>
                </div>
              )}

              {/* ✅ Preview card */}
              {plan && (
                <div className="mb-6 p-5 rounded-2xl border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3">Your calculated plan (Calories/day)</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Weight Loss</p>
                      <p className="text-lg font-bold">{plan.weightLoss}</p>
                      <p className="text-xs text-muted-foreground">80%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Maintenance</p>
                      <p className="text-lg font-bold">{plan.maintenance}</p>
                      <p className="text-xs text-muted-foreground">100%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Muscle Gain</p>
                      <p className="text-lg font-bold">{plan.muscleGain}</p>
                      <p className="text-xs text-muted-foreground">115%</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    TDEE: <span className="font-semibold text-foreground">{plan.tdee}</span> • BMR:{' '}
                    <span className="font-semibold text-foreground">{plan.bmr}</span>
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                {goals.map((g) => {
                  const isRecommended = recommendedGoalId === g.id;
                  const isSelected = goal === g.id;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={cn(
                        'w-full p-6 rounded-xl border-2 transition-all text-left flex items-center gap-4',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : isRecommended
                          ? 'border-primary/60 bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-4xl">{g.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-lg text-foreground">{g.label}</p>
                        <p className="text-muted-foreground">{g.description}</p>

                        {/* ✅ show exact calories for each option */}
                        {plan && (
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {g.id === 'weight_loss' && `${plan.weightLoss} Calories/day`}
                            {g.id === 'maintenance' && `${plan.maintenance} Calories/day`}
                            {g.id === 'muscle_gain' && `${plan.muscleGain} Calories/day`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {!isSelected && isRecommended && (
                          <span className="text-xs font-semibold text-primary" dir="rtl">مُرشَّح</span>
                        )}
                        {isSelected && <Check className="w-6 h-6 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-10">
            {currentStep > (needsNameAndType ? 0 : 1) && (
              <Button
                onClick={prevStep}
                variant="outline"
                disabled={saving}
                className="flex-1 h-14 rounded-xl text-base font-semibold"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={saving}
              className={cn(
                'h-14 bg-gradient-primary hover:opacity-90 text-primary-foreground text-base font-semibold rounded-xl shadow-glow',
                currentStep === (needsNameAndType ? 0 : 1) ? 'w-full' : 'flex-1'
              )}
            >
              {saving ? 'Saving...' : currentStep === totalSteps - 1 ? 'Complete Setup' : 'Continue'}
              {!saving && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
