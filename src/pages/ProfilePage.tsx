import { useEffect, useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Camera,
  Crown,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client'; // ✅ عدّل المسار لو مختلف
import { toast } from 'sonner';

type Profile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  goal: string | null;
  daily_calories: number | null;
};

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        navigate('/signin');
        return;
      }

      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // لو مفيش row لسه (rare) أو أي خطأ
        console.error(error);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }

      setLoadingProfile(false);
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

  const avatarLetter = useMemo(() => {
    return (displayName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();
  }, [displayName, user?.email]);

  const stats = [
    { label: 'Workouts', value: 48 },
    { label: 'Meals Logged', value: 234 },
    { label: 'Days Active', value: 32 },
    { label: 'Goals Met', value: 12 },
  ];

  const menuItems = [
    { icon: Settings, label: 'Account Settings', path: '/settings' },
    { icon: Bell, label: 'Notifications', path: '/settings' },
    { icon: Shield, label: 'Privacy & Security', path: '/settings' },
    { icon: Crown, label: 'Upgrade to Premium', path: '/settings', highlight: true },
    { icon: HelpCircle, label: 'Help & Support', path: '/settings' },
  ];

  const goToEdit = () => {
    // لو عندك صفحة edit profile خليه يروح لها
    // مؤقتًا نوديه للـ onboarding عشان يقدر يكمّل البيانات
    navigate('/onboarding');
    toast.message('You can update your profile info in onboarding for now.');
  };

  return (
    <MainLayout title="Profile" subtitle="Manage your account">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-4">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-28 h-28 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <span className="text-4xl font-bold text-primary-foreground">
                    {avatarLetter}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Change profile picture"
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-md hover:bg-muted transition-colors"
                  onClick={() => toast.message('Avatar upload not implemented yet.')}
                >
                  <Camera className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Name & Email */}
              <h2 className="text-xl font-bold text-foreground mb-1">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>

              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                <Crown className="w-3 h-3" />
                {profile?.account_type === 'coach' ? 'Coach' : 'Premium Member'}
              </span>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 w-full mt-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Edit Profile Button */}
              <Button className="w-full mt-6 gap-2" variant="outline" onClick={goToEdit}>
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>

              {loadingProfile && (
                <p className="text-xs text-muted-foreground mt-3">Loading profile...</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Full Name</Label>
                  <Input value={profile?.full_name ?? ''} readOnly className="mt-1" />
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <Input value={user?.email ?? ''} readOnly className="mt-1" />
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Gender</Label>
                  <Input value={profile?.gender ?? ''} readOnly className="mt-1" />
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Activity Level</Label>
                  <Input value={profile?.activity_level ?? ''} readOnly className="mt-1" />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-sm text-muted-foreground">Goal</Label>
                  <Input value={profile?.goal ?? ''} readOnly className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fitness Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Fitness Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.weight_kg ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Weight (kg)</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.height_cm ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Height (cm)</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {profile?.age ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Age</p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {profile?.daily_calories ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Daily Goal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <Card>
            <CardHeader>
              <CardTitle>Settings & More</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0',
                    item.highlight && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        item.highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={cn('font-medium', item.highlight ? 'text-primary' : 'text-foreground')}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 p-4 hover:bg-destructive/10 transition-colors text-destructive"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="font-medium">Sign Out</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
