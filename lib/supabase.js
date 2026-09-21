import { createClient } from "@supabase/supabase-js";

let cached = null;

// Server-only client (service_role key). Must never be imported from a
// "use client" component — only from API routes / server code.
export function getSupabase() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
