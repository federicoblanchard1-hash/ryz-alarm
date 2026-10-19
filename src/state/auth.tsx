import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { loadProfile, profileFromSettings, saveProfile, settingsFromProfile } from '@/services/account';
import { accountsEnabled, supabase } from '@/services/supabase';
import { useStore } from './store';

interface Auth {
  /** Accounts are configured in this build. */
  enabled: boolean;
  session: Session | null;
  email: string | null;
  /** The saved session has been read; until then we don't know if you're signed in. */
  checked: boolean;
}

const AuthContext = createContext<Auth>({ enabled: false, session: null, email: null, checked: true });

/**
 * Keeps you signed in and your account in step with the app: on sign-in it
 * pulls your profile (name, age, news topics, goals) once, then saves any
 * change back to the account a moment later.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, ready, updateSettings } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(!accountsEnabled);
  // The user whose profile has been pulled; saving waits for it so local defaults never overwrite the account.
  const [pulledFor, setPulledFor] = useState<string | null>(null);
  const settingsRef = useRef(data.settings);
  useLayoutEffect(() => {
    settingsRef.current = data.settings;
  });

  useEffect(() => {
    if (!accountsEnabled) return;
    supabase.auth
      .getSession()
      .then(({ data: d }) => setSession(d.session))
      .finally(() => setChecked(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Phones: refresh the session only while Ryz is in the foreground (Supabase's advice for React Native).
  useEffect(() => {
    if (!accountsEnabled || Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh()));
    return () => sub.remove();
  }, []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId || !ready || pulledFor === userId) return;
    let cancelled = false;
    loadProfile(userId)
      .then((profile) => {
        if (!cancelled && profile) updateSettings(settingsFromProfile(profile, settingsRef.current));
      })
      .catch(() => {})
      .finally(() => !cancelled && setPulledFor(userId));
    return () => {
      cancelled = true;
    };
  }, [userId, ready, pulledFor, updateSettings]);

  const profileJson = JSON.stringify(profileFromSettings(data.settings));
  useEffect(() => {
    if (!userId || pulledFor !== userId) return;
    const timer = setTimeout(() => saveProfile(userId, JSON.parse(profileJson)).catch(() => {}), 1200);
    return () => clearTimeout(timer);
  }, [userId, pulledFor, profileJson]);

  const value = useMemo<Auth>(() => ({ enabled: accountsEnabled, session, email: session?.user.email ?? null, checked }), [session, checked]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  return useContext(AuthContext);
}
