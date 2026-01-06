import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Flame, 
  Beef, 
  Wheat, 
  Droplet, 
  TrendingUp, 
  Dumbbell,
  Plus,
  Lightbulb,
  Scale,
  Target,
  ArrowRight,
  Sparkles,
  Activity,
  Calendar,
  Trophy,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import heroNutrition from '@/assets/hero-nutrition.jpg';

interface Profile {
  full_name: string | null;
  daily_calories: number | null;
  weight_kg: number | null;
  goal: string | null;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, daily_calories, weight_kg, goal')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const dailyCalories = { consumed: 1850, target: profile?.daily_calories || 2400 };
  const macros = {
    protein: { current: 120, target: Math.round((profile?.daily_calories || 2400) * 0.3 / 4) },
    carbs: { current: 180, target: Math.round((profile?.daily_calories || 2400) * 0.4 / 4) },
    fat: { current: 55, target: Math.round((profile?.daily_calories || 2400) * 0.3 / 9) },
  };

  const stats = [
    { 
      label: 'السعرات', 
      value: dailyCalories.consumed, 
      target: dailyCalories.target,
      icon: Flame, 
      color: 'primary',
      unit: 'سعرة'
    },
    { 
      label: 'البروتين', 
      value: macros.protein.current, 
      target: macros.protein.target,
      icon: Beef, 
      color: 'orange',
      unit: 'جرام'
    },
    { 
      label: 'الكربوهيدرات', 
      value: macros.carbs.current, 
      target: macros.carbs.target,
      icon: Wheat, 
      color: 'accent',
      unit: 'جرام'
    },
    { 
      label: 'الدهون', 
      value: macros.fat.current, 
      target: macros.fat.target,
      icon: Droplet, 
      color: 'purple',
      unit: 'جرام'
    },
  ];

  const meals = [
    { name: 'الفطور', time: '8:00 صباحاً', calories: 450, status: 'completed' },
    { name: 'الغداء', time: '1:00 ظهراً', calories: 650, status: 'completed' },
    { name: 'سناك', time: '4:00 مساءً', calories: 200, status: 'completed' },
    { name: 'العشاء', time: '7:00 مساءً', calories: 550, status: 'pending' },
  ];

  const workouts = [
    { name: 'تمارين علوية', progress: 85, color: 'primary', icon: '💪' },
    { name: 'كارديو', progress: 60, color: 'accent', icon: '🏃' },
    { name: 'تمارين البطن', progress: 40, color: 'orange', icon: '🎯' },
  ];

  const insights = [
    { type: 'success', title: 'ممتاز في البروتين!', message: 'أنت على المسار الصحيح لتحقيق هدف البروتين اليوم.' },
    { type: 'warning', title: 'نقص في الكربوهيدرات', message: 'فكر في إضافة بعض الحبوب الكاملة في وجبتك القادمة.' },
    { type: 'info', title: 'تذكير التمرين', message: 'لم تسجل تمريناً اليوم. حان وقت الحركة!' },
  ];

  const quickActions = [
    { icon: Plus, label: 'سجل وجبة', color: 'primary', path: '/nutrition' },
    { icon: Dumbbell, label: 'ابدأ تمرين', color: 'accent', path: '/workouts' },
    { icon: Scale, label: 'سجل الوزن', color: 'purple', path: '/inbody' },
    { icon: Sparkles, label: 'اسأل الذكاء الاصطناعي', color: 'orange', path: '/ai-assistant' },
  ];

  const caloriePercent = Math.min((dailyCalories.consumed / dailyCalories.target) * 100, 100);
  const circumference = 2 * Math.PI * 80;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'صديقنا';

