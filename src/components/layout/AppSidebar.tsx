import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


import { 
  Dumbbell, 
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { coachNavItems, userNavItems } from '@/lib/NavLinks';




const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [cachedAccountType, setCachedAccountType] = useState<string | null>(() => {
    // Load from localStorage on mount
    return localStorage.getItem('user_account_type');
  });
  
  // Get account type with priority and cache it
  const accountType = useMemo(() => {
    const type = user?.user_metadata?.account_type || profile?.account_type || cachedAccountType;
    
    // Cache it for next time
    if (type && type !== cachedAccountType) {
      localStorage.setItem('user_account_type', type);
      setCachedAccountType(type);
    }
    
    return type;
  }, [user?.user_metadata?.account_type, profile?.account_type, cachedAccountType]);
  
  // Calculate navItems - only when we have account type
  const navItems = useMemo(() => {
    if (!accountType) return null;
    return accountType === 'coach' ? coachNavItems : userNavItems;
  }, [accountType]);
  
  // Clear cache on sign out
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('user_account_type');
      setCachedAccountType(null);
    }
  }, [user]);
  
  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Build a usable avatar image URL (supports public URL or private bucket path)
  useEffect(() => {
    const run = async () => {
      const avatar = profile?.avatar_url || null;
      if (!avatar) {
        setAvatarSrc(null);
        return;
      }

      if (avatar.startsWith('http')) {
        setAvatarSrc(avatar);
        return;
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(avatar, 60 * 60);

      if (error) {
        console.error('Error creating signed URL for sidebar avatar:', error);
        setAvatarSrc(null);
        return;
      }

      setAvatarSrc(data.signedUrl);
    };

    run();
  }, [profile?.avatar_url]);
  
  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-md"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full w-[280px] bg-sidebar z-50 transition-transform duration-300 flex flex-col",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-display font-bold text-sidebar-foreground">
            FitMentor
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-4 overflow-y-auto">
          <ul className="space-y-1">
            {!navItems ? (
              // Loading state - show nothing or minimal placeholder
              <li className="px-4 py-3 text-sm text-sidebar-foreground/50 text-center">
                Loading...
              </li>
            ) : (
              navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
              })
            )}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center overflow-hidden">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-primary-foreground">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-sidebar-border transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-sidebar-foreground/60" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
