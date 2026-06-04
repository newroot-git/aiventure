import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// "I'm a judge" — sign in as a throwaway guest via the av_uid cookie. Reuses the
// existing guest if one's already set (so tapping again doesn't churn accounts);
// only mints a new profile when there isn't a valid one.
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();
  const existing = req.cookies.get("av_uid")?.value;
  if (existing) {
    const { data } = await db.from("profiles").select("id").eq("id", existing).maybeSingle();
    if (data) return NextResponse.json({ ok: true, reused: true });
  }
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
