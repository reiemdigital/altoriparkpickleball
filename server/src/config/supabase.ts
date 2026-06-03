// server/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 🔍 SENIOR DIAGNOSTIC LAYER: Print available keys to the log safely
console.log("=========================================");
console.log("☁️ CLOUD ENVIRONMENT DIAGNOSTIC SCAN ☁️");
console.log("Detected Env Keys containing 'SUPABASE':", 
  Object.keys(process.env).filter(key => key.toUpperCase().includes('SUPABASE'))
);
console.log("SUPABASE_URL detected? ->", !!process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY detected? ->", !!process.env.SUPABASE_ANON_KEY);
console.log("SUPABASE_SERVICE_ROLE_KEY detected? ->", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("=========================================");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Critical Failure: Missing Supabase environment variables (Requires SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});