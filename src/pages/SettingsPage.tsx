import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/contexts/ThemeContext';
// ✅ FIX 1: Import supabase directly to use 'updateUser' for password reset
import { supabase } from '@/integrations/supabase/client'; 
import { toast } from 'sonner';
import { 
  Sun,
  Moon,
  Bell,
  Globe,
  Lock,
  Trash2,
  Download,
  HelpCircle,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  
  // State for Password Reset
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async () => {
    // 1. Basic Validation
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // 2. Supabase Update Call
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setIsResetOpen(false);
      setNewPassword('');
      setConfirmPassword('');

    } catch (error) {
      // ✅ FIX 2: Handle TypeScript 'unknown' error type
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          </CardContent>
        </Card>

        {/* Privacy & Security */}
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
            
            {/* Password Reset Dialog */}
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full mt-2">
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Enter your new password below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <DialogClose asChild>
                    <Button variant="ghost" type="button">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
            <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
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
            <Button variant="ghost" className="w-full justify-start h-auto py-3">FAQ</Button>
            <Button variant="ghost" className="w-full justify-start h-auto py-3">Contact Support</Button>
            <Button variant="ghost" className="w-full justify-start h-auto py-3">Privacy Policy</Button>
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