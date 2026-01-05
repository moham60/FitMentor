import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Sun,
  Moon,
  Bell,
  Globe,
  Lock,
  Trash2,
  Download,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <MainLayout 
      title="Settings"
      subtitle="Customize your experience"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-primary" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified about your goals</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Weekly progress reports</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Meal Reminders</p>
                <p className="text-sm text-muted-foreground">Remind me to log meals</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Workout Reminders</p>
                <p className="text-sm text-muted-foreground">Daily workout notifications</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Profile Visibility</p>
                <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Share Progress</p>
                <p className="text-sm text-muted-foreground">Share achievements on leaderboard</p>
              </div>
              <Switch />
            </div>
            <Button variant="outline" className="w-full mt-2">
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Language & Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Language</p>
                <p className="text-sm text-muted-foreground">English (US)</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Export My Data
            </Button>
            <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="ghost" className="w-full justify-start">FAQ</Button>
            <Button variant="ghost" className="w-full justify-start">Contact Support</Button>
            <Button variant="ghost" className="w-full justify-start">Terms of Service</Button>
            <Button variant="ghost" className="w-full justify-start">Privacy Policy</Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground pb-8">
          FitMintor v1.0.0 • Made with ❤️
        </p>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
