import { NextResponse } from "next/server";
import { sendNudge } from "@/lib/db";

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
    const { slug } = await sendNudge(body.toId, body.message ?? "", body.when ?? "Whenever");
    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error("[/api/nudge]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
