import { NextResponse } from "next/server";
import { addCustomOption, addResolvedPlace, currentUserId } from "@/lib/db";
import { clientError, rateLimit, clientIp } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(req: Request) {
  let body: { slug?: string; title?: string; area?: string; slotKey?: string; day?: number; ai?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug || !body.title?.trim() || !body.slotKey) {
    return NextResponse.json({ error: "slug + title + slotKey required" }, { status: 400 });
  }
  // the "ask AI to find this exact place" path costs an LLM call — gate + limit it
  if (body.ai) {
    if (!(await currentUserId())) return NextResponse.json({ error: "sign in required" }, { status: 401 });
    if (!rateLimit(`resolve:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: "Slow down a moment, then try again." }, { status: 429 });
    }
  }
  try {
    const ok = body.ai
      ? await addResolvedPlace(body.slug, body.title, body.slotKey, body.day ?? 1)
      : await addCustomOption(body.slug, body.title, body.slotKey, body.day ?? 1, body.area);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("[/api/plans/add-option]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
