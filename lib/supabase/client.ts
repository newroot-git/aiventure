"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client (anon key) for client-side reads + auth.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
