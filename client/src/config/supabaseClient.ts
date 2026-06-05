// client/src/config/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Enforces safe fallback handling if environmental keys fail to compile during the build process,
 * avoiding a catastrophic application white-screen layout crash.
 */
const initializeSupabaseEngine = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("⚠️ Supabase initialization failure: Missing client environment key maps.");
    
    // 🛡️ Type-cast the safe proxy object to unknown then SupabaseClient to pass strict linting contracts
    return {
      storage: {
        from: () => ({
          upload: async () => ({ 
            data: null, 
            error: new Error("Supabase is unconfigured. Verify build environment configurations.") 
          }),
          getPublicUrl: () => ({ 
            data: { publicUrl: "" } 
          })
        })
      }
    } as unknown as SupabaseClient;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

// Export exactly one clean, fully type-safe configuration instance block
export const supabaseStorage = initializeSupabaseEngine();