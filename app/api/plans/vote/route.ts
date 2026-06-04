import { NextResponse } from "next/server";
import { toggleVote } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { optionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.optionId) return NextResponse.json({ error: "optionId required" }, { status: 400 });
  try {
    const voted = await toggleVote(body.optionId);
    return NextResponse.json({ ok: true, voted });
  } catch (e) {
    console.error("[/api/plans/vote]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
