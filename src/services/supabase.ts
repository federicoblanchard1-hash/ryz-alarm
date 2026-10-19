import { createClient } from '@supabase/supabase-js';

import { sessionStore } from './sessionStore';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** False when the app was built without the Supabase settings in .env; accounts then stay off. */
export const accountsEnabled = Boolean(url && key);

export const supabase = createClient(url || 'https://invalid.local', key || 'missing', {
  auth: {
    storage: sessionStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
