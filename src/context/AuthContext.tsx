import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { Profile, UserRole, AuthState } from '../types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<any>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string; role?: UserRole }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, fallbackUser?: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        if (error) {
          console.warn('Error fetching profile from DB:', error.message);
        }
        const activeUser = fallbackUser || user;
        const defaultProfile: Profile = {
          id: userId,
          email: activeUser?.email || '',
          full_name: activeUser?.user_metadata?.full_name || 'New User',
          role: (activeUser?.user_metadata?.role as UserRole) || 'attendee',
          avatar_url: null,
          created_at: new Date().toISOString()
        };
        setProfile(defaultProfile);
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user).finally(() => setLoading(false));
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      if (error) throw error;

      // Ensure a profile is written explicitly if the trigger is not yet configured or is lagging
      if (data?.user) {
        try {
          // Check if profile was already auto-created by database triggers
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .maybeSingle();

          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email,
                full_name: fullName,
                role,
              });
            if (profileError) {
              console.warn('Explicit profile insertion skipped, profile might be handled by trigger or RLS policies:', profileError.message);
            }
          }

          // Add activity log for new account registration
          try {
            const signUpLog = {
              id: crypto.randomUUID ? crypto.randomUUID() : 'log-' + Math.random().toString(36).slice(2, 11),
              user_id: data.user.id,
              user_name: fullName,
              user_role: role,
              activity_type: 'registration',
              description: `New user registered: ${fullName} (${role})`,
              related_event_id: null,
              created_at: new Date().toISOString()
            };

            const { error: dbL } = await supabase.from('activity_logs').insert(signUpLog);
            if (dbL) {
              const localLogs = JSON.parse(localStorage.getItem('mock_activity_logs') || '[]');
              localLogs.push(signUpLog);
              localStorage.setItem('mock_activity_logs', JSON.stringify(localLogs));
            }

            // Broadcast real-time activity log
            await fetch('/api/activity-logs/emit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(signUpLog)
            }).catch(() => {});
          } catch (logErr) {
            console.warn('Failed to log new signup:', logErr);
          }

        } catch (profileErr: any) {
          console.warn('Explicit profile check/insert skipped:', profileErr.message);
        }
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    });
    if (error) throw error;
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string; role?: UserRole }) => {
    if (!user) throw new Error('Not authenticated');
    
    // Update profiles table
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // Refresh context state
    await fetchProfile(user.id);
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isOrganizer: profile?.role === 'organizer',
    isAttendee: profile?.role === 'attendee',
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
