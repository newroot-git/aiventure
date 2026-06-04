import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Clears the guest/dev cookie. (Supabase session sign-out happens client-side.)
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("av_uid", "", { path: "/", maxAge: 0 });
  return res;
}
