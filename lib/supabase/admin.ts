import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key. NEVER import this in a
// client component or expose the key to the browser.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error("Missing Supabase URL or service role key in env vars");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
