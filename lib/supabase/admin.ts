import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side reads/writes (API routes, server actions).
// MVP runs without RLS — this client is the trusted server gateway. Never import in client code.
// SECURITY DEBT (tracked in review.md): add RLS before any real launch.

let cached: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
