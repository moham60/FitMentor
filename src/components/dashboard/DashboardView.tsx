import { useEffect, useMemo, useState } from 'react';
import { Play, Plus, TrendingUp, Flame, Target } from 'lucide-react';
import CalorieRing from '../ui/CalorieRing';
import MacroBar from '../ui/MacroBar';
import { Button } from '../ui/button';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type Profile = {
  user_id: string;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;

  daily_calories: number | null;

  // optional if you saved them in onboarding
  calories_maintain?: number | null;
  calories_mild_loss?: number | null;
  calories_loss?: number | null;
  calories_extreme_loss?: number | null;
  calories_gain?: number | null;
};

const DashboardView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Replace with your real tracking later
  const consumedCalories = 1450;

  // keep macros as demo for now
  const macros = {
    protein: { current: 95, target: 154 },
    carbs: { current: 120, target: 200 },
    fat: { current: 45, target: 65 },
  };

  const streak = 12;
  const weight = { current: 78, previous: 79.5 };

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        navigate('/signin');
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!error) setProfile(data as Profile);
      setLoading(false);
    };

    run();
  }, [user?.id, navigate]);

  const displayName = useMemo(() => {
    return (
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')[0] ||
      'User'
    );
  }, [profile?.full_name, user?.user_metadata?.full_name, user?.email]);

  const profileComplete = useMemo(() => {
    return Boolean(
      profile?.gender &&
        profile?.age &&
        profile?.height_cm &&
        profile?.weight_kg &&
        profile?.activity_level &&
        profile?.goal &&
        profile?.daily_calories
    );
  }, [profile]);

  const targetCalories = profile?.daily_calories ?? 2200;

  if (loading) {
    return <div className="pb-24 animate-fade-in">Loading dashboard...</div>;
  }

  // ✅ If incomplete, show CTA (NO auto redirect)
  if (!profileComplete) {
    return (
      <div className="pb-24 animate-fade-in">
        <div className="bg-gradient-card rounded-2xl p-6 border border-border/50 shadow-card">
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Finish your setup
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            We need your profile details (age, height, weight, activity, goal) to calculate your daily calories.
          </p>
          <Button className="w-full" onClick={() => navigate('/onboarding')}>
            Go to Onboarding
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-muted-foreground text-sm">Good morning</p>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {displayName} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-accent/20 rounded-full px-3 py-1.5">
          <Flame className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-accent">{streak} days</span>
        </div>
      </div>

      {/* Calorie Ring Card */}
      <div className="bg-gradient-card rounded-2xl p-6 border border-border/50 shadow-card mb-6">
        <div className="flex flex-col items-center">
          <CalorieRing consumed={consumedCalories} target={targetCalories} />

          <div className="flex justify-center gap-8 mt-6 w-full">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{consumedCalories}</p>
              <p className="text-xs text-muted-foreground">Consumed</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{targetCalories}</p>
              <p className="text-xs text-muted-foreground">Target</p>
            </div>
          </div>

          {/* Optional: show the full plan if you saved those columns */}
          <div className="mt-6 w-full grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground">Maintain</p>
              <p className="text-lg font-bold">{profile?.calories_maintain ?? '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground">Mild loss</p>
              <p className="text-lg font-bold">{profile?.calories_mild_loss ?? '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground">Loss</p>
              <p className="text-lg font-bold">{profile?.calories_loss ?? '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/50">
              <p className="text-xs text-muted-foreground">Extreme loss</p>
              <p className="text-lg font-bold">{profile?.calories_extreme_loss ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Macros Card */}
      <div className="bg-gradient-card rounded-2xl p-5 border border-border/50 shadow-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Macros</h2>
        </div>
        <div className="space-y-4">
          <MacroBar label="Protein" current={macros.protein.current} target={macros.protein.target} color="primary" />
          <MacroBar label="Carbs" current={macros.carbs.current} target={macros.carbs.target} color="warning" />
          <MacroBar label="Fat" current={macros.fat.current} target={macros.fat.target} color="accent" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button variant="secondary" className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-secondary/80 transition-all">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium">Log Meal</span>
        </Button>
        <Button variant="secondary" className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-secondary/80 transition-all">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-accent" />
          </div>
          <span className="font-medium">Start Workout</span>
        </Button>
      </div>

      {/* Weight Progress */}
      <div className="bg-gradient-card rounded-2xl p-5 border border-border/50 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <h2 className="font-display font-semibold text-foreground">Weight Progress</h2>
          </div>
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-4xl font-display font-bold text-foreground">{weight.current}</span>
          <span className="text-muted-foreground">kg</span>
          <span className="text-success text-sm ml-auto">
            -{(weight.previous - weight.current).toFixed(1)} kg
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
