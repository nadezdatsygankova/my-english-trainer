import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Quick sanity check on localhost
if (import.meta.env.DEV) {
  console.log("[supabase] URL:", url?.slice(0, 24) + "…");
  console.log("[supabase] key present:", !!anon);
}

export const supabase = createClient(url, anon);
