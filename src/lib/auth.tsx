import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase, type Profile, type Role } from './supabase';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, meta: { full_name: string; role: Role; organization: string; phone: string; city: string }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) {
        console.warn('Failed to load profile:', error.message);
        return;
      }
      if (data && isMounted.current) {
        setUser(data as Profile);
      }
    } catch (err) {
      console.warn('Profile load error:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        if (isMounted.current) setUser(null);
        return;
      }
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        if (isMounted.current) setUser(null);
      }
    } catch (err) {
      console.warn('Session refresh error:', err);
      if (isMounted.current) setUser(null);
    }
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Initial session error:', error.message);
        } else if (session?.user && mounted) {
          await loadProfile(session.user.id);
        }
      } catch (err) {
        console.warn('Init session error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          loadProfile(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp: AuthState['signUp'] = async (email, password, meta) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: meta },
      });
      if (error) return { error: error.message };
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Sign up failed. Please try again.' };
    }
  };

  const signIn: AuthState['signIn'] = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        await loadProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Sign in failed. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    if (isMounted.current) setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
