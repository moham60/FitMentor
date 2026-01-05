import { Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header = ({ title, subtitle }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border px-6 py-4 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="lg:ml-0 ml-12">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Daily Goal Badge */}
          <div className="hidden md:flex bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-center shadow-glow">
            <div>
              <p className="text-[10px] font-semibold uppercase opacity-90">Daily Goal</p>
              <p className="text-xl font-bold">2,400</p>
              <p className="text-[10px] opacity-90">calories</p>
            </div>
          </div>

          {/* Notifications */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl border-border"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl border-border hover:rotate-180 transition-transform duration-300"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>

          {/* User Avatar */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-muted rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-foreground">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground">Premium</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
