import { NextResponse, type NextRequest } from "next/server";
import { seedDemoAccount } from "@/lib/db";
import { signGuest } from "@/lib/guest";
import { rateLimit, clientIp, clientError } from "@/lib/http";

export const runtime = "nodejs";

// Create a pre-seeded demo account (name only) and sign in as it via the av_uid cookie.
export async function POST(req: NextRequest) {
  let body: { name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  if (!body.name || !body.name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!rateLimit(`demo:${clientIp(req)}`, 8, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many demo accounts. Try again later." }, { status: 429 });
  }
  try {
    const { userId } = await seedDemoAccount(body.name);
    const res = NextResponse.json({ ok: true });
    res.cookies.set("av_uid", signGuest(userId), {
      path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax",
      httpOnly: true, secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error("[/api/demo]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
