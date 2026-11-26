import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

// Supabase is optional. If no credentials are provided the app still runs,
// and scans are simply kept in an in-memory store (see store.js).
let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  console.log('  Supabase: connected');
} else {
  console.log('  Supabase: not configured -> using in-memory store');
}

export const isSupabaseEnabled = () => supabase !== null;
export default supabase;
