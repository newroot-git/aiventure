import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Full sign-out: clear the guest cookie AND end the Supabase session server-side
// (signOut expires the sb-* cookies via the SSR cookie adapter). Without the latter
// a "signed out" user stayed authenticated because currentUserId reads the session first.
export async function POST() {
  try {
    const sb = await supabaseServer();
    await sb.auth.signOut();
  } catch {
    // no active session / adapter issue — still clear the guest cookie below
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("av_uid", "", { path: "/", maxAge: 0 });
  return res;
}
