import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientIp, clientError } from "@/lib/http";
import { signGuest, verifyGuest } from "@/lib/guest";

export const runtime = "nodejs";

// "I'm a judge" — sign in as a throwaway guest via the av_uid cookie. Reuses the
// existing guest if one's already set (so tapping again doesn't churn accounts);
// only mints a new profile when there isn't a valid one.
export async function POST(req: NextRequest) {
  try {
    const db = supabaseAdmin();
    const existing = verifyGuest(req.cookies.get("av_uid")?.value);
    if (existing) {
      const { data } = await db.from("profiles").select("id").eq("id", existing).maybeSingle();
      if (data) return NextResponse.json({ ok: true, reused: true });
    }
    // only mint-new is rate-limited (reuse above is free) — stops guest-account floods
    if (!rateLimit(`guest:${clientIp(req)}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many guest sessions. Try again later." }, { status: 429 });
    }
    const n = Math.floor(Math.random() * 9000 + 1000);
    const { data, error } = await db.from("profiles")
      .insert({ name: `Guest ${n}`, email: null, interests: ["Hiking", "Food", "Live music"] } as never)
      .select("id").single();
    if (error || !data) return NextResponse.json({ error: "could not start guest" }, { status: 500 });
    const id = (data as unknown as { id: string }).id;
    const res = NextResponse.json({ ok: true });
    // signed + httpOnly so it can't be read by page JS or forged to another uuid
    res.cookies.set("av_uid", signGuest(id), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error("[/api/guest]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
