import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { normalizePlanStatus, planLabel, planStatusLabel, type PlanStatus } from '@/lib/subscriptionPlans';

type Profile = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  plan_id?: string | null;
  plan_status?: string | null;
  plan_started_at?: string | null;
  plan_expires_at?: string | null;
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

  // Avatar upload + display
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Generate an image URL that works for both public URLs and private buckets.
  useEffect(() => {
    const run = async () => {
      const avatar = profile?.avatar_url;
      if (!avatar) {
        setAvatarSrc(null);
        return;
      }

      // If we already stored a full URL, use it directly.
      if (avatar.startsWith('http')) {
        setAvatarSrc(avatar);
        return;
      }

      // Otherwise treat it as a storage path and generate a signed URL.
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(avatar, 60 * 60);

      if (error) {
        console.error('Error creating signed URL for avatar:', error);
        setAvatarSrc(null);
        return;
      }

      setAvatarSrc(data.signedUrl);
    };

    run();
  }, [profile?.avatar_url]);

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

  const isCoach = profile?.account_type === 'coach';

  const menuItems = [
    { icon: Settings, label: 'Account Settings', path: '/settings' },
    { icon: Bell, label: 'Notifications', path: '/settings' },
    { icon: Shield, label: 'Privacy & Security', path: '/settings' },
    ...(!isCoach
      ? [{ icon: Crown, label: 'Upgrade Plan', path: '/subscription', highlight: true }]
      : []),
    { icon: HelpCircle, label: 'Help & Support', path: '/settings' },
  ];

  // plan_id = tier (free/basic/gold/premium)
  // plan_status = state (pending/suspended/active). If NULL, treat it as active.
  const currentPlanId = (profile?.plan_id ?? 'free') as string;
  const rawPlanStatus = profile?.plan_status ?? null;
  const normalizedPlanStatus: PlanStatus | null =
    normalizePlanStatus(rawPlanStatus) ?? (rawPlanStatus === null ? 'active' : null);
  const statusLabel = planStatusLabel(normalizedPlanStatus);

  // UX rule: until admin activates, keep user visually on Free.
  const displayPlanId = normalizedPlanStatus === 'active' ? currentPlanId : 'free';
  const planLabelToShow = planLabel(displayPlanId);

  const goToEdit = () => {
    // لو عندك صفحة edit profile خليه يروح لها
    // مؤقتًا نوديه للـ onboarding عشان يقدر يكمّل البيانات
    navigate('/onboarding');
    toast.message('You can update your profile info in onboarding for now.');
  };

  const triggerAvatarPicker = () => {
    if (uploadingAvatar) return;
    fileInputRef.current?.click();
  };

  const handleAvatarSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      // allow selecting the same file again
      e.target.value = '';

      if (!user?.id) {
        toast.error('You must be signed in.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.');
        return;
      }

      const maxSizeMb = 5;
      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`Image is too large. Max ${maxSizeMb}MB.`);
        return;
      }

      setUploadingAvatar(true);

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // Store the storage path in the DB.
      // This works for both public buckets (you can getPublicUrl later)
      // and private buckets (we use createSignedUrl at render time).
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: filePath } : prev));
      toast.success('Profile photo updated!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
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
                <div className="w-28 h-28 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow overflow-hidden">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-primary-foreground">
                      {avatarLetter}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Change profile picture"
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-md hover:bg-muted transition-colors"
                  onClick={triggerAvatarPicker}
                >
                  <Camera className="w-5 h-5 text-foreground" />
                </button>

                {/* A11y: form control must have a label */}
                <label htmlFor="avatar-upload" className="sr-only">
                  Profile photo
                </label>
                <input
                  id="avatar-upload"
                  title="Upload profile photo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelected}
                />
              </div>

              {/* Name & Email */}
              <h2 className="text-xl font-bold text-foreground mb-1">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                  <Crown className="w-3 h-3" />
                  {profile?.account_type === 'coach' ? 'Coach' : 'Member'}
                </span>

                {!isCoach && (
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="focus:outline-none"
                    aria-label="Manage subscription"
                  >
                    <Badge variant={displayPlanId === 'free' ? 'secondary' : 'default'}>
                      {planLabelToShow}
                    </Badge>
                  </button>
                )}
              </div>

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

              {uploadingAvatar && (
                <p className="text-xs text-muted-foreground mt-2">Uploading photo...</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Subscription (users only) */}
          {!isCoach && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Subscription</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={displayPlanId === 'free' ? 'secondary' : 'default'}>
                      {planLabelToShow}
                    </Badge>
                    {normalizedPlanStatus !== 'active' && <Badge variant="outline">{statusLabel}</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  Account status:{' '}
                  <span className="text-foreground font-medium">{statusLabel}</span>
                  {normalizedPlanStatus === 'active' && profile?.plan_expires_at && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Expires on:{' '}
                      <span className="font-medium">
                        {new Date(profile.plan_expires_at).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                  {normalizedPlanStatus === 'pending' && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Your payment is received. You are on Free until approval.
                    </span>
                  )}
                  {normalizedPlanStatus === 'suspended' && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Your subscription is suspended. You are on Free until reactivated.
                    </span>
                  )}
                  {normalizedPlanStatus === null && rawPlanStatus !== null && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Invalid status in DB: <span className="font-medium">{rawPlanStatus}</span>
                    </span>
                  )}
                  {normalizedPlanStatus !== 'active' && currentPlanId !== 'free' && (
                    <span className="block text-xs text-muted-foreground mt-1">
                      Selected plan: <span className="font-medium">{planLabel(currentPlanId)}</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate('/subscription')}>
                    {currentPlanId === 'free' ? 'Upgrade' : 'Change Plan'}
                  </Button>
                  {currentPlanId !== 'free' && normalizedPlanStatus === 'active' && (
                    <Button type="button" onClick={() => navigate('/checkout?plan=' + currentPlanId)}>
                      Renew
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
