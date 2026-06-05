// client/src/config/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Read from Vite's decoupled environment manager properties
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Supabase initialization failure: Missing client environment environment key maps.");
}

// Export the centralized storage engine instance
export const supabaseStorage = createClient(supabaseUrl || '', supabaseAnonKey || '');