import { createClient } from '@supabase/supabase-client';

// Ambil URL dan Anon Key dari environment variable (.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Peringatan: URL atau Anon Key Supabase belum diatur di file .env gais!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
