import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// "I'm a judge" — spin up a fresh throwaway profile and sign in via the av_uid
// cookie. No email needed. The seeded crew show up as friends automatically
// (getFriends = everyone else), so they can invite/nudge straight away.
export async function POST() {
  const db = supabaseAdmin();
  const n = Math.floor(Math.random() * 9000 + 1000);
  const { data, error } = await db.from("profiles")
    .insert({ name: `Guest ${n}`, email: null, interests: ["Hiking", "Food", "Live music"] } as never)
    .select("id").single();
  if (error || !data) return NextResponse.json({ error: "could not start guest" }, { status: 500 });
  const id = (data as unknown as { id: string }).id;
  const res = NextResponse.json({ ok: true });
  res.cookies.set("av_uid", id, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}
