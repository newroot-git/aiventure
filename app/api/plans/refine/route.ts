import { NextResponse } from "next/server";
import { refineSlot, refineAll } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { slug?: string; slotKey?: string; day?: number; feedback?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!body.all && !body.slotKey) return NextResponse.json({ error: "slotKey or all required" }, { status: 400 });
  try {
    if (body.all) await refineAll(body.slug, body.feedback, body.day);
    else await refineSlot(body.slug, body.slotKey!, body.day ?? 1, body.feedback);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/plans/refine]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
