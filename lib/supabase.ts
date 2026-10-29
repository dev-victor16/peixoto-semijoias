import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey));

let _supabaseClient: SupabaseClient | null = null;
let _supabaseAdminClient: SupabaseClient | null = null;

// Cliente público / anônimo
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_supabaseClient) return _supabaseClient;
  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey);
  return _supabaseClient;
}

// Cliente com privilégios administrativos (service_role se disponível, senão anon)
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (_supabaseAdminClient) return _supabaseAdminClient;
  _supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return _supabaseAdminClient;
}
