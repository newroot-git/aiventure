import { NextResponse } from "next/server";
import { createPlanFromDrop, invitePeople, currentUserId, type CreateExtras } from "@/lib/db";
import type { DropInput } from "@/lib/ai";
import { clientError, rateLimit, clientIp } from "@/lib/http";

export const runtime = "nodejs";
// trip builds (multi-day, big output) can run long; give them headroom so the
// platform never kills the function mid-build and returns a non-JSON page.
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  if (!rateLimit(`create:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Slow down a moment, then try again." }, { status: 429 });
  }
  let body: DropInput & CreateExtras & { inviteIds?: string[] };
  try {
    body = (await req.json()) as DropInput & CreateExtras & { inviteIds?: string[] };
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  // a description is only required for AI builds; building it yourself needs none
  if (body.aiBuild && (!body?.intent || typeof body.intent !== "string" || !body.intent.trim())) {
    return NextResponse.json({ error: "add a description so AI can build it" }, { status: 400 });
  }
  if (typeof body.intent === "string" && body.intent.length > 500) {
    return NextResponse.json({ error: "description too long (max 500)" }, { status: 400 });
  }
  if (typeof body.intent !== "string") body.intent = "";
  try {
    const { slug } = await createPlanFromDrop(body);
    if (Array.isArray(body.inviteIds) && body.inviteIds.length) {
      await invitePeople(slug, body.inviteIds).catch((e) => console.error("[invite on create]", e));
    }
    return NextResponse.json({ slug });
  } catch (e) {
    console.error("[/api/plans/create]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
