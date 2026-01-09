import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, User, Activity, Target, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client'; // ✅ عدّل المسار لو مختلف

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
type Gender = 'male' | 'female';
type GoalId = 'maintain' | 'loss_0_25' | 'loss_0_5' | 'loss_1' | 'gain';

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

  // زي المثال (نِسَب)
  const maintain = tdee * 1.0;
  const mildLoss = tdee * 0.9;   // 90%
  const loss = tdee * 0.81;      // 81%
  const extremeLoss = tdee * 0.62; // 62%

  // اختياري للزيادة
  const gain = tdee * 1.1; // +10%

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

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<GoalId | null>(null);

  const [saving, setSaving] = useState(false);

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: '🪑' },
    { id: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', icon: '🚶' },
    { id: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', icon: '🏃' },
    { id: 'very', label: 'Very Active', description: 'Hard exercise 6-7 days/week', icon: '🏋️' },
    { id: 'extra', label: 'Extra Active', description: 'Very hard exercise & physical job', icon: '💪' },
  ] as const;

  // ✅ Step 4 goals (زي المثال + gain)
  const goals = [
    { id: 'maintain', label: 'Maintain weight', description: '100% Calories/day', icon: '⚖️', color: 'text-primary' },
    { id: 'loss_0_25', label: 'Mild weight loss', description: '0.25 kg/week • 90%', icon: '📉', color: 'text-warning' },
    { id: 'loss_0_5', label: 'Weight loss', description: '0.5 kg/week • 81%', icon: '🔥', color: 'text-destructive' },
    { id: 'loss_1', label: 'Extreme weight loss', description: '1 kg/week • 62%', icon: '🚨', color: 'text-destructive' },
    { id: 'gain', label: 'Gain weight', description: '+10% Calories/day', icon: '📈', color: 'text-accent' },
  ] as const;

  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

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

  const selectedDailyCalories = useMemo(() => {
    if (!plan || !goal) return null;

    switch (goal) {
      case 'loss_0_25':
        return plan.mildLoss;
      case 'loss_0_5':
        return plan.loss;
      case 'loss_1':
        return plan.extremeLoss;
      case 'gain':
        return plan.gain;
      case 'maintain':
      default:
        return plan.maintain;
    }
  }, [plan, goal]);

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!gender) {
        toast.error('Please select your gender');
        return false;
      }
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

    if (currentStep === 3) {
      if (!activityLevel) {
        toast.error('Please select your activity level');
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
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
    if (!user?.id) {
      toast.error('Please sign in first');
      navigate('/signin');
      return;
    }

    if (!plan || !selectedDailyCalories) {
      toast.error('Unable to calculate calories');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        gender,
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        activity_level: activityLevel,
        goal,
        account_type: user.user_metadata?.account_type || 'user',

        // ✅ محسوبات السعرات
        bmr: plan.bmr,
        tdee: plan.tdee,
        calories_maintain: plan.maintain,
        calories_mild_loss: plan.mildLoss,
        calories_loss: plan.loss,
        calories_extreme_loss: plan.extremeLoss,
        calories_gain: plan.gain,

        // ✅ الهدف المختار لليوم
        daily_calories: selectedDailyCalories,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Profile + Calories saved successfully!');
      navigate('/dashboard');
    } catch {
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
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

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
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative z-10',
                      step < currentStep
                        ? 'bg-accent text-accent-foreground'
                        : step === currentStep
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <span
                    className={cn(
                      'text-xs mt-2 font-medium',
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
              <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progressWidth}%` }} />
            </div>
          </div>

          {/* Step 1 */}
          {currentStep === 1 && (
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
          {currentStep === 2 && (
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
          {currentStep === 3 && (
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
          {currentStep === 4 && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">What's your goal?</h2>
                <p className="text-muted-foreground mt-2">We'll create a personalized plan for you</p>
              </div>

              {/* ✅ Preview card */}
              {plan && (
                <div className="mb-6 p-5 rounded-2xl border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3">Your calculated plan (Calories/day)</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Maintain</p>
                      <p className="text-lg font-bold">{plan.maintain}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Mild loss (90%)</p>
                      <p className="text-lg font-bold">{plan.mildLoss}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Loss (81%)</p>
                      <p className="text-lg font-bold">{plan.loss}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border/50">
                      <p className="text-muted-foreground text-xs">Extreme (62%)</p>
                      <p className="text-lg font-bold">{plan.extremeLoss}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
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
                      'w-full p-6 rounded-xl border-2 transition-all text-left flex items-center gap-4',
                      goal === g.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-4xl">{g.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-foreground">{g.label}</p>
                      <p className="text-muted-foreground">{g.description}</p>

                      {/* ✅ show exact calories for each option */}
                      {plan && (
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {g.id === 'maintain' && `${plan.maintain} Calories/day`}
                          {g.id === 'loss_0_25' && `${plan.mildLoss} Calories/day`}
                          {g.id === 'loss_0_5' && `${plan.loss} Calories/day`}
                          {g.id === 'loss_1' && `${plan.extremeLoss} Calories/day`}
                          {g.id === 'gain' && `${plan.gain} Calories/day`}
                        </p>
                      )}
                    </div>
                    {goal === g.id && <Check className="w-6 h-6 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
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
                'h-14 bg-gradient-primary hover:opacity-90 text-primary-foreground text-base font-semibold rounded-xl shadow-glow',
                currentStep === 1 ? 'w-full' : 'flex-1'
              )}
            >
              {saving ? 'Saving...' : currentStep === totalSteps ? 'Complete Setup' : 'Continue'}
              {!saving && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
