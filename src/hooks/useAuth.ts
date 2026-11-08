import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut as apiSignOut } from '../services/supabase/auth';
import { isSupabaseConfigured } from '../services/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    getSession().then((currSession) => {
      setSession(currSession);
      setUser(currSession?.user ?? null);
      setLoading(false);
    });

    const { data: authListener } = onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [configured]);

  const signOut = async () => {
    await apiSignOut();
    setUser(null);
    setSession(null);
  };

  return {
    user,
    session,
    loading,
    configured,
    signOut,
  };
}
