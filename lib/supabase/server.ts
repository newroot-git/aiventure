import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Anon client bound to the request cookies — reads the Supabase auth session.
// Writes still go through supabaseAdmin (service role); this is auth-only.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          // throws in Server Components (read-only cookies) — middleware refreshes instead
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
