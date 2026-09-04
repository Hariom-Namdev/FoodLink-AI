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

const MAX_PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY_MS = 400;

async function fetchProfile(): Promise<Profile | null> {
  // Use SECURITY DEFINER RPC to bypass RLS — works even if policies are misconfigured
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  return (data as Profile) ?? null;
}

async function loadProfileWithRetry(): Promise<Profile | null> {
  for (let attempt = 0; attempt < MAX_PROFILE_RETRIES; attempt++) {
    try {
      const profile = await fetchProfile();
      if (profile) return profile;
    } catch (err) {
      console.warn(`Profile fetch attempt ${attempt + 1} failed:`, err);
    }
    if (attempt < MAX_PROFILE_RETRIES - 1) {
      await new Promise((r) => setTimeout(r, PROFILE_RETRY_DELAY_MS));
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadProfile = useCallback(async () => {
    const profile = await loadProfileWithRetry();
    if (isMounted.current) {
      setUser(profile);
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
        await loadProfile();
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
          await loadProfile();
        }
      } catch (err) {
        console.warn('Init session error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();

    // Defer async work inside onAuthStateChange to avoid the known Supabase deadlock
    // where calling Supabase queries synchronously in the callback blocks the auth layer.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setTimeout(() => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          return;
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
          loadProfile();
        }
      }, 0);
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
        const profile = await loadProfileWithRetry();
        if (profile && isMounted.current) {
          setUser(profile);
        } else if (isMounted.current) {
          // Profile trigger may have failed — create profile via SECURITY DEFINER RPC
          const { data: upserted, error: upsertError } = await supabase.rpc('upsert_my_profile', {
            p_full_name: meta.full_name,
            p_role: meta.role,
            p_organization: meta.organization,
            p_phone: meta.phone,
            p_city: meta.city,
          });
          if (!upsertError && upserted && isMounted.current) {
            setUser(upserted as Profile);
          }
        }
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
        const profile = await loadProfileWithRetry();
        if (profile && isMounted.current) {
          setUser(profile);
        } else {
          return { error: 'Account profile not found. Please contact support.' };
        }
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
