import { NextResponse } from "next/server";
import { respondNudge } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { nudgeId?: string; accept?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.nudgeId || typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "nudgeId + accept required" }, { status: 400 });
  }
  try {
    const { slug } = await respondNudge(body.nudgeId, body.accept);
    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error("[/api/nudge/respond]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
