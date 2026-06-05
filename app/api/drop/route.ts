import { NextResponse } from "next/server";
import { generateDrop, type DropInput } from "@/lib/ai";
import { currentUserId } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/http";

export const runtime = "nodejs";
// matches /api/plans/create — generateDrop can run ~50s with a retry
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  if (!rateLimit(`drop:${clientIp(req)}`, 15, 60_000)) {
    return NextResponse.json({ error: "Slow down a moment, then try again." }, { status: 429 });
  }
  let body: DropInput;
  try {
    body = (await req.json()) as DropInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body?.intent || typeof body.intent !== "string" || body.intent.length > 500) {
    return NextResponse.json({ error: "a valid intent (<=500 chars) is required" }, { status: 400 });
  }

  try {
    const result = await generateDrop(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/drop]", e);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
