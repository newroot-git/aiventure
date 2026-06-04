import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Dev profile switcher: sets the `av_uid` cookie. This is the seam that real
// magic-link auth will replace (swap for a Supabase session) — every reader
// already goes through currentUserId().
export async function POST(req: Request) {
  // dev-only seam — must never be reachable in production (one-request identity swap)
  if (process.env.NEXT_PUBLIC_DEV_SWITCH !== "1") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("av_uid", body.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
