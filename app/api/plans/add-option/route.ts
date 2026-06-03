import { NextResponse } from "next/server";
import { addCustomOption } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { slug?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.slug || !body.query?.trim()) {
    return NextResponse.json({ error: "slug + query required" }, { status: 400 });
  }
  try {
    const ok = await addCustomOption(body.slug, body.query);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("[/api/plans/add-option]", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
