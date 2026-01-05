import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Crown,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Edit
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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

  return (
    <MainLayout 
      title="Profile"
      subtitle="Manage your account"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-4">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="w-28 h-28 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <span className="text-4xl font-bold text-primary-foreground">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-md hover:bg-muted transition-colors">
                  <Camera className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Name & Email */}
              <h2 className="text-xl font-bold text-foreground mb-1">
                {user?.user_metadata?.full_name || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                <Crown className="w-3 h-3" />
                Premium Member
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
              <Button className="w-full mt-6 gap-2" variant="outline">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
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
                  <Input 
                    value={user?.user_metadata?.full_name || ''} 
                    readOnly 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <Input 
                    value={user?.email || ''} 
                    readOnly 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <Input 
                    placeholder="Add phone number" 
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Location</Label>
                  <Input 
                    placeholder="Add location" 
                    className="mt-1"
                  />
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
                  <p className="text-2xl font-bold text-foreground">85.2</p>
                  <p className="text-xs text-muted-foreground">Weight (kg)</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">178</p>
                  <p className="text-xs text-muted-foreground">Height (cm)</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">28</p>
                  <p className="text-xs text-muted-foreground">Age</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-primary">2,400</p>
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
                    "w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-0",
                    item.highlight && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      item.highlight 
                        ? "bg-primary/10 text-primary" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "font-medium",
                      item.highlight ? "text-primary" : "text-foreground"
                    )}>
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
