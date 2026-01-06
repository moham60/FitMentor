import { User, Settings, Bell, Moon, ChevronRight, Target, Trophy, Calendar, LogOut } from 'lucide-react';
import { Button } from '../ui/button';

const ProfileView = () => {
  const user = {
    name: 'Ahmed Mohamed',
    email: 'ahmed@example.com',
    goal: 'Weight Loss',
    memberSince: 'January 15, 2024',
    stats: {
      workouts: 48,
      streak: 12,
      weightLost: 5.2,
    },
  };

  const menuItems = [
    { icon: Target, label: 'My Goals', description: 'Edit fitness goals' },
    { icon: Bell, label: 'Notifications', description: 'Manage alerts' },
    { icon: Moon, label: 'Appearance', description: 'Dark mode' },
    { icon: Settings, label: 'Settings', description: 'Account settings' },
  ];

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
          <User className="w-12 h-12 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">{user.name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
        <div className="mt-2 inline-flex items-center gap-2 bg-primary/20 rounded-full px-3 py-1">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">{user.goal}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Workouts', value: user.stats.workouts, icon: Calendar },
          { label: 'Day Streak', value: user.stats.streak, icon: Trophy },
          { label: 'kg Lost', value: user.stats.weightLost, icon: Target },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-gradient-card rounded-xl p-4 border border-border/50 text-center"
            >
              <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Menu */}
      <div className="space-y-2 mb-8">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              className="w-full flex items-center justify-between p-4 bg-secondary rounded-xl border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Membership Info */}
      <div className="bg-gradient-card rounded-xl p-4 border border-border/50 mb-6">
        <p className="text-sm text-muted-foreground">Member since</p>
        <p className="font-medium text-foreground">{user.memberSince}</p>
      </div>

      {/* Logout */}
      <Button variant="secondary" className="w-full text-destructive hover:bg-destructive/10">
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default ProfileView;
