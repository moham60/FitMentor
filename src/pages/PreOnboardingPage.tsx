import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, User, Activity, Target, Flame, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// --- Types & Constants ---
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
type Gender = 'male' | 'female';
type GoalId = 'maintain' | 'loss_0_25' | 'loss_0_5' | 'loss_1' | 'gain';

const activityLevels = [
  { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: '🪑' },
  { id: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', icon: '🚶' },
  { id: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', icon: '🏃' },
  { id: 'very', label: 'Very Active', description: 'Hard exercise 6-7 days/week', icon: '🏋️' },
  { id: 'extra', label: 'Extra Active', description: 'Very hard exercise & physical job', icon: '💪' },
] as const;

const goals = [
  { id: 'maintain', label: 'Maintain weight', description: '100% Calories/day', icon: '⚖️' },
  { id: 'loss_0_25', label: 'Mild weight loss', description: '0.25 kg/week • 90%', icon: '📉' },
  { id: 'loss_0_5', label: 'Weight loss', description: '0.5 kg/week • 81%', icon: '🔥' },
  { id: 'loss_1', label: 'Extreme weight loss', description: '1 kg/week • 62%', icon: '🚨' },
  { id: 'gain', label: 'Gain weight', description: '+10% Calories/day', icon: '📈' },
] as const;

// --- Helper Functions ---
function roundCal(n: number) {
  return Math.round(n);
}

function activityFactor(level: ActivityLevel) {
  switch (level) {
    case 'sedentary': return 1.2;
    case 'light': return 1.375;
    case 'moderate': return 1.55;
    case 'very': return 1.725;
    case 'extra': return 1.9;
    default: return 1.2;
  }
}

function calculateCaloriePlan(params: {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
}) {
  const { gender, age, heightCm, weightKg, activityLevel } = params;

  // Mifflin-St Jeor
  const bmr =
    gender === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * activityFactor(activityLevel);

  const maintain = tdee * 1.0;
  const mildLoss = tdee * 0.9;
  const loss = tdee * 0.81;
  const extremeLoss = tdee * 0.62;
  const gain = tdee * 1.1;

  return {
    bmr: roundCal(bmr),
    tdee: roundCal(tdee),
    maintain: roundCal(maintain),
    mildLoss: roundCal(mildLoss),
    loss: roundCal(loss),
    extremeLoss: roundCal(extremeLoss),
    gain: roundCal(gain),
  };
}

const PreOnboardingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signUp } = useAuth();

  // 1. Retrieve Pending Signup Data
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

  useEffect(() => {
    if (!pending) {
      toast.error('Please create an account first');
      navigate('/signup', { replace: true });
    }
  }, [pending, navigate]);

  // 2. Component State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<GoalId | null>(null);

  // 3. Derived Data (Parsers & Calculators)
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

  const plan = useMemo(() => {
    if (!gender || !activityLevel) return null;
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

  const selectedDailyCalories = useMemo(() => {
    if (!plan || !goal) return null;
    switch (goal) {
      case 'loss_0_25': return plan.mildLoss;
      case 'loss_0_5': return plan.loss;
      case 'loss_1': return plan.extremeLoss;
      case 'gain': return plan.gain;
      case 'maintain':
      default: return plan.maintain;
    }
  }, [plan, goal]);

  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

  // 4. Validation & Submission Logic
  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!gender) { toast.error('Please select your gender'); return false; }
      if (!age.trim()) { toast.error('Please enter your age'); return false; }
      if (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 100) {
        toast.error('Please enter a valid age (10 - 100)'); return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!height.trim()) { toast.error('Please enter your height'); return false; }
      if (!weight.trim()) { toast.error('Please enter your weight'); return false; }
      if (!Number.isFinite(parsedHeight) || parsedHeight < 80 || parsedHeight > 250) {
        toast.error('Please enter a valid height (80 - 250 cm)'); return false;
      }
      if (!Number.isFinite(parsedWeight) || parsedWeight < 20 || parsedWeight > 300) {
        toast.error('Please enter a valid weight (20 - 300 kg)'); return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (!activityLevel) { toast.error('Please select your activity level'); return false; }
      return true;
    }
    if (currentStep === 4) {
      if (!goal) { toast.error('Please select your goal'); return false; }
      if (!plan || !selectedDailyCalories) { toast.error('Calculation error. Please check inputs.'); return false; }
      return true;
    }
    return true;
  };

  const finalizeSignUp = async () => {
    if (!pending) return;
    if (!plan || !selectedDailyCalories) {
      toast.error('Unable to calculate calories');
      return;
    }

    setSaving(true);
    try {
      const extraData = {
        onboarding_completed: true,
        gender,
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        activity_level: activityLevel,
        goal,
        // Saved Calculations
        bmr: plan.bmr,
        tdee: plan.tdee,
        calories_maintain: plan.maintain,
        calories_mild_loss: plan.mildLoss,
        calories_loss: plan.loss,
        calories_extreme_loss: plan.extremeLoss,
        calories_gain: plan.gain,
        // Selected Target
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
    } catch {
      toast.error('An error occurred. Please try again.');
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

    await finalizeSignUp();
  };

  const prevStep = () => {
    if (saving) return;
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Gradient similar to Target Design */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background -z-10" />
      
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-50 p-3 rounded-full bg-card border-2 border-border shadow-lg hover:scale-105 transition-transform"
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-3xl p-8 lg:p-12 shadow-2xl animate-fade-in">
          
          {/* Progress Bar (Stepper) */}
          <div className="mb-10">
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative z-10',
                      step < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : step === currentStep
                        ? 'bg-primary text-primary-foreground shadow-glow scale-110'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <span
                    className={cn(
                      'text-xs mt-2 font-medium hidden sm:block',
                      step === currentStep ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {step === 1 && 'Profile'}
                    {step === 2 && 'Body'}
                    {step === 3 && 'Activity'}
                    {step === 4 && 'Goal'}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out" 
                style={{ width: `${progressWidth}%` }} 
              />
            </div>
          </div>

          {/* --- Step 1: Profile --- */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Tell us about yourself</h2>
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
                  <Label htmlFor="age" className="text-sm font-semibold">Age</Label>
                  <div className="relative mt-2">
                    <Input
                      id="age"
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Enter your age"
                      className="h-14 text-lg rounded-xl pr-16"
                      min={10} max={100}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">years</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Step 2: Body --- */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Your body measurements</h2>
                <p className="text-muted-foreground mt-2">We'll use this to calculate your daily needs</p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="height" className="text-sm font-semibold">Height</Label>
                  <div className="relative mt-2">
                    <Input
                      id="height"
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="Enter your height"
                      className="h-14 text-lg rounded-xl pr-16"
                      min={80} max={250}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">cm</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="weight" className="text-sm font-semibold">Weight</Label>
                  <div className="relative mt-2">
                    <Input
                      id="weight"
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Enter your weight"
                      className="h-14 text-lg rounded-xl pr-16"
                      min={20} max={300}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">kg</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- Step 3: Activity --- */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Flame className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Your activity level</h2>
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

          {/* --- Step 4: Goal --- */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">What's your goal?</h2>
                <p className="text-muted-foreground mt-2">We'll create a personalized plan for you</p>
              </div>

              {/* Preview Card */}
              {plan && (
                <div className="mb-6 p-5 rounded-2xl border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3 font-medium">Your calculated plan (Calories/day)</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Maintain</p>
                      <p className="text-lg font-bold">{plan.maintain}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Loss (Normal)</p>
                      <p className="text-lg font-bold">{plan.loss}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Extreme Loss</p>
                      <p className="text-lg font-bold">{plan.extremeLoss}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Gain</p>
                      <p className="text-lg font-bold">{plan.gain}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    TDEE: <span className="font-semibold text-foreground">{plan.tdee}</span> • BMR:{' '}
                    <span className="font-semibold text-foreground">{plan.bmr}</span>
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4',
                      goal === g.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-3xl">{g.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-base text-foreground">{g.label}</p>
                      <p className="text-sm text-muted-foreground">{g.description}</p>
                      
                      {/* Show exact calories for this specific option if calculated */}
                      {plan && (
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {g.id === 'maintain' && `${plan.maintain} kcal`}
                          {g.id === 'loss_0_25' && `${plan.mildLoss} kcal`}
                          {g.id === 'loss_0_5' && `${plan.loss} kcal`}
                          {g.id === 'loss_1' && `${plan.extremeLoss} kcal`}
                          {g.id === 'gain' && `${plan.gain} kcal`}
                        </p>
                      )}
                    </div>
                    {goal === g.id && <Check className="w-6 h-6 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex gap-4 mt-10">
            {currentStep > 1 && (
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
                'h-14 text-base font-semibold rounded-xl shadow-lg',
                currentStep === 1 ? 'w-full' : 'flex-1'
              )}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </div>
              ) : currentStep === totalSteps ? (
                <div className="flex items-center gap-2">
                  <span>Finish & Verify</span>
                  <Check className="w-5 h-5" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PreOnboardingPage;