import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, User, Activity, Target, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Form data
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: '🪑' },
    { id: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', icon: '🚶' },
    { id: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', icon: '🏃' },
    { id: 'very', label: 'Very Active', description: 'Hard exercise 6-7 days/week', icon: '🏋️' },
    { id: 'extra', label: 'Extra Active', description: 'Very hard exercise & physical job', icon: '💪' },
  ];

  const goals = [
    { id: 'lose', label: 'Lose Weight', description: 'Burn fat and get lean', icon: '📉', color: 'text-destructive' },
    { id: 'maintain', label: 'Maintain Weight', description: 'Stay at current weight', icon: '⚖️', color: 'text-primary' },
    { id: 'gain', label: 'Gain Weight', description: 'Build muscle mass', icon: '📈', color: 'text-accent' },
  ];

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      navigate('/dashboard');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

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
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative z-10",
                      step < currentStep
                        ? "bg-accent text-accent-foreground"
                        : step === currentStep
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step < currentStep ? <Check className="w-5 h-5" /> : step}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 font-medium",
                      step === currentStep ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {step === 1 && "Profile"}
                    {step === 2 && "Body"}
                    {step === 3 && "Activity"}
                    {step === 4 && "Goal"}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-500"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>

          {/* Step 1: Gender & Age */}
          {currentStep === 1 && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Tell us about yourself
                </h2>
                <p className="text-muted-foreground mt-2">
                  This helps us personalize your experience
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold">Gender</Label>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <button
                      onClick={() => setGender('male')}
                      className={cn(
                        "p-6 rounded-xl border-2 transition-all text-center",
                        gender === 'male'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-4xl mb-2 block">👨</span>
                      <p className="font-semibold text-foreground">Male</p>
                    </button>
                    <button
                      onClick={() => setGender('female')}
                      className={cn(
                        "p-6 rounded-xl border-2 transition-all text-center",
                        gender === 'female'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
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
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      years
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Height & Weight */}
          {currentStep === 2 && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Your body measurements
                </h2>
                <p className="text-muted-foreground mt-2">
                  We'll use this to calculate your daily needs
                </p>
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
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      kg
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Activity Level */}
          {currentStep === 3 && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Flame className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Your activity level
                </h2>
                <p className="text-muted-foreground mt-2">
                  How active are you in your daily life?
                </p>
              </div>

              <div className="space-y-3">
                {activityLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setActivityLevel(level.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4",
                      activityLevel === level.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{level.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{level.label}</p>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    {activityLevel === level.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Goal */}
          {currentStep === 4 && (
            <div className="animate-slide-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  What's your goal?
                </h2>
                <p className="text-muted-foreground mt-2">
                  We'll create a personalized plan for you
                </p>
              </div>

              <div className="grid gap-4">
                {goals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={cn(
                      "w-full p-6 rounded-xl border-2 transition-all text-left flex items-center gap-4",
                      goal === g.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-4xl">{g.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-foreground">{g.label}</p>
                      <p className="text-muted-foreground">{g.description}</p>
                    </div>
                    {goal === g.id && (
                      <Check className="w-6 h-6 text-primary" />
                    )}
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
                className="flex-1 h-14 rounded-xl text-base font-semibold"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={nextStep}
              className={cn(
                "h-14 bg-gradient-primary hover:opacity-90 text-primary-foreground text-base font-semibold rounded-xl shadow-glow",
                currentStep === 1 ? "w-full" : "flex-1"
              )}
            >
              {currentStep === totalSteps ? 'Complete Setup' : 'Continue'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
