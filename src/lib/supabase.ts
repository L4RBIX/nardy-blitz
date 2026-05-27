/**
 * Supabase client — initialised only when both env vars are present.
 * Every feature that needs Supabase must guard with `isSupabaseConfigured`
 * so the app works without any configuration.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured: boolean =
  Boolean(supabaseUrl && supabaseUrl.length > 0 &&
          supabaseAnonKey && supabaseAnonKey.length > 0);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
