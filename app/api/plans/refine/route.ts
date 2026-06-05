import { NextResponse } from "next/server";
import { refineSlot, refineAll, currentUserId } from "@/lib/db";
import { clientError, rateLimit, clientIp } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  if (!rateLimit(`refine:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Slow down a moment, then try again." }, { status: 429 });
  }
  let body: { slug?: string; slotKey?: string; day?: number; feedback?: string; all?: boolean; append?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!body.all && !body.slotKey) return NextResponse.json({ error: "slotKey or all required" }, { status: 400 });
  try {
    // whole-plan tweak always re-rolls; a single slot can append (add more) or replace
    if (body.all) await refineAll(body.slug, body.feedback, body.day);
    else await refineSlot(body.slug, body.slotKey!, body.day ?? 1, body.feedback, !!body.append);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/plans/refine]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