  return (
    <MainLayout 
      title={`مرحباً، ${firstName}!`}
      subtitle="إليك ملخص لياقتك البدنية لهذا اليوم"
    >
      {/* Welcome Banner with Image */}
      <Card className="relative overflow-hidden mb-8 bg-gradient-to-r from-primary/10 via-accent/5 to-purple/10 border-none animate-fade-in">
        <div className="absolute inset-0 opacity-20">
          <img src={heroNutrition} alt="" className="w-full h-full object-cover" />
        </div>
        <CardContent className="relative py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow animate-bounce-in">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">يوم جديد، هدف جديد!</h2>
                <p className="text-muted-foreground">لقد أكملت 75% من أهدافك أمس. استمر!</p>
              </div>
            </div>
            <div className="flex gap-3">
              {quickActions.slice(0, 2).map((action, i) => (
                <Button 
                  key={i}
                  onClick={() => navigate(action.path)}
                  className={cn(
                    "gap-2 shadow-lg hover:scale-105 transition-transform",
                    i === 0 ? "bg-gradient-primary shadow-glow" : ""
                  )}
                  variant={i === 0 ? 'default' : 'outline'}
                >
                  <action.icon className="w-5 h-5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in card-hover"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all group-hover:scale-110 group-hover:shadow-glow",
                action.color === 'primary' && "bg-gradient-primary",
                action.color === 'accent' && "bg-accent",
                action.color === 'purple' && "bg-purple",
                action.color === 'orange' && "bg-orange"
              )}>
                <action.icon className="w-7 h-7 text-white" />
              </div>
              <p className="font-medium text-foreground">{action.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const percent = Math.round((stat.value / stat.target) * 100);
          return (
            <Card 
              key={index} 
              className="relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={cn(
                "absolute top-0 left-0 right-0 h-1.5 transition-all",
                stat.color === 'primary' && "bg-gradient-primary",
                stat.color === 'orange' && "bg-orange",
                stat.color === 'accent' && "bg-accent",
                stat.color === 'purple' && "bg-purple"
              )} />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-3xl font-bold text-foreground">{percent}%</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.value}/{stat.target} {stat.unit}
                    </p>
                  </div>
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    stat.color === 'primary' && "bg-primary/10 text-primary",
                    stat.color === 'orange' && "bg-orange/10 text-orange",
                    stat.color === 'accent' && "bg-accent/10 text-accent",
                    stat.color === 'purple' && "bg-purple/10 text-purple"
                  )}>
                    <stat.icon className="w-7 h-7" />
                  </div>
                </div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      stat.color === 'primary' && "bg-gradient-primary",
                      stat.color === 'orange' && "bg-orange",
                      stat.color === 'accent' && "bg-accent",
                      stat.color === 'purple' && "bg-purple"
                    )}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calorie Ring */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Flame className="w-5 h-5 text-white" />
              </div>
              السعرات اليومية
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="14"
                />
                <circle
                  cx="90"
                  cy="90"
                  r="80"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-foreground">{dailyCalories.consumed}</span>
                <span className="text-sm text-muted-foreground">من {dailyCalories.target}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 w-full mt-6">
              {Object.entries(macros).map(([name, values]) => (
                <div key={name} className="text-center p-3 rounded-xl bg-muted/50">
                  <div className="text-xl font-bold text-foreground">{values.current}g</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {name === 'protein' ? 'بروتين' : name === 'carbs' ? 'كربوهيدرات' : 'دهون'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              وجبات اليوم
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => navigate('/nutrition')}>
              عرض الكل <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {meals.map((meal, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                    meal.status === 'completed' ? "bg-accent/20" : "bg-muted"
                  )}>
                    {meal.status === 'completed' ? '✅' : '⏳'}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{meal.name}</p>
                    <p className="text-xs text-muted-foreground">{meal.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-primary">{meal.calories}</span>
                  <span className="text-xs text-muted-foreground">سعرة</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workout Progress */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Dumbbell className="w-5 h-5 text-white" />
              </div>
              تقدم التمارين
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workouts.map((workout, index) => (
              <div key={index} className="flex items-center gap-4 group">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110",
                  workout.color === 'primary' && "bg-primary/10",
                  workout.color === 'accent' && "bg-accent/10",
                  workout.color === 'orange' && "bg-orange/10"
                )}>
                  {workout.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-foreground">{workout.name}</p>
                    <span className="text-xl font-bold text-foreground">{workout.progress}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        workout.color === 'primary' && "bg-gradient-primary",
                        workout.color === 'accent' && "bg-accent",
                        workout.color === 'orange' && "bg-orange"
                      )}
                      style={{ width: `${workout.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button 
              className="w-full mt-4 bg-gradient-primary shadow-glow gap-2 hover:scale-[1.02] transition-transform"
              onClick={() => navigate('/workouts')}
            >
              <Play className="w-5 h-5" />
              ابدأ تمرين
            </Button>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="lg:col-span-8 animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-warning" />
              </div>
              نصائح الذكاء الاصطناعي
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-primary gap-1" onClick={() => navigate('/ai-assistant')}>
              اسأل المزيد <ArrowRight className="w-4 h-4 mr-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={cn(
                  "flex gap-4 p-4 rounded-xl border-r-4 transition-all hover:scale-[1.01]",
                  insight.type === 'success' && "bg-accent/10 border-accent",
                  insight.type === 'warning' && "bg-orange/10 border-orange",
                  insight.type === 'info' && "bg-primary/10 border-primary"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                  insight.type === 'success' && "bg-accent/20 text-accent",
                  insight.type === 'warning' && "bg-orange/20 text-orange",
                  insight.type === 'info' && "bg-primary/20 text-primary"
                )}>
                  {insight.type === 'success' ? '🎉' : insight.type === 'warning' ? '⚠️' : '💡'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weight Progress */}
        <Card className="lg:col-span-4 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              تقدم الوزن
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-5xl font-bold text-foreground">{profile?.weight_kg || 85.2}</p>
              <p className="text-sm text-muted-foreground">الوزن الحالي (كجم)</p>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <div className="text-center p-3 rounded-xl bg-muted/50 flex-1 mx-1">
                <p className="font-semibold text-foreground">87.5</p>
                <p className="text-xs text-muted-foreground">البداية</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-accent/10 flex-1 mx-1">
                <p className="font-semibold text-accent">-2.3</p>
                <p className="text-xs text-muted-foreground">التغيير</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-primary/10 flex-1 mx-1">
                <p className="font-semibold text-primary">80.0</p>
                <p className="text-xs text-muted-foreground">الهدف</p>
              </div>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
                style={{ width: '31%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">31% نحو الهدف</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

// Add missing Play icon
const Play = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

export default DashboardPage;
