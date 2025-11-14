
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL_PLACEHOLDER";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY_PLACEHOLDER";

if (supabaseUrl === "YOUR_SUPABASE_URL_PLACEHOLDER" || supabaseAnonKey === "YOUR_SUPABASE_ANON_KEY_PLACEHOLDER") {
    console.warn("Supabase credentials are not set. Please update supabase.ts with your project URL and anon key.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
