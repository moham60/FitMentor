import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    accountType: "user" | "coach",
    extraData?: Record<string, unknown>,
    emailRedirectTo?: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ error: AuthError | null }>;
  isNewUser: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType: "user" | "coach",
    extraData?: Record<string, unknown>,
    emailRedirectTo?: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: emailRedirectTo ?? `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          account_type: accountType,
          ...(extraData ?? {}),
        },
      },
    });

    return { error: error as AuthError | null };
  };

  /**
   * ✅ Google login should return to GoogleOnboardingPage first
   * Important: you must add this URL in Supabase -> Auth -> URL Configuration -> Redirect URLs
   * e.g. http://localhost:8080/google-onboarding
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error as AuthError | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateUserMetadata = async (metadata: Record<string, any>) => {
    const { error } = await supabase.auth.updateUser({ data: metadata });
    return { error: error as AuthError | null };
  };

  /**
   * ✅ Better "new user" check:
   * بعض المشاريع بتعمل profile تلقائي (trigger) => فـ data موجودة
   * لكن full_name / account_type بيكونوا فاضيين
   */
  const isNewUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, account_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if user is new:', error);
      return true;
    }

    if (!data) return true;

    const nameOk = typeof data.full_name === 'string' && data.full_name.trim().length > 0;
    const typeOk = typeof data.account_type === 'string' && data.account_type.trim().length > 0;

    return !(nameOk && typeOk);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateUserMetadata,
        isNewUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
