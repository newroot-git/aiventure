import { NextResponse } from "next/server";
import { sendNudge } from "@/lib/db";
import { clientError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { toId?: string; message?: string; when?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
  try {
    await sendNudge(body.toId, body.message ?? "", body.when ?? "Whenever");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/nudge]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
