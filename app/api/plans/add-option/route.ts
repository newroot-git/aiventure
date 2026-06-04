import { NextResponse } from "next/server";
import { addCustomOption } from "@/lib/db";
import { clientError } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { slug?: string; title?: string; area?: string; slotKey?: string; day?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug || !body.title?.trim() || !body.slotKey) {
    return NextResponse.json({ error: "slug + title + slotKey required" }, { status: 400 });
  }
  try {
    const ok = await addCustomOption(body.slug, body.title, body.slotKey, body.day ?? 1, body.area);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("[/api/plans/add-option]", e);
    return NextResponse.json({ error: clientError(e) }, { status: 500 });
  }
}
